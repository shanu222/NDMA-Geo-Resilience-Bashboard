import type { Express } from 'express';
import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from './db.js';
import { authOptional, requireAuth, requireRoles, signToken } from './middleware/auth.js';
import { computeRiskScore, nationalRiskIndex, categorize } from './services/riskService.js';
import { buildDecisionSuggestions } from './services/aiDecision.js';
import { buildRiskPdf } from './services/pdfService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

export function registerRoutes(app: Express) {
  app.use(authOptional);

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'ndma-georesilience-api' });
  });

  app.post('/api/v1/auth/login', express.json(), async (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'email and password required' });
      return;
    }
    const { rows } = await query<{
      id: string;
      email: string;
      password_hash: string;
      role: 'admin' | 'engineer' | 'field_officer';
    }>(`SELECT id, email, password_hash, role FROM users WHERE email = $1`, [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  app.get('/api/v1/auth/me', requireAuth, async (req, res) => {
    const { rows } = await query(`SELECT id, email, role, full_name FROM users WHERE id = $1::uuid`, [
      req.auth!.sub,
    ]);
    res.json(rows[0] || null);
  });

  app.get('/api/v1/dashboard/summary', async (_req, res) => {
    const national = await nationalRiskIndex();
    const alerts = await query(
      `SELECT a.id, a.type, a.severity, a.message, a.created_at, l.name AS location_name
       FROM alerts a LEFT JOIN locations l ON l.id = a.location_id
       ORDER BY a.created_at DESC LIMIT 12`,
    );
    const zones = await query(
      `SELECT l.id, l.name,
              (SELECT score FROM risk_snapshots WHERE location_id = l.id ORDER BY computed_at DESC LIMIT 1) AS risk,
              l.population::text AS population
       FROM locations l ORDER BY l.name LIMIT 24`,
    );
    const metrics = await query(
      `SELECT
         (SELECT COALESCE(AVG(rainfall_mm),0)::text FROM weather_data WHERE ts > NOW() - INTERVAL '24 hours') AS avg_rain,
         (SELECT COUNT(*)::text FROM alerts WHERE severity IN ('warning','critical') AND created_at > NOW() - INTERVAL '7 days') AS warnings,
         (SELECT COUNT(*)::text FROM infrastructure) AS infra,
         (SELECT SUM(population)::text FROM locations) AS population`,
    );
    const m = metrics.rows[0] as { avg_rain: string; warnings: string; infra: string; population: string };
    const suggestions = await buildDecisionSuggestions();
    const activity = await query(
      `SELECT 'Alert' AS kind, message AS detail, created_at FROM alerts ORDER BY created_at DESC LIMIT 5`,
    );
    res.json({
      nationalRisk: national,
      alerts: alerts.rows,
      zones: zones.rows,
      metrics: {
        avgRainfallMm: Math.round(Number(m.avg_rain) * 10) / 10,
        warnings: Number(m.warnings),
        infrastructure: Number(m.infra),
        population: Number(m.population),
      },
      aiSuggestions: suggestions,
      activity: activity.rows,
    });
  });

  app.get('/api/v1/locations', async (_req, res) => {
    const { rows } = await query(`SELECT id, name, district, polygon_geojson, centroid_geojson, population, terrain_risk FROM locations`);
    res.json(rows);
  });

  app.get('/api/v1/infrastructure', async (_req, res) => {
    const { rows } = await query(`SELECT id, type, condition_score, risk_score, geojson, label FROM infrastructure`);
    res.json(rows);
  });

  app.get('/api/v1/disasters', async (req, res) => {
    const type = req.query.type as string | undefined;
    const { rows } = type
      ? await query(
          `SELECT * FROM disasters_history WHERE type = $1 ORDER BY occurred_at DESC LIMIT 500`,
          [type],
        )
      : await query(`SELECT * FROM disasters_history ORDER BY occurred_at DESC LIMIT 500`);
    res.json(rows);
  });

  app.get('/api/v1/weather/latest', async (_req, res) => {
    const { rows } = await query(
      `SELECT w.*, l.name AS location_name FROM weather_data w
       LEFT JOIN locations l ON l.id = w.location_id
       ORDER BY w.ts DESC LIMIT 50`,
    );
    res.json(rows);
  });

  app.get('/api/v1/weather/forecast', async (_req, res) => {
    const key = process.env.OPENWEATHER_API_KEY;
    if (!key) {
      res.json({ source: 'synthetic', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({ day: d, temp: 22 + i, rainChance: 20 + i * 3 })) });
      return;
    }
    const first = await query(`SELECT centroid_geojson FROM locations LIMIT 1`);
    const c = first.rows[0] as { centroid_geojson: { coordinates: [number, number] } } | undefined;
    const coords = c?.centroid_geojson?.coordinates ?? [67.0011, 24.8607];
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords[1]}&lon=${coords[0]}&appid=${key}&units=metric`;
    const r = await fetch(url);
    if (!r.ok) {
      res.status(502).json({ error: 'forecast_unavailable' });
      return;
    }
    const j = await r.json();
    res.json({ source: 'openweather', raw: j });
  });

  app.get('/api/v1/alerts', async (_req, res) => {
    const { rows } = await query(
      `SELECT a.*, l.name AS location_name FROM alerts a LEFT JOIN locations l ON l.id = a.location_id ORDER BY a.created_at DESC LIMIT 200`,
    );
    res.json(rows);
  });

  app.post('/api/v1/risk/calculate', express.json(), (req, res) => {
    const { rainfall, terrain, infrastructure, populationDensity } = req.body as Record<string, unknown>;
    const score = computeRiskScore({
      rainfall: Number(rainfall ?? 50),
      terrain: Number(terrain ?? 50),
      infrastructure: Number(infrastructure ?? 50),
      populationDensity: Number(populationDensity ?? 50),
    });
    res.json({ score, category: categorize(score) });
  });

  app.get('/api/v1/risk/zones', async (_req, res) => {
    const { rows } = await query(
      `SELECT l.name,
              (SELECT score FROM risk_snapshots WHERE location_id = l.id ORDER BY computed_at DESC LIMIT 1) AS risk,
              l.population::text AS population,
              (SELECT AVG(condition_score)::text FROM infrastructure) AS infra_avg
       FROM locations l`,
    );
    res.json(rows);
  });

  app.get('/api/v1/ai/suggestions', async (_req, res) => {
    const suggestions = await buildDecisionSuggestions();
    res.json({ suggestions });
  });

  app.get('/api/v1/ai/predictions', async (_req, res) => {
    const { rows } = await query(
      `SELECT l.name,
              (SELECT rainfall_mm FROM weather_data WHERE location_id = l.id ORDER BY ts DESC LIMIT 1) AS last_rain,
              (SELECT score FROM risk_snapshots WHERE location_id = l.id ORDER BY computed_at DESC LIMIT 1) AS risk
       FROM locations l`,
    );
    const predictions = (rows as { name: string; last_rain: string | null; risk: string | null }[]).map((r) => {
      const rain = r.last_rain != null ? Number(r.last_rain) : 0;
      const risk = r.risk != null ? Number(r.risk) : 50;
      const future = Math.min(100, Math.round(risk + rain * 0.35));
      return { location: r.name, horizonHours: 48, floodRisk: future, note: 'Heuristic trend from rainfall + current composite risk.' };
    });
    res.json({ predictions });
  });

  app.get('/api/v1/deployments', async (_req, res) => {
    const { rows } = await query(
      `SELECT d.*, l.name AS location_name FROM deployments d LEFT JOIN locations l ON l.id = d.location_id ORDER BY d.started_at DESC`,
    );
    res.json(rows);
  });

  app.post('/api/v1/deployments', express.json(), requireAuth, requireRoles('admin', 'engineer'), async (req, res) => {
    const { team_name, location_id, status, notes } = req.body as Record<string, string>;
    const { rows } = await query(
      `INSERT INTO deployments (team_name, location_id, status, notes) VALUES ($1, $2::uuid, $3, $4) RETURNING *`,
      [team_name, location_id, status || 'assigned', notes || ''],
    );
    res.json(rows[0]);
  });

  app.get('/api/v1/geo-layers', async (_req, res) => {
    const { rows } = await query(`SELECT id, name, feature_geojson, created_at FROM geo_layers ORDER BY created_at DESC`);
    res.json(rows);
  });

  app.post('/api/v1/geo-layers', express.json(), requireAuth, async (req, res) => {
    const { name, feature } = req.body as { name?: string; feature?: object };
    if (!feature) {
      res.status(400).json({ error: 'feature GeoJSON required' });
      return;
    }
    const { rows } = await query(
      `INSERT INTO geo_layers (name, feature_geojson, created_by) VALUES ($1, $2::jsonb, $3::uuid) RETURNING *`,
      [name || 'layer', JSON.stringify(feature), req.auth!.sub],
    );
    res.json(rows[0]);
  });

  app.delete('/api/v1/geo-layers/:id', requireAuth, async (req, res) => {
    await query(`DELETE FROM geo_layers WHERE id = $1::uuid`, [req.params.id]);
    res.json({ ok: true });
  });

  app.post('/api/v1/field-reports', requireAuth, upload.single('image'), async (req, res) => {
    const file = req.file;
    const { notes, lon, lat } = req.body as { notes?: string; lon?: string; lat?: string };
    const imageUrl = file ? `/uploads/${file.filename}` : null;
    const geojson =
      lon && lat
        ? JSON.stringify({ type: 'Point', coordinates: [Number(lon), Number(lat)] })
        : null;
    const damage = 20 + Math.random() * 70;
    const cost = Math.round(50_000 + Math.random() * 500_000);
    const { rows } = await query(
      `INSERT INTO field_reports (image_url, geojson, damage_score, retrofit_cost, notes, created_by)
       VALUES ($1, $2::jsonb, $3, $4, $5, $6::uuid) RETURNING *`,
      [imageUrl, geojson, damage, cost, notes || '', req.auth!.sub],
    );
    res.json(rows[0]);
  });

  app.get('/api/v1/reports/pdf', async (_req, res) => {
    const pdf = await buildRiskPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ndma-risk-report.pdf"');
    res.send(pdf);
  });

  app.get('/api/v1/meta/hooks', requireAuth, requireRoles('admin', 'engineer'), async (_req, res) => {
    const { rows } = await query(`SELECT * FROM future_hooks ORDER BY id`);
    res.json(rows);
  });
}
