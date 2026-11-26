"""
Pydantic request and response schemas for PhishGuard AI API.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=2_000_000,
        description="Raw email message, plain text body, or HTML content to analyze.",
    )
    subject: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional email subject line.",
    )
    sender: Optional[str] = Field(
        default=None,
        max_length=320,
        description="Optional sender address (From header).",
    )
    save_content: bool = Field(
        default=False,
        description="Opt-in flag to store full email text in SQLite audit history. Defaults to False (privacy-first).",
    )


class UrlRiskAnalysis(BaseModel):
    url: str
    is_ip: bool
    is_shortener: bool
    is_suspicious_tld: bool
    has_at_symbol: bool
    is_https: bool
    is_excessive_subdomains: bool
    risk_level: str  # "Malicious", "Suspicious", "Neutral"
    risk_reasons: List[str]


class FeatureContribution(BaseModel):
    feature: str
    contribution: float
    direction: str  # "Phishing Indicator" or "Safe Indicator"
    description: str


class PredictResponse(BaseModel):
    scan_id: str
    label: str  # "Phishing" or "Safe"
    is_phishing: bool
    phishing_probability: float
    confidence_score: float
    confidence_band: str  # "Safe / Low", "Suspicious / Medium", "High", "Critical"
    sha256_hash: str
    subject: Optional[str] = None
    sender: Optional[str] = None
    timestamp: str
    extracted_features: Dict[str, Union[int, float]]
    top_contributing_features: List[FeatureContribution]
    urls_analyzed: List[UrlRiskAnalysis]
    recommended_action: str


class BatchPredictResponse(BaseModel):
    total_processed: int
    phishing_count: int
    safe_count: int
    results: List[PredictResponse]


class ScanHistoryItem(BaseModel):
    id: int
    scan_id: str
    sha256_hash: str
    subject: Optional[str] = None
    sender: Optional[str] = None
    verdict: str
    is_phishing: bool
    phishing_probability: float
    confidence_band: str
    timestamp: str
    has_stored_content: bool
    content: Optional[str] = None


class ScanHistoryResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[ScanHistoryItem]


class DeleteResponse(BaseModel):
    success: bool
    message: str
