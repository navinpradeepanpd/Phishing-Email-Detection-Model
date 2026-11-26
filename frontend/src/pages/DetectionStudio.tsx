import React, { useState, useRef } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassTextarea } from '../components/ui/GlassInput';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { Badge } from '../components/ui/Badge';
import { Tooltip } from '../components/ui/Tooltip';
import { CircularGlassGauge } from '../components/ui/CircularGlassGauge';
import { SuspiciousTextHighlighter } from '../components/ui/SuspiciousTextHighlighter';
import { FeatureContributionChart } from '../components/ui/FeatureContributionChart';
import { PRESET_EMAILS, type PresetEmail } from '../data/presetEmails';
import { api, type ScanResult } from '../api/client';
import {
  Zap,
  RotateCcw,
  Lock,
  Link as LinkIcon,
  HelpCircle,
  FileText,
  UploadCloud,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DetectionStudio: React.FC = () => {
  const [emailText, setEmailText] = useState(PRESET_EMAILS[0].body);
  const [saveContent, setSaveContent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter 1 phishing and 1 safe preset for the required "Try example" dropdown
  const phishingExample = PRESET_EMAILS.find((e) => e.type === 'phishing') || PRESET_EMAILS[0];
  const safeExample = PRESET_EMAILS.find((e) => e.type === 'safe') || PRESET_EMAILS[3];

  const handleScan = async () => {
    if (!emailText.trim()) return;
    setLoading(true);
    setError(null);
    setAriaAnnouncement('Scanning email text and extracting threat features...');
    try {
      const res = await api.predict(emailText, saveContent);
      setResult(res);

      const verdictStr = res.is_phishing
        ? 'PHISHING threat detected'
        : res.phishing_probability > 0.4
        ? 'SUSPICIOUS email under review'
        : 'SAFE legitimate email';
      setAriaAnnouncement(
        `Scan complete. Verdict: ${verdictStr}. Phishing probability: ${(
          res.phishing_probability * 100
        ).toFixed(1)} percent with ${res.confidence_band} confidence.`
      );
    } catch (err: any) {
      const msg = err.message || 'Error scanning email';
      setError(msg);
      setAriaAnnouncement(`Scan error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: PresetEmail) => {
    setEmailText(preset.body);
    setResult(null);
    setError(null);
    setDropdownOpen(false);
    setAriaAnnouncement(`Loaded sample: ${preset.title}`);
  };

  const handleFileDrop = (file: File) => {
    if (!file) return;
    if (file.name.endsWith('.eml') || file.type.includes('text') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          setEmailText(content);
          setResult(null);
          setError(null);
          setAriaAnnouncement(`Imported file: ${file.name}`);
        }
      };
      reader.readAsText(file);
    } else {
      setError('Please upload a .eml or text file');
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileDrop(e.dataTransfer.files[0]);
    }
  };

  // Derive tri-state verdict: SAFE / PHISHING / SUSPICIOUS
  const getTriVerdict = (res: ScanResult): 'SAFE' | 'PHISHING' | 'SUSPICIOUS' => {
    if (res.phishing_probability >= 0.65) return 'PHISHING';
    if (res.phishing_probability <= 0.35) return 'SAFE';
    return 'SUSPICIOUS';
  };

  return (
    <div className="space-y-8">
      {/* ARIA Live Region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {ariaAnnouncement}
      </div>

      {/* Hidden File Input for .eml upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleFileDrop(e.target.files[0])}
        accept=".eml,.txt"
        className="hidden"
      />

      {/* HERO SECTION: Input Console */}
      <GlassCard depth={2} className="p-6 sm:p-8 space-y-6" iridescent>
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileText className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Analyze Email
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Paste an email, subject, or full RFC822 headers, or drop a raw <code className="font-mono text-indigo-500">.eml</code> message
            </p>
          </div>

          {/* "Try example" Dropdown & Presets */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-semibold backdrop-blur-glass bg-white/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border-white/60 dark:border-white/10 shadow-sm hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <span>Try example</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute right-0 mt-2 w-72 rounded-2xl border backdrop-blur-glass bg-white/90 dark:bg-slate-900/90 border-white/80 dark:border-white/10 shadow-xl p-2 z-30 space-y-1"
                >
                  <button
                    onClick={() => handleSelectPreset(phishingExample)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-rose-500/10 dark:hover:bg-rose-500/15 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        Phishing Example
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {phishingExample.title}
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectPreset(safeExample)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Safe Example
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {safeExample.title}
                    </p>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Text Area & Drag-and-Drop Zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative rounded-3xl border transition-all duration-300 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 ring-4 ring-indigo-500/20'
              : 'border-white/60 dark:border-white/10'
          }`}
        >
          <GlassTextarea
            rows={10}
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder="Paste an email, subject, or full headers here... Or drag & drop a .eml file anywhere inside this box."
            aria-label="Email content input"
            className="border-0 bg-transparent rounded-3xl shadow-none p-5"
          />

          {/* Quick .eml file trigger in corner */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-200/40 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] rounded-b-3xl">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-slate-400" />
              <span>Or click to upload <strong>.eml</strong> file</span>
            </button>
            <span className="text-[11px] font-mono text-slate-400">
              {emailText.length.toLocaleString()} characters
            </span>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={!saveContent}
              onChange={(val) => setSaveContent(!val)}
              label="Zero-Storage Mode"
            />
            <Tooltip content="Privacy safeguard: Only the SHA-256 fingerprint is recorded. Raw body text is never stored.">
              <Lock className="w-4 h-4 text-slate-400 cursor-help" />
            </Tooltip>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <GlassButton
              variant="ghost"
              size="md"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => {
                setEmailText('');
                setResult(null);
                setAriaAnnouncement('Cleared email content');
              }}
            >
              Clear
            </GlassButton>

            {/* Glowing Morphing Analyze Button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <GlassButton
                variant="primary"
                size="lg"
                loading={loading}
                icon={<Zap className="w-4 h-4 fill-white" />}
                onClick={handleScan}
                className="w-full sm:w-auto shadow-[0_0_24px_rgba(99,102,241,0.45)] hover:shadow-[0_0_32px_rgba(99,102,241,0.6)]"
              >
                {loading ? 'Analyzing Signals...' : 'Analyze Threat'}
              </GlassButton>
            </motion.div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </GlassCard>

      {/* RESULT PANEL (Animates in with Framer Motion spring) */}
      <AnimatePresence>
        {result && (
          <motion.div
            key="analysis-result"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="space-y-6"
          >
            {/* Top Verdict & Probability Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Circular Gauge Card (5 cols) */}
              <GlassCard depth={3} className="md:col-span-5 p-6 flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Phishing Threat Probability
                </span>

                <CircularGlassGauge
                  probability={result.phishing_probability}
                  verdict={getTriVerdict(result)}
                  confidence={`${result.confidence_band} Confidence`}
                  size={210}
                />

                <div className="flex flex-col items-center gap-1.5 pt-1">
                  <Badge
                    variant={
                      getTriVerdict(result) === 'PHISHING'
                        ? 'phish'
                        : getTriVerdict(result) === 'SUSPICIOUS'
                        ? 'warn'
                        : 'safe'
                    }
                    pulse
                    size="md"
                    className="text-sm px-4 py-1.5"
                  >
                    VERDICT: {getTriVerdict(result)}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Evaluated by Scikit-Learn Champion Pipeline (Acc 98.1%)
                  </span>
                </div>
              </GlassCard>

              {/* "Why this verdict" Card (7 cols) */}
              <GlassCard depth={2} className="md:col-span-7 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Why this verdict: Feature Attribution
                    </h2>
                  </div>
                  <Tooltip content="Linear feature weight contributions computed in real-time from the trained pipeline coefficients">
                    <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Diverging signals pushing toward safe (left, green) or phishing (right, coral).
                </p>

                <FeatureContributionChart features={result.top_contributing_words} />
              </GlassCard>
            </div>

            {/* Email Text with Suspicious Phrases Highlighted */}
            <GlassCard depth={2} className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Semantic Heatmap Inspection
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Hover over highlighted phrases to view their threat weights
                </span>
              </div>

              <SuspiciousTextHighlighter
                text={emailText}
                contributions={result.top_contributing_words}
              />
            </GlassCard>

            {/* URL Risk Chips & Security Analysis */}
            {result.urls_analyzed && result.urls_analyzed.length > 0 && (
              <GlassCard depth={2} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Extracted Links & URL Risk Chips ({result.urls_analyzed.length})
                    </h3>
                  </div>
                  <Badge variant="neutral" size="sm">
                    Offline String & Regex Analysis
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.urls_analyzed.map((urlObj, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border space-y-2 ${
                        urlObj.is_suspicious
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-100'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold truncate max-w-[240px]">
                          {urlObj.url}
                        </span>
                        <Badge variant={urlObj.is_suspicious ? 'phish' : 'safe'} size="sm">
                          {urlObj.is_suspicious ? 'THREAT RISK' : 'SAFE DOMAIN'}
                        </Badge>
                      </div>

                      {urlObj.reasons && urlObj.reasons.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {urlObj.reasons.map((reason, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Domain ({urlObj.domain || 'standard'}) exhibits standard structure with HTTPS.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Strict Safety Guarantee Notice */}
            <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <Info className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <strong className="text-slate-900 dark:text-white">Strict Safety Note:</strong>{' '}
                Links and domains are analyzed entirely via offline pattern matching and cryptographic checks. They are{' '}
                <strong>never fetched, visited, or resolved</strong> over the live network.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
