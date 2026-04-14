import mongoose from 'mongoose';
import { hasDatabase } from '../db.js';
import { RiskSnapshot } from '../models.js';

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
  await RiskSnapshot.create({
    location_id: new mongoose.Types.ObjectId(locationId),
    score,
    category: cat,
    inputs,
    computed_at: new Date(),
  });
}

export async function nationalRiskIndex(): Promise<number> {
  if (!hasDatabase || mongoose.connection.readyState !== 1) return 55;
  const agg = await RiskSnapshot.aggregate<{ avg: number }>([
    { $sort: { computed_at: -1 } },
    { $group: { _id: '$location_id', score: { $first: '$score' } } },
    { $group: { _id: null, avg: { $avg: '$score' } } },
  ]);
  if (agg[0]?.avg != null) return Math.round(agg[0].avg);
  return 55;
}
