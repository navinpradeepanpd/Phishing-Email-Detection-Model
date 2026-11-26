"""
Unit and integration tests for FastAPI backend using httpx and TestClient.
"""

import pytest
from starlette.testclient import TestClient

from backend.database import init_db
from backend.main import app
from backend.service import model_service


@pytest.fixture(scope="session", autouse=True)
def setup_test_backend() -> None:
    init_db()
    if not model_service.is_ready:
        model_service.load()


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert "Logistic Regression" in data["champion_model"]


def test_metrics_endpoint(client: TestClient) -> None:
    response = client.get("/api/metrics")
    assert response.status_code == 200
    data = response.json()

    # Verify real metrics from metrics.json
    assert "champion_metrics" in data
    assert "dataset_statistics" in data
    assert "data_leakage_audit" in data
    assert "all_model_evaluations" in data

    champ = data["champion_metrics"]
    assert champ["accuracy"] > 0.95
    assert champ["f1_score"] > 0.95
    assert "confusion_matrix" in champ
    assert champ["confusion_matrix"]["tp"] > 0
    assert champ["confusion_matrix"]["tn"] > 0


def test_predict_phishing_email(client: TestClient) -> None:
    payload = {
        "text": (
            "URGENT SECURITY ALERT: Your bank account has been suspended! "
            "Click http://192.168.1.50/verify-login?id=8291 to verify your password immediately."
        ),
        "subject": "URGENT: Account Suspension",
        "sender": "alerts@bank-verification.xyz",
        "save_content": False,  # default privacy
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["label"] == "Phishing"
    assert data["is_phishing"] is True
    assert data["phishing_probability"] > 0.70
    assert data["confidence_band"] in ["High", "Critical"]
    assert len(data["sha256_hash"]) == 64

    # URL inspection checks
    assert len(data["urls_analyzed"]) == 1
    url_info = data["urls_analyzed"][0]
    assert url_info["is_ip"] is True
    assert url_info["risk_level"] == "Malicious"

    # Extracted feature checks
    assert data["extracted_features"]["has_ip_url"] == 1
    assert data["extracted_features"]["urgency_words"] >= 2

    # Local feature attribution
    assert len(data["top_contributing_features"]) > 0


def test_predict_safe_email(client: TestClient) -> None:
    payload = {
        "text": (
            "Hi team, just a reminder about our sprint planning session tomorrow at 10 AM. "
            "Please update your Jira backlog items before the meeting. Thanks!"
        ),
        "subject": "Sprint Planning Reminder",
        "sender": "alex@company.internal",
        "save_content": False,
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["label"] == "Safe"
    assert data["is_phishing"] is False
    assert data["phishing_probability"] < 0.35
    assert "Safe" in data["confidence_band"]


def test_predict_privacy_opt_in_vs_opt_out(client: TestClient) -> None:
    # 1. Opt-out (default): content is not stored in SQLite
    res1 = client.post(
        "/api/predict",
        json={"text": "Private email body that should not be stored", "save_content": False},
    )
    assert res1.status_code == 200
    scan_id1 = res1.json()["scan_id"]

    # 2. Opt-in: content is stored
    res2 = client.post(
        "/api/predict",
        json={"text": "Explicitly approved email body to be stored", "save_content": True},
    )
    assert res2.status_code == 200
    scan_id2 = res2.json()["scan_id"]

    # Query history to verify DB storage
    history_res = client.get("/api/history?limit=10")
    items = history_res.json()["items"]

    item1 = next((i for i in items if i["scan_id"] == scan_id1), None)
    item2 = next((i for i in items if i["scan_id"] == scan_id2), None)

    assert item1 is not None
    assert item1["has_stored_content"] is False
    assert item1["content"] is None

    assert item2 is not None
    assert item2["has_stored_content"] is True
    assert "Explicitly approved" in str(item2["content"])


def test_batch_predict_csv(client: TestClient) -> None:
    csv_content = (
        "text\n"
        '"URGENT: Verify your account credentials now at http://10.0.0.1/auth!"\n'
        '"Team meeting is scheduled for 3pm in room 102."\n'
    )
    files = {"file": ("batch_test.csv", csv_content.encode("utf-8"), "text/csv")}
    response = client.post("/api/predict/batch", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["total_processed"] == 2
    assert data["phishing_count"] >= 1
    assert data["safe_count"] >= 1
    assert len(data["results"]) == 2


def test_batch_predict_eml(client: TestClient) -> None:
    eml_content = (
        "From: spoofed@phishing-lure.xyz\r\n"
        "To: victim@company.com\r\n"
        "Subject: Critical Payroll Notice\r\n"
        "Content-Type: text/plain; charset=utf-8\r\n"
        "\r\n"
        "URGENT: Update your direct deposit bank details immediately at http://192.168.1.1/payroll!\r\n"
    ).encode("utf-8")

    files = [("files", ("test_alert.eml", eml_content, "message/rfc822"))]
    response = client.post("/api/predict/batch", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["total_processed"] == 1
    assert data["phishing_count"] == 1
    assert data["results"][0]["subject"] == "Critical Payroll Notice"


def test_history_pagination_and_deletion(client: TestClient) -> None:
    # First ensure at least one record exists
    client.post("/api/predict", json={"text": "Test record for history"})

    # Get current history
    response = client.get("/api/history?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1

    target_item = data["items"][0]
    target_id = target_item["id"]

    # Delete the record
    del_res = client.delete(f"/api/history/{target_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Deleting again should return 404
    del_res404 = client.delete(f"/api/history/{target_id}")
    assert del_res404.status_code == 404


def test_payload_too_large_rejection(client: TestClient) -> None:
    headers = {"Content-Length": str(15 * 1024 * 1024)}  # 15 MB
    response = client.post("/api/predict", json={"text": "small text"}, headers=headers)
    assert response.status_code == 413
    assert "Payload exceeds" in response.json()["error"]["message"]
