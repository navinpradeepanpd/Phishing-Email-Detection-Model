"""
SQLite database management and audit logging for PhishGuard AI.
Stores scan verdicts, probabilities, risk bands, and SHA-256 hashes.
Strictly respects privacy: email content is stored ONLY when opt-in save_content=True.
"""

from __future__ import annotations

import json
import sqlite3
from typing import Any, Dict, List, Optional, Tuple

from backend.config import DATABASE_PATH


def get_db_connection() -> sqlite3.Connection:
    """Creates a thread-safe connection to the SQLite database with WAL mode enabled."""
    conn = sqlite3.connect(str(DATABASE_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    """Initializes the database schema and indexes."""
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id TEXT UNIQUE NOT NULL,
                sha256_hash TEXT NOT NULL,
                subject TEXT,
                sender TEXT,
                verdict TEXT NOT NULL,
                is_phishing INTEGER NOT NULL,
                phishing_probability REAL NOT NULL,
                confidence_band TEXT NOT NULL,
                extracted_features_json TEXT,
                timestamp TEXT NOT NULL,
                has_stored_content INTEGER NOT NULL DEFAULT 0,
                content TEXT
            );
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_scan_history_timestamp ON scan_history(timestamp DESC);"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_scan_history_verdict ON scan_history(verdict);"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_scan_history_hash ON scan_history(sha256_hash);"
        )
        conn.commit()


def save_scan_result(
    scan_id: str,
    sha256_hash: str,
    subject: Optional[str],
    sender: Optional[str],
    verdict: str,
    is_phishing: bool,
    phishing_probability: float,
    confidence_band: str,
    extracted_features: Dict[str, Any],
    timestamp: str,
    save_content: bool,
    raw_content: Optional[str],
) -> int:
    """
    Inserts a scan verdict record into SQLite.
    If save_content is False, content is stored as NULL to ensure zero persistence of sensitive email body.
    """
    stored_text = raw_content if save_content else None
    has_stored = 1 if (save_content and raw_content) else 0

    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO scan_history (
                scan_id,
                sha256_hash,
                subject,
                sender,
                verdict,
                is_phishing,
                phishing_probability,
                confidence_band,
                extracted_features_json,
                timestamp,
                has_stored_content,
                content
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                scan_id,
                sha256_hash,
                subject,
                sender,
                verdict,
                1 if is_phishing else 0,
                round(phishing_probability, 5),
                confidence_band,
                json.dumps(extracted_features),
                timestamp,
                has_stored,
                stored_text,
            ),
        )
        conn.commit()
        return int(cursor.lastrowid or 0)


def fetch_scan_history(
    limit: int = 50,
    offset: int = 0,
    verdict: Optional[str] = None,
    search: Optional[str] = None,
) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Retrieves paginated scan history entries with optional filtering by verdict or search keywords.
    """
    query = "SELECT * FROM scan_history WHERE 1=1"
    params: List[Any] = []

    if verdict:
        query += " AND LOWER(verdict) = ?"
        params.append(verdict.strip().lower())

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query += " AND (LOWER(subject) LIKE ? OR LOWER(sender) LIKE ? OR LOWER(sha256_hash) LIKE ?)"
        params.extend([search_pattern, search_pattern, search_pattern])

    count_query = f"SELECT COUNT(*) as total FROM ({query})"

    with get_db_connection() as conn:
        total = conn.execute(count_query, params).fetchone()["total"]

        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()
        items = [
            {
                "id": r["id"],
                "scan_id": r["scan_id"],
                "sha256_hash": r["sha256_hash"],
                "subject": r["subject"],
                "sender": r["sender"],
                "verdict": r["verdict"],
                "is_phishing": bool(r["is_phishing"]),
                "phishing_probability": r["phishing_probability"],
                "confidence_band": r["confidence_band"],
                "timestamp": r["timestamp"],
                "has_stored_content": bool(r["has_stored_content"]),
                "content": r["content"],
            }
            for r in rows
        ]

    return total, items


def delete_scan_record(record_id: int) -> bool:
    """Deletes a single scan history record by database ID."""
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM scan_history WHERE id = ?", (record_id,))
        conn.commit()
        return cursor.rowcount > 0


def clear_history() -> int:
    """Deletes all scan records from the database."""
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM scan_history")
        conn.commit()
        return cursor.rowcount


# Initialize schema on module import
init_db()
