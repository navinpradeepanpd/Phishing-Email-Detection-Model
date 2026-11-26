import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuroraBackground } from './components/ui/AuroraBackground';
import { GlassTabs } from './components/ui/GlassTabs';
import { ToggleSwitch } from './components/ui/ToggleSwitch';
import { Skeleton } from './components/ui/Skeleton';
import {
  ShieldCheck,
  Zap,
  UploadCloud,
  Activity,
  History,
  Palette,
  Cpu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load view components for optimal bundle splitting and Lighthouse performance
const DetectionStudio = lazy(() =>
  import('./pages/DetectionStudio').then((m) => ({ default: m.DetectionStudio }))
);
const BatchScanner = lazy(() =>
  import('./pages/BatchScanner').then((m) => ({ default: m.BatchScanner }))
);
const MetricsDashboard = lazy(() =>
  import('./pages/MetricsDashboard').then((m) => ({ default: m.MetricsDashboard }))
);
const AuditHistory = lazy(() =>
  import('./pages/AuditHistory').then((m) => ({ default: m.AuditHistory }))
);
const HowItWorks = lazy(() =>
  import('./pages/HowItWorks').then((m) => ({ default: m.HowItWorks }))
);
const DesignShowcase = lazy(() =>
  import('./pages/DesignShowcase').then((m) => ({ default: m.DesignShowcase }))
);

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'studio' | 'batch' | 'metrics' | 'history' | 'pipeline' | 'design'>('studio');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isBooting, setIsBooting] = useState<boolean>(true);

  // Boot intro animation under 1.5 seconds (1200ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 1100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = (val: boolean) => {
    setIsDark(val);
    if (val) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <>
      {/* Boot / Intro Animation Overlay (<1.5s) */}
      <AnimatePresence>
        {isBooting && (
          <motion.div
            key="boot-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center space-y-4"
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 p-0.5 shadow-[0_0_35px_rgba(99,102,241,0.5)]">
                <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold tracking-tight">PhishGuard AI</h1>
                <p className="text-xs text-slate-400 font-mono mt-1">Initializing Champion Pipeline...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuroraBackground className="text-slate-800 dark:text-slate-100 min-h-screen flex flex-col">
        {/* Sticky Glass Navbar */}
        <header className="sticky top-0 z-40 border-b border-white/60 dark:border-white/10 backdrop-blur-glass bg-white/45 dark:bg-slate-950/45 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
            {/* Logo & Brand */}
            <div
              onClick={() => setActiveTab('studio')}
              className="flex items-center gap-3 cursor-pointer group select-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-lg text-slate-900 dark:text-white">
                    PhishGuard
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                    AI v2.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Enterprise Threat Intelligence</p>
              </div>
            </div>

            {/* Navigation Glass Tabs (Desktop) */}
            <div className="hidden lg:flex">
              <GlassTabs
                tabs={[
                  { id: 'studio', label: 'Analyze Email', icon: <Zap className="w-4 h-4" /> },
                  { id: 'batch', label: 'Batch Scan', icon: <UploadCloud className="w-4 h-4" /> },
                  { id: 'metrics', label: 'Telemetry', icon: <Activity className="w-4 h-4" /> },
                  { id: 'pipeline', label: 'How It Works', icon: <Cpu className="w-4 h-4" /> },
                  { id: 'history', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
                  { id: 'design', label: 'Liquid Glass', icon: <Palette className="w-4 h-4" /> },
                ]}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as any)}
              />
            </div>

            {/* Theme Switch */}
            <div className="flex items-center gap-3">
              <ToggleSwitch
                checked={isDark}
                onChange={toggleTheme}
                themeMode
              />
            </div>
          </div>

          {/* Navigation Bar (Mobile / Tablet) */}
          <div className="lg:hidden flex overflow-x-auto px-4 py-2 border-t border-white/40 dark:border-white/5 space-x-2">
            <GlassTabs
              tabs={[
                { id: 'studio', label: 'Analyze' },
                { id: 'batch', label: 'Batch' },
                { id: 'metrics', label: 'Metrics' },
                { id: 'pipeline', label: 'Pipeline' },
                { id: 'history', label: 'History' },
                { id: 'design', label: 'Design' },
              ]}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as any)}
            />
          </div>
        </header>

        {/* Main View Area with Smooth Page Transitions */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Suspense
                fallback={
                  <div className="space-y-6">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                }
              >
                {activeTab === 'studio' && <DetectionStudio />}
                {activeTab === 'batch' && <BatchScanner />}
                {activeTab === 'metrics' && <MetricsDashboard />}
                {activeTab === 'pipeline' && <HowItWorks />}
                {activeTab === 'history' && <AuditHistory />}
                {activeTab === 'design' && (
                  <DesignShowcase isDark={isDark} onToggleDark={() => toggleTheme(!isDark)} />
                )}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Global Liquid Glass Footer */}
        <footer className="mt-auto border-t border-white/60 dark:border-white/10 backdrop-blur-glass bg-white/40 dark:bg-slate-950/40 py-6 px-4 sm:px-6 transition-colors">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">PhishGuard AI</span>
              <span>—</span>
              <span>Production ML Threat Intelligence</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Trained on 17,514 genuine samples</span>
              <span>•</span>
              <span>Zero data leakage verified</span>
              <span>•</span>
              <span>FPR: 1.40%</span>
            </div>
          </div>
        </footer>
      </AuroraBackground>
    </>
  );
};

export default App;
