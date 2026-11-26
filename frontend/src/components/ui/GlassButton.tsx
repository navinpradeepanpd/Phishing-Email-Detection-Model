import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export interface GlassButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'safe' | 'danger' | 'warning' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'glass',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl font-medium gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-2xl font-semibold gap-2',
    lg: 'px-7 py-3.5 text-base rounded-2xl font-bold gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40 backdrop-blur-md',
    safe:
      'bg-emerald-500/90 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 border border-emerald-300/40 backdrop-blur-md',
    danger:
      'bg-rose-500/90 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25 border border-rose-300/40 backdrop-blur-md',
    warning:
      'bg-amber-500/90 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25 border border-amber-300/40 backdrop-blur-md',
    ghost:
      'bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border-transparent',
    glass:
      'bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border border-white/60 dark:border-white/15 shadow-sm shadow-black/5 backdrop-blur-glass',
  }[variant];

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.025 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.975 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon && <span className="inline-flex shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </motion.button>
  );
};
