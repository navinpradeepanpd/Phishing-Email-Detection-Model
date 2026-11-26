import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import {
  Mail,
  Sparkles,
  Cpu,
  Binary,
  Layers,
  ShieldCheck,
  TrendingUp,
  Target,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  // Sequentially cycle through pipeline stages
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 6);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  const pipelineStages = [
    {
      id: 0,
      title: '1. Email Ingestion',
      icon: <Mail className="w-5 h-5" />,
      tag: 'Raw RFC822 / Text',
      desc: 'Ingests email headers, From/Reply-To addresses, and raw HTML or plaintext message bodies.',
      details: 'Supports individual paste, .eml RFC822 files, or bulk CSV rows. SHA-256 fingerprint generated.',
    },
    {
      id: 1,
      title: '2. Cleaning & Sanitization',
      icon: <Sparkles className="w-5 h-5" />,
      tag: 'Regex Normalizer',
      desc: 'Strips malicious script tags, unescapes HTML entities (&amp;, &nbsp;), and normalizes whitespace.',
      details: 'Removes DOM noise and deduplicates content to guarantee robust, reproducible tokenization.',
    },
    {
      id: 2,
      title: '3. Feature Extraction',
      icon: <Cpu className="w-5 h-5" />,
      tag: 'Dual Stream',
      desc: 'Splits content into two parallel analytical streams: semantic linguistic text and structural heuristics.',
      details: 'Evaluates URL syntax, header alignment, urgency keywords, credential requests, and capital ratios.',
    },
    {
      id: 3,
      title: '4. TF-IDF + URL Heuristics',
      icon: <Binary className="w-5 h-5" />,
      tag: 'FeatureUnion',
      desc: 'Sublinear TF-IDF (1-2 n-grams, 5,000 max features) combined with 16 handcrafted heuristics.',
      details: 'Scales heuristic counts with MaxAbsScaler to eliminate data leakage and prevent distortion.',
    },
    {
      id: 4,
      title: '5. Scikit-Learn Pipeline',
      icon: <Layers className="w-5 h-5" />,
      tag: 'Champion Model',
      desc: 'Tuned Logistic Regression (C=8.0) cross-validated with 5-fold stratified evaluation.',
      details: 'Produces calibrated log-odds probability distributions and transparent linear feature weights.',
    },
    {
      id: 5,
      title: '6. Explainable Verdict',
      icon: <ShieldCheck className="w-5 h-5" />,
      tag: 'Threat Intelligence',
      desc: 'Outputs confidence band, probability gauge, highlighted word contributions, and URL risk chips.',
      details: 'Every score is strictly grounded in genuine mathematics without fabrication or external URL polling.',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Overview Card */}
      <GlassCard depth={1} className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Architecture & Pipeline Mechanics
                </h1>
                <Badge variant="indigo" size="sm">
                  Scikit-Learn Champion
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                How PhishGuard AI extracts semantic and structural signals to catch zero-day phishing attacks
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* SEQUENTIAL ANIMATED PIPELINE NODES */}
      <GlassCard depth={2} className="p-6 sm:p-8 space-y-6" iridescent>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Live Pipeline Execution Flow (Step {activeStep + 1} of 6)
          </span>
          <span className="text-[11px] font-mono text-indigo-500 animate-pulse">
            Active Processing Stage
          </span>
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 relative">
          {pipelineStages.map((stage) => {
            const isActive = stage.id === activeStep;
            const isCompleted = stage.id < activeStep;

            return (
              <motion.div
                key={stage.id}
                onClick={() => setActiveStep(stage.id)}
                whileHover={{ y: -4 }}
                className={`relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer text-left flex flex-col justify-between min-h-[170px] ${
                  isActive
                    ? 'bg-indigo-600/15 dark:bg-indigo-500/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.35)] ring-2 ring-indigo-500/40'
                    : isCompleted
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30'
                    : 'bg-white/40 dark:bg-slate-900/40 border-white/60 dark:border-white/10 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`p-2 rounded-xl ${
                        isActive
                          ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                      }`}
                    >
                      {stage.icon}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      0{stage.id + 1}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {stage.title}
                  </h3>
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                    {stage.tag}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {stage.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Stage Deep-Dive */}
        <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/10 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
          <Zap className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <strong className="text-slate-900 dark:text-white">
              Stage Deep-Dive ({pipelineStages[activeStep].title}):
            </strong>{' '}
            {pipelineStages[activeStep].details}
          </div>
        </div>
      </GlassCard>

      {/* EDUCATIONAL FOUNDATIONS: 3 Deep-Dive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: TF-IDF */}
        <GlassCard depth={2} className="p-6 space-y-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 w-fit">
            <Binary className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            What is TF-IDF Vectorization?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <strong>Term Frequency-Inverse Document Frequency (TF-IDF)</strong> scores how unique a word is to an email relative to the entire corpus. Universal words like <em>"the"</em> receive near-zero weight, while urgent keywords like <em>"verify-now"</em> receive high discriminating signal.
          </p>
          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-indigo-900 dark:text-indigo-200 font-mono">
            TF-IDF = TF(t,d) × log(N / DF(t))
          </div>
        </GlassCard>

        {/* Card 2: Naive Bayes vs Logistic Regression */}
        <GlassCard depth={2} className="p-6 space-y-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 w-fit">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Naive Bayes vs. Logistic Regression
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <strong>Naive Bayes</strong> assumes all features are mutually independent — which fails when urgent phrases appear together. <strong>Logistic Regression</strong> learns correlation weights ($w_j$), capturing nuanced interactions and achieving superior F1 (<strong>97.50%</strong> vs 95.79%).
          </p>
          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-[11px] text-purple-900 dark:text-purple-200">
            Champion tuned with $C=8.0$ and sublinear TF scaling.
          </div>
        </GlassCard>

        {/* Card 3: Precision vs Recall in Security */}
        <GlassCard depth={2} className="p-6 space-y-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 w-fit">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Why Precision & Recall Matter in Security
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            In email security, missing an attack (**Low Recall**) causes ransomware outbreaks. However, falsely quarantining safe customer invoices (**Low Precision**) halts business workflows. PhishGuard achieves <strong>97.65% Precision</strong> and <strong>97.35% Recall</strong>.
          </p>
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[11px] text-emerald-900 dark:text-emerald-200">
            False Positive Rate strictly constrained to <strong>1.40%</strong>.
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
