import mongoose from 'mongoose';
import { hasDatabase } from '../db.js';
import { Location, WeatherData } from '../models.js';
import { broadcast } from '../realtime.js';
import { refreshRiskForLocations, runAlertEngine } from './alertEngine.js';

/** OpenWeatherMap 2.5 — current weather */
export const OPENWEATHER_CURRENT_URL = 'https://api.openweathermap.org/data/2.5/weather';
/** OpenWeatherMap 2.5 — 5-day / 3-hour forecast */
export const OPENWEATHER_FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

/** Major Pakistan monitoring points */
export const PAKISTAN_POINTS: { name: string; district: string; lat: number; lon: number }[] = [
  { name: 'Karachi Central', district: 'Karachi', lat: 24.8607, lon: 67.0011 },
  { name: 'Lahore East', district: 'Lahore', lat: 31.5204, lon: 74.3587 },
  { name: 'Islamabad Zone-3', district: 'Islamabad', lat: 33.6844, lon: 73.0479 },
  { name: 'Rawalpindi North', district: 'Rawalpindi', lat: 33.5651, lon: 73.0169 },
  { name: 'Peshawar District', district: 'Peshawar', lat: 34.0151, lon: 71.5249 },
];

export function getOpenWeatherApiKey(): string {
  return (process.env.OPENWEATHER_API_KEY || '').trim();
}

function windDegToCompass(deg: number | undefined): string {
  if (deg == null || Number.isNaN(deg)) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

type OwmCurrentResponse = {
  rain?: { '1h'?: number; '3h'?: number };
  main?: { temp?: number; feels_like?: number; humidity?: number };
  wind?: { speed?: number; deg?: number };
  weather?: { main?: string }[];
};

function parseRainfallMm(j: OwmCurrentResponse): number {
  const r = j.rain;
  if (!r) return 0;
  return (r['1h'] ?? r['3h'] ?? 0) as number;
}

/**
 * Fetch current weather for coordinates (metric units).
 * API key from OPENWEATHER_API_KEY — never hardcoded.
 */
export async function fetchCurrentWeatherByCoords(lat: number, lon: number) {
  const key = getOpenWeatherApiKey();
  if (!key) {
    return { ok: false as const, error: 'no_api_key' as const };
  }
  const url = `${OPENWEATHER_CURRENT_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    console.error('[openweather] current HTTP error', res.status, t.slice(0, 200));
    return { ok: false as const, error: 'http' as const, status: res.status };
  }
  const j = (await res.json()) as OwmCurrentResponse;
  console.log('[openweather] current', { lat, lon, temp: j.main?.temp, rain_mm: parseRainfallMm(j) });
  return { ok: true as const, raw: j };
}

/** Normalize current weather for API consumers (rainfall mm, wind km/h). */
export function normalizeCurrentWeather(raw: OwmCurrentResponse) {
  const rainfall_mm = parseRainfallMm(raw);
  const temp = raw.main?.temp ?? 0;
  const feels = raw.main?.feels_like ?? temp;
  const humidity = raw.main?.humidity ?? 0;
  const windMs = raw.wind?.speed ?? 0;
  const windKmh = Math.round(windMs * 3.6 * 10) / 10;
  const wind_deg = raw.wind?.deg;
  return {
    rainfall_mm,
    temp_c: Math.round(temp * 10) / 10,
    feels_like_c: Math.round(feels * 10) / 10,
    humidity: Math.round(humidity),
    wind_speed_kmh: windKmh,
    wind_deg,
    wind_dir: windDegToCompass(wind_deg),
    summary: raw.weather?.[0]?.main ?? '',
  };
}

type OwmForecastResponse = {
  list?: { dt: number; main: { temp: number }; dt_txt: string; pop?: number }[];
};

/**
 * Fetch 5-day / 3-hour forecast (metric).
 */
export async function fetchForecastByCoords(lat: number, lon: number) {
  const key = getOpenWeatherApiKey();
  if (!key) {
    return { ok: false as const, error: 'no_api_key' as const };
  }
  const url = `${OPENWEATHER_FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    console.error('[openweather] forecast HTTP error', res.status, t.slice(0, 200));
    return { ok: false as const, error: 'http' as const, status: res.status };
  }
  const j = (await res.json()) as OwmForecastResponse;
  console.log('[openweather] forecast', { lat, lon, slots: j.list?.length ?? 0 });
  return { ok: true as const, raw: j };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Build daily forecast rows for the UI (label + avg temp). */
export function forecastListToDailyDays(raw: OwmForecastResponse): { day: string; temp: number; rainChance?: number }[] {
  const list = raw.list ?? [];
  const byDay = new Map<string, { temps: number[]; pops: number[] }>();
  for (const item of list) {
    const dayKey = item.dt_txt?.split(' ')[0];
    if (!dayKey) continue;
    if (!byDay.has(dayKey)) byDay.set(dayKey, { temps: [], pops: [] });
    const g = byDay.get(dayKey)!;
    g.temps.push(item.main.temp);
    if (item.pop != null) g.pops.push(Math.round(item.pop * 100));
  }
  const out: { day: string; temp: number; rainChance?: number }[] = [];
  let i = 0;
  for (const [dateStr, { temps, pops }] of byDay) {
    if (i >= 7) break;
    const d = new Date(dateStr + 'T12:00:00Z');
    const label = DAY_NAMES[d.getUTCDay()] ?? dateStr;
    const temp = Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10;
    const rainChance = pops.length ? Math.round(pops.reduce((a, b) => a + b, 0) / pops.length) : undefined;
    out.push({ day: label, temp, rainChance });
    i++;
  }
  return out;
}

export async function syncOpenWeather() {
  if (!hasDatabase || mongoose.connection.readyState !== 1) {
    broadcast('weather', { ok: false, mode: 'no_database' });
    return;
  }
  const key = getOpenWeatherApiKey();
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
      const url = `${OPENWEATHER_CURRENT_URL}?lat=${p.lat}&lon=${p.lon}&units=metric&appid=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const j = (await res.json()) as OwmCurrentResponse;
      const rainfall = parseRainfallMm(j);
      const temp = j.main?.temp ?? null;
      const humidity = j.main?.humidity ?? null;
      const windSpeed = j.wind?.speed != null ? j.wind.speed * 3.6 : null;
      const windDeg = j.wind?.deg ?? null;

      const loc = await Location.findOne({ name: p.name }).lean();
      const locationId = loc?._id;

      await WeatherData.create({
        location_id: locationId,
        ts: new Date(),
        rainfall_mm: rainfall,
        temp_c: temp,
        humidity,
        wind_speed: windSpeed,
        wind_deg: windDeg,
        raw: j as object,
      });
    }
    await refreshRiskForLocations();
    await runAlertEngine();
    broadcast('weather', { ok: true, mode: 'openweather' });
  } catch (e) {
    console.error('[weather]', e);
  }
}

async function insertSyntheticWeather() {
  const rows = await Location.find().lean();
  for (const r of rows) {
    const rainfall = Math.round(20 + Math.random() * 60);
    await WeatherData.create({
      location_id: r._id,
      ts: new Date(),
      rainfall_mm: rainfall,
      temp_c: 25 + Math.random() * 8,
      humidity: 55 + Math.random() * 30,
      wind_speed: 8 + Math.random() * 15,
      wind_deg: 180,
      raw: { synthetic: true },
    });
  }
}
