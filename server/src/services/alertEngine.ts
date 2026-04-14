import { query } from '../db.js';
import { broadcast } from '../realtime.js';
import { categorize, computeRiskScore, persistSnapshot } from './riskService.js';

const RAIN_WARNING = 35;
const RAIN_CRITICAL = 55;

export async function refreshRiskForLocations() {
  const { rows: locs } = await query<{
    id: string;
    population: number;
    terrain_risk: number;
  }>(`SELECT id, population, terrain_risk FROM locations`);

  for (const loc of locs) {
    const w = await query<{ rainfall_mm: string | null }>(
      `SELECT rainfall_mm::text FROM weather_data WHERE location_id = $1::uuid ORDER BY ts DESC LIMIT 1`,
      [loc.id],
    );
    const rainfall = w.rows[0]?.rainfall_mm != null ? Number(w.rows[0].rainfall_mm) : 30;

    const inf = await query<{ avg: string | null }>(
      `SELECT AVG(condition_score)::text AS avg FROM infrastructure`,
    );
    const avgInfra = inf.rows[0]?.avg != null ? Number(inf.rows[0].avg) : 55;

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

    await persistSnapshot(loc.id, score, {
      rainfall_mm: rainfall,
      terrain: terrainNorm,
      infrastructure: infraNorm,
      populationDensity: popDensity,
    });
  }
  broadcast('risk', { ok: true });
}

export async function runAlertEngine() {
  const { rows } = await query<{
    id: string;
    name: string;
    rainfall_mm: string | null;
  }>(
    `SELECT l.id, l.name, w.rainfall_mm::text
     FROM locations l
     JOIN LATERAL (
       SELECT rainfall_mm FROM weather_data WHERE location_id = l.id ORDER BY ts DESC LIMIT 1
     ) w ON true`,
  );

  for (const r of rows) {
    const rain = r.rainfall_mm != null ? Number(r.rainfall_mm) : 0;
    const rs = await query<{ score: string }>(
      `SELECT score::text FROM risk_snapshots WHERE location_id = $1::uuid ORDER BY computed_at DESC LIMIT 1`,
      [r.id],
    );
    const risk = rs.rows[0]?.score != null ? Number(rs.rows[0].score) : 0;

    if (rain >= RAIN_CRITICAL || risk >= 85) {
      await insertIfNew(
        'flood',
        'critical',
        `Critical flood risk in ${r.name}. Deploy emergency teams and inspect infrastructure.`,
        r.id,
      );
    } else if (rain >= RAIN_WARNING || risk >= 65) {
      await insertIfNew(
        'rainfall',
        'warning',
        `Heavy rainfall / elevated risk in ${r.name}. Increase monitoring.`,
        r.id,
      );
    } else if (risk >= 45 && Math.random() < 0.15) {
      await insertIfNew(
        'monitoring',
        'info',
        `Routine monitoring: conditions stable in ${r.name}.`,
        r.id,
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
  const dup = await query(
    `SELECT id FROM alerts WHERE location_id = $1::uuid AND message = $2 AND created_at > NOW() - INTERVAL '2 hours'`,
    [locationId, message],
  );
  if (dup.rowCount) return;
  await query(
    `INSERT INTO alerts (type, severity, message, location_id) VALUES ($1, $2, $3, $4::uuid)`,
    [type, severity, message, locationId],
  );
}

export { categorize };
