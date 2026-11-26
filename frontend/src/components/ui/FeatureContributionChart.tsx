import React from 'react';
import { motion } from 'framer-motion';

export interface FeatureContribution {
  feature: string;
  weight: number;
  type: 'token' | 'heuristic';
  direction: 'phishing' | 'safe';
}

export interface FeatureContributionChartProps {
  features: FeatureContribution[];
}

export const FeatureContributionChart: React.FC<FeatureContributionChartProps> = ({ features }) => {
  if (!features || features.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        No significant contributing signals detected.
      </div>
    );
  }

  // Find max absolute weight for proportional scaling
  const maxAbsWeight = Math.max(...features.map((f) => Math.abs(f.weight)), 1.0);

  return (
    <div className="space-y-3">
      {/* Legend / Axis Labels */}
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-200/50 dark:border-white/10">
        <span className="text-emerald-600 dark:text-emerald-400">Safe Evidence</span>
        <span className="text-slate-400 text-[10px]">Zero Baseline</span>
        <span className="text-rose-600 dark:text-rose-400">Phishing Evidence</span>
      </div>

      <div className="space-y-2 pt-1">
        {features.map((item, idx) => {
          const isPhish = item.direction === 'phishing';
          const normalized = Math.min(Math.abs(item.weight) / maxAbsWeight, 1);
          const barWidthPercent = normalized * 50; // Max 50% from center

          return (
            <div key={idx} className="flex items-center text-xs group">
              {/* Feature Name */}
              <div className="w-1/3 truncate font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium pr-2">
                {item.feature}
                {item.type === 'heuristic' && (
                  <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-500 font-sans">
                    heuristic
                  </span>
                )}
              </div>

              {/* Diverging Bar Area (Center Split) */}
              <div className="w-2/3 flex items-center h-5 bg-slate-200/40 dark:bg-white/5 rounded-lg relative overflow-hidden px-1">
                {/* Center marker line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 dark:bg-white/20 z-10" />

                {/* Left Side (Safe) Bar */}
                <div className="w-1/2 flex justify-end h-full items-center">
                  {!isPhish && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidthPercent * 2}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.05 }}
                      className="h-3 rounded-l-md bg-gradient-to-l from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    />
                  )}
                </div>

                {/* Right Side (Phishing) Bar */}
                <div className="w-1/2 flex justify-start h-full items-center">
                  {isPhish && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidthPercent * 2}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.05 }}
                      className="h-3 rounded-r-md bg-gradient-to-r from-rose-500 to-amber-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                    />
                  )}
                </div>

                {/* Weight text indicator */}
                <span
                  className={`absolute ${
                    isPhish ? 'right-2' : 'left-2'
                  } text-[10px] font-mono font-bold ${
                    isPhish ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {item.weight > 0 ? `+${item.weight.toFixed(2)}` : item.weight.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
