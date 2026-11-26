import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  themeMode?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  themeMode = false,
}) => {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      {label && <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border transition-colors duration-300
          ${checked ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-300 dark:bg-slate-700/80 border-slate-400/30'}
          backdrop-blur-md shadow-inner
        `}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md
            ${checked ? 'translate-x-7 text-indigo-600' : 'translate-x-1 text-slate-500'}
          `}
        >
          {themeMode ? (
            checked ? <Moon className="h-3 w-3 stroke-[2.5]" /> : <Sun className="h-3 w-3 stroke-[2.5]" />
          ) : null}
        </motion.span>
      </button>
    </label>
  );
};
