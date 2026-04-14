import { useState } from "react";
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

interface InteractiveMapProps {
  onBack: () => void;
}

export default function InteractiveMap({ onBack }: InteractiveMapProps) {
  const [showLayers, setShowLayers] = useState(false);
  const [activeLayers, setActiveLayers] = useState<string[]>(['weather']);
  const [showWeatherPanel, setShowWeatherPanel] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#0B1F3A] relative overflow-hidden">
      {/* Map Background - Simulated */}
      <div className="absolute inset-0">
        <div className="w-full h-full bg-gradient-to-br from-[#0a1f35] via-[#0f2d4a] to-[#1a3a52]">
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(30, 94, 255, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(30, 94, 255, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          ></div>

          {/* Simulated map markers and zones */}
          <div className="absolute inset-0">
            {/* High risk zone */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.4 }}
              transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              className="absolute top-1/4 left-1/3 w-32 h-32 bg-[#EF4444] rounded-full blur-3xl"
            ></motion.div>

            {/* Medium risk zone */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.3 }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
              className="absolute top-1/2 right-1/4 w-40 h-40 bg-[#FF7A00] rounded-full blur-3xl"
            ></motion.div>

            {/* Safe zone */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.2 }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", delay: 1 }}
              className="absolute bottom-1/4 left-1/2 w-36 h-36 bg-[#22C55E] rounded-full blur-3xl"
            ></motion.div>

            {/* Location markers */}
            {[...Array(8)].map((_, i) => (
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
                  <div className="w-3 h-3 bg-[#1E5EFF] rounded-full animate-ping absolute"></div>
                  <div className="w-3 h-3 bg-[#1E5EFF] rounded-full border-2 border-white"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
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
        <button className="w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all">
          <Navigation className="w-5 h-5 text-white" />
        </button>
        <button className="w-12 h-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all">
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

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">Rainfall</div>
                  <div className="text-2xl text-[#1E5EFF]">45mm</div>
                  <div className="text-xs text-white/50 mt-1">Last 6 hours</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">Temperature</div>
                  <div className="text-2xl text-[#FF7A00]">28°C</div>
                  <div className="text-xs text-white/50 mt-1">Feels like 31°C</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">Humidity</div>
                  <div className="text-2xl text-white">78%</div>
                  <div className="text-xs text-white/50 mt-1">High</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-white/60 mb-1 uppercase tracking-wider">Wind</div>
                  <div className="text-2xl text-[#22C55E]">12km/h</div>
                  <div className="text-xs text-white/50 mt-1">NE Direction</div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-xs text-white/60 mb-3 uppercase tracking-wider">7-Day Forecast</div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                    <div key={day} className="flex-shrink-0 text-center">
                      <div className="text-xs text-white/60 mb-2">{day}</div>
                      <div className="w-10 h-10 rounded-lg bg-[#1E5EFF]/20 flex items-center justify-center mb-2">
                        <CloudRain className="w-5 h-5 text-[#1E5EFF]" />
                      </div>
                      <div className="text-xs text-white">{20 + i}°</div>
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
