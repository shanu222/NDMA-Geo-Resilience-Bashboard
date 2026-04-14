import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Layers,
  Navigation,
  Maximize2,
  CloudRain,
  History,
  Building2,
  Users,
  ArrowLeft,
  Circle
} from "lucide-react";
import PakistanMapView, { type MapPoint } from "./maps/PakistanMapView";
import { apiGet } from "@/lib/api";
import { useRealtimePoll } from "@/lib/useRealtime";

interface InteractiveMapProps {
  onBack: () => void;
}

type Basemap = "osm" | "satellite" | "terrain";

function parsePoint(g: unknown): { lat: number; lng: number } | null {
  if (!g || typeof g !== "object") return null;
  const gj = g as { type?: string; coordinates?: [number, number] };
  if (gj.type === "Point" && gj.coordinates?.length === 2) {
    return { lat: gj.coordinates[1], lng: gj.coordinates[0] };
  }
  return null;
}

export default function InteractiveMap({ onBack }: InteractiveMapProps) {
  const [showLayers, setShowLayers] = useState(false);
  const [activeLayers, setActiveLayers] = useState<string[]>(['weather']);
  const [showWeatherPanel, setShowWeatherPanel] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("osm");
  const [fitSignal, setFitSignal] = useState(0);

  const [weather, setWeather] = useState<{
    rainfall: number;
    temp: number;
    humidity: number;
    wind: number;
    windDir: string;
    feels: number;
  }>({ rainfall: 0, temp: 0, humidity: 0, wind: 0, windDir: "—", feels: 0 });

  const [forecast, setForecast] = useState<{ day: string; temp: number }[]>([]);
  /** When set, live OpenWeather data is loaded for this map point. */
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [locations, setLocations] = useState<MapPoint[]>([]);
  const [infrastructure, setInfrastructure] = useState<MapPoint[]>([]);
  const [disasters, setDisasters] = useState<MapPoint[]>([]);
  const [heat, setHeat] = useState<{ lat: number; lng: number; v: number }[]>([]);

  const load = useCallback(async () => {
    try {
      const locs = await apiGet<
        { id: string; name: string; centroid_geojson: unknown; population: number }[]
      >("/api/v1/locations");
      setLocations(
        locs
          .map((l) => {
            const p = parsePoint(l.centroid_geojson);
            if (!p) return null;
            return {
              id: l.id,
              lat: p.lat,
              lng: p.lng,
              label: l.name,
              meta: String(l.population),
            } as MapPoint;
          })
          .filter(Boolean) as MapPoint[],
      );

      const inf = await apiGet<
        { id: string; type: string; label: string | null; geojson: unknown }[]
      >("/api/v1/infrastructure");
      setInfrastructure(
        inf
          .map((x) => {
            const p = parsePoint(x.geojson);
            if (!p) return null;
            return {
              id: x.id,
              lat: p.lat,
              lng: p.lng,
              label: x.label || x.type,
              meta: x.type,
            } as MapPoint;
          })
          .filter(Boolean) as MapPoint[],
      );

      const dh = await apiGet<{ id: string; type: string; geojson: unknown; description: string | null }[]>(
        "/api/v1/disasters",
      );
      setDisasters(
        dh
          .map((d) => {
            const p = parsePoint(d.geojson);
            if (!p) return null;
            return {
              id: d.id,
              lat: p.lat,
              lng: p.lng,
              label: `${d.type}`,
              meta: d.description || "",
            } as MapPoint;
          })
          .filter(Boolean) as MapPoint[],
      );

      const wx = await apiGet<
        {
          rainfall_mm: string | null;
          temp_c: string | null;
          humidity: string | null;
          wind_speed: string | null;
          wind_deg: string | null;
          location_id: string | null;
        }[]
      >("/api/v1/weather/latest");

      const pts: { lat: number; lng: number; v: number }[] = [];
      let sumR = 0;
      let sumT = 0;
      let sumH = 0;
      let sumW = 0;
      let n = 0;
      for (const row of wx.slice(0, 20)) {
        const r = row.rainfall_mm != null ? Number(row.rainfall_mm) : 0;
        const lc = locs.find((l) => l.id === row.location_id);
        const p = parsePoint(lc?.centroid_geojson);
        if (p) pts.push({ lat: p.lat, lng: p.lng, v: r });
        sumR += r;
        sumT += row.temp_c != null ? Number(row.temp_c) : 0;
        sumH += row.humidity != null ? Number(row.humidity) : 0;
        sumW += row.wind_speed != null ? Number(row.wind_speed) : 0;
        n += 1;
      }
      setHeat(pts);
      if (!pinnedCoords && n) {
        const avgT = sumT / n;
        setWeather({
          rainfall: Math.round((sumR / n) * 10) / 10,
          temp: Math.round(avgT * 10) / 10,
          humidity: Math.round(sumH / n),
          wind: Math.round((sumW / n) * 10) / 10,
          windDir: "NE",
          feels: Math.round((avgT + 2) * 10) / 10,
        });
      }

      if (!pinnedCoords) {
        const fc = await apiGet<{ days?: { day: string; temp: number }[] }>("/api/v1/weather/forecast");
        if (fc.days?.length) setForecast(fc.days);
        else {
          setForecast(
            ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => ({
              day: d,
              temp: 20 + i,
            })),
          );
        }
      }
    } catch {
      /* offline — keep defaults */
    }
  }, [pinnedCoords]);

  useEffect(() => {
    if (!pinnedCoords) {
      setWeatherLoading(false);
      setWeatherError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setWeatherLoading(true);
      setWeatherError(null);
      try {
        const cur = await apiGet<{
          rainfall_mm: number;
          temp_c: number;
          humidity: number;
          wind_speed_kmh: number;
          wind_dir: string;
          feels_like_c: number;
        }>(
          `/api/v1/weather/current?lat=${pinnedCoords.lat}&lon=${pinnedCoords.lng}`,
        );
        if (cancelled) return;
        console.log("[weather-ui] OpenWeather current @ pin", pinnedCoords, cur);
        setWeather({
          rainfall: Math.round(cur.rainfall_mm * 10) / 10,
          temp: Math.round(cur.temp_c * 10) / 10,
          humidity: cur.humidity,
          wind: Math.round(cur.wind_speed_kmh * 10) / 10,
          windDir: cur.wind_dir || "—",
          feels: Math.round(cur.feels_like_c * 10) / 10,
        });
        const fc = await apiGet<{ days?: { day: string; temp: number }[] }>(
          `/api/v1/weather/forecast?lat=${pinnedCoords.lat}&lon=${pinnedCoords.lng}`,
        );
        if (!cancelled && fc.days?.length) setForecast(fc.days);
      } catch {
        if (!cancelled) setWeatherError("Weather data unavailable for this location.");
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pinnedCoords]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimePoll(load, 60_000);

  const layers = [
    { id: 'weather', label: 'Weather', icon: CloudRain, color: '#1E5EFF' },
    { id: 'history', label: 'Disaster History', icon: History, color: '#FF7A00' },
    { id: 'infrastructure', label: 'Infrastructure', icon: Building2, color: '#22C55E' },
    { id: 'population', label: 'Population', icon: Users, color: '#8B5CF6' }
  ];

  const toggleLayer = (layerId: string) => {
    setActiveLayers(prev =>
      prev.includes(layerId)
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  const cycleBasemap = () => {
    setBasemap((b) => (b === "osm" ? "satellite" : b === "satellite" ? "terrain" : "osm"));
  };

  const mapMemo = useMemo(
    () => (
      <PakistanMapView
        basemap={basemap}
        activeLayers={activeLayers}
        infrastructure={infrastructure}
        disasters={disasters}
        weatherHeat={heat}
        locations={locations}
        fitSignal={fitSignal}
        onLocationPointClick={(p) => setPinnedCoords({ lat: p.lat, lng: p.lng })}
      />
    ),
    [basemap, activeLayers, infrastructure, disasters, heat, locations, fitSignal],
  );

  return (
    <div className="min-h-screen bg-[#0B1F3A] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 z-0">{mapMemo}</div>
      </div>

      {/* Top Bar */}
      <div className="relative z-20 p-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <input
              type="text"
              placeholder="Search location..."
              className="w-full h-11 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:border-[#1E5EFF] transition-all"
            />
          </div>

          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`w-11 h-11 rounded-xl backdrop-blur-md border flex items-center justify-center transition-all ${
              showLayers
                ? 'bg-[#1E5EFF] border-[#1E5EFF]'
                : 'bg-black/40 border-white/20 hover:bg-black/60'
            }`}
          >
            <Layers className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Layer Panel */}
        <AnimatePresence>
          {showLayers && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-4"
            >
              <h3 className="text-sm text-white/60 uppercase tracking-wider mb-3">Map Layers</h3>
              <div className="space-y-2">
                {layers.map(layer => {
                  const Icon = layer.icon;
                  const isActive = activeLayers.includes(layer.id);
                  return (
                    <button
                      key={layer.id}
                      onClick={() => toggleLayer(layer.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-white/10 border border-white/20'
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${layer.color}20`, border: `1px solid ${layer.color}40` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: layer.color }} />
                      </div>
                      <span className="flex-1 text-left text-sm text-white">{layer.label}</span>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isActive ? 'border-[#1E5EFF] bg-[#1E5EFF]' : 'border-white/30'
                      }`}>
                        {isActive && <Circle className="w-2.5 h-2.5 text-white fill-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 space-y-3">
        <button
          type="button"
          onClick={cycleBasemap}
          className="w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all"
        >
          <Navigation className="w-5 h-5 text-white" />
        </button>
        <button
          type="button"
          onClick={() => setFitSignal((s) => s + 1)}
          className="w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all"
        >
          <Maximize2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Weather Panel Toggle */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <button
          onClick={() => setShowWeatherPanel(!showWeatherPanel)}
          className="w-full bg-gradient-to-t from-black/80 to-transparent p-4 text-center"
        >
          <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-2"></div>
          <p className="text-xs text-white/60 uppercase tracking-wider">
            {showWeatherPanel ? 'Hide' : 'Show'} Weather Data
          </p>
        </button>

        <AnimatePresence>
          {showWeatherPanel && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-black/90 backdrop-blur-xl border-t border-white/20 p-6"
            >
              <h3 className="text-sm text-white/60 uppercase tracking-wider mb-4">Live Weather</h3>
              {weatherError ? (
                <p className="text-xs text-red-400 mb-3">{weatherError}</p>
              ) : null}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">Rainfall</div>
                  <div className="text-2xl text-[#1E5EFF]">
                    {weatherLoading ? "…" : `${weather.rainfall}mm`}
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    {pinnedCoords ? "OpenWeather at pin" : "Recent average"}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">Temperature</div>
                  <div className="text-2xl text-[#FF7A00]">
                    {weatherLoading ? "…" : `${weather.temp}°C`}
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    Feels like {weatherLoading ? "…" : `${weather.feels}°C`}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">Humidity</div>
                  <div className="text-2xl text-white">{weatherLoading ? "…" : `${weather.humidity}%`}</div>
                  <div className="text-xs text-white/50 mt-1">Live</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">Wind</div>
                  <div className="text-2xl text-[#22C55E]">{weatherLoading ? "…" : `${weather.wind}km/h`}</div>
                  <div className="text-xs text-white/50 mt-1">{weather.windDir} Direction</div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-xs text-white/60 mb-3 uppercase tracking-wider">7-Day Forecast</div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {forecast.map((day) => (
                    <div key={day.day} className="flex-shrink-0 text-center">
                      <div className="text-xs text-white/60 mb-2">{day.day}</div>
                      <div className="w-10 h-10 rounded-lg bg-[#1E5EFF]/20 flex items-center justify-center mb-2">
                        <CloudRain className="w-5 h-5 text-[#1E5EFF]" />
                      </div>
                      <div className="text-xs text-white">{day.temp}°</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
