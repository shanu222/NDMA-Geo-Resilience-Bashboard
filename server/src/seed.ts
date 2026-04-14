import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { hasDatabase } from './db.js';
import {
  User,
  Location,
  Infrastructure,
  DisasterHistory,
  FutureHook,
} from './models.js';
import { PAKISTAN_POINTS } from './services/weatherService.js';

function pointGeojson(lon: number, lat: number) {
  return { type: 'Point', coordinates: [lon, lat] };
}

function roughBBox(lon: number, lat: number) {
  const d = 0.35;
  return {
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
  };
}

export async function seedIfEmpty() {
  if (!hasDatabase || mongoose.connection.readyState !== 1) return;

  const n = await User.countDocuments();
  if (n > 0) return;

  const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'admin123', 10);
  await User.create({
    email: 'admin@ndma.gov.pk',
    password_hash: hash,
    role: 'admin',
    full_name: 'NDMA Administrator',
  });

  for (const p of PAKISTAN_POINTS) {
    await Location.create({
      name: p.name,
      district: p.district,
      polygon_geojson: roughBBox(p.lon, p.lat),
      centroid_geojson: pointGeojson(p.lon, p.lat),
      population: 500_000 + Math.floor(Math.random() * 2_000_000),
      terrain_risk: 40 + Math.floor(Math.random() * 40),
    });
  }

  const types = ['bridge', 'hospital', 'road', 'dam', 'school'];
  for (let i = 0; i < 40; i++) {
    const t = types[i % types.length];
    const lon = 60 + Math.random() * 8;
    const lat = 24 + Math.random() * 8;
    await Infrastructure.create({
      type: t,
      condition_score: 30 + Math.floor(Math.random() * 60),
      risk_score: undefined,
      geojson: pointGeojson(lon, lat),
      label: `${t}-${i + 1}`,
    });
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
    await DisasterHistory.create({
      type: d.type,
      occurred_at: new Date(Date.now() - days * 86400000),
      severity: d.sev,
      geojson: pointGeojson(65 + Math.random() * 5, 27 + Math.random() * 6),
      description: 'Historical event (seed)',
    });
  }

  await FutureHook.insertMany([
    { hook_type: 'ai_models', config: { status: 'planned' } },
    { hook_type: 'satellite_feeds', config: { status: 'planned' } },
    { hook_type: 'iot_sensors', config: { status: 'planned' } },
  ]);

  console.log('[ndma-db] Seed data created (admin@ndma.gov.pk)');
}
