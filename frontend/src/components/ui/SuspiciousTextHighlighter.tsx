import React from 'react';
import { Tooltip } from './Tooltip';

export interface ContributingWord {
  feature: string;
  weight: number;
  type: 'token' | 'heuristic';
  direction: 'phishing' | 'safe';
}

export interface SuspiciousTextHighlighterProps {
  text: string;
  contributions: ContributingWord[];
}

export const SuspiciousTextHighlighter: React.FC<SuspiciousTextHighlighterProps> = ({
  text,
  contributions,
}) => {
  if (!text) return null;

  // Filter token contributions that exist in the text
  const tokens = contributions.filter(
    (c) => c.type === 'token' && c.feature && c.feature.length > 2 && text.toLowerCase().includes(c.feature.toLowerCase())
  );

  if (tokens.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-white/40 dark:border-white/10 font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words max-h-72 overflow-y-auto">
        {text}
      </div>
    );
  }

  // Build regex matching all tokens case-insensitively
  // Sort tokens by length descending so longer phrases match first
  const sortedTokens = [...tokens].sort((a, b) => b.feature.length - a.feature.length);
  const pattern = new RegExp(`(${sortedTokens.map((t) => t.feature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

  const parts = text.split(pattern);

  return (
    <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-white/10 font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words max-h-80 overflow-y-auto selection:bg-indigo-500/30">
      {parts.map((part, idx) => {
        const matched = sortedTokens.find((t) => t.feature.toLowerCase() === part.toLowerCase());
        if (!matched) {
          return <span key={idx}>{part}</span>;
        }

        const isPhish = matched.direction === 'phishing';
        const weightAbs = Math.abs(matched.weight);
        // Heat level based on weight intensity
        const intensity = weightAbs > 1.5 ? 'high' : weightAbs > 0.8 ? 'med' : 'low';

        const styleClass = isPhish
          ? intensity === 'high'
            ? 'bg-rose-500/30 text-rose-900 dark:text-rose-200 border-b-2 border-rose-500 font-bold px-1 rounded-sm'
            : intensity === 'med'
            ? 'bg-rose-400/20 text-rose-800 dark:text-rose-200 border-b border-rose-400 font-semibold px-0.5 rounded-sm'
            : 'bg-rose-300/15 text-rose-700 dark:text-rose-300 border-b border-rose-300 px-0.5'
          : 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-b-2 border-emerald-500 font-bold px-1 rounded-sm';

        const tooltipContent = (
          <div className="text-[11px] font-sans space-y-0.5">
            <p className="font-bold flex items-center gap-1">
              <span className={isPhish ? 'text-rose-400' : 'text-emerald-400'}>
                {isPhish ? 'Threat Indicator' : 'Safe Indicator'}
              </span>
              <span>(Weight: {matched.weight > 0 ? `+${matched.weight.toFixed(2)}` : matched.weight.toFixed(2)})</span>
            </p>
            <p className="text-slate-300">
              {isPhish
                ? `Token "${part}" frequently appears in malicious and phishing email bodies.`
                : `Token "${part}" correlates strongly with verified legitimate communication.`}
            </p>
          </div>
        );

        return (
          <Tooltip key={idx} content={tooltipContent} position="top">
            <mark className={`cursor-help transition-colors ${styleClass}`}>
              {part}
            </mark>
          </Tooltip>
        );
      })}
    </div>
  );
};
