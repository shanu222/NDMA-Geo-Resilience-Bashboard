import { motion } from "motion/react";
import { ArrowLeft, AlertTriangle, AlertCircle, Info, Filter, MapPin, Clock } from "lucide-react";

interface AlertsScreenProps {
  onBack: () => void;
}

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  location: string;
  time: string;
  description: string;
}

export default function AlertsScreen({ onBack }: AlertsScreenProps) {
  const alerts: Alert[] = [
    {
      id: '1',
      severity: 'critical',
      title: 'Flash Flood Warning',
      location: 'Karachi District',
      time: '15 mins ago',
      description: 'Heavy rainfall detected. Immediate evacuation recommended for low-lying areas.'
    },
    {
      id: '2',
      severity: 'critical',
      title: 'Infrastructure Failure Risk',
      location: 'Lahore Bridge-7',
      time: '32 mins ago',
      description: 'Structural integrity compromised. Deploy inspection team immediately.'
    },
    {
      id: '3',
      severity: 'warning',
      title: 'Rainfall Alert',
      location: 'Islamabad Region',
      time: '1 hour ago',
      description: 'Moderate to heavy rainfall expected in next 24-48 hours.'
    },
    {
      id: '4',
      severity: 'warning',
      title: 'High Water Levels',
      location: 'Indus River Basin',
      time: '2 hours ago',
      description: 'River water levels approaching warning threshold.'
    },
    {
      id: '5',
      severity: 'info',
      title: 'System Update',
      location: 'National',
      time: '3 hours ago',
      description: 'New satellite imagery available for all monitored zones.'
    },
    {
      id: '6',
      severity: 'warning',
      title: 'Landslide Risk',
      location: 'Murree Hills',
      time: '4 hours ago',
      description: 'Unstable terrain detected. Monitor continuously.'
    }
  ];

  const getSeverityConfig = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          icon: AlertTriangle,
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          label: 'CRITICAL'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          color: '#FF7A00',
          bgColor: 'rgba(255, 122, 0, 0.1)',
          borderColor: 'rgba(255, 122, 0, 0.3)',
          label: 'WARNING'
        };
      case 'info':
        return {
          icon: Info,
          color: '#1E5EFF',
          bgColor: 'rgba(30, 94, 255, 0.1)',
          borderColor: 'rgba(30, 94, 255, 0.3)',
          label: 'INFO'
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3A] via-[#1a1f3a] to-[#2a1f3a] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#EF4444] rounded-full blur-3xl animate-pulse"></div>
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
              <h1 className="text-xl text-white tracking-tight">Active Alerts</h1>
              <p className="text-xs text-white/60">Real-time monitoring system</p>
            </div>
            <button className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all">
              <Filter className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#EF4444]/10 backdrop-blur-sm border border-[#EF4444]/30 rounded-xl p-3 text-center">
              <div className="text-lg text-[#EF4444]">2</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Critical</div>
            </div>
            <div className="bg-[#FF7A00]/10 backdrop-blur-sm border border-[#FF7A00]/30 rounded-xl p-3 text-center">
              <div className="text-lg text-[#FF7A00]">3</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Warnings</div>
            </div>
            <div className="bg-[#1E5EFF]/10 backdrop-blur-sm border border-[#1E5EFF]/30 rounded-xl p-3 text-center">
              <div className="text-lg text-[#1E5EFF]">1</div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider">Info</div>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="p-4 space-y-3">
          {alerts.map((alert, index) => {
            const config = getSeverityConfig(alert.severity);
            const Icon = config.icon;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="bg-white/5 backdrop-blur-sm border rounded-2xl overflow-hidden hover:bg-white/10 transition-all"
                style={{ borderColor: config.borderColor }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: config.bgColor, borderColor: config.borderColor, border: '1px solid' }}
                    >
                      <Icon className="w-6 h-6" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider"
                          style={{ backgroundColor: config.bgColor, color: config.color }}
                        >
                          {config.label}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-white/50">
                          <Clock className="w-3 h-3" />
                          {alert.time}
                        </div>
                      </div>
                      <h3 className="text-white mb-1 truncate">{alert.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-white/60">
                        <MapPin className="w-3 h-3" />
                        {alert.location}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{alert.description}</p>

                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 h-9 rounded-lg bg-white/10 border border-white/20 text-xs text-white hover:bg-white/20 transition-all uppercase tracking-wider">
                      View Details
                    </button>
                    <button
                      className="h-9 px-4 rounded-lg text-xs text-white hover:opacity-80 transition-all uppercase tracking-wider"
                      style={{ backgroundColor: config.color }}
                    >
                      Respond
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
