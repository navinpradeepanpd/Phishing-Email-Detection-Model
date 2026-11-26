"""
Configuration settings for PhishGuard AI Backend.
"""

from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = BASE_DIR / "ml"
ARTIFACTS_DIR = ML_DIR / "artifacts"

# Paths to trained model artifacts
MODEL_PATH = ARTIFACTS_DIR / "best_model.joblib"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"

# SQLite Database Path
DATABASE_PATH = Path(__file__).resolve().parent / "phishguard.db"

# Security and Limits
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB payload limit
RATE_LIMIT_REQUESTS_PER_MINUTE = 120    # 120 req/min per IP

# Allowed CORS Origins for frontend integration
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "*",
]
