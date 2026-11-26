"""
Inference engine, feature attribution, and threat analysis service for PhishGuard AI.
Loads serialized pipeline, performs zero-network URL inspection, computes exact
local linear feature contributions, and parses individual or batch emails.
"""

from __future__ import annotations

import email
import hashlib
import json
import logging
import re
import time
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from urllib.parse import urlparse

import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from backend.config import METRICS_PATH, MODEL_PATH
from backend.database import save_scan_result
from backend.schemas import (
    BatchPredictResponse,
    FeatureContribution,
    PredictResponse,
    UrlRiskAnalysis,
)
from ml.data_loader import clean_html_and_text, detect_and_normalize_columns
from ml.features import (
    FEATURE_NAMES,
    IPV4_REGEX,
    SHORTENER_DOMAINS,
    SUSPICIOUS_TLDS,
    extract_all_features_dict,
    extract_raw_urls,
)

logger = logging.getLogger("PhishGuard.Service")


def compute_sha256(text: str) -> str:
    """Returns SHA-256 hex digest of email text."""
    return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()


def analyze_url_risk_offline(url: str) -> UrlRiskAnalysis:
    """
    Performs purely offline, static syntactic inspection of a URL.
    STRICT SECURITY RULE: Never fetches, curls, resolves, or opens any URL.
    """
    reasons: List[str] = []
    is_ip = False
    is_shortener = False
    is_suspicious_tld = False
    has_at_symbol = "@" in url
    is_excessive_subdomains = False

    full_u = url if re.match(r"^[a-zA-Z]+://", url) else f"http://{url}"
    is_https = full_u.lower().startswith("https://")

    try:
        parsed = urlparse(full_u)
        netloc = parsed.netloc.split(":")[0].lower()
    except (ValueError, Exception):
        netloc = ""

    if IPV4_REGEX.match(netloc):
        is_ip = True
        reasons.append("URL uses raw IP address instead of domain name")

    if any(s in netloc for s in SHORTENER_DOMAINS):
        is_shortener = True
        reasons.append("URL uses an anonymizing link shortener service")

    if has_at_symbol:
        reasons.append("URL contains '@' redirect syntax designed to deceive users")

    parts = [p for p in netloc.split(".") if p]
    if len(parts) >= 4 and not IPV4_REGEX.match(netloc):
        is_excessive_subdomains = True
        reasons.append(f"Excessive subdomain depth ({len(parts)-2} subdomains)")

    if parts:
        tld = parts[-1].lower()
        if tld in SUSPICIOUS_TLDS:
            is_suspicious_tld = True
            reasons.append(f"Suspicious / high-abuse top-level domain (.{tld})")

    if not is_https:
        reasons.append("Insecure plain HTTP protocol (no TLS encryption)")

    if is_ip or has_at_symbol or is_shortener or (is_suspicious_tld and not is_https):
        risk_level = "Malicious"
    elif is_suspicious_tld or is_excessive_subdomains or not is_https:
        risk_level = "Suspicious"
    else:
        risk_level = "Neutral"

    return UrlRiskAnalysis(
        url=url,
        is_ip=is_ip,
        is_shortener=is_shortener,
        is_suspicious_tld=is_suspicious_tld,
        has_at_symbol=has_at_symbol,
        is_https=is_https,
        is_excessive_subdomains=is_excessive_subdomains,
        risk_level=risk_level,
        risk_reasons=reasons,
    )


class PhishGuardModelService:
    """
    Singleton service managing the trained model pipeline and evaluation metrics.
    """

    def __init__(self) -> None:
        self.pipeline: Optional[Pipeline] = None
        self.metrics: Dict[str, Any] = {}
        self.feature_names: List[str] = []
        self.feature_weights: Optional[np.ndarray] = None
        self.intercept: float = 0.0
        self.is_ready: bool = False

    def load(self) -> None:
        """Loads serialized model and metrics from disk."""
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained model not found at {MODEL_PATH}. Run 'python ml/train.py' first."
            )
        if not METRICS_PATH.exists():
            raise FileNotFoundError(
                f"Metrics file not found at {METRICS_PATH}. Run 'python ml/train.py' first."
            )

        logger.info(f"Loading trained model pipeline from {MODEL_PATH}...")
        self.pipeline = joblib.load(MODEL_PATH)

        logger.info(f"Loading model metrics from {METRICS_PATH}...")
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            self.metrics = json.load(f)

        # Index linear feature names and weights for local explainability
        feature_union = self.pipeline.named_steps.get("features")
        classifier = self.pipeline.named_steps.get("classifier")

        all_names: List[str] = []
        if feature_union is not None:
            for name, trans in feature_union.transformer_list:
                if hasattr(trans, "get_feature_names_out"):
                    sub = trans.get_feature_names_out()
                    all_names.extend([f"{name}__{fn}" for fn in sub])
                elif hasattr(trans, "named_steps") and "extractor" in trans.named_steps:
                    sub = trans.named_steps["extractor"].get_feature_names_out()
                    all_names.extend([f"{name}__{fn}" for fn in sub])
                else:
                    all_names.extend([f"{name}__feat_{i}" for i in range(16)])

        self.feature_names = all_names

        if hasattr(classifier, "coef_"):
            self.feature_weights = classifier.coef_.ravel()
            self.intercept = float(getattr(classifier, "intercept_", [0.0])[0])
        else:
            self.feature_weights = None

        self.is_ready = True
        logger.info(
            f"PhishGuardModelService loaded successfully with {len(self.feature_names)} features. "
            f"Champion: {self.metrics.get('champion_model')}"
        )

    def explain_prediction(
        self, text: str, top_k: int = 8
    ) -> List[FeatureContribution]:
        """
        Computes exact local linear feature contributions: contribution_j = weight_j * feature_value_j.
        Positive values push toward Phishing; negative values push toward Safe.
        """
        if self.pipeline is None or self.feature_weights is None:
            return []

        features_step = self.pipeline.named_steps.get("features")
        if features_step is None:
            return []

        # Vectorize single input
        vec = features_step.transform([text])
        if hasattr(vec, "tocsr"):
            csr = vec.tocsr()
            indices = csr.indices
            data = csr.data
        else:
            arr = np.asarray(vec).ravel()
            indices = np.where(arr != 0)[0]
            data = arr[indices]

        contributions: List[Tuple[str, float]] = []
        for idx, val in zip(indices, data):
            if idx < len(self.feature_weights) and idx < len(self.feature_names):
                weight = float(self.feature_weights[idx])
                contrib = float(weight * val)
                fname = self.feature_names[idx]
                contributions.append((fname, contrib))

        # Sort by absolute impact
        contributions.sort(key=lambda x: abs(x[1]), reverse=True)

        results: List[FeatureContribution] = []
        for fname, contrib in contributions[:top_k]:
            direction = (
                "Phishing Indicator" if contrib > 0 else "Safe Indicator"
            )
            clean_name = (
                fname.replace("tfidf__", "Keyword: ")
                .replace("heuristics__", "Heuristic: ")
            )

            if "urgency_words" in fname:
                desc = "Urgency-inducing language detected in email content"
            elif "all_caps_ratio" in fname:
                desc = "High proportion of capitalized letters indicates pressure"
            elif "has_ip_url" in fname:
                desc = "Direct IP address link used instead of domain"
            elif "suspicious_tld" in fname:
                desc = "URL links to known high-abuse top-level domain"
            elif "url_count" in fname:
                desc = "Presence of external hyperlinks"
            elif contrib > 0:
                desc = f"Token associated with malicious email patterns"
            else:
                desc = f"Token associated with legitimate communication"

            results.append(
                FeatureContribution(
                    feature=clean_name,
                    contribution=round(contrib, 4),
                    direction=direction,
                    description=desc,
                )
            )

        return results

    def predict(
        self,
        text: str,
        subject: Optional[str] = None,
        sender: Optional[str] = None,
        save_content: bool = False,
    ) -> PredictResponse:
        """
        Executes end-to-end phishing classification, URL risk analysis, and audit logging.
        """
        if not self.is_ready or self.pipeline is None:
            raise RuntimeError("Model service is not initialized.")

        # Extract Subject/From from raw text headers if not supplied
        if not subject:
            sub_match = re.search(r"(?:^|\n)subject:\s*(.*?)(?:\n|$)", text, re.IGNORECASE)
            if sub_match:
                subject = sub_match.group(1).strip()
        if not sender:
            from_match = re.search(r"(?:^|\n)from:\s*(.*?)(?:\n|$)", text, re.IGNORECASE)
            if from_match:
                sender = from_match.group(1).strip()

        # Run pipeline inference
        pred_label_int = int(self.pipeline.predict([text])[0])
        probs = self.pipeline.predict_proba([text])[0]
        phish_prob = float(probs[1])

        is_phishing = pred_label_int == 1
        label = "Phishing" if is_phishing else "Safe"

        # Determine confidence score and band
        confidence_score = round(float(max(probs[0], probs[1])), 4)
        if phish_prob >= 0.85:
            confidence_band = "Critical"
        elif phish_prob >= 0.65:
            confidence_band = "High"
        elif phish_prob >= 0.40:
            confidence_band = "Suspicious / Medium"
        else:
            confidence_band = "Safe / Low"

        # Extract heuristics
        extracted_features = extract_all_features_dict(text)

        # Static offline URL inspection
        raw_urls = extract_raw_urls(text)
        urls_analyzed = [analyze_url_risk_offline(u) for u in raw_urls]

        # Top feature explanations for this specific email
        top_contributions = self.explain_prediction(text, top_k=8)

        # Actionable recommendations
        if is_phishing and confidence_band == "Critical":
            rec_action = (
                "🚨 CRITICAL MALICIOUS EMAIL: Do not click any links, open attachments, "
                "or reply. Quarantine message immediately and report to IT Security."
            )
        elif is_phishing:
            rec_action = (
                "⚠️ SUSPICIOUS PHISHING THREAT: Exercise high caution. Contains pressure tactics "
                "or suspicious links. Verify sender identity via an alternate trusted channel."
            )
        else:
            rec_action = (
                "✅ SAFE / LEGITIMATE COMMUNICATION: No active phishing indicators or malicious "
                "link patterns detected. Standard organizational safety applies."
            )

        scan_id = f"scan_{uuid.uuid4().hex[:12]}"
        sha_hash = compute_sha256(text)
        ts_now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

        # Save scan to SQLite (Respecting opt-in save_content privacy rule)
        save_scan_result(
            scan_id=scan_id,
            sha256_hash=sha_hash,
            subject=subject,
            sender=sender,
            verdict=label,
            is_phishing=is_phishing,
            phishing_probability=phish_prob,
            confidence_band=confidence_band,
            extracted_features=extracted_features,
            timestamp=ts_now,
            save_content=save_content,
            raw_content=text,
        )

        return PredictResponse(
            scan_id=scan_id,
            label=label,
            is_phishing=is_phishing,
            phishing_probability=round(phish_prob, 4),
            confidence_score=confidence_score,
            confidence_band=confidence_band,
            sha256_hash=sha_hash,
            subject=subject,
            sender=sender,
            timestamp=ts_now,
            extracted_features=extracted_features,
            top_contributing_features=top_contributions,
            urls_analyzed=urls_analyzed,
            recommended_action=rec_action,
        )

    def process_batch_csv(self, file_bytes: bytes) -> BatchPredictResponse:
        """Processes a CSV containing emails to scan."""
        try:
            df = pd.read_csv(BytesIO(file_bytes), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(BytesIO(file_bytes), encoding="latin-1")

        # Locate text column
        text_col = None
        for col in df.columns:
            if str(col).strip().lower() in [
                "text",
                "email text",
                "email_text",
                "body",
                "message",
                "content",
                "email",
                "subject_body",
            ]:
                text_col = col
                break

        if text_col is None:
            if len(df.columns) > 0:
                text_col = df.columns[0]
            else:
                raise ValueError("Uploaded CSV has no readable columns.")

        texts = df[text_col].dropna().astype(str).tolist()

        results: List[PredictResponse] = []
        for text in texts[:200]:  # Protect from gigantic uploads
            res = self.predict(str(text), save_content=False)
            results.append(res)

        phish_count = sum(1 for r in results if r.is_phishing)
        safe_count = len(results) - phish_count

        return BatchPredictResponse(
            total_processed=len(results),
            phishing_count=phish_count,
            safe_count=safe_count,
            results=results,
        )

    def process_batch_eml(
        self, eml_files: List[Tuple[str, bytes]]
    ) -> BatchPredictResponse:
        """Processes a list of raw .eml file byte buffers."""
        results: List[PredictResponse] = []

        for filename, content_bytes in eml_files[:100]:
            msg = email.message_from_bytes(content_bytes)
            subject = msg.get("Subject", "")
            sender = msg.get("From", "")

            # Extract body text
            body_parts = []
            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    if content_type in ["text/plain", "text/html"]:
                        payload = part.get_payload(decode=True)
                        if payload:
                            body_parts.append(payload.decode("utf-8", errors="replace"))
            else:
                payload = msg.get_payload(decode=True)
                if payload:
                    body_parts.append(payload.decode("utf-8", errors="replace"))

            raw_text = "\n".join(body_parts) if body_parts else msg.as_string()
            combined_text = f"Subject: {subject}\nFrom: {sender}\n\n{raw_text}"

            res = self.predict(
                text=combined_text,
                subject=subject,
                sender=sender,
                save_content=False,
            )
            results.append(res)

        phish_count = sum(1 for r in results if r.is_phishing)
        safe_count = len(results) - phish_count

        return BatchPredictResponse(
            total_processed=len(results),
            phishing_count=phish_count,
            safe_count=safe_count,
            results=results,
        )


# Global singleton instance
model_service = PhishGuardModelService()
