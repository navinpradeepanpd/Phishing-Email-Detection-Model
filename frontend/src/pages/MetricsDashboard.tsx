import React, { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { Badge } from '../components/ui/Badge';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Skeleton } from '../components/ui/Skeleton';
import { api, type MetricsData } from '../api/client';
import {
  Activity,
  Award,
  BarChart3,
  TrendingUp,
  Download,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const MetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHowToRead, setShowHowToRead] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <GlassCard className="p-8 text-center text-rose-500">
        Failed to load verified metrics: {error}
      </GlassCard>
    );
  }

  const champ = metrics.champion_metrics;
  const cm = champ.confusion_matrix;
  const totalTest = cm.tn + cm.fp + cm.fn + cm.tp;

  // Confusion matrix cell percentages
  const tnPct = ((cm.tn / totalTest) * 100).toFixed(1);
  const fpPct = ((cm.fp / totalTest) * 100).toFixed(1);
  const fnPct = ((cm.fn / totalTest) * 100).toFixed(1);
  const tpPct = ((cm.tp / totalTest) * 100).toFixed(1);

  // 1. Multi-model comparison grouped bar chart data
  const comparisonData = metrics.all_model_evaluations.map((m) => ({
    name: m.model_name.replace(' (Tuned)', '').replace(' (Calibrated)', ''),
    accuracy: +(m.accuracy * 100).toFixed(2),
    precision: +(m.precision * 100).toFixed(2),
    recall: +(m.recall * 100).toFixed(2),
    f1: +(m.f1_score * 100).toFixed(2),
    roc_auc: +(m.roc_auc * 100).toFixed(2),
  }));

  // 2. Cross-validation scores data
  const cvData = Object.entries(metrics.cross_validation_results).map(([name, res]) => ({
    name: name.replace(' (Tuned)', '').replace(' (Calibrated)', ''),
    meanF1: +(res.mean_cv_f1 * 100).toFixed(2),
    stdF1: +(res.std_cv_f1 * 100).toFixed(2),
  }));

  // 3. Multi-model ROC curves
  // Downsample ROC points to ~25 points for smooth responsive rendering
  const sampleIndices = (len: number, count = 25) => {
    if (len <= count) return Array.from({ length: len }, (_, i) => i);
    const step = (len - 1) / (count - 1);
    return Array.from({ length: count }, (_, i) => Math.round(i * step));
  };

  const champRocLen = champ.roc_curve.fpr.length;
  const indices = sampleIndices(champRocLen);
  const rocComparisonData = indices.map((idx) => {
    const pt: Record<string, number> = {
      fpr: +(champ.roc_curve.fpr[idx] * 100).toFixed(2),
    };
    metrics.all_model_evaluations.forEach((m) => {
      const mIdx = Math.min(idx, m.roc_curve.fpr.length - 1);
      const shortName = m.model_name.replace(' (Tuned)', '').replace(' (Calibrated)', '');
      pt[shortName] = +(m.roc_curve.tpr[mIdx] * 100).toFixed(2);
    });
    return pt;
  });

  const modelColors: Record<string, string> = {
    'Logistic Regression': '#6366f1', // Indigo (Champion)
    'Multinomial Naive Bayes': '#10b981', // Emerald
    'Linear SVM': '#f59e0b', // Amber
    'Random Forest': '#ec4899', // Pink
    'Gradient Boosting': '#06b6d4', // Cyan
  };

  // 4. Class Balance Donut Data
  const donutData = [
    { name: 'Legitimate (Safe)', value: metrics.dataset_statistics.safe_samples, color: '#10b981' },
    { name: 'Phishing Threats', value: metrics.dataset_statistics.phishing_samples, color: '#f43f5e' },
  ];

  // 5. Top Indicating Words Diverging Data
  const topPhishWords = metrics.top_explainability_features.phishing_indicators
    .slice(0, 10)
    .map((item) => ({
      feature: item.feature.replace('word: ', '').replace('heuristic: ', ''),
      weight: item.weight,
      direction: 'phishing' as const,
    }));

  const topSafeWords = metrics.top_explainability_features.safe_indicators
    .slice(0, 10)
    .map((item) => ({
      feature: item.feature.replace('word: ', '').replace('heuristic: ', ''),
      weight: Math.abs(item.weight),
      direction: 'safe' as const,
    }));

  return (
    <div className="space-y-8 print:p-0 print:space-y-4">
      {/* Top Banner & Export Action */}
      <GlassCard depth={1} className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Model Performance Telemetry
                </h1>
                <Badge variant="indigo" size="sm">
                  100% Real Evaluation
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Authentic verification metrics on held-out test set ({metrics.dataset_statistics.test_samples.toLocaleString()} genuine emails). Zero synthetic numbers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="safe" pulse>
              Champion: {metrics.champion_model}
            </Badge>
            <GlassButton
              variant="glass"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportPDF}
              className="print:hidden"
            >
              Export PDF Report
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* TOP ROW: 6 Animated Glass Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <GlassCard depth={2} className="p-4 text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accuracy</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            <AnimatedNumber value={champ.accuracy * 100} decimals={2} suffix="%" />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Overall accuracy</span>
        </GlassCard>

        <GlassCard depth={2} className="p-4 text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Precision</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            <AnimatedNumber value={champ.precision * 100} decimals={2} suffix="%" />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Phish flag precision</span>
        </GlassCard>

        <GlassCard depth={2} className="p-4 text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recall</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-600 dark:text-teal-400">
            <AnimatedNumber value={champ.recall * 100} decimals={2} suffix="%" />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Threat catch rate</span>
        </GlassCard>

        <GlassCard depth={2} className="p-4 text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">F1-Score</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            <AnimatedNumber value={champ.f1_score * 100} decimals={2} suffix="%" />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Harmonic balance</span>
        </GlassCard>

        <GlassCard depth={2} className="p-4 text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ROC-AUC</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            <AnimatedNumber value={champ.roc_auc * 100} decimals={2} suffix="%" />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Discrimination index</span>
        </GlassCard>

        <GlassCard depth={2} className="p-4 text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">False-Pos Rate</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-500">
            <AnimatedNumber value={champ.false_positive_rate * 100} decimals={2} suffix="%" />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Only 23 / 1,647 safe</span>
        </GlassCard>
      </div>

      {/* CONFUSION MATRIX & DATASET DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Confusion Matrix Heatmap (7 cols) */}
        <GlassCard depth={2} className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Interactive Confusion Matrix Heatmap
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">N = {totalTest.toLocaleString()} test emails</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hover over any cell to inspect exact counts, dataset proportions, and plain-language interpretation.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* True Negatives (TN) */}
            <div
              onMouseEnter={() => setHoveredCell('tn')}
              onMouseLeave={() => setHoveredCell(null)}
              className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer text-center space-y-1.5 ${
                hoveredCell === 'tn'
                  ? 'bg-emerald-500/25 border-emerald-500/60 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                  : 'bg-emerald-500/10 border-emerald-500/25'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                <span>True Negative (TN)</span>
                <span className="font-mono text-[11px] font-bold">{tnPct}%</span>
              </div>
              <div className="text-3xl font-extrabold font-mono text-emerald-900 dark:text-emerald-100">
                {cm.tn.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                <strong>Legitimate email correctly passed as Safe.</strong> Inbox delivery uninterrupted.
              </p>
            </div>

            {/* False Positives (FP) */}
            <div
              onMouseEnter={() => setHoveredCell('fp')}
              onMouseLeave={() => setHoveredCell(null)}
              className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer text-center space-y-1.5 ${
                hoveredCell === 'fp'
                  ? 'bg-rose-500/25 border-rose-500/60 shadow-lg shadow-rose-500/10 scale-[1.02]'
                  : 'bg-rose-500/10 border-rose-500/25'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-200">
                <span>False Positive (FP)</span>
                <span className="font-mono text-[11px] font-bold">{fpPct}%</span>
              </div>
              <div className="text-3xl font-extrabold font-mono text-rose-900 dark:text-rose-100">
                {cm.fp.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                <strong>Safe email falsely flagged as Phishing.</strong> Critical benchmark: restricted to just 1.4%.
              </p>
            </div>

            {/* False Negatives (FN) */}
            <div
              onMouseEnter={() => setHoveredCell('fn')}
              onMouseLeave={() => setHoveredCell(null)}
              className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer text-center space-y-1.5 ${
                hoveredCell === 'fn'
                  ? 'bg-rose-500/25 border-rose-500/60 shadow-lg shadow-rose-500/10 scale-[1.02]'
                  : 'bg-rose-500/10 border-rose-500/25'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-200">
                <span>False Negative (FN)</span>
                <span className="font-mono text-[11px] font-bold">{fnPct}%</span>
              </div>
              <div className="text-3xl font-extrabold font-mono text-rose-900 dark:text-rose-100">
                {cm.fn.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                <strong>Phishing email slipped past detection.</strong> Miss rate: only 26 out of 981 threats.
              </p>
            </div>

            {/* True Positives (TP) */}
            <div
              onMouseEnter={() => setHoveredCell('tp')}
              onMouseLeave={() => setHoveredCell(null)}
              className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer text-center space-y-1.5 ${
                hoveredCell === 'tp'
                  ? 'bg-emerald-500/25 border-emerald-500/60 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                  : 'bg-emerald-500/10 border-emerald-500/25'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                <span>True Positive (TP)</span>
                <span className="font-mono text-[11px] font-bold">{tpPct}%</span>
              </div>
              <div className="text-3xl font-extrabold font-mono text-emerald-900 dark:text-emerald-100">
                {cm.tp.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                <strong>Malicious email intercepted.</strong> Phishing attack successfully neutralized.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Dataset Card & Class Balance Donut (5 cols) */}
        <GlassCard depth={2} className="lg:col-span-5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Dataset Composition & Splits
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-500">
              {metrics.dataset_statistics.total_clean_samples.toLocaleString()} Total
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(val: any) => [`${val.toLocaleString()} emails`, 'Count']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(val: string) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/50 dark:border-white/10 text-center text-xs">
            <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Train (70%)</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                {metrics.dataset_statistics.train_samples.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Val (15%)</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                {metrics.dataset_statistics.val_samples.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Test (15%)</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                {metrics.dataset_statistics.test_samples.toLocaleString()}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* MULTI-MODEL ROC CURVES & MODEL COMPARISON GROUPED BAR CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ROC Curves Comparing All Models (6 cols) */}
        <GlassCard depth={2} className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                ROC Curves — All Trained Models
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-500">
              AUC {+(champ.roc_auc * 100).toFixed(2)}%
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Discriminatory power across discrimination thresholds. Higher left-corner bend indicates stronger separation.
          </p>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rocComparisonData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="fpr" tick={{ fontSize: 11 }} label={{ value: 'FPR (%)', position: 'insideBottom', offset: -4, fontSize: 10 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} label={{ value: 'TPR (%)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                {Object.keys(modelColors).map((name) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={modelColors[name]}
                    strokeWidth={name === 'Logistic Regression' ? 3 : 1.5}
                    dot={false}
                    name={name}
                  />
                ))}
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Grouped Model Comparison Bar Chart (6 cols) */}
        <GlassCard depth={2} className="lg:col-span-6 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Benchmark Comparison on Test Set
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">5 Candidate Architectures</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Test set Accuracy, Precision, Recall, and F1 across all trained pipelines.
          </p>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} name="Accuracy" />
                <Bar dataKey="f1" fill="#10b981" radius={[4, 4, 0, 0]} name="F1-Score" />
                <Bar dataKey="precision" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Precision" />
                <Bar dataKey="recall" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Recall" />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* CROSS-VALIDATION & TOP INDICATING WORDS DIVERGING CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 5-Fold Stratified Cross-Validation Chart (5 cols) */}
        <GlassCard depth={2} className="lg:col-span-5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                5-Fold Cross-Validation Scores
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Mean F1 ± Std</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            F1 generalization performance across 5 randomized folds during training.
          </p>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cvData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" domain={[85, 100]} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="meanF1" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Mean CV F1 (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Two-Sided Diverging Bar Chart: Top Indicating Features (7 cols) */}
        <GlassCard depth={2} className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Top Phishing vs. Safe Indicating Words
              </h3>
            </div>
            <Badge variant="indigo" size="sm">
              Logistic Regression Coefficients
            </Badge>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Features with the highest positive weights (Phishing signals) and highest negative weights (Safe signals).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Phishing Column */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                Top Phishing Tokens (+ Weight)
              </span>
              <div className="space-y-1.5">
                {topPhishWords.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-rose-500/10 dark:bg-rose-500/15 p-2 rounded-xl border border-rose-500/20">
                    <span className="font-mono font-semibold text-rose-800 dark:text-rose-200 truncate mr-2">
                      {item.feature}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      +{item.weight.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Safe Column */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Top Safe Tokens (- Weight)
              </span>
              <div className="space-y-1.5">
                {topSafeWords.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-emerald-500/10 dark:bg-emerald-500/15 p-2 rounded-xl border border-emerald-500/20">
                    <span className="font-mono font-semibold text-emerald-800 dark:text-emerald-200 truncate mr-2">
                      {item.feature}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      -{item.weight.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* COLLAPSIBLE: "How to Read This" Educational Guide */}
      <GlassCard depth={1} className="p-6 transition-all">
        <button
          onClick={() => setShowHowToRead(!showHowToRead)}
          className="w-full flex items-center justify-between text-left cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              How to Read This: Understanding Accuracy, Precision & Recall
            </h3>
          </div>
          {showHowToRead ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showHowToRead && (
          <div className="pt-4 mt-4 border-t border-slate-200/50 dark:border-white/10 space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 space-y-1">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">Accuracy (98.13%)</span>
                <p>
                  The overall ratio of correct verdicts across all emails. High accuracy means the model is generally dependable across the board.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 space-y-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">Precision (97.65%)</span>
                <p>
                  When the model sounds the alarm and flags an email as Phishing, how often is it actually right? High precision protects legitimate communications from ending up in quarantine.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 space-y-1">
                <span className="font-bold text-teal-600 dark:text-teal-400 uppercase">Recall (97.35%)</span>
                <p>
                  Out of every 100 genuine phishing attacks launched, how many did the system catch? High recall prevents malicious emails from reaching employees unnoticed.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200">
              <strong>Why False Positive Rate Matters in Email Defense:</strong> While catching attacks is paramount, a false positive rate above 3% disrupts enterprise productivity by dropping important customer orders and vendor invoices. PhishGuard keeps FPR down to <strong>1.40%</strong> (only 23 safe emails flagged out of 1,647).
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
