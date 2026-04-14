import mongoose from 'mongoose';
import { Location, WeatherData, Infrastructure, Alert, RiskSnapshot } from '../models.js';
import { broadcast } from '../realtime.js';
import { categorize, computeRiskScore, persistSnapshot } from './riskService.js';

const RAIN_WARNING = 35;
const RAIN_CRITICAL = 55;

export async function refreshRiskForLocations() {
  const locs = await Location.find().lean();

  for (const loc of locs) {
    const w = await WeatherData.findOne({ location_id: loc._id })
      .sort({ ts: -1 })
      .lean();
    const rainfall = w?.rainfall_mm != null ? Number(w.rainfall_mm) : 30;

    const infAgg = await Infrastructure.aggregate<{ avg: number | null }>([
      { $group: { _id: null, avg: { $avg: '$condition_score' } } },
    ]);
    const avgInfra = infAgg[0]?.avg != null ? Number(infAgg[0].avg) : 55;

    const popDensity = Math.min(100, Math.round(loc.population / 25_000));

    const rainfallNorm = Math.min(100, rainfall * 1.2);
    const terrainNorm = loc.terrain_risk;
    const infraNorm = Math.min(100, avgInfra);
    const score = computeRiskScore({
      rainfall: rainfallNorm,
      terrain: terrainNorm,
      infrastructure: infraNorm,
      populationDensity: popDensity,
    });

    await persistSnapshot(String(loc._id), score, {
      rainfall_mm: rainfall,
      terrain: terrainNorm,
      infrastructure: infraNorm,
      populationDensity: popDensity,
    });
  }
  broadcast('risk', { ok: true });
}

export async function runAlertEngine() {
  const locs = await Location.find().lean();

  for (const loc of locs) {
    const w = await WeatherData.findOne({ location_id: loc._id })
      .sort({ ts: -1 })
      .lean();
    const rain = w?.rainfall_mm != null ? Number(w.rainfall_mm) : 0;

    const rs = await RiskSnapshot.findOne({ location_id: loc._id })
      .sort({ computed_at: -1 })
      .lean();
    const risk = rs?.score != null ? Number(rs.score) : 0;

    if (rain >= RAIN_CRITICAL || risk >= 85) {
      await insertIfNew(
        'flood',
        'critical',
        `Critical flood risk in ${loc.name}. Deploy emergency teams and inspect infrastructure.`,
        String(loc._id),
      );
    } else if (rain >= RAIN_WARNING || risk >= 65) {
      await insertIfNew(
        'rainfall',
        'warning',
        `Heavy rainfall / elevated risk in ${loc.name}. Increase monitoring.`,
        String(loc._id),
      );
    } else if (risk >= 45 && Math.random() < 0.15) {
      await insertIfNew(
        'monitoring',
        'info',
        `Routine monitoring: conditions stable in ${loc.name}.`,
        String(loc._id),
      );
    }
  }
  broadcast('alerts', { ok: true });
}

async function insertIfNew(
  type: string,
  severity: 'info' | 'warning' | 'critical',
  message: string,
  locationId: string,
) {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const dup = await Alert.findOne({
    location_id: new mongoose.Types.ObjectId(locationId),
    message,
    created_at: { $gte: since },
  }).lean();
  if (dup) return;
  await Alert.create({
    type,
    severity,
    message,
    location_id: new mongoose.Types.ObjectId(locationId),
  });
}

export { categorize };
