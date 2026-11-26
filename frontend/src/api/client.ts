export interface ScanResult {
  id?: string;
  label: 'Phishing' | 'Safe';
  is_phishing: boolean;
  phishing_probability: number;
  confidence_band: 'High' | 'Medium' | 'Low';
  confidence_score: number;
  extracted_features: {
    url_count: number;
    has_ip_url: number;
    url_shortener_count: number;
    suspicious_tld_count: number;
    http_ratio: number;
    anchor_mismatch: number;
    urgency_words: number;
    money_words: number;
    credential_words: number;
    all_caps_ratio: number;
    exclamation_count: number;
    attachment_mentions: number;
    header_sender_mismatch: number;
    [key: string]: number;
  };
  top_contributing_words: Array<{
    feature: string;
    weight: number;
    type: 'token' | 'heuristic';
    direction: 'phishing' | 'safe';
  }>;
  urls_analyzed: Array<{
    url: string;
    is_suspicious: boolean;
    reasons: string[];
    domain: string;
  }>;
  timestamp?: string;
}

export interface BatchScanResponse {
  total: number;
  phishing_count: number;
  safe_count: number;
  phishing_percentage: number;
  results: ScanResult[];
}

export interface ModelEvaluation {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  false_positive_rate: number;
  false_negative_rate: number;
  confusion_matrix: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
    matrix: number[][];
  };
  classification_report: Record<string, any>;
  roc_curve: {
    fpr: number[];
    tpr: number[];
  };
}

export interface MetricsData {
  generated_at: string;
  champion_model: string;
  dataset_statistics: {
    total_clean_samples: number;
    phishing_samples: number;
    safe_samples: number;
    phishing_percentage: number;
    safe_percentage: number;
    train_samples: number;
    val_samples: number;
    test_samples: number;
  };
  data_leakage_audit: {
    train_samples: number;
    val_samples: number;
    test_samples: number;
    train_unique: number;
    val_unique: number;
    test_unique: number;
    train_val_leakage_count: number;
    train_test_leakage_count: number;
    val_test_leakage_count: number;
    leakage_detected: boolean;
  };
  overfitting_audit: {
    train_accuracy: number;
    val_accuracy: number;
    test_accuracy: number;
    train_val_gap: number;
    train_test_gap: number;
    is_overfitting: boolean;
    threshold: number;
  };
  champion_metrics: ModelEvaluation;
  cross_validation_results: Record<
    string,
    {
      fold_f1_scores: number[];
      mean_cv_f1: number;
      std_cv_f1: number;
    }
  >;
  all_model_evaluations: ModelEvaluation[];
  top_explainability_features: {
    phishing_indicators: Array<{ feature: string; weight: number }>;
    safe_indicators: Array<{ feature: string; weight: number }>;
  };
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  email_hash: string;
  verdict: 'Phishing' | 'Safe';
  probability: number;
  confidence_band: string;
  url_count: number;
  preview: string;
}

const API_BASE = '/api';

function normalizeScanResult(raw: any): ScanResult {
  // Normalize top contributing features/words
  const rawFeatures = raw.top_contributing_features || raw.top_contributing_words || [];
  const top_contributing_words = rawFeatures.map((f: any) => {
    let cleanFeature = f.feature || '';
    let fType: 'token' | 'heuristic' = f.type || 'token';
    if (cleanFeature.toLowerCase().startsWith('heuristic: ')) {
      fType = 'heuristic';
      cleanFeature = cleanFeature.replace(/^heuristic:\s*/i, '');
    } else if (cleanFeature.toLowerCase().startsWith('keyword: ')) {
      fType = 'token';
      cleanFeature = cleanFeature.replace(/^keyword:\s*/i, '');
    } else if (cleanFeature.toLowerCase().startsWith('word: ')) {
      fType = 'token';
      cleanFeature = cleanFeature.replace(/^word:\s*/i, '');
    }

    const weight = typeof f.contribution === 'number' ? f.contribution : (f.weight || 0);
    const rawDir = (f.direction || '').toLowerCase();
    const direction = rawDir.includes('phish') ? 'phishing' : 'safe';

    return {
      feature: cleanFeature,
      weight,
      type: fType,
      direction,
    };
  });

  // Normalize URLs analyzed
  const urls_analyzed = (raw.urls_analyzed || []).map((u: any) => {
    let reasons: string[] = [];
    if (Array.isArray(u.risk_reasons)) reasons = u.risk_reasons;
    else if (Array.isArray(u.reasons)) reasons = u.reasons;

    const isSuspicious =
      typeof u.is_suspicious === 'boolean'
        ? u.is_suspicious
        : (u.risk_level === 'Malicious' || u.risk_level === 'Suspicious' || reasons.length > 0);

    let domain = u.domain || '';
    if (!domain && u.url) {
      try {
        const full = u.url.startsWith('http') ? u.url : `http://${u.url}`;
        domain = new URL(full).hostname;
      } catch {
        domain = u.url;
      }
    }

    return {
      url: u.url || '',
      is_suspicious: isSuspicious,
      reasons,
      domain,
    };
  });

  // Normalize confidence band
  const rawBand = raw.confidence_band || 'Medium';
  let confidence_band: 'High' | 'Medium' | 'Low' = 'Medium';
  if (rawBand.toLowerCase().includes('high') || rawBand.toLowerCase().includes('critical')) {
    confidence_band = 'High';
  } else if (rawBand.toLowerCase().includes('low') || rawBand.toLowerCase().includes('safe')) {
    confidence_band = 'Low';
  }

  return {
    id: raw.scan_id || raw.id,
    label: raw.label === 'Phishing' ? 'Phishing' : 'Safe',
    is_phishing: Boolean(raw.is_phishing),
    phishing_probability: Number(raw.phishing_probability || 0),
    confidence_band,
    confidence_score: Number(raw.confidence_score || 0),
    extracted_features: raw.extracted_features || {},
    top_contributing_words,
    urls_analyzed,
    timestamp: raw.timestamp,
  };
}

export const api = {
  predict: async (text: string, save_content: boolean = false): Promise<ScanResult> => {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, save_content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Prediction failed' }));
      throw new Error(err.detail || 'Failed to predict email');
    }
    const data = await res.json();
    return normalizeScanResult(data);
  },

  predictBatch: async (files: File[] | File): Promise<BatchScanResponse> => {
    const formData = new FormData();
    const fileList = Array.isArray(files) ? files : [files];
    if (fileList.length === 1 && fileList[0].name.toLowerCase().endsWith('.csv')) {
      formData.append('file', fileList[0]);
    } else {
      fileList.forEach((f) => formData.append('files', f));
    }
    const res = await fetch(`${API_BASE}/predict/batch`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Batch scan failed' }));
      throw new Error(err.detail || 'Batch analysis failed');
    }
    const data = await res.json();
    const results = (data.results || []).map((r: any) => normalizeScanResult(r));
    return {
      total: data.total_processed || data.total || results.length,
      phishing_count: data.phishing_count || results.filter((r: any) => r.is_phishing).length,
      safe_count: data.safe_count || results.filter((r: any) => !r.is_phishing).length,
      phishing_percentage:
        data.phishing_percentage !== undefined
          ? data.phishing_percentage
          : results.length > 0
          ? ((results.filter((r: any) => r.is_phishing).length / results.length) * 100)
          : 0,
      results,
    };
  },

  getMetrics: async (): Promise<MetricsData> => {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error('Failed to fetch system metrics');
    return res.json();
  },

  getHistory: async (
    limit = 50,
    offset = 0,
    verdict?: string,
    search?: string
  ): Promise<{ total: number; items: HistoryItem[] }> => {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    if (verdict && verdict !== 'All') params.set('verdict', verdict);
    if (search && search.trim()) params.set('search', search.trim());

    const res = await fetch(`${API_BASE}/history?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch scan history');
    return res.json();
  },

  deleteHistoryItem: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete history record');
  },

  clearHistory: async (): Promise<void> => {
    const res = await fetch(`${API_BASE}/history/clear`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to clear history');
  },
};
