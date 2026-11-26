import React, { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassInput, GlassTextarea } from '../components/ui/GlassInput';
import { GlassTabs } from '../components/ui/GlassTabs';
import { GlassModal } from '../components/ui/GlassModal';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { Badge } from '../components/ui/Badge';
import { Tooltip } from '../components/ui/Tooltip';
import { Skeleton } from '../components/ui/Skeleton';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
  Layers,
  Fingerprint,
  Info,
} from 'lucide-react';

export const DesignShowcase: React.FC<{ isDark: boolean; onToggleDark: () => void }> = ({
  isDark,
  onToggleDark,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sampleNumber, setSampleNumber] = useState(98.13);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/50 dark:border-white/10">
        <div>
          <Badge variant="indigo" pulse className="mb-2">
            DESIGN SYSTEM SHOWCASE
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Liquid Glass Visual Language
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Apple visionOS elegance merged with modern fintech precision. Translucent 28px glass, specular cursor shimmer, and semantic glow.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white/40 dark:bg-slate-900/40 p-2 rounded-2xl border border-white/60 dark:border-white/10 backdrop-blur-md">
          <ToggleSwitch checked={isDark} onChange={onToggleDark} label="Theme" themeMode />
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex justify-center">
        <GlassTabs
          tabs={[
            { id: 'overview', label: 'Overview & Cards', icon: <Layers className="w-4 h-4" /> },
            { id: 'buttons', label: 'Buttons & Badges', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'inputs', label: 'Inputs & Form Elements', icon: <Fingerprint className="w-4 h-4" /> },
            { id: 'feedback', label: 'Modals & Numbers', icon: <Zap className="w-4 h-4" /> },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Section 1: Glass Cards & Depths */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" /> Floating Glass Cards with Specular Shimmer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard depth={1} className="p-6 space-y-3">
              <Badge variant="neutral">Depth 1 — Floating</Badge>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Subtle Layer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Backdrop filter blur(24px) with 1px top-left specular rim. Move your cursor across this card to watch the soft gleam follow you.
              </p>
            </GlassCard>

            <GlassCard depth={2} className="p-6 space-y-3" iridescent>
              <Badge variant="indigo">Depth 2 — Iridescent</Badge>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Iridescent Border Card</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Highlights high-importance elements with a delicate multi-color gradient rim (indigo, purple, emerald) and deep elevation.
              </p>
            </GlassCard>

            <GlassCard depth={3} className="p-6 space-y-3">
              <Badge variant="safe">Depth 3 — Elevated</Badge>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Maximum Depth</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                High-contrast drop shadow for prominent metrics and active scan inspection panels.
              </p>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Section 2: Buttons & Badges */}
      {activeTab === 'buttons' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Semantic Button Variants</h2>
            <div className="flex flex-wrap gap-4 items-center">
              <GlassButton variant="primary" icon={<Zap className="w-4 h-4" />}>
                Primary Scan
              </GlassButton>
              <GlassButton variant="safe" icon={<ShieldCheck className="w-4 h-4" />}>
                Safe Verdict
              </GlassButton>
              <GlassButton variant="danger" icon={<ShieldAlert className="w-4 h-4" />}>
                Phishing Threat
              </GlassButton>
              <GlassButton variant="warning">Warning / Review</GlassButton>
              <GlassButton variant="glass">Glass Secondary</GlassButton>
              <GlassButton variant="ghost">Ghost Button</GlassButton>
              <GlassButton variant="primary" loading>
                Analyzing
              </GlassButton>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Semantic Glowing Badges</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge variant="safe" pulse>
                SAFE EMAIL (99.8%)
              </Badge>
              <Badge variant="phish" pulse>
                PHISHING THREAT (97.4%)
              </Badge>
              <Badge variant="warn">UNCERTAIN / REVIEW</Badge>
              <Badge variant="indigo">CHAMPION MODEL</Badge>
              <Badge variant="neutral">OFFLINE SCAN</Badge>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Inputs & Form Controls */}
      {activeTab === 'inputs' && (
        <div className="space-y-6 max-w-2xl">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Translucent Input Elements</h2>
          <GlassInput
            label="Sender Address"
            placeholder="e.g. security-update@micros0ft-support.com"
            icon={<Fingerprint className="w-4 h-4" />}
          />
          <GlassTextarea
            label="Email Raw Content"
            rows={5}
            placeholder="Paste raw email body or RFC822 headers here for threat inspection..."
          />
          <div className="flex items-center gap-4">
            <ToggleSwitch
              checked={true}
              onChange={() => {}}
              label="Zero-Storage Privacy Mode"
            />
            <Tooltip content="Stores only cryptographic SHA-256 hash without email body" position="right">
              <Info className="w-4 h-4 text-slate-400 cursor-help" />
            </Tooltip>
          </div>
        </div>
      )}

      {/* Section 4: Modal & Animated Numbers */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Dynamic Feedback & Transitions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6 text-center space-y-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Accuracy</span>
              <div className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400">
                <AnimatedNumber value={sampleNumber} decimals={2} suffix="%" />
              </div>
              <GlassButton
                size="sm"
                variant="glass"
                onClick={() => setSampleNumber(sampleNumber === 98.13 ? 99.85 : 98.13)}
              >
                Trigger Number Spring
              </GlassButton>
            </GlassCard>

            <GlassCard className="p-6 text-center space-y-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Frosted Modal Window</span>
              <div className="pt-2">
                <GlassButton variant="primary" onClick={() => setIsModalOpen(true)}>
                  Open Liquid Modal
                </GlassButton>
              </div>
            </GlassCard>

            <GlassCard className="p-6 space-y-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Skeleton Loaders</span>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </GlassCard>
          </div>

          <GlassModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Liquid Glass Modal Dialog"
            description="Ultra-smooth spring animation with high backdrop saturation"
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This modal uses Framer Motion spring physics with backdrop blur and saturation. It renders effortlessly inside the Liquid Glass design architecture.
              </p>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50 dark:border-white/10">
                <GlassButton variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Dismiss
                </GlassButton>
                <GlassButton variant="primary" onClick={() => setIsModalOpen(false)}>
                  Acknowledge
                </GlassButton>
              </div>
            </div>
          </GlassModal>
        </div>
      )}
    </div>
  );
};
