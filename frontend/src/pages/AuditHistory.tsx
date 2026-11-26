import React, { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { api, type HistoryItem } from '../api/client';
import { History, Trash2, RotateCcw, Shield, Search, Filter } from 'lucide-react';

export const AuditHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<'All' | 'Phishing' | 'Safe'>('All');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory(100, 0, verdictFilter, search);
      setHistory(data.items);
      setTotal(data.total);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [verdictFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all scan history from SQLite?')) return;
    try {
      await api.clearHistory();
      setHistory([]);
      setTotal(0);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Card */}
      <GlassCard depth={1} className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Audit Trail & Scan Ledger
                </h1>
                <Badge variant="neutral" size="sm">
                  SQLite WAL Persistence
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Privacy-preserving threat logging. Text is never stored by default; cryptographic SHA-256 digests verify verdicts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlassButton
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={fetchHistory}
            >
              Refresh
            </GlassButton>
            {history.length > 0 && (
              <GlassButton
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={handleClear}
              >
                Clear Ledger
              </GlassButton>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Filter and Search Bar */}
      <GlassCard depth={2} className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by hash, subject, sender..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <GlassButton type="submit" variant="primary" size="sm">
              Search
            </GlassButton>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Verdict:</span>
            {(['All', 'Phishing', 'Safe'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVerdictFilter(v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  verdictFilter === v
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-white/70'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </form>
      </GlassCard>

      {/* History Table */}
      <GlassCard depth={2} className="p-6">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/50 dark:border-white/10">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Ledger Records ({total})
          </span>
          <span className="text-xs text-slate-400 font-mono">Top 100 Scans</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Shield className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No audit logs matched your query
            </p>
            <p className="text-xs text-slate-400">
              Emails scanned in the Detection Studio or Batch Scanner will record here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-white/10 text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">Verdict</th>
                  <th className="pb-3 font-semibold">Confidence</th>
                  <th className="pb-3 font-semibold">Probability</th>
                  <th className="pb-3 font-semibold">SHA-256 Digest</th>
                  <th className="pb-3 font-semibold">URLs</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 font-mono">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 text-slate-500 font-sans">
                      {new Date(item.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 font-sans">
                      <Badge variant={item.verdict === 'Phishing' ? 'phish' : 'safe'} size="sm">
                        {item.verdict}
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300 font-sans">
                      {item.confidence_band}
                    </td>
                    <td className="py-3">
                      <span
                        className={`font-bold ${
                          item.verdict === 'Phishing' ? 'text-rose-500' : 'text-emerald-500'
                        }`}
                      >
                        {(item.probability * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 truncate max-w-[160px]" title={item.email_hash}>
                      {item.email_hash ? item.email_hash.substring(0, 16) + '...' : '—'}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{item.url_count}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
