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

interface WebDashboardProps {
  onBackToMobile: () => void;
}

export default function WebDashboard({ onBackToMobile }: WebDashboardProps) {
  const activeAlerts = [
    { location: 'Karachi Central', severity: 'critical', type: 'Flash Flood' },
    { location: 'Lahore East', severity: 'warning', type: 'Heavy Rainfall' },
    { location: 'Islamabad Zone-3', severity: 'info', type: 'Monitoring' }
  ];

  const monitoredZones = [
    { name: 'Karachi Central', risk: 92, population: '2.4M', status: 'critical' },
    { name: 'Lahore East', risk: 78, population: '1.8M', status: 'warning' },
    { name: 'Islamabad Zone-3', risk: 65, population: '890K', status: 'moderate' },
    { name: 'Rawalpindi North', risk: 54, population: '1.2M', status: 'moderate' },
    { name: 'Peshawar District', risk: 43, population: '780K', status: 'low' }
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
              <span className="text-xs text-white/60">Last Update: 2 mins ago</span>
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
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full text-[9px] flex items-center justify-center">3</span>
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
                Active Alerts (3)
              </h2>
              <div className="space-y-2">
                {activeAlerts.map((alert, i) => {
                  const color = alert.severity === 'critical' ? '#EF4444' : alert.severity === 'warning' ? '#FF7A00' : '#1E5EFF';
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
                        <span className="text-xs uppercase tracking-wider" style={{ color }}>{alert.severity}</span>
                      </div>
                      <div className="text-sm text-white mb-1">{alert.type}</div>
                      <div className="flex items-center gap-1 text-xs text-white/60">
                        <MapPin className="w-3 h-3" />
                        {alert.location}
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
                Monitored Zones (24)
              </h2>
              <div className="space-y-2">
                {monitoredZones.map((zone, i) => {
                  const getRiskColor = (risk: number) => {
                    if (risk >= 80) return '#EF4444';
                    if (risk >= 60) return '#FF7A00';
                    if (risk >= 40) return '#FCD34D';
                    return '#22C55E';
                  };
                  const color = getRiskColor(zone.risk);

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">{zone.name}</span>
                        <span className="text-lg tracking-tight" style={{ color }}>{zone.risk}</span>
                      </div>
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                        <div className="h-full rounded-full transition-all" style={{ width: `${zone.risk}%`, backgroundColor: color }}></div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/60">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {zone.population}
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
          {/* Map simulation */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f35] via-[#0f2d4a] to-[#1a3a52]">
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(30, 94, 255, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(30, 94, 255, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}
            ></div>

            {/* Risk zones */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.4 }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
              className="absolute top-1/4 left-1/3 w-64 h-64 bg-[#EF4444] rounded-full blur-3xl"
            ></motion.div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.3 }}
              transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
              className="absolute top-1/2 right-1/4 w-80 h-80 bg-[#FF7A00] rounded-full blur-3xl"
            ></motion.div>

            {/* Location markers */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: "spring" }}
                className="absolute"
                style={{
                  top: `${Math.random() * 80 + 10}%`,
                  left: `${Math.random() * 80 + 10}%`
                }}
              >
                <div className="relative">
                  <div className="w-4 h-4 bg-[#1E5EFF] rounded-full animate-ping absolute"></div>
                  <div className="w-4 h-4 bg-[#1E5EFF] rounded-full border-2 border-white"></div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Map overlay info */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
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
                <div className="text-4xl tracking-tight text-white">68</div>
                <div className="flex items-center gap-1 text-[#FF7A00] mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">+12%</span>
                </div>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '68%' }}
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
                <div className="text-2xl text-white mb-1">45mm</div>
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
                <div className="text-2xl text-white mb-1">12</div>
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
                <div className="text-2xl text-white mb-1">348</div>
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
                <div className="text-2xl text-white mb-1">8.2M</div>
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
                  High flood risk detected in Karachi Central. Recommend immediate deployment of emergency teams.
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 h-8 bg-[#1E5EFF] rounded-lg text-xs text-white uppercase tracking-wider hover:bg-[#1E5EFF]/80 transition-all">
                    Deploy
                  </button>
                  <button className="h-8 px-3 bg-white/10 border border-white/20 rounded-lg text-xs text-white hover:bg-white/20 transition-all">
                    Review
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-xs text-white/60 uppercase tracking-wider mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {[
                  { action: 'Alert triggered', location: 'Karachi', time: '2 mins ago' },
                  { action: 'Data updated', location: 'National', time: '5 mins ago' },
                  { action: 'Team deployed', location: 'Lahore', time: '12 mins ago' }
                ].map((item, i) => (
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
