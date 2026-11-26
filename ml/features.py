"""
Feature extraction pipeline for PhishGuard AI.
Extracts:
1. URL threat signals (IP domains, shorteners, @ redirects, excessive subdomains, suspicious TLDs, length, HTTP vs HTTPS, anchor text mismatch).
2. Content threat heuristics (urgency words, financial/prize lure words, credential harvesting phrases, ALL-CAPS ratio, exclamation marks, attachment mentions, header sender/reply-to mismatches).
3. Textual TF-IDF features (unigrams & bigrams with stop-word filtering).
4. Unified Scikit-Learn Pipeline combining text and handcrafted features without data leakage.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from urllib.parse import urlparse

import numpy as np
from bs4 import BeautifulSoup
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import MaxAbsScaler

# Common URL Shortener Services
SHORTENER_DOMAINS = {
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "is.gd",
    "buff.ly",
    "adf.ly",
    "bit.do",
    "mcaf.ee",
    "su.pr",
    "tiny.cc",
    "rb.gy",
    "rebrand.ly",
    "cutt.ly",
    "shorte.st",
}

# High-Abuse / Suspicious Top Level Domains frequently associated with phishing
SUSPICIOUS_TLDS = {
    "xyz",
    "top",
    "club",
    "work",
    "ru",
    "tk",
    "ml",
    "ga",
    "cf",
    "gq",
    "buzz",
    "cam",
    "fit",
    "surf",
    "country",
    "stream",
    "gdn",
    "mom",
    "bid",
    "loan",
    "date",
    "faith",
    "review",
    "zip",
    "mov",
    "click",
    "link",
}

# Pre-compiled high-performance combined regex patterns
URGENCY_REGEX = re.compile(
    r"\b(?:urgent|verify|suspended|immediately|immediate action|action required|freeze|locked|terminate|within 24 hours|expires|final notice|restriction|unauthorized|compromised)\b",
    re.IGNORECASE,
)

MONEY_REGEX = re.compile(
    r"\b(?:prize|lottery|winner|dollars|million|bonus|claim|refund|wire transfer|inheritance|reward|cash|payout|crypto|bitcoin|btc|beneficiary)\b",
    re.IGNORECASE,
)

CREDENTIAL_REGEX = re.compile(
    r"\b(?:password|login|account|credentials|username|verify your|reset password|sign in|pin|ssn|social security|bank account|identity|update your billing|security code)\b",
    re.IGNORECASE,
)

ATTACHMENT_REGEX = re.compile(
    r"\b(?:attached|attachment|invoice|\.pdf|\.zip|\.exe|\.iso|\.docx?|\.xlsx?|\.scr|\.vbs|view document|download file)\b",
    re.IGNORECASE,
)

UPPER_LETTER_REGEX = re.compile(r"[A-Z]")
ALPHA_LETTER_REGEX = re.compile(r"[a-zA-Z]")
ANCHOR_REGEX = re.compile(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)
DOMAIN_IN_TEXT_REGEX = re.compile(r"([a-z0-9-]+\.[a-z]{2,})", re.IGNORECASE)
FROM_REGEX = re.compile(r"(?:^|\n)from:\s*(?:.*?<([^>]+)>|([^\s@]+@[^\s@]+))", re.IGNORECASE)
REPLY_TO_REGEX = re.compile(r"(?:^|\n)reply-to:\s*(?:.*?<([^>]+)>|([^\s@]+@[^\s@]+))", re.IGNORECASE)

URL_REGEX = re.compile(
    r"(?:https?://|ftp://|www\.)[^\s<>\"]+|(?:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^\s<>\"]*)?)",
    re.IGNORECASE,
)
IPV4_REGEX = re.compile(r"^(\d{1,3}\.){3}\d{1,3}(?::\d+)?$")


def extract_raw_urls(text: str) -> List[str]:
    """Extracts candidate URLs from raw text or HTML."""
    if not text:
        return []
    matches = URL_REGEX.findall(text)
    urls = []
    for m in matches:
        m = m.strip(".,;:?!'\"()[]{}<>")
        if not m:
            continue
        # Filter out common email addresses incorrectly matched as domains
        if "@" in m and not m.lower().startswith(("http://", "https://")):
            continue
        urls.append(m)
    return urls


def check_anchor_text_mismatch(text: str) -> int:
    """
    Checks if an HTML link has anchor text displaying one domain (e.g. paypal.com)
    while href actually points to a different target (e.g. evil-phish.xyz).
    Returns 1 if mismatch found, 0 otherwise.
    """
    if not text or "<a" not in text.lower():
        return 0

    for match in ANCHOR_REGEX.finditer(text):
        href = match.group(1).strip().lower()
        anchor_text = match.group(2).strip().lower()
        domain_match = DOMAIN_IN_TEXT_REGEX.search(anchor_text)
        if domain_match:
            anchor_domain = domain_match.group(1)
            try:
                parsed_href = urlparse(href if "://" in href else "http://" + href)
                href_domain = parsed_href.netloc or parsed_href.path
            except (ValueError, Exception):
                continue
            if anchor_domain not in href_domain and href_domain not in anchor_domain:
                return 1
    return 0


def check_header_mismatch(text: str) -> int:
    """
    Checks if email contains raw headers with a mismatch between From: and Reply-To: (or Return-Path:).
    Returns 1 if mismatch detected, 0 otherwise.
    """
    if not text or "from:" not in text.lower():
        return 0

    from_match = FROM_REGEX.search(text)
    reply_to_match = REPLY_TO_REGEX.search(text)

    if from_match and reply_to_match:
        from_email = (from_match.group(1) or from_match.group(2) or "").lower().strip()
        reply_to_email = (reply_to_match.group(1) or reply_to_match.group(2) or "").lower().strip()
        from_domain = from_email.split("@")[-1] if "@" in from_email else ""
        reply_domain = reply_to_email.split("@")[-1] if "@" in reply_to_email else ""
        if from_domain and reply_domain and from_domain != reply_domain:
            return 1

    return 0


def extract_url_features(text: str) -> Dict[str, Union[int, float]]:
    """
    Analyzes URLs in email text/HTML and returns engineered numerical features:
    - url_count: total number of URLs
    - has_ip_url: 1 if any URL uses an IPv4 address instead of a domain
    - url_shortener_count: number of shortened URLs
    - at_symbol_in_url: 1 if '@' is in any URL (used to obscure host)
    - excessive_subdomains: 1 if any URL has >= 3 subdomain parts
    - suspicious_tld_count: number of URLs ending with suspicious TLDs (.xyz, .top, .ru, etc.)
    - very_long_url_count: number of URLs > 75 characters
    - http_ratio: ratio of insecure http:// URLs to total URLs
    - anchor_mismatch: 1 if anchor text differs from actual target href
    """
    urls = extract_raw_urls(text)
    anchor_mismatch = check_anchor_text_mismatch(text)

    if not urls:
        return {
            "url_count": 0,
            "has_ip_url": 0,
            "url_shortener_count": 0,
            "at_symbol_in_url": 0,
            "excessive_subdomains": 0,
            "suspicious_tld_count": 0,
            "very_long_url_count": 0,
            "http_ratio": 0.0,
            "anchor_mismatch": anchor_mismatch,
        }

    url_count = len(urls)
    has_ip = 0
    shortener_count = 0
    at_symbol = 0
    excessive_subdomains = 0
    suspicious_tlds = 0
    very_long = 0
    http_count = 0

    for u in urls:
        full_u = u if re.match(r"^[a-zA-Z]+://", u) else f"http://{u}"
        try:
            parsed = urlparse(full_u)
            netloc = parsed.netloc.split(":")[0].lower()
        except (ValueError, Exception):
            continue

        # IP address domain
        if IPV4_REGEX.match(netloc):
            has_ip = 1

        # URL shorteners
        if any(shortener in netloc for shortener in SHORTENER_DOMAINS):
            shortener_count += 1

        # '@' in URL
        if "@" in u:
            at_symbol = 1

        # Subdomains check: netloc split by dot
        parts = [p for p in netloc.split(".") if p]
        if len(parts) >= 4 and not IPV4_REGEX.match(netloc):
            # e.g., login.paypal.com.attacker.xyz
            excessive_subdomains = 1

        # Suspicious TLDs
        if parts:
            tld = parts[-1].lower()
            if tld in SUSPICIOUS_TLDS:
                suspicious_tlds += 1

        # Length > 75
        if len(u) > 75:
            very_long += 1

        # HTTP vs HTTPS
        if full_u.lower().startswith("http://"):
            http_count += 1

    http_ratio = round(http_count / url_count, 3)

    return {
        "url_count": url_count,
        "has_ip_url": has_ip,
        "url_shortener_count": shortener_count,
        "at_symbol_in_url": at_symbol,
        "excessive_subdomains": excessive_subdomains,
        "suspicious_tld_count": suspicious_tlds,
        "very_long_url_count": very_long,
        "http_ratio": http_ratio,
        "anchor_mismatch": anchor_mismatch,
    }


def extract_content_features(text: str) -> Dict[str, Union[int, float]]:
    """
    Analyzes email textual content and returns threat heuristics:
    - urgency_words: count of urgency-inducing terms (urgent, verify, suspended, immediately)
    - money_words: count of prize, lottery, wire transfer keywords
    - credential_words: count of credential requests (password, login, account, ssn)
    - all_caps_ratio: ratio of uppercase letters to total alphabetic letters
    - exclamation_count: count of exclamation marks
    - attachment_mentions: 1 if attachments are mentioned/solicited
    - header_sender_mismatch: 1 if From and Reply-To headers disagree
    """
    if not text:
        return {
            "urgency_words": 0,
            "money_words": 0,
            "credential_words": 0,
            "all_caps_ratio": 0.0,
            "exclamation_count": 0,
            "attachment_mentions": 0,
            "header_sender_mismatch": 0,
        }

    # Keyword counts using precompiled combined regex patterns
    urgency_count = len(URGENCY_REGEX.findall(text))
    money_count = len(MONEY_REGEX.findall(text))
    credential_count = len(CREDENTIAL_REGEX.findall(text))
    attachment_count = 1 if ATTACHMENT_REGEX.search(text) else 0

    # Fast ALL-CAPS ratio
    n_upper = len(UPPER_LETTER_REGEX.findall(text))
    n_alpha = len(ALPHA_LETTER_REGEX.findall(text))
    all_caps_ratio = round(n_upper / n_alpha, 4) if n_alpha > 0 else 0.0

    # Exclamation count
    exclamation_count = text.count("!")

    # Sender header mismatch
    header_mismatch = check_header_mismatch(text)

    return {
        "urgency_words": urgency_count,
        "money_words": money_count,
        "credential_words": credential_count,
        "all_caps_ratio": all_caps_ratio,
        "exclamation_count": exclamation_count,
        "attachment_mentions": attachment_count,
        "header_sender_mismatch": header_mismatch,
    }


_HEURISTIC_CACHE: Dict[int, Dict[str, Union[int, float]]] = {}


def extract_all_features_dict(text: str) -> Dict[str, Union[int, float]]:
    """Combines URL and Content features into a single dictionary with hash memoization."""
    h = hash(text)
    cached = _HEURISTIC_CACHE.get(h)
    if cached is not None:
        return cached

    url_feats = extract_url_features(text)
    content_feats = extract_content_features(text)
    combined = {**url_feats, **content_feats}
    if len(_HEURISTIC_CACHE) < 100000:
        _HEURISTIC_CACHE[h] = combined
    return combined


FEATURE_NAMES = [
    "url_count",
    "has_ip_url",
    "url_shortener_count",
    "at_symbol_in_url",
    "excessive_subdomains",
    "suspicious_tld_count",
    "very_long_url_count",
    "http_ratio",
    "anchor_mismatch",
    "urgency_words",
    "money_words",
    "credential_words",
    "all_caps_ratio",
    "exclamation_count",
    "attachment_mentions",
    "header_sender_mismatch",
]


class HeuristicFeatureExtractor(BaseEstimator, TransformerMixin):
    """
    Scikit-learn Transformer that extracts handcrafted URL and content features
    from raw email text, producing a 2D numpy array of shape (n_samples, n_features).
    """

    def __init__(self) -> None:
        self.feature_names_ = FEATURE_NAMES

    def fit(self, X: Any, y: Optional[Any] = None) -> "HeuristicFeatureExtractor":
        return self

    def transform(self, X: Any) -> np.ndarray:
        if hasattr(X, "tolist"):
            texts = X.tolist()
        elif isinstance(X, (list, tuple)):
            texts = list(X)
        else:
            texts = [str(X)]

        matrix = np.zeros((len(texts), len(self.feature_names_)), dtype=np.float32)

        for i, text in enumerate(texts):
            feats = extract_all_features_dict(str(text))
            for j, fname in enumerate(self.feature_names_):
                matrix[i, j] = feats.get(fname, 0.0)

        return matrix

    def get_feature_names_out(self, input_features: Optional[Sequence[str]] = None) -> np.ndarray:
        return np.array(self.feature_names_)


def build_phishing_pipeline(
    classifier: Optional[Any] = None,
    max_tfidf_features: int = 5000,
    ngram_range: Tuple[int, int] = (1, 2),
) -> Pipeline:
    """
    Builds a unified scikit-learn Pipeline combining:
    - Text TF-IDF Vectorizer (unigrams + bigrams, stop words, sublinear TF)
    - Heuristic Feature Extractor (URL + Content threat heuristics) + StandardScaler
    - Optional classification estimator

    Guarantees zero data leakage: vocabulary, IDF weights, and heuristic scaling
    are learned strictly during `pipeline.fit()` on the training set.
    """
    feature_union = FeatureUnion(
        transformer_list=[
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=ngram_range,
                    max_features=max_tfidf_features,
                    stop_words="english",
                    sublinear_tf=True,
                ),
            ),
            (
                "heuristics",
                Pipeline(
                    steps=[
                        ("extractor", HeuristicFeatureExtractor()),
                        ("scaler", MaxAbsScaler()),
                    ]
                ),
            ),
        ]
    )

    steps: List[Tuple[str, Any]] = [("features", feature_union)]
    if classifier is not None:
        steps.append(("classifier", classifier))

    return Pipeline(steps=steps)
