import React, { useState, useRef } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { Badge } from '../components/ui/Badge';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { api, type BatchScanResponse } from '../api/client';
import {
  UploadCloud,
  FileCheck,
  RotateCcw,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PieChart as PieIcon,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

export const BatchScanner: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BatchScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'label' | 'prob' | 'confidence' | 'urls'>('prob');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setLoading(true);
    setProgress(15);
    setError(null);

    // Simulated progress bar while network payload processes
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 85 ? prev + Math.floor(Math.random() * 15 + 5) : prev));
    }, 180);

    try {
      const res = await api.predictBatch(selectedFiles);
      setProgress(100);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Batch scan failed');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!result || !result.results) return;
    const headers = ['Index', 'Verdict', 'Probability', 'Confidence', 'URLs_Analyzed', 'Top_Threat_Signal'];
    const rows = result.results.map((r, i) => [
      i + 1,
      r.label,
      (r.phishing_probability * 100).toFixed(2) + '%',
      r.confidence_band,
      r.urls_analyzed ? r.urls_analyzed.length : 0,
      r.top_contributing_words && r.top_contributing_words[0] ? `"${r.top_contributing_words[0].feature}"` : '""',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PhishGuard_Batch_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sort & Filter
  const sortedResults = result?.results
    ? [...result.results]
        .filter((r) => {
          if (!searchFilter) return true;
          const query = searchFilter.toLowerCase();
          const matchVerdict = r.label.toLowerCase().includes(query);
          const matchWord = r.top_contributing_words?.some((w) => w.feature.toLowerCase().includes(query));
          return matchVerdict || matchWord;
        })
        .sort((a, b) => {
          let cmp = 0;
          if (sortField === 'prob') cmp = a.phishing_probability - b.phishing_probability;
          else if (sortField === 'label') cmp = a.label.localeCompare(b.label);
          else if (sortField === 'confidence') cmp = a.confidence_band.localeCompare(b.confidence_band);
          else if (sortField === 'urls') cmp = (a.urls_analyzed?.length || 0) - (b.urls_analyzed?.length || 0);
          return sortAsc ? cmp : -cmp;
        })
    : [];

  const donutData = result
    ? [
        { name: 'Safe Verified', value: result.safe_count, color: '#10b981' },
        { name: 'Phishing Threats', value: result.phishing_count, color: '#f43f5e' },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Overview Card */}
      <GlassCard depth={1} className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Batch Threat Scanner
                </h1>
                <Badge variant="indigo" size="sm">Multi-File .EML & CSV</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bulk audit of multiple .eml email files or entire CSV spreadsheets using the champion model
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Upload Zone */}
      <GlassCard depth={2} className="p-8 text-center space-y-4" iridescent>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.eml"
          multiple
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-white/20 rounded-3xl p-8 cursor-pointer hover:border-indigo-500/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-3"
        >
          <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file(s) selected: ${selectedFiles.map((f) => f.name).slice(0, 3).join(', ')}${selectedFiles.length > 3 ? '...' : ''}`
                : 'Click to select CSV or multiple .EML files'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports CSV with email bodies or raw RFC822 .eml messages (Hold Ctrl/Cmd to select multiple)
            </p>
          </div>
        </div>

        {/* Live Progress Bar when Loading */}
        {loading && (
          <div className="space-y-2 max-w-md mx-auto pt-2">
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>Scanning and analyzing threats...</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200/60 dark:bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
              />
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && !loading && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <GlassButton
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => {
                setSelectedFiles([]);
                setResult(null);
              }}
            >
              Reset
            </GlassButton>
            <GlassButton
              variant="primary"
              size="md"
              loading={loading}
              icon={<FileCheck className="w-4 h-4" />}
              onClick={handleUpload}
            >
              Scan {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
            </GlassButton>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </GlassCard>

      {/* Results View */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary KPIs & Summary Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* KPI Tiles (7 cols) */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-2 gap-4">
              <GlassCard depth={2} className="p-5 text-center space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Total Emails Scanned</span>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  <AnimatedNumber value={result.total} />
                </div>
                <span className="text-[10px] text-slate-400">Processed in memory</span>
              </GlassCard>

              <GlassCard depth={2} className="p-5 text-center space-y-1">
                <span className="text-xs font-semibold text-rose-500 uppercase">Phishing Threats</span>
                <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                  <AnimatedNumber value={result.phishing_count} />
                </div>
                <span className="text-[10px] text-slate-400">Flagged for quarantine</span>
              </GlassCard>

              <GlassCard depth={2} className="p-5 text-center space-y-1">
                <span className="text-xs font-semibold text-emerald-500 uppercase">Safe Verified</span>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  <AnimatedNumber value={result.safe_count} />
                </div>
                <span className="text-[10px] text-slate-400">Passed safety threshold</span>
              </GlassCard>

              <GlassCard depth={2} className="p-5 text-center space-y-1">
                <span className="text-xs font-semibold text-indigo-500 uppercase">Threat Ratio</span>
                <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  <AnimatedNumber value={result.phishing_percentage} decimals={1} suffix="%" />
                </div>
                <span className="text-[10px] text-slate-400">Attack prevalence</span>
              </GlassCard>
            </div>

            {/* Summary Donut (5 cols) */}
            <GlassCard depth={2} className="lg:col-span-5 p-5 flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 mb-1">
                <PieIcon className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Threat Composition
                </span>
              </div>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {donutData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any) => [`${val} emails`, 'Count']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Legend verticalAlign="bottom" height={28} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          {/* Results Table with Sort, Filter & CSV Export */}
          <GlassCard depth={2} className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Detailed Batch Scan Ledger ({sortedResults.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click column headers to sort by probability or verdict.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Filter by keyword..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border text-xs bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <GlassButton
                  variant="glass"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleExportCSV}
                >
                  Export CSV
                </GlassButton>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-white/10 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">#</th>
                    <th
                      className="pb-3 font-semibold cursor-pointer hover:text-indigo-500 transition-colors"
                      onClick={() => {
                        setSortField('label');
                        setSortAsc(!sortAsc);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Verdict</span>
                        {sortField === 'label' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      className="pb-3 font-semibold cursor-pointer hover:text-indigo-500 transition-colors"
                      onClick={() => {
                        setSortField('prob');
                        setSortAsc(!sortAsc);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Probability</span>
                        {sortField === 'prob' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      className="pb-3 font-semibold cursor-pointer hover:text-indigo-500 transition-colors"
                      onClick={() => {
                        setSortField('confidence');
                        setSortAsc(!sortAsc);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Confidence</span>
                        {sortField === 'confidence' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th
                      className="pb-3 font-semibold cursor-pointer hover:text-indigo-500 transition-colors"
                      onClick={() => {
                        setSortField('urls');
                        setSortAsc(!sortAsc);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>URLs</span>
                        {sortField === 'urls' ? (
                          sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th className="pb-3 font-semibold">Top Threat Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 font-mono">
                  {sortedResults.map((item, idx) => (
                    <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 text-slate-500">{idx + 1}</td>
                      <td className="py-3 font-sans">
                        <Badge variant={item.is_phishing ? 'phish' : 'safe'} size="sm">
                          {item.label}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <span
                          className={`font-bold ${
                            item.is_phishing ? 'text-rose-500' : 'text-emerald-500'
                          }`}
                        >
                          {(item.phishing_probability * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300 font-sans">
                        {item.confidence_band}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">
                        {item.urls_analyzed ? item.urls_analyzed.length : 0}
                      </td>
                      <td className="py-3 text-slate-500 truncate max-w-[200px]">
                        {item.top_contributing_words && item.top_contributing_words[0] ? (
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {item.top_contributing_words[0].feature}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
};
