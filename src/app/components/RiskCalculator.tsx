import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Calculator, Droplets, Mountain, Building2, TrendingUp } from "lucide-react";

interface RiskCalculatorProps {
  onBack: () => void;
}

export default function RiskCalculator({ onBack }: RiskCalculatorProps) {
  const [rainfall, setRainfall] = useState(50);
  const [terrain, setTerrain] = useState(50);
  const [infrastructure, setInfrastructure] = useState(50);
  const [showResult, setShowResult] = useState(false);

  const calculateRisk = () => {
    // Simple weighted calculation
    return Math.round((rainfall * 0.4 + terrain * 0.3 + infrastructure * 0.3));
  };

  const riskScore = calculateRisk();
  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: 'CRITICAL', color: '#EF4444' };
    if (score >= 60) return { label: 'HIGH', color: '#FF7A00' };
    if (score >= 40) return { label: 'MODERATE', color: '#FCD34D' };
    return { label: 'LOW', color: '#22C55E' };
  };

  const riskLevel = getRiskLevel(riskScore);

  const handleCalculate = () => {
    setShowResult(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3A] via-[#1a1f3a] to-[#2a1f3a] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#8B5CF6] rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl text-white tracking-tight">Risk Calculator</h1>
            <p className="text-xs text-white/60">AI-powered risk assessment</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-[#8B5CF6]" />
          </div>
        </div>

        {/* Input Parameters */}
        <div className="space-y-6 mb-6">
          {/* Rainfall */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#1E5EFF]/20 border border-[#1E5EFF]/40 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-[#1E5EFF]" />
              </div>
              <div className="flex-1">
                <h3 className="text-white">Rainfall Intensity</h3>
                <p className="text-xs text-white/60">Current and forecasted precipitation</p>
              </div>
              <div className="text-xl text-[#1E5EFF]">{rainfall}mm</div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={rainfall}
              onChange={(e) => setRainfall(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1E5EFF ${rainfall}%, rgba(255,255,255,0.1) ${rainfall}%)`
              }}
            />
            <div className="flex justify-between mt-2 text-[10px] text-white/50">
              <span>0mm</span>
              <span>50mm</span>
              <span>100mm+</span>
            </div>
          </motion.div>

          {/* Terrain Condition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/20 border border-[#FF7A00]/40 flex items-center justify-center">
                <Mountain className="w-5 h-5 text-[#FF7A00]" />
              </div>
              <div className="flex-1">
                <h3 className="text-white">Terrain Condition</h3>
                <p className="text-xs text-white/60">Slope, drainage, and soil quality</p>
              </div>
              <div className="text-xl text-[#FF7A00]">{terrain}%</div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={terrain}
              onChange={(e) => setTerrain(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FF7A00 ${terrain}%, rgba(255,255,255,0.1) ${terrain}%)`
              }}
            />
            <div className="flex justify-between mt-2 text-[10px] text-white/50">
              <span>Stable</span>
              <span>Moderate</span>
              <span>Unstable</span>
            </div>
          </motion.div>

          {/* Infrastructure Condition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div className="flex-1">
                <h3 className="text-white">Infrastructure Quality</h3>
                <p className="text-xs text-white/60">Structural integrity and age</p>
              </div>
              <div className="text-xl text-[#22C55E]">{infrastructure}%</div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={infrastructure}
              onChange={(e) => setInfrastructure(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #22C55E ${infrastructure}%, rgba(255,255,255,0.1) ${infrastructure}%)`
              }}
            />
            <div className="flex justify-between mt-2 text-[10px] text-white/50">
              <span>Excellent</span>
              <span>Fair</span>
              <span>Poor</span>
            </div>
          </motion.div>
        </div>

        {/* Calculate Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={handleCalculate}
          className="w-full h-14 bg-gradient-to-r from-[#1E5EFF] to-[#8B5CF6] rounded-2xl text-white uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-[#1E5EFF]/20"
        >
          Calculate Risk Score
        </motion.button>

        {/* Results */}
        {showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="mt-6 space-y-4"
          >
            {/* Risk Score Gauge */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-xs text-white/60 uppercase tracking-wider mb-3">Risk Assessment Result</div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="relative w-40 h-40 mx-auto mb-4"
              >
                <svg className="transform -rotate-90" width="160" height="160">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="12"
                  />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke={riskLevel.color}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - riskScore / 100) }}
                    transition={{ duration: 1.5, delay: 0.3 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl tracking-tight" style={{ color: riskLevel.color }}>{riskScore}</div>
                  <div className="text-xs text-white/60 uppercase tracking-wider">Score</div>
                </div>
              </motion.div>
              <div
                className="inline-block px-4 py-2 rounded-xl text-sm uppercase tracking-wider"
                style={{ backgroundColor: `${riskLevel.color}20`, color: riskLevel.color }}
              >
                {riskLevel.label} RISK
              </div>
            </div>

            {/* Predictions */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-xs text-white/60 mb-2 uppercase tracking-wider">Flood Probability</div>
                <div className="text-2xl text-[#1E5EFF] mb-1">{Math.min(riskScore + 10, 95)}%</div>
                <div className="text-[10px] text-white/50">Next 48 hours</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-xs text-white/60 mb-2 uppercase tracking-wider">Damage Estimate</div>
                <div className="text-2xl text-[#FF7A00] mb-1">₨{(riskScore * 5).toFixed(0)}M</div>
                <div className="text-[10px] text-white/50">Potential loss</div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gradient-to-br from-[#1E5EFF]/20 to-[#8B5CF6]/20 backdrop-blur-sm border border-[#1E5EFF]/30 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-5 h-5 text-[#1E5EFF]" />
                <h3 className="text-white">AI Recommendations</h3>
              </div>
              <ul className="space-y-2 text-sm text-white/80">
                {riskScore >= 80 && (
                  <>
                    <li className="flex gap-2">
                      <span className="text-[#EF4444]">•</span>
                      <span>Immediate evacuation of high-risk zones</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#EF4444]">•</span>
                      <span>Deploy emergency response teams</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#EF4444]">•</span>
                      <span>Activate disaster management protocol</span>
                    </li>
                  </>
                )}
                {riskScore >= 60 && riskScore < 80 && (
                  <>
                    <li className="flex gap-2">
                      <span className="text-[#FF7A00]">•</span>
                      <span>Increase monitoring frequency</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#FF7A00]">•</span>
                      <span>Prepare evacuation routes</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#FF7A00]">•</span>
                      <span>Alert local authorities</span>
                    </li>
                  </>
                )}
                {riskScore < 60 && (
                  <>
                    <li className="flex gap-2">
                      <span className="text-[#22C55E]">•</span>
                      <span>Continue routine monitoring</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#22C55E]">•</span>
                      <span>Maintain current alert status</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
