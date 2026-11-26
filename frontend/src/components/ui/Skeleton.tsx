import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
  const variantClass = {
    text: 'h-4 w-full rounded-md',
    rectangular: 'rounded-2xl',
    circular: 'rounded-full',
  }[variant];

  return (
    <div
      className={`relative overflow-hidden bg-slate-200/60 dark:bg-white/5 backdrop-blur-sm ${variantClass} ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent" />
    </div>
  );
};
