import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface GlassTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const GlassTabs: React.FC<GlassTabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 p-1.5 rounded-2xl border backdrop-blur-glass
        bg-slate-200/50 dark:bg-slate-900/60
        border-white/50 dark:border-white/10
        shadow-sm ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 cursor-pointer select-none
              ${isActive ? 'text-indigo-950 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}
            `}
          >
            {isActive && (
              <motion.div
                layoutId="active-glass-tab-indicator"
                className="absolute inset-0 rounded-xl bg-white dark:bg-white/15 shadow-sm shadow-black/5 border border-white/80 dark:border-white/10"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-mono font-bold bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-300">
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};
