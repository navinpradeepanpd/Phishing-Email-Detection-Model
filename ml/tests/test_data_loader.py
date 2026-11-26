"""
Unit and integration tests for data_loader.py
"""

from pathlib import Path
import pandas as pd
import pytest

from ml.data_loader import (
    clean_email_dataframe,
    clean_html_and_text,
    detect_and_normalize_columns,
    load_dataset,
    normalize_label,
    report_class_balance,
)


def test_clean_html_and_text() -> None:
    html_input = "<html><body><h1>URGENT&amp;IMPORTANT</h1><p>Please click &nbsp; <a href='http://evil.com'>here</a>   now!   \n\n\r</p></body></html>"
    cleaned = clean_html_and_text(html_input)
    assert "URGENT&IMPORTANT" in cleaned
    assert "Please click here now!" in cleaned
    assert "<html>" not in cleaned
    assert "<p>" not in cleaned
    assert "  " not in cleaned  # normalized whitespace


def test_clean_html_edge_cases() -> None:
    assert clean_html_and_text(None) == ""
    assert clean_html_and_text("") == ""
    assert clean_html_and_text("   \n\t  ") == ""
    assert clean_html_and_text("Plain text message") == "Plain text message"


def test_normalize_label() -> None:
    # Phishing variations
    assert normalize_label(1) == 1
    assert normalize_label("1") == 1
    assert normalize_label("phishing") == 1
    assert normalize_label("Phishing Email") == 1
    assert normalize_label("spam") == 1
    assert normalize_label(True) == 1

    # Safe variations
    assert normalize_label(0) == 0
    assert normalize_label("0") == 0
    assert normalize_label("safe") == 0
    assert normalize_label("Safe Email") == 0
    assert normalize_label("ham") == 0
    assert normalize_label(False) == 0

    # Invalid / NaN
    assert normalize_label(None) is None
    assert normalize_label("unknown") is None
    assert normalize_label(99) is None


def test_detect_and_normalize_columns() -> None:
    df = pd.DataFrame(
        {
            "Email Text": ["Hello world", "Urgent security update"],
            "Email Type": ["Safe Email", "Phishing Email"],
        }
    )
    norm = detect_and_normalize_columns(df, "test.csv")
    assert list(norm.columns) == ["text", "label"]
    assert len(norm) == 2


def test_clean_email_dataframe() -> None:
    raw_data = {
        "text": [
            "Normal work email about meeting",
            "<div>URGENT: Verify password at once!</div>",
            "Normal work email about meeting",  # Duplicate text
            None,  # Missing text
            "   ",  # Whitespace only
            "Valid text with invalid label",
        ],
        "label": [0, 1, 0, 1, 0, "invalid_label"],
    }
    df = pd.DataFrame(raw_data)
    cleaned = clean_email_dataframe(df, verbose=False)

    # Should retain exactly 2 rows (1 safe, 1 phishing)
    assert len(cleaned) == 2
    assert set(cleaned["label"].unique()) == {0, 1}
    assert (cleaned["text"] == "Normal work email about meeting").sum() == 1
    assert "URGENT: Verify password at once!" in cleaned["text"].values


def test_report_class_balance() -> None:
    df = pd.DataFrame(
        {
            "text": ["e1", "e2", "e3", "e4"],
            "label": [1, 1, 0, 0],
        }
    )
    stats = report_class_balance(df, "TestSet")
    assert stats["total_samples"] == 4
    assert stats["phishing_count"] == 2
    assert stats["safe_count"] == 2
    assert stats["phishing_percentage"] == 50.0
    assert stats["safe_percentage"] == 50.0
    assert stats["balance_ratio"] == 1.0


def test_load_sample_dataset() -> None:
    sample_path = Path(__file__).resolve().parent.parent / "data" / "sample_emails.csv"
    assert sample_path.exists(), f"Sample dataset missing at {sample_path}"

    df = load_dataset(sample_path, clean=True, verbose=False)
    assert isinstance(df, pd.DataFrame)
    assert len(df) >= 35  # At least ~40 rows (deduplicated)
    assert "text" in df.columns
    assert "label" in df.columns
    assert set(df["label"].unique()).issubset({0, 1})
    assert (df["label"] == 1).sum() > 0
    assert (df["label"] == 0).sum() > 0


def test_load_multiple_datasets(tmp_path: Path) -> None:
    csv1 = tmp_path / "part1.csv"
    csv2 = tmp_path / "part2.csv"

    pd.DataFrame(
        {
            "text": ["Email 1 body", "Email 2 body"],
            "label": [0, 1],
        }
    ).to_csv(csv1, index=False)

    pd.DataFrame(
        {
            "text": ["Email 3 body", "Email 4 body"],
            "label": [1, 0],
        }
    ).to_csv(csv2, index=False)

    merged = load_dataset([csv1, csv2], clean=True, verbose=False)
    assert len(merged) == 4
    assert list(merged["label"].values) == [0, 1, 1, 0]
