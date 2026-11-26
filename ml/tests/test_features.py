"""
Unit and integration tests for features.py
"""

import numpy as np
import pytest
from sklearn.linear_model import LogisticRegression

from ml.features import (
    FEATURE_NAMES,
    HeuristicFeatureExtractor,
    build_phishing_pipeline,
    check_anchor_text_mismatch,
    check_header_mismatch,
    extract_all_features_dict,
    extract_content_features,
    extract_raw_urls,
    extract_url_features,
)


def test_extract_raw_urls() -> None:
    text = "Check http://example.com/test and https://secure.bank.org?id=1 also www.evil-site.xyz/path"
    urls = extract_raw_urls(text)
    assert len(urls) >= 3
    assert any("example.com" in u for u in urls)
    assert any("secure.bank.org" in u for u in urls)
    assert any("evil-site.xyz" in u for u in urls)


def test_url_features_ip_address() -> None:
    text = "Visit our portal at http://192.168.1.100/login to update."
    feats = extract_url_features(text)
    assert feats["url_count"] == 1
    assert feats["has_ip_url"] == 1
    assert feats["http_ratio"] == 1.0


def test_url_features_shortener() -> None:
    text = "Click bit.ly/secure-reset to reset your password"
    feats = extract_url_features(text)
    assert feats["url_shortener_count"] == 1


def test_url_features_at_symbol() -> None:
    text = "Click http://paypal.com@evil-attacker.com/signin"
    feats = extract_url_features(text)
    assert feats["at_symbol_in_url"] == 1


def test_url_features_excessive_subdomains() -> None:
    text = "Visit http://login.security.update.account.bank.com/portal"
    feats = extract_url_features(text)
    assert feats["excessive_subdomains"] == 1


def test_url_features_suspicious_tld() -> None:
    text = "Claim your cash at http://lottery-winner.xyz and http://claim-prize.top"
    feats = extract_url_features(text)
    assert feats["suspicious_tld_count"] == 2


def test_url_features_very_long_url() -> None:
    long_url = "http://example.com/" + "a" * 80
    feats = extract_url_features(f"Go to {long_url}")
    assert feats["very_long_url_count"] == 1


def test_check_anchor_text_mismatch() -> None:
    mismatch_html = '<a href="http://evil-phish.xyz/steal">https://chase.com/login</a>'
    assert check_anchor_text_mismatch(mismatch_html) == 1

    clean_html = '<a href="https://chase.com/login">https://chase.com/login</a>'
    assert check_anchor_text_mismatch(clean_html) == 0


def test_check_header_mismatch() -> None:
    mismatched = (
        "From: Support <support@paypal.com>\n"
        "Reply-To: Fraudster <attacker@suspicious-domain.ru>\n"
        "Subject: Suspicious Activity\n\n"
        "Please confirm your account."
    )
    assert check_header_mismatch(mismatched) == 1

    legit = (
        "From: Support <support@paypal.com>\n"
        "Reply-To: Support <support@paypal.com>\n"
        "Subject: Monthly Summary"
    )
    assert check_header_mismatch(legit) == 0


def test_content_features_urgency_and_credentials() -> None:
    text = "URGENT: Your bank account has been suspended! Verify your password immediately."
    feats = extract_content_features(text)
    assert feats["urgency_words"] >= 3  # urgent, suspended, immediately, verify
    assert feats["credential_words"] >= 2  # account, password, verify your
    assert feats["exclamation_count"] == 1
    assert feats["all_caps_ratio"] > 0.10

    # Test high uppercase ratio
    shouting_text = "URGENT ACTION: YOUR ACCOUNT HAS BEEN TERMINATED!"
    shouting_feats = extract_content_features(shouting_text)
    assert shouting_feats["all_caps_ratio"] > 0.80


def test_content_features_money_and_attachment() -> None:
    text = "You won a lottery prize of 1 million dollars! See attached invoice.pdf."
    feats = extract_content_features(text)
    assert feats["money_words"] >= 3  # lottery, prize, million, dollars
    assert feats["attachment_mentions"] == 1


def test_heuristic_feature_extractor() -> None:
    texts = [
        "Normal email about scheduling",
        "URGENT: Click http://192.168.1.1/login to reset password! http://bit.ly/xyz",
    ]
    extractor = HeuristicFeatureExtractor()
    extractor.fit(texts)
    matrix = extractor.transform(texts)

    assert isinstance(matrix, np.ndarray)
    assert matrix.shape == (2, len(FEATURE_NAMES))
    assert list(extractor.get_feature_names_out()) == FEATURE_NAMES

    # Row 1 (normal) should have zero URL and low urgency
    assert matrix[0, FEATURE_NAMES.index("url_count")] == 0
    # Row 2 (phish) should have IP url, shortener, urgency, etc.
    assert matrix[1, FEATURE_NAMES.index("has_ip_url")] == 1
    assert matrix[1, FEATURE_NAMES.index("url_shortener_count")] == 1
    assert matrix[1, FEATURE_NAMES.index("urgency_words")] >= 1


def test_build_phishing_pipeline_fit_predict() -> None:
    X_train = [
        "Hi team, sprint review is tomorrow at 10 AM.",
        "URGENT: verify your bank account credentials immediately at http://192.168.1.5/login",
        "Attached is the financial quarterly earnings report for review.",
        "Winner! You won a cash prize of 5 million dollars! Claim now at http://win.xyz",
    ]
    y_train = np.array([0, 1, 0, 1])

    pipeline = build_phishing_pipeline(
        classifier=LogisticRegression(),
        max_tfidf_features=50,
        ngram_range=(1, 2),
    )

    # Fit pipeline
    pipeline.fit(X_train, y_train)

    # Test prediction
    preds = pipeline.predict(
        [
            "Let's schedule a team meeting for Tuesday.",
            "URGENT ALERT: Account suspended! Click http://bit.ly/login to reset password!",
        ]
    )

    assert len(preds) == 2
    assert preds[0] == 0
    assert preds[1] == 1
