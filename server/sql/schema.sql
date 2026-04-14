-- NDMA GeoResilience — core schema (PostgreSQL; PostGIS optional — geo stored as GeoJSON JSONB)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'engineer', 'field_officer')),
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  district TEXT,
  polygon_geojson JSONB,
  centroid_geojson JSONB,
  population INTEGER NOT NULL DEFAULT 0,
  terrain_risk INTEGER NOT NULL DEFAULT 50 CHECK (terrain_risk BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_district ON locations (district);

CREATE TABLE IF NOT EXISTS infrastructure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  condition_score INTEGER NOT NULL DEFAULT 50 CHECK (condition_score BETWEEN 0 AND 100),
  risk_score INTEGER CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)),
  geojson JSONB,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disasters_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  geojson JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disasters_type_time ON disasters_history (type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS weather_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations (id) ON DELETE SET NULL,
  ts TIMESTAMPTZ NOT NULL,
  rainfall_mm REAL NOT NULL DEFAULT 0,
  temp_c REAL,
  humidity REAL,
  wind_speed REAL,
  wind_deg REAL,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_ts ON weather_data (ts DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  location_id UUID REFERENCES locations (id) ON DELETE SET NULL,
  geojson JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts (created_at DESC);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  cost_estimate REAL,
  risk_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  location_id UUID REFERENCES locations (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT,
  geojson JSONB,
  damage_score REAL,
  retrofit_cost REAL,
  notes TEXT,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  feature_geojson JSONB NOT NULL,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS future_hooks (
  id SERIAL PRIMARY KEY,
  hook_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations (id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  category TEXT NOT NULL CHECK (category IN ('low', 'medium', 'high')),
  inputs JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_loc_time ON risk_snapshots (location_id, computed_at DESC);
