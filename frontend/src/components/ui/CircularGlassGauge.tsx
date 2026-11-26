import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';

export interface CircularGlassGaugeProps {
  probability: number; // 0.0 to 1.0
  verdict: 'SAFE' | 'PHISHING' | 'SUSPICIOUS';
  confidence: string;
  size?: number;
}

export const CircularGlassGauge: React.FC<CircularGlassGaugeProps> = ({
  probability,
  verdict,
  confidence,
  size = 200,
}) => {
  const percentage = Math.min(Math.max(probability * 100, 0), 100);
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorConfig = {
    SAFE: {
      stroke: '#10b981',
      glow: 'rgba(16, 185, 129, 0.35)',
      gradientStart: '#34d399',
      gradientEnd: '#059669',
      textColor: 'text-emerald-500 dark:text-emerald-400',
    },
    SUSPICIOUS: {
      stroke: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.35)',
      gradientStart: '#fbbf24',
      gradientEnd: '#d97706',
      textColor: 'text-amber-500 dark:text-amber-400',
    },
    PHISHING: {
      stroke: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.4)',
      gradientStart: '#fb7185',
      gradientEnd: '#e11d48',
      textColor: 'text-rose-500 dark:text-rose-400',
    },
  }[verdict];

  const gradientId = `gauge-gradient-${verdict.toLowerCase()}`;

  return (
    <div className="relative flex flex-col items-center justify-center p-2">
      {/* Outer ambient frosted glow */}
      <div
        className="absolute inset-4 rounded-full blur-2xl opacity-40 transition-all duration-700 pointer-events-none"
        style={{ backgroundColor: colorConfig.glow }}
      />

      {/* SVG Circular Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorConfig.gradientStart} />
              <stop offset="100%" stopColor={colorConfig.gradientEnd} />
            </linearGradient>
            <filter id="gauge-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={colorConfig.stroke} floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background Track with glass appearance */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-200/60 dark:text-white/10"
          />

          {/* Animated Filled Progress Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            fill="transparent"
            filter="url(#gauge-shadow)"
          />
        </svg>

        {/* Center Glass Node */}
        <div className="absolute inset-5 rounded-full backdrop-blur-glass bg-white/40 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 shadow-inner flex flex-col items-center justify-center text-center p-3">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-400">
            Probability
          </span>
          <div className={`text-3xl font-extrabold font-mono tracking-tight ${colorConfig.textColor}`}>
            <AnimatedNumber value={percentage} decimals={1} suffix="%" />
          </div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {confidence}
          </span>
        </div>
      </div>
    </div>
  );
};
