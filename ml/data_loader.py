"""
Data loading and cleaning pipeline for PhishGuard AI.
Loads raw email CSVs, normalizes schemas, strips HTML, cleans whitespace,
removes duplicates, and reports class distributions.
"""

from __future__ import annotations

import html
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Union

from bs4 import BeautifulSoup
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PhishGuard.DataLoader")

TEXT_COLUMN_CANDIDATES = [
    "text",
    "email text",
    "email_text",
    "body",
    "message",
    "content",
    "email",
    "subject_body",
]

LABEL_COLUMN_CANDIDATES = [
    "label",
    "email type",
    "email_type",
    "class",
    "spam",
    "category",
    "is_phishing",
    "target",
]

PHISHING_LABEL_VALUES = {
    "1",
    1,
    1.0,
    True,
    "true",
    "phishing",
    "phishing email",
    "phish",
    "spam",
    "bad",
    "malicious",
}

SAFE_LABEL_VALUES = {
    "0",
    0,
    0.0,
    False,
    "false",
    "safe",
    "safe email",
    "ham",
    "good",
    "legitimate",
    "clean",
}


TAG_SEARCH_REGEX = re.compile(r"<\w+.*?>")
SCRIPT_STYLE_REGEX = re.compile(r"<(script|style).*?>.*?</\1>", re.DOTALL | re.IGNORECASE)
TAG_STRIP_REGEX = re.compile(r"<[^>]+>")
WHITESPACE_REGEX = re.compile(r"\s+")


def clean_html_and_text(raw_text: Any) -> str:
    """
    Cleans email text by:
    1. Unescaping HTML entities (&amp; -> &, &nbsp; -> ' ', etc.)
    2. Stripping HTML tags while preserving text for feature analysis
    3. Normalizing whitespace (tabs, newlines, multiple spaces -> single space)
    4. Stripping leading/trailing whitespace
    """
    if raw_text is None or pd.isna(raw_text):
        return ""

    text = str(raw_text)

    # Decode HTML entities
    text = html.unescape(text)

    # Fast check: if HTML tags exist, strip them
    if "<" in text and ">" in text and TAG_SEARCH_REGEX.search(text):
        text = SCRIPT_STYLE_REGEX.sub(" ", text)
        text = TAG_STRIP_REGEX.sub(" ", text)

    # Normalize whitespace
    text = WHITESPACE_REGEX.sub(" ", text).strip()
    return text


def detect_and_normalize_columns(df: pd.DataFrame, source_name: str = "") -> pd.DataFrame:
    """
    Identifies text and label columns from diverse datasets and renames to standard 'text' and 'label'.
    """
    normalized_cols = {c: str(c).strip().lower() for c in df.columns}
    inv_map = {v: k for k, v in normalized_cols.items()}

    matched_text_col: Optional[str] = None
    matched_label_col: Optional[str] = None

    for candidate in TEXT_COLUMN_CANDIDATES:
        if candidate in inv_map:
            matched_text_col = inv_map[candidate]
            break

    for candidate in LABEL_COLUMN_CANDIDATES:
        if candidate in inv_map:
            matched_label_col = inv_map[candidate]
            break

    if not matched_text_col:
        raise ValueError(
            f"Could not identify a text column in {source_name}. "
            f"Available columns: {list(df.columns)}. Expected one of: {TEXT_COLUMN_CANDIDATES}"
        )

    if not matched_label_col:
        raise ValueError(
            f"Could not identify a label column in {source_name}. "
            f"Available columns: {list(df.columns)}. Expected one of: {LABEL_COLUMN_CANDIDATES}"
        )

    out_df = pd.DataFrame()
    out_df["text"] = df[matched_text_col]
    out_df["label"] = df[matched_label_col]
    return out_df


def normalize_label(val: Any) -> Optional[int]:
    """
    Converts various label formats to binary integer:
    1 = Phishing, 0 = Safe.
    Returns None if the value cannot be recognized.
    """
    if pd.isna(val):
        return None

    if isinstance(val, (int, np.integer)):
        if val in (0, 1):
            return int(val)
        return None

    if isinstance(val, (float, np.floating)):
        if val == 0.0:
            return 0
        if val == 1.0:
            return 1
        return None

    str_val = str(val).strip().lower()
    if str_val in PHISHING_LABEL_VALUES:
        return 1
    if str_val in SAFE_LABEL_VALUES:
        return 0

    return None


def report_class_balance(df: pd.DataFrame, dataset_name: str = "Dataset") -> Dict[str, Any]:
    """
    Computes class balance statistics and logs them clearly.
    """
    total = len(df)
    if total == 0:
        stats = {
            "dataset_name": dataset_name,
            "total_samples": 0,
            "phishing_count": 0,
            "safe_count": 0,
            "phishing_percentage": 0.0,
            "safe_percentage": 0.0,
            "balance_ratio": 0.0,
        }
        logger.info(f"[{dataset_name}] Empty DataFrame.")
        return stats

    phishing_count = int((df["label"] == 1).sum())
    safe_count = int((df["label"] == 0).sum())
    phishing_pct = round((phishing_count / total) * 100, 2)
    safe_pct = round((safe_count / total) * 100, 2)
    balance_ratio = round(phishing_count / safe_count, 3) if safe_count > 0 else float("inf")

    stats = {
        "dataset_name": dataset_name,
        "total_samples": total,
        "phishing_count": phishing_count,
        "safe_count": safe_count,
        "phishing_percentage": phishing_pct,
        "safe_percentage": safe_pct,
        "balance_ratio": balance_ratio,
    }

    logger.info(
        f"[{dataset_name} Balance] Total: {total} | "
        f"Phishing (1): {phishing_count} ({phishing_pct}%) | "
        f"Safe (0): {safe_count} ({safe_pct}%) | "
        f"Phishing/Safe Ratio: {balance_ratio}"
    )
    return stats


def clean_email_dataframe(df: pd.DataFrame, verbose: bool = True) -> pd.DataFrame:
    """
    Applies data hygiene:
    1. Normalizes labels to binary 0/1; drops unrecognized labels
    2. Cleans text: unescapes HTML, strips markup, normalizes whitespace
    3. Drops null, NaN, or whitespace-only texts
    4. Removes duplicate email records
    5. Resets row indexing
    """
    initial_rows = len(df)

    # 1. Map labels
    cleaned = df.copy()
    cleaned["label"] = cleaned["label"].apply(normalize_label)
    cleaned = cleaned.dropna(subset=["label"])
    cleaned["label"] = cleaned["label"].astype(int)

    # 2. Clean text
    cleaned["text"] = cleaned["text"].apply(clean_html_and_text)

    # 3. Drop empty texts
    cleaned = cleaned[cleaned["text"].str.strip().str.len() > 0]

    # 4. Remove duplicate emails
    cleaned = cleaned.drop_duplicates(subset=["text"], keep="first")

    # 5. Reset index
    cleaned = cleaned.reset_index(drop=True)

    dropped_rows = initial_rows - len(cleaned)
    if verbose:
        logger.info(
            f"Data Cleaning Complete: Retained {len(cleaned)} rows (Dropped {dropped_rows} rows from {initial_rows})"
        )

    return cleaned


def load_dataset(
    filepaths: Union[str, Path, Sequence[Union[str, Path]]],
    clean: bool = True,
    verbose: bool = True,
) -> pd.DataFrame:
    """
    Loads one or more CSV datasets, merges them, standardizes columns, and optionally cleans.

    Parameters:
    - filepaths: A single file path or list/tuple of file paths.
    - clean: Whether to run HTML stripping, whitespace normalization, deduplication, and label cleaning.
    - verbose: Whether to log distribution metrics.

    Returns:
    - A clean pandas DataFrame with columns ['text', 'label'].
    """
    if isinstance(filepaths, (str, Path)):
        files = [Path(filepaths)]
    else:
        files = [Path(f) for f in filepaths]

    dfs: List[pd.DataFrame] = []

    for file_path in files:
        if not file_path.exists():
            raise FileNotFoundError(f"Dataset file not found at: {file_path}")

        # Warn if loading the sample dataset
        if file_path.name.lower() == "sample_emails.csv":
            logger.warning(
                "⚠️ Loading 'sample_emails.csv'. This is a tiny diagnostic dataset for unit tests only! "
                "NEVER use this sample dataset to report production model metrics."
            )

        # Read CSV with robust encoding handling
        try:
            raw_df = pd.read_csv(file_path, encoding="utf-8")
        except UnicodeDecodeError:
            raw_df = pd.read_csv(file_path, encoding="latin-1")

        norm_df = detect_and_normalize_columns(raw_df, source_name=file_path.name)
        dfs.append(norm_df)

    if not dfs:
        raise ValueError("No valid datasets loaded.")

    combined_df = pd.concat(dfs, ignore_index=True)

    if clean:
        combined_df = clean_email_dataframe(combined_df, verbose=verbose)

    if verbose:
        report_class_balance(combined_df, dataset_name="Loaded Dataset")

    return combined_df
