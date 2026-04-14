import { query } from '../db.js';
import { broadcast } from '../realtime.js';
import { refreshRiskForLocations, runAlertEngine } from './alertEngine.js';

const OPENWEATHER = 'https://api.openweathermap.org/data/2.5/weather';

/** Major Pakistan monitoring points */
export const PAKISTAN_POINTS: { name: string; district: string; lat: number; lon: number }[] = [
  { name: 'Karachi Central', district: 'Karachi', lat: 24.8607, lon: 67.0011 },
  { name: 'Lahore East', district: 'Lahore', lat: 31.5204, lon: 74.3587 },
  { name: 'Islamabad Zone-3', district: 'Islamabad', lat: 33.6844, lon: 73.0479 },
  { name: 'Rawalpindi North', district: 'Rawalpindi', lat: 33.5651, lon: 73.0169 },
  { name: 'Peshawar District', district: 'Peshawar', lat: 34.0151, lon: 71.5249 },
];

export async function syncOpenWeather() {
  if (!process.env.DATABASE_URL) {
    broadcast('weather', { ok: false, mode: 'no_database' });
    return;
  }
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    try {
      await insertSyntheticWeather();
      await refreshRiskForLocations();
      await runAlertEngine();
      broadcast('weather', { ok: false, mode: 'synthetic' });
    } catch (e) {
      console.error('[weather]', e);
    }
    return;
  }

  try {
  for (const p of PAKISTAN_POINTS) {
    const url = `${OPENWEATHER}?lat=${p.lat}&lon=${p.lon}&appid=${key}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const j = (await res.json()) as {
      rain?: { '1h'?: number; '3h'?: number };
      main?: { temp?: number; humidity?: number };
      wind?: { speed?: number; deg?: number };
    };
    const rainfall = j.rain?.['1h'] ?? j.rain?.['3h'] ?? 0;
    const temp = j.main?.temp ?? null;
    const humidity = j.main?.humidity ?? null;
    const windSpeed = j.wind?.speed != null ? j.wind.speed * 3.6 : null;
    const windDeg = j.wind?.deg ?? null;

    const loc = await query<{ id: string }>(
      `SELECT id FROM locations WHERE name = $1 LIMIT 1`,
      [p.name],
    );
    const locationId = loc.rows[0]?.id;
    await query(
      `INSERT INTO weather_data (location_id, ts, rainfall_mm, temp_c, humidity, wind_speed, wind_deg, raw)
       VALUES ($1::uuid, NOW(), $2, $3, $4, $5, $6, $7::jsonb)`,
      [locationId, rainfall, temp, humidity, windSpeed, windDeg, JSON.stringify(j)],
    );
  }
  await refreshRiskForLocations();
  await runAlertEngine();
  broadcast('weather', { ok: true, mode: 'openweather' });
  } catch (e) {
    console.error('[weather]', e);
  }
}

async function insertSyntheticWeather() {
  const { rows } = await query<{ id: string; name: string }>(
    `SELECT id, name FROM locations`,
  );
  for (const r of rows) {
    const rainfall = Math.round(20 + Math.random() * 60);
    await query(
      `INSERT INTO weather_data (location_id, ts, rainfall_mm, temp_c, humidity, wind_speed, wind_deg, raw)
       VALUES ($1::uuid, NOW(), $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        r.id,
        rainfall,
        25 + Math.random() * 8,
        55 + Math.random() * 30,
        8 + Math.random() * 15,
        180,
        JSON.stringify({ synthetic: true }),
      ],
    );
  }
}
