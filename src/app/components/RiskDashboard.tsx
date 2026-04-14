import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, TrendingUp, AlertTriangle, Building2, Users, Droplets, Activity } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useRealtimePoll } from "@/lib/useRealtime";

interface RiskDashboardProps {
  onBack: () => void;
}

type Zone = {
  name: string;
  risk: number;
  trend: 'up' | 'down' | 'stable';
  population: string;
  infrastructure: string;
};

export default function RiskDashboard({ onBack }: RiskDashboardProps) {
  const [national, setNational] = useState(68);
  const [avgRain, setAvgRain] = useState(45);
  const [warnings, setWarnings] = useState(12);
  const [infra, setInfra] = useState(348);
  const [pop, setPop] = useState("8.2M");
  const [riskZones, setRiskZones] = useState<Zone[]>([
    { name: 'Karachi Central', risk: 92, trend: 'up', population: '2.4M', infrastructure: 'Critical' },
    { name: 'Lahore East', risk: 78, trend: 'up', population: '1.8M', infrastructure: 'High' },
    { name: 'Islamabad Zone-3', risk: 65, trend: 'stable', population: '890K', infrastructure: 'Moderate' },
    { name: 'Rawalpindi North', risk: 54, trend: 'down', population: '1.2M', infrastructure: 'Moderate' },
    { name: 'Peshawar District', risk: 43, trend: 'stable', population: '780K', infrastructure: 'Low' }
  ]);
  const [prediction, setPrediction] = useState(
    "High flood risk detected in Karachi Central and Lahore East regions. Rainfall intensity expected to increase by 35% in next 24 hours. Immediate resource deployment recommended.",
  );

  const load = async () => {
    try {
      const s = await apiGet<{
        nationalRisk: number;
        metrics: { avgRainfallMm: number; warnings: number; infrastructure: number; population: number };
        zones: { name: string; risk: string | null; population: string }[];
      }>("/api/v1/dashboard/summary");
      setNational(s.nationalRisk);
      setAvgRain(s.metrics.avgRainfallMm);
      setWarnings(s.metrics.warnings);
      setInfra(s.metrics.infrastructure);
      setPop(
        s.metrics.population >= 1_000_000
          ? `${(s.metrics.population / 1_000_000).toFixed(1)}M`
          : `${Math.round(s.metrics.population / 1000)}K`,
      );
      setRiskZones(
        s.zones.map((z) => {
          const r = z.risk != null ? Number(z.risk) : 50;
          const trend: Zone['trend'] = r >= 70 ? 'up' : r >= 50 ? 'stable' : 'down';
          const infraLabel = r >= 80 ? 'Critical' : r >= 60 ? 'High' : r >= 45 ? 'Moderate' : 'Low';
          const popn = Number(z.population);
          const popStr = popn >= 1_000_000 ? `${(popn / 1_000_000).toFixed(1)}M` : `${Math.round(popn / 1000)}K`;
          return {
            name: z.name,
            risk: r,
            trend,
            population: popStr,
            infrastructure: infraLabel,
          };
        }),
      );
      const pred = await apiGet<{ predictions: { location: string; floodRisk: number; note: string }[] }>(
        "/api/v1/ai/predictions",
      );
      if (pred.predictions?.length) {
        const top = pred.predictions.slice(0, 2).map((p) => `${p.location} (~${p.floodRisk})`).join(", ");
        setPrediction(`48h heuristic: elevated focus on ${top}. ${pred.predictions[0]?.note ?? ""}`);
      }
    } catch {
      /* offline */
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useRealtimePoll(load, 60_000);

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return '#EF4444';
    if (risk >= 60) return '#FF7A00';
    if (risk >= 40) return '#FCD34D';
    return '#22C55E';
  };

  const getRiskLabel = (risk: number) => {
    if (risk >= 80) return 'CRITICAL';
    if (risk >= 60) return 'HIGH';
    if (risk >= 40) return 'MODERATE';
    return 'LOW';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3A] via-[#1a1f3a] to-[#2a1f3a] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-[#EF4444] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FF7A00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="sticky top-0 bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onBack}
              className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl text-white tracking-tight">Risk Dashboard</h1>
              <p className="text-xs text-white/60">AI-powered risk assessment</p>
            </div>
          </div>

          {/* National Overview */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <div className="text-xs text-white/60 uppercase tracking-wider mb-3">National Risk Index</div>
            <div className="flex items-end gap-2 mb-3">
              <div className="text-3xl text-white tracking-tight">{national}</div>
              <div className="flex items-center gap-1 text-[#FF7A00] mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Live</span>
              </div>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${national}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-[#22C55E] via-[#FCD34D] via-[#FF7A00] to-[#EF4444]"
              ></motion.div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-white/50">
              <span>LOW</span>
              <span>MODERATE</span>
              <span>HIGH</span>
              <span>CRITICAL</span>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-sm text-white/60 uppercase tracking-wider mb-3">Key Indicators</h2>
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1E5EFF]/20 border border-[#1E5EFF]/40 flex items-center justify-center mb-3">
                  <Droplets className="w-5 h-5 text-[#1E5EFF]" />
                </div>
                <div className="text-2xl text-white mb-1">{avgRain}mm</div>
                <div className="text-xs text-white/60">Avg Rainfall</div>
                <div className="text-[10px] text-[#1E5EFF] mt-1">Last 24h</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                </div>
                <div className="text-2xl text-white mb-1">{warnings}</div>
                <div className="text-xs text-white/60">Active Warnings</div>
                <div className="text-[10px] text-[#EF4444] mt-1">Requires action</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center mb-3">
                  <Building2 className="w-5 h-5 text-[#22C55E]" />
                </div>
                <div className="text-2xl text-white mb-1">{infra}</div>
                <div className="text-xs text-white/60">Infrastructure</div>
                <div className="text-[10px] text-[#22C55E] mt-1">Monitored assets</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-[#8B5CF6]" />
                </div>
                <div className="text-2xl text-white mb-1">{pop}</div>
                <div className="text-xs text-white/60">Population</div>
                <div className="text-[10px] text-[#8B5CF6] mt-1">At-risk zones</div>
              </motion.div>
            </div>
          </div>

          {/* High Risk Zones */}
          <div>
            <h2 className="text-sm text-white/60 uppercase tracking-wider mb-3">High-Risk Zones</h2>
            <div className="space-y-3">
              {riskZones.map((zone, index) => {
                const color = getRiskColor(zone.risk);
                const label = getRiskLabel(zone.risk);

                return (
                  <motion.div
                    key={zone.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white mb-1">{zone.name}</h3>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider"
                            style={{ backgroundColor: `${color}20`, color }}
                          >
                            {label}
                          </span>
                          <span className="text-xs text-white/50">
                            {zone.trend === 'up' ? '↑' : zone.trend === 'down' ? '↓' : '→'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl tracking-tight" style={{ color }}>{zone.risk}</div>
                        <div className="text-[10px] text-white/50 uppercase">Score</div>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${zone.risk}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      ></motion.div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-white/60">
                        <Users className="w-4 h-4" />
                        <span>{zone.population}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <Building2 className="w-4 h-4" />
                        <span>{zone.infrastructure}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* AI Prediction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-gradient-to-br from-[#1E5EFF]/20 to-[#8B5CF6]/20 backdrop-blur-sm border border-[#1E5EFF]/30 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#1E5EFF] flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white">AI Prediction</h3>
                <p className="text-xs text-white/60">Next 48 hours</p>
              </div>
            </div>
            <p className="text-sm text-white/80 leading-relaxed mb-3">
              {prediction}
            </p>
            <button className="w-full h-10 bg-[#1E5EFF] rounded-xl text-white text-sm uppercase tracking-wider hover:bg-[#1E5EFF]/80 transition-all">
              View Full Analysis
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
