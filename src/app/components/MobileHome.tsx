import { motion } from "motion/react";
import {
  MapPin,
  Map,
  Activity,
  Calculator,
  AlertTriangle,
  FileText,
  Search,
  Zap,
  Globe,
  Bell
} from "lucide-react";

interface MobileHomeProps {
  onNavigate: (screen: string) => void;
}

export default function MobileHome({ onNavigate }: MobileHomeProps) {
  const menuItems = [
    { id: "search", icon: Search, label: "Search Location", color: "#1E5EFF" },
    { id: "map", icon: Map, label: "Live Map", color: "#22C55E" },
    { id: "weather", icon: Activity, label: "Weather", color: "#FF7A00" },
    { id: "risk", icon: Zap, label: "Risk Dashboard", color: "#EF4444" },
    { id: "calculator", icon: Calculator, label: "Risk Calculator", color: "#8B5CF6" },
    { id: "alerts", icon: AlertTriangle, label: "Alerts", color: "#EF4444" },
    { id: "field", icon: Globe, label: "Field Report", color: "#22C55E" },
    { id: "reports", icon: FileText, label: "Reports", color: "#1E5EFF" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3A] via-[#1a1f3a] to-[#2a1f3a] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#1E5EFF] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FF7A00] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1E5EFF] to-[#FF7A00] rounded-lg flex items-center justify-center">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl tracking-tight text-white">NDMA</h1>
                <p className="text-xs text-white/60 tracking-wider uppercase">GeoResilience Command</p>
              </div>
            </div>
            <button className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center relative">
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full text-[10px] flex items-center justify-center">3</span>
            </button>
          </div>

          {/* Status Bar */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/60 tracking-wider uppercase">System Status</span>
              <span className="flex items-center gap-1 text-xs text-[#22C55E]">
                <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse"></span>
                OPERATIONAL
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="text-center">
                <div className="text-lg text-white tracking-tight">24</div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider">Active Zones</div>
              </div>
              <div className="text-center">
                <div className="text-lg text-[#FF7A00]">12</div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-lg text-[#EF4444]">3</div>
                <div className="text-[10px] text-white/60 uppercase tracking-wider">Critical</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Menu Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h2 className="text-sm text-white/60 uppercase tracking-wider mb-4">Command Center</h2>
          <div className="grid grid-cols-2 gap-4">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.4 }}
                  onClick={() => onNavigate(item.id)}
                  className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${item.color}20`, border: `1px solid ${item.color}40` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <h3 className="text-sm text-white mb-1">{item.label}</h3>
                  <div className="w-8 h-0.5 bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Access */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-sm text-white/60 uppercase tracking-wider mb-4">Quick Access</h2>
          <button
            onClick={() => onNavigate('map')}
            className="w-full bg-gradient-to-r from-[#1E5EFF] to-[#1E5EFF]/80 rounded-2xl p-5 text-left relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <h3 className="text-white mb-1">Launch Interactive Map</h3>
                <p className="text-xs text-white/70">Real-time monitoring and analysis</p>
              </div>
              <Map className="w-8 h-8 text-white/80" />
            </div>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
