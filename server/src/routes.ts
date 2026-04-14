import type { Express } from 'express';
import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasDatabase } from './db.js';
import {
  User,
  Location,
  Infrastructure,
  DisasterHistory,
  WeatherData,
  Alert,
  Deployment,
  GeoLayer,
  FieldReport,
  FutureHook,
  RiskSnapshot,
} from './models.js';
import { authOptional, requireAuth, requireRoles, signToken } from './middleware/auth.js';
import { computeRiskScore, nationalRiskIndex, categorize } from './services/riskService.js';
import { buildDecisionSuggestions } from './services/aiDecision.js';
import { buildRiskPdf } from './services/pdfService.js';
import {
  fetchCurrentWeatherByCoords,
  normalizeCurrentWeather,
  fetchForecastByCoords,
  forecastListToDailyDays,
  getOpenWeatherApiKey,
  PAKISTAN_POINTS,
} from './services/weatherService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

function defaultForecastCoords(): [number, number] {
  const p = PAKISTAN_POINTS[0];
  return [p.lon, p.lat];
}

export function registerRoutes(app: Express) {
  app.use(authOptional);

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'ndma-georesilience-api',
      database: hasDatabase && mongoose.connection.readyState === 1,
    });
  });

  app.get('/api/v1/weather/current', async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({ error: 'lat and lon query parameters are required' });
      return;
    }
    const r = await fetchCurrentWeatherByCoords(lat, lon);
    if (!r.ok) {
      if (r.error === 'no_api_key') {
        res.status(503).json({ error: 'openweather_not_configured', message: 'Set OPENWEATHER_API_KEY' });
        return;
      }
      res.status(502).json({ error: 'openweather_unavailable', status: 'status' in r ? r.status : undefined });
      return;
    }
    const normalized = normalizeCurrentWeather(r.raw);
    res.json({ source: 'openweather', lat, lon, ...normalized, raw: r.raw });
  });

  app.get('/api/v1/weather/forecast', async (req, res) => {
    let lon: number;
    let lat: number;
    if (req.query.lat != null && req.query.lon != null) {
      lat = Number(req.query.lat);
      lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        res.status(400).json({ error: 'invalid lat or lon' });
        return;
      }
    } else if (hasDatabase && mongoose.connection.readyState === 1) {
      const first = await Location.findOne().lean();
      const c = first?.centroid_geojson as { coordinates?: [number, number] } | undefined;
      if (c?.coordinates?.length === 2) {
        lon = c.coordinates[0];
        lat = c.coordinates[1];
      } else {
        [lon, lat] = defaultForecastCoords();
      }
    } else {
      [lon, lat] = defaultForecastCoords();
    }

    const key = getOpenWeatherApiKey();
    if (!key) {
      res.json({
        source: 'synthetic',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({
          day: d,
          temp: 22 + i,
          rainChance: 20 + i * 3,
        })),
      });
      return;
    }

    const fr = await fetchForecastByCoords(lat, lon);
    if (!fr.ok) {
      res.status(502).json({ error: 'forecast_unavailable' });
      return;
    }
    const days = forecastListToDailyDays(fr.raw);
    res.json({
      source: 'openweather',
      lat,
      lon,
      days: days.length ? days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({
        day: d,
        temp: 22 + i,
      })),
      raw: fr.raw,
    });
  });

  app.post('/api/v1/auth/login', express.json(), async (req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.status(503).json({
        error: 'database_unavailable',
        message: 'Set MONGODB_URI and ensure MongoDB is reachable.',
      });
      return;
    }
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'email and password required' });
      return;
    }
    const user = await User.findOne({ email }).lean();
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const id = user._id.toString();
    const token = signToken({ sub: id, email: user.email, role: user.role as 'admin' | 'engineer' | 'field_officer' });
    res.json({ token, user: { id, email: user.email, role: user.role } });
  });

  app.get('/api/v1/auth/me', requireAuth, async (req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'database_unavailable' });
      return;
    }
    const user = await User.findById(req.auth!.sub).lean();
    if (!user) {
      res.json(null);
      return;
    }
    res.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    });
  });

  app.get('/api/v1/dashboard/summary', async (_req, res) => {
    const suggestions = await buildDecisionSuggestions();
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json({
        nationalRisk: 55,
        alerts: [],
        zones: [],
        metrics: { avgRainfallMm: 0, warnings: 0, infrastructure: 0, population: 0 },
        aiSuggestions: suggestions,
        activity: [],
        degraded: true,
      });
      return;
    }

    const national = await nationalRiskIndex();
    const alertsDocs = await Alert.find().sort({ created_at: -1 }).limit(12).populate('location_id', 'name').lean();
    const alerts = alertsDocs.map((a) => ({
      id: a._id.toString(),
      type: a.type,
      severity: a.severity,
      message: a.message,
      created_at: a.created_at,
      location_name:
        a.location_id && typeof a.location_id === 'object' && 'name' in a.location_id
          ? (a.location_id as { name: string }).name
          : null,
    }));

    const locs = await Location.find().sort({ name: 1 }).limit(24).lean();
    const zones = await Promise.all(
      locs.map(async (l) => {
        const rs = await RiskSnapshot.findOne({ location_id: l._id }).sort({ computed_at: -1 }).lean();
        return {
          id: l._id.toString(),
          name: l.name,
          risk: rs?.score != null ? String(rs.score) : null,
          population: String(l.population),
        };
      }),
    );

    const dayAgo = new Date(Date.now() - 86400000);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const [avgRainAgg, warnC, infraC, popAgg] = await Promise.all([
      WeatherData.aggregate<{ v: number | null }>([
        { $match: { ts: { $gte: dayAgo } } },
        { $group: { _id: null, v: { $avg: '$rainfall_mm' } } },
      ]),
      Alert.countDocuments({
        severity: { $in: ['warning', 'critical'] },
        created_at: { $gte: weekAgo },
      }),
      Infrastructure.countDocuments(),
      Location.aggregate<{ s: number | null }>([{ $group: { _id: null, s: { $sum: '$population' } } }]),
    ]);
    const avgRain = avgRainAgg[0]?.v ?? 0;
    const population = popAgg[0]?.s ?? 0;

    const activityDocs = await Alert.find().sort({ created_at: -1 }).limit(5).lean();
    const activity = activityDocs.map((a) => ({
      kind: 'Alert' as const,
      detail: a.message,
      created_at: a.created_at,
    }));

    res.json({
      nationalRisk: national,
      alerts,
      zones,
      metrics: {
        avgRainfallMm: Math.round(Number(avgRain) * 10) / 10,
        warnings: warnC,
        infrastructure: infraC,
        population: Number(population),
      },
      aiSuggestions: suggestions,
      activity,
    });
  });

  app.get('/api/v1/locations', async (_req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json([]);
      return;
    }
    const rows = await Location.find().lean();
    res.json(
      rows.map((l) => ({
        id: l._id.toString(),
        name: l.name,
        district: l.district,
        polygon_geojson: l.polygon_geojson,
        centroid_geojson: l.centroid_geojson,
        population: l.population,
        terrain_risk: l.terrain_risk,
      })),
    );
  });

  app.get('/api/v1/infrastructure', async (_req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json([]);
      return;
    }
    const rows = await Infrastructure.find().lean();
    res.json(
      rows.map((x) => ({
        id: x._id.toString(),
        type: x.type,
        condition_score: x.condition_score,
        risk_score: x.risk_score,
        geojson: x.geojson,
        label: x.label,
      })),
    );
  });

  app.get('/api/v1/disasters', async (req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json([]);
      return;
    }
    const type = req.query.type as string | undefined;
    const q = type ? { type } : {};
    const rows = await DisasterHistory.find(q).sort({ occurred_at: -1 }).limit(500).lean();
    res.json(
      rows.map((d) => ({
        id: d._id.toString(),
        type: d.type,
        occurred_at: d.occurred_at,
        severity: d.severity,
        geojson: d.geojson,
        description: d.description,
        created_at: d.created_at,
      })),
    );
  });

  app.get('/api/v1/weather/latest', async (_req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json([]);
      return;
    }
    const rows = await WeatherData.find().sort({ ts: -1 }).limit(50).populate('location_id', 'name').lean();
    res.json(
      rows.map((w) => {
        const loc = w.location_id as { name?: string } | null;
        return {
          id: w._id.toString(),
          location_id: w.location_id && typeof w.location_id === 'object' && '_id' in (w.location_id as object)
            ? String((w.location_id as { _id: mongoose.Types.ObjectId })._id)
            : w.location_id
              ? String(w.location_id)
              : null,
          ts: w.ts,
          rainfall_mm: w.rainfall_mm != null ? String(w.rainfall_mm) : null,
          temp_c: w.temp_c != null ? String(w.temp_c) : null,
          humidity: w.humidity != null ? String(w.humidity) : null,
          wind_speed: w.wind_speed != null ? String(w.wind_speed) : null,
          wind_deg: w.wind_deg != null ? String(w.wind_deg) : null,
          location_name: loc?.name ?? null,
          raw: w.raw,
        };
      }),
    );
  });

  app.get('/api/v1/alerts', async (_req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json([]);
      return;
    }
    const rows = await Alert.find().sort({ created_at: -1 }).limit(200).populate('location_id', 'name').lean();
    res.json(
      rows.map((a) => ({
        id: a._id.toString(),
        type: a.type,
        severity: a.severity,
        message: a.message,
        location_id: a.location_id
          ? typeof a.location_id === 'object' && '_id' in (a.location_id as object)
            ? String((a.location_id as { _id: mongoose.Types.ObjectId })._id)
            : String(a.location_id)
          : null,
        geojson: a.geojson,
        created_at: a.created_at,
        location_name:
          a.location_id && typeof a.location_id === 'object' && 'name' in a.location_id
            ? (a.location_id as { name: string }).name
            : null,
      })),
    );
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
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json([]);
      return;
    }
    const infraAvg = await Infrastructure.aggregate<{ avg: number | null }>([
      { $group: { _id: null, avg: { $avg: '$condition_score' } } },
    ]);
    const avgInfra = infraAvg[0]?.avg != null ? String(infraAvg[0].avg) : null;
    const locs = await Location.find().lean();
    const out = await Promise.all(
      locs.map(async (l) => {
        const rs = await RiskSnapshot.findOne({ location_id: l._id }).sort({ computed_at: -1 }).lean();
        return {
          name: l.name,
          risk: rs?.score != null ? String(rs.score) : null,
          population: String(l.population),
          infra_avg: avgInfra,
        };
      }),
    );
    res.json(out);
  });

  app.get('/api/v1/ai/suggestions', async (_req, res) => {
    const suggestions = await buildDecisionSuggestions();
    res.json({ suggestions });
  });

  app.get('/api/v1/ai/predictions', async (_req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json({ predictions: [] });
      return;
    }
    const locs = await Location.find().lean();
    const predictions = await Promise.all(
      locs.map(async (l) => {
        const w = await WeatherData.findOne({ location_id: l._id }).sort({ ts: -1 }).lean();
        const rs = await RiskSnapshot.findOne({ location_id: l._id }).sort({ computed_at: -1 }).lean();
        const rain = w?.rainfall_mm != null ? Number(w.rainfall_mm) : 0;
        const risk = rs?.score != null ? Number(rs.score) : 50;
        const future = Math.min(100, Math.round(risk + rain * 0.35));
        return {
          location: l.name,
          horizonHours: 48,
          floodRisk: future,
          note: 'Heuristic trend from rainfall + current composite risk.',
        };
      }),
    );
    res.json({ predictions });
  });

  app.get('/api/v1/deployments', async (_req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json([]);
      return;
    }
    const rows = await Deployment.find().sort({ started_at: -1 }).populate('location_id', 'name').lean();
    res.json(
      rows.map((d) => ({
        id: d._id.toString(),
        team_name: d.team_name,
        location_id: d.location_id
          ? typeof d.location_id === 'object' && '_id' in (d.location_id as object)
            ? String((d.location_id as { _id: mongoose.Types.ObjectId })._id)
            : String(d.location_id)
          : null,
        status: d.status,
        notes: d.notes,
        started_at: d.started_at,
        location_name:
          d.location_id && typeof d.location_id === 'object' && 'name' in d.location_id
            ? (d.location_id as { name: string }).name
            : null,
      })),
    );
  });

  app.post('/api/v1/deployments', express.json(), requireAuth, requireRoles('admin', 'engineer'), async (req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'database_unavailable' });
      return;
    }
    const { team_name, location_id, status, notes } = req.body as Record<string, string>;
    const doc = await Deployment.create({
      team_name,
      location_id: new mongoose.Types.ObjectId(location_id),
      status: status || 'assigned',
      notes: notes || '',
    });
    res.json({
      id: doc._id.toString(),
      team_name: doc.team_name,
      location_id: doc.location_id?.toString(),
      status: doc.status,
      notes: doc.notes,
      started_at: doc.started_at,
    });
  });

  app.get('/api/v1/geo-layers', async (_req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json([]);
      return;
    }
    const rows = await GeoLayer.find().sort({ created_at: -1 }).lean();
    res.json(
      rows.map((g) => ({
        id: g._id.toString(),
        name: g.name,
        feature_geojson: g.feature_geojson,
        created_at: g.created_at,
      })),
    );
  });

  app.post('/api/v1/geo-layers', express.json(), requireAuth, async (req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'database_unavailable' });
      return;
    }
    const { name, feature } = req.body as { name?: string; feature?: object };
    if (!feature) {
      res.status(400).json({ error: 'feature GeoJSON required' });
      return;
    }
    const doc = await GeoLayer.create({
      name: name || 'layer',
      feature_geojson: feature,
      created_by: new mongoose.Types.ObjectId(req.auth!.sub),
    });
    res.json({
      id: doc._id.toString(),
      name: doc.name,
      feature_geojson: doc.feature_geojson,
      created_at: doc.created_at,
    });
  });

  app.delete('/api/v1/geo-layers/:id', requireAuth, async (req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'database_unavailable' });
      return;
    }
    await GeoLayer.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  });

  app.post('/api/v1/field-reports', requireAuth, upload.single('image'), async (req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.status(503).json({ error: 'database_unavailable' });
      return;
    }
    const file = req.file;
    const { notes, lon, lat } = req.body as { notes?: string; lon?: string; lat?: string };
    const imageUrl = file ? `/uploads/${file.filename}` : null;
    const geojson =
      lon && lat
        ? { type: 'Point', coordinates: [Number(lon), Number(lat)] }
        : null;
    const damage = 20 + Math.random() * 70;
    const cost = Math.round(50_000 + Math.random() * 500_000);
    const doc = await FieldReport.create({
      image_url: imageUrl,
      geojson,
      damage_score: damage,
      retrofit_cost: cost,
      notes: notes || '',
      created_by: new mongoose.Types.ObjectId(req.auth!.sub),
    });
    res.json({
      id: doc._id.toString(),
      image_url: doc.image_url,
      geojson: doc.geojson,
      damage_score: doc.damage_score,
      retrofit_cost: doc.retrofit_cost,
      notes: doc.notes,
      created_at: doc.created_at,
    });
  });

  app.get('/api/v1/reports/pdf', async (_req, res) => {
    const pdf = await buildRiskPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ndma-risk-report.pdf"');
    res.send(pdf);
  });

  app.get('/api/v1/meta/hooks', requireAuth, requireRoles('admin', 'engineer'), async (_req, res) => {
    if (!hasDatabase || mongoose.connection.readyState !== 1) {
      res.json([]);
      return;
    }
    const rows = await FutureHook.find().sort({ created_at: -1 }).lean();
    res.json(
      rows.map((h) => ({
        id: h._id.toString(),
        hook_type: h.hook_type,
        config: h.config,
        created_at: h.created_at,
      })),
    );
  });
}
