import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Globe,
  Bell,
  AlertTriangle,
  Activity,
  Droplets,
  Building2,
  Users,
  TrendingUp,
  MapPin,
  Layers,
  Monitor
} from "lucide-react";
import PakistanMapView, { type MapPoint } from "./maps/PakistanMapView";
import { apiGet, apiUrl, type DashboardSummary } from "@/lib/api";
import { useRealtimePoll } from "@/lib/useRealtime";

interface WebDashboardProps {
  onBackToMobile: () => void;
}

function parsePoint(g: unknown): { lat: number; lng: number } | null {
  if (!g || typeof g !== "object") return null;
  const gj = g as { type?: string; coordinates?: [number, number] };
  if (gj.type === "Point" && gj.coordinates?.length === 2) {
    return { lat: gj.coordinates[1], lng: gj.coordinates[0] };
  }
  return null;
}

function formatPop(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export default function WebDashboard({ onBackToMobile }: WebDashboardProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [lastUpd, setLastUpd] = useState<string>("—");

  const [locations, setLocations] = useState<MapPoint[]>([]);
  const [infrastructure, setInfrastructure] = useState<MapPoint[]>([]);
  const [disasters, setDisasters] = useState<MapPoint[]>([]);
  const [heat, setHeat] = useState<{ lat: number; lng: number; v: number }[]>([]);

  const load = useCallback(async () => {
    try {
      const d = await apiGet<DashboardSummary>("/api/v1/dashboard/summary");
      setSummary(d);
      setLastUpd(new Date().toLocaleTimeString());

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
          .slice(0, 80)
          .map((d) => {
            const p = parsePoint(d.geojson);
            if (!p) return null;
            return {
              id: d.id,
              lat: p.lat,
              lng: p.lng,
              label: d.type,
              meta: d.description || "",
            } as MapPoint;
          })
          .filter(Boolean) as MapPoint[],
      );

      const wx = await apiGet<
        { rainfall_mm: string | null; location_id: string | null }[]
      >("/api/v1/weather/latest");
      const pts: { lat: number; lng: number; v: number }[] = [];
      for (const row of wx.slice(0, 30)) {
        const r = row.rainfall_mm != null ? Number(row.rainfall_mm) : 0;
        const lc = locs.find((l) => l.id === row.location_id);
        const p = parsePoint(lc?.centroid_geojson);
        if (p) pts.push({ lat: p.lat, lng: p.lng, v: r });
      }
      setHeat(pts);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimePoll(load, 45_000);

  const activeAlerts = summary?.alerts?.slice(0, 6) ?? [];
  const monitoredZones = summary?.zones?.slice(0, 8) ?? [];
  const national = summary?.nationalRisk ?? 68;
  const m = summary?.metrics;

  const mapMemo = useMemo(
    () => (
      <PakistanMapView
        basemap="osm"
        activeLayers={["weather", "history", "infrastructure", "population"]}
        infrastructure={infrastructure}
        disasters={disasters}
        weatherHeat={heat}
        locations={locations}
        fitSignal={0}
      />
    ),
    [infrastructure, disasters, heat, locations],
  );

  const aiText = summary?.aiSuggestions?.[0] ??
    "High flood risk detected in Karachi Central. Recommend immediate deployment of emergency teams.";

  const activity = summary?.activity?.length
    ? summary.activity.map((a) => ({
        action: a.kind,
        location: a.detail,
        time: new Date(a.created_at).toLocaleString(),
      }))
    : [
        { action: "Alert triggered", location: "Karachi", time: "2 mins ago" },
        { action: "Data updated", location: "National", time: "5 mins ago" },
        { action: "Team deployed", location: "Lahore", time: "12 mins ago" },
      ];

  return (
    <div className="min-h-screen bg-[#0B1F3A] text-white">
      {/* Top Navigation Bar */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1E5EFF] to-[#FF7A00] rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg tracking-tight">NDMA GeoResilience Command System</h1>
                <p className="text-[10px] text-white/60 tracking-wider uppercase">Control Room Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-8">
              <span className="flex items-center gap-2 text-xs text-[#22C55E]">
                <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse"></span>
                SYSTEM OPERATIONAL
              </span>
              <span className="mx-2 text-white/20">|</span>
              <span className="text-xs text-white/60">Last Update: {lastUpd}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToMobile}
              className="px-4 h-9 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Mobile View</span>
            </button>
            <button className="relative w-9 h-9 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full text-[9px] flex items-center justify-center">
                {Math.min(99, activeAlerts.length || 3)}
              </span>
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-white/20">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1E5EFF] to-[#8B5CF6]"></div>
              <div className="text-xs">
                <div className="text-white">Admin User</div>
                <div className="text-white/60">NDMA HQ</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Alerts & Zones */}
        <div className="w-80 bg-black/20 backdrop-blur-sm border-r border-white/10 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Active Alerts */}
            <div>
              <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                Active Alerts ({activeAlerts.length || 3})
              </h2>
              <div className="space-y-2">
                {(activeAlerts.length ? activeAlerts : [
                  { severity: 'critical', type: 'Flash Flood', location_name: 'Karachi District', message: '' },
                  { severity: 'warning', type: 'Heavy Rainfall', location_name: 'Lahore', message: '' },
                  { severity: 'info', type: 'Monitoring', location_name: 'Islamabad', message: '' },
                ] as unknown as typeof activeAlerts).map((alert, i) => {
                  const sev = (alert as { severity: string }).severity;
                  const color = sev === 'critical' ? '#EF4444' : sev === 'warning' ? '#FF7A00' : '#1E5EFF';
                  const type = (alert as { type?: string }).type || 'Alert';
                  const loc = (alert as { location_name?: string | null }).location_name || 'National';
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }}></div>
                        <span className="text-xs uppercase tracking-wider" style={{ color }}>{sev}</span>
                      </div>
                      <div className="text-sm text-white mb-1">{type}</div>
                      <div className="flex items-center gap-1 text-xs text-white/60">
                        <MapPin className="w-3 h-3" />
                        {loc}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Monitored Zones */}
            <div>
              <h2 className="text-xs text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Monitored Zones ({monitoredZones.length || 24})
              </h2>
              <div className="space-y-2">
                {(monitoredZones.length ? monitoredZones : [
                  { name: 'Karachi Central', risk: '92', population: '2400000' },
                  { name: 'Lahore East', risk: '78', population: '1800000' },
                ]).map((zone, i) => {
                  const getRiskColor = (risk: number) => {
                    if (risk >= 80) return '#EF4444';
                    if (risk >= 60) return '#FF7A00';
                    if (risk >= 40) return '#FCD34D';
                    return '#22C55E';
                  };
                  const name = (zone as { name: string }).name;
                  const risk = Number((zone as { risk: string | null }).risk ?? 50);
                  const popRaw = Number((zone as { population: string }).population ?? 0);
                  const pop = popRaw ? formatPop(popRaw) : '—';
                  const color = getRiskColor(risk);

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">{name}</span>
                        <span className="text-lg tracking-tight" style={{ color }}>{risk}</span>
                      </div>
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                        <div className="h-full rounded-full transition-all" style={{ width: `${risk}%`, backgroundColor: color }}></div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/60">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {pop}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Map */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 z-0">{mapMemo}</div>

          {/* Map overlay info */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
            <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-xl p-3 pointer-events-auto">
              <div className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Current View</div>
              <div className="text-sm text-white">Pakistan - National Overview</div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Analytics */}
        <div className="w-96 bg-black/20 backdrop-blur-sm border-l border-white/10 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* National Risk Index */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-xs text-white/60 uppercase tracking-wider mb-3">National Risk Index</div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-4xl tracking-tight text-white">{national}</div>
                <div className="flex items-center gap-1 text-[#FF7A00] mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Live</span>
                </div>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${national}%` }}
                  transition={{ duration: 1.5 }}
                  className="h-full bg-gradient-to-r from-[#22C55E] via-[#FF7A00] to-[#EF4444]"
                ></motion.div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-[#1E5EFF]/20 border border-[#1E5EFF]/40 flex items-center justify-center mb-3">
                  <Droplets className="w-5 h-5 text-[#1E5EFF]" />
                </div>
                <div className="text-2xl text-white mb-1">{m ? `${m.avgRainfallMm}mm` : '45mm'}</div>
                <div className="text-xs text-white/60">Avg Rainfall</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                </div>
                <div className="text-2xl text-white mb-1">{m?.warnings ?? 12}</div>
                <div className="text-xs text-white/60">Warnings</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center mb-3">
                  <Building2 className="w-5 h-5 text-[#22C55E]" />
                </div>
                <div className="text-2xl text-white mb-1">{m?.infrastructure ?? 348}</div>
                <div className="text-xs text-white/60">Infrastructure</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-[#8B5CF6]" />
                </div>
                <div className="text-2xl text-white mb-1">{m ? formatPop(m.population) : '8.2M'}</div>
                <div className="text-xs text-white/60">Population</div>
              </motion.div>
            </div>

            {/* AI Decision Support */}
            <div className="bg-gradient-to-br from-[#1E5EFF]/20 to-[#8B5CF6]/20 border border-[#1E5EFF]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-[#1E5EFF]" />
                <h3 className="text-sm text-white">AI Decision Support</h3>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-white/80 leading-relaxed">
                  {aiText}
                </div>
                <div className="flex gap-2">
                  <a
                    className="flex-1 h-8 bg-[#1E5EFF] rounded-lg text-xs text-white uppercase tracking-wider hover:bg-[#1E5EFF]/80 transition-all flex items-center justify-center"
                    href={apiUrl("/api/v1/reports/pdf")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF
                  </a>
                  <button type="button" className="h-8 px-3 bg-white/10 border border-white/20 rounded-lg text-xs text-white hover:bg-white/20 transition-all">
                    Review
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {activity.map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-sm text-white mb-1">{item.action}</div>
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{item.location}</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
