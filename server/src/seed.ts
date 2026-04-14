import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { PAKISTAN_POINTS } from './services/weatherService.js';

function pointGeojson(lon: number, lat: number) {
  return JSON.stringify({ type: 'Point', coordinates: [lon, lat] });
}

function roughBBox(lon: number, lat: number) {
  const d = 0.35;
  return JSON.stringify({
    type: 'Polygon',
    coordinates: [
      [
        [lon - d, lat - d],
        [lon + d, lat - d],
        [lon + d, lat + d],
        [lon - d, lat + d],
        [lon - d, lat - d],
      ],
    ],
  });
}

export async function seedIfEmpty() {
  const u = await query(`SELECT COUNT(*)::int AS c FROM users`);
  if ((u.rows[0] as { c: number }).c > 0) return;

  const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'admin123', 10);
  await query(
    `INSERT INTO users (email, password_hash, role, full_name) VALUES ($1, $2, 'admin', 'NDMA Administrator')`,
    ['admin@ndma.gov.pk', hash],
  );

  for (const p of PAKISTAN_POINTS) {
    await query(
      `INSERT INTO locations (name, district, polygon_geojson, centroid_geojson, population, terrain_risk)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)`,
      [
        p.name,
        p.district,
        roughBBox(p.lon, p.lat),
        pointGeojson(p.lon, p.lat),
        500_000 + Math.floor(Math.random() * 2_000_000),
        40 + Math.floor(Math.random() * 40),
      ],
    );
  }

  const types = ['bridge', 'hospital', 'road', 'dam', 'school'];
  for (let i = 0; i < 40; i++) {
    const t = types[i % types.length];
    const lon = 60 + Math.random() * 8;
    const lat = 24 + Math.random() * 8;
    await query(
      `INSERT INTO infrastructure (type, condition_score, risk_score, geojson, label)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [
        t,
        30 + Math.floor(Math.random() * 60),
        null,
        pointGeojson(lon, lat),
        `${t}-${i + 1}`,
      ],
    );
  }

  const dis = [
    { type: 'flood', sev: 4 },
    { type: 'flood', sev: 5 },
    { type: 'earthquake', sev: 3 },
    { type: 'landslide', sev: 2 },
  ];
  for (let i = 0; i < 30; i++) {
    const d = dis[i % dis.length];
    const days = 30 + Math.floor(Math.random() * 600);
    await query(
      `INSERT INTO disasters_history (type, occurred_at, severity, geojson, description)
       VALUES ($1, NOW() - ($2::int * INTERVAL '1 day'), $3, $4::jsonb, $5)`,
      [
        d.type,
        days,
        d.sev,
        pointGeojson(65 + Math.random() * 5, 27 + Math.random() * 6),
        'Historical event (seed)',
      ],
    );
  }

  await query(
    `INSERT INTO future_hooks (hook_type, config) VALUES
     ('ai_models', '{"status":"planned"}'),
     ('satellite_feeds', '{"status":"planned"}'),
     ('iot_sensors', '{"status":"planned"}')`,
  );
}
