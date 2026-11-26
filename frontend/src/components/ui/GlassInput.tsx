import React from 'react';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold tracking-wider text-slate-600 dark:text-slate-300 uppercase">{label}</label>}
        <div className="relative flex items-center">
          {icon && <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none">{icon}</span>}
          <input
            ref={ref}
            className={`w-full rounded-2xl border backdrop-blur-glass transition-all duration-200
              bg-white/50 dark:bg-slate-900/50
              border-slate-200/80 dark:border-white/10
              text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60
              ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 text-sm
              shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]
              ${error ? 'border-rose-400 focus:ring-rose-400/40' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-500 mt-0.5">{error}</p>}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

export interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const GlassTextarea = React.forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold tracking-wider text-slate-600 dark:text-slate-300 uppercase">{label}</label>}
        <textarea
          ref={ref}
          className={`w-full rounded-2xl border backdrop-blur-glass transition-all duration-200
            bg-white/50 dark:bg-slate-900/50
            border-slate-200/80 dark:border-white/10
            text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60
            p-4 text-sm font-mono leading-relaxed resize-y
            shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]
            ${error ? 'border-rose-400 focus:ring-rose-400/40' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-rose-500 mt-0.5">{error}</p>}
      </div>
    );
  }
);

GlassTextarea.displayName = 'GlassTextarea';
