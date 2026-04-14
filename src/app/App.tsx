import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import MobileHome from "./components/MobileHome";
import InteractiveMap from "./components/InteractiveMap";
import AlertsScreen from "./components/AlertsScreen";
import RiskDashboard from "./components/RiskDashboard";
import RiskCalculator from "./components/RiskCalculator";
import WebDashboard from "./components/WebDashboard";
import { Monitor, Smartphone } from "lucide-react";

type Screen = 'home' | 'map' | 'weather' | 'risk' | 'calculator' | 'alerts' | 'field' | 'reports' | 'search' | 'web';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [viewMode, setViewMode] = useState<'mobile' | 'web'>('mobile');

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const handleBack = () => {
    setCurrentScreen('home');
  };

  const toggleView = () => {
    if (viewMode === 'mobile') {
      setViewMode('web');
      setCurrentScreen('web');
    } else {
      setViewMode('mobile');
      setCurrentScreen('home');
    }
  };

  return (
    <div className="size-full bg-[#0B1F3A] relative overflow-hidden">
      {/* View Toggle Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={toggleView}
        className="fixed top-4 right-4 z-50 px-4 h-11 bg-black/60 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-black/80 transition-all flex items-center gap-2 shadow-lg"
      >
        {viewMode === 'mobile' ? (
          <>
            <Monitor className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Web View</span>
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider">Mobile View</span>
          </>
        )}
      </motion.button>

      <AnimatePresence mode="wait">
        {viewMode === 'web' ? (
          <motion.div
            key="web"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="size-full"
          >
            <WebDashboard onBackToMobile={() => {
              setViewMode('mobile');
              setCurrentScreen('home');
            }} />
          </motion.div>
        ) : (
          <motion.div
            key="mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="size-full"
          >
            {currentScreen === 'home' && (
              <MobileHome onNavigate={handleNavigate} />
            )}
            {currentScreen === 'map' && (
              <InteractiveMap onBack={handleBack} />
            )}
            {currentScreen === 'alerts' && (
              <AlertsScreen onBack={handleBack} />
            )}
            {currentScreen === 'risk' && (
              <RiskDashboard onBack={handleBack} />
            )}
            {currentScreen === 'calculator' && (
              <RiskCalculator onBack={handleBack} />
            )}
            {(currentScreen === 'weather' || currentScreen === 'field' || currentScreen === 'reports' || currentScreen === 'search') && (
              <MobileHome onNavigate={handleNavigate} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}