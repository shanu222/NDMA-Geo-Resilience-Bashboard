import { query } from '../db.js';

export type RiskCategory = 'low' | 'medium' | 'high';

export function categorize(score: number): RiskCategory {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/** Weighted risk 0–100 from inputs (0–100 scales). */
export function computeRiskScore(input: {
  rainfall: number;
  terrain: number;
  infrastructure: number;
  populationDensity: number;
}) {
  const wRain = 0.35;
  const wTerrain = 0.2;
  const wInfra = 0.25;
  const wPop = 0.2;
  const infraStress = 100 - input.infrastructure;
  const score = Math.round(
    input.rainfall * wRain +
      input.terrain * wTerrain +
      infraStress * wInfra +
      input.populationDensity * wPop,
  );
  return Math.max(0, Math.min(100, score));
}

export async function persistSnapshot(
  locationId: string,
  score: number,
  inputs: Record<string, unknown>,
) {
  const cat = categorize(score);
  await query(
    `INSERT INTO risk_snapshots (location_id, score, category, inputs)
     VALUES ($1::uuid, $2, $3, $4::jsonb)`,
    [locationId, score, cat, JSON.stringify(inputs)],
  );
}

export async function nationalRiskIndex(): Promise<number> {
  const { rows } = await query<{ m: string | null }>(
    `SELECT AVG(score)::text AS m FROM (
       SELECT DISTINCT ON (location_id) score FROM risk_snapshots
       ORDER BY location_id, computed_at DESC
     ) t`,
  );
  if (rows[0]?.m != null) return Math.round(Number(rows[0].m));
  return 55;
}
