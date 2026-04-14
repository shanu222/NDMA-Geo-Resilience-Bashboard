import { query } from '../db.js';

export async function buildDecisionSuggestions(): Promise<string[]> {
  const out: string[] = [];
  const top = await query<{ name: string; score: string }>(
    `SELECT l.name, rs.score::text
     FROM risk_snapshots rs
     JOIN locations l ON l.id = rs.location_id
     ORDER BY rs.computed_at DESC, rs.score DESC
     LIMIT 5`,
  );
  for (const r of top.rows) {
    const s = Number(r.score);
    if (s >= 75) {
      out.push(`High flood risk in ${r.name}. Deploy emergency teams and verify evacuation routes.`);
    } else if (s >= 55) {
      out.push(`Elevated risk in ${r.name}. Inspect critical infrastructure and pre-position assets.`);
    }
  }
  const rain = await query<{ name: string; rainfall_mm: string | null }>(
    `SELECT l.name, w.rainfall_mm::text FROM locations l
     JOIN LATERAL (SELECT rainfall_mm FROM weather_data WHERE location_id = l.id ORDER BY ts DESC LIMIT 1) w ON true
     ORDER BY w.rainfall_mm DESC NULLS LAST LIMIT 1`,
  );
  if (rain.rows[0]?.name) {
    out.push(`Rainfall focus: ${rain.rows[0].name} — coordinate water-level monitoring along major channels.`);
  }
  out.push('Maintain cross-agency situational awareness and update field teams every watch cycle.');
  return Array.from(new Set(out)).slice(0, 6);
}
