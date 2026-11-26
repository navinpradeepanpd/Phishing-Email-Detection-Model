import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'safe' | 'phish' | 'warn' | 'neutral' | 'indigo';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  className = '',
}) => {
  const sizeClass = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-3 py-1 text-xs gap-1.5',
  }[size];

  const variantClass = {
    safe: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    phish: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
    warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    indigo: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.25)]',
    neutral: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40 dark:border-slate-700/60',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold tracking-wide backdrop-blur-sm ${sizeClass} ${variantClass} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75
              ${variant === 'safe' ? 'bg-emerald-400' : variant === 'phish' ? 'bg-rose-400' : 'bg-amber-400'}
            `}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2
              ${variant === 'safe' ? 'bg-emerald-500' : variant === 'phish' ? 'bg-rose-500' : 'bg-amber-500'}
            `}
          />
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};
