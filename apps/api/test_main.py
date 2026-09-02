import os

os.environ.setdefault("ADMIN_KEY", "test-admin-key")

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_anyone_can_create_report_without_login():
    response = client.post(
        "/api/v1/reports",
        json={
            "title": "Test Culvert Blockage",
            "category": "blocked_drain",
            "severity": "high",
            "description": "Plastic waste is blocking the entrance.",
            "latitude": 6.5249,
            "longitude": 3.3897,
            "address": "Akoka, Lagos",
            "evidence_paths": ["reports/demo/photo-1.jpg"],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["reference"].startswith("DF-")


def test_anyone_can_list_and_view_reports():
    create = client.post(
        "/api/v1/reports",
        json={"title": "Iwaya Flooding", "category": "flooding", "latitude": 6.5, "longitude": 3.39},
    )
    reference = create.json()["reference"]

    listed = client.get("/api/v1/reports")
    assert listed.status_code == 200
    assert any(item["reference"] == reference for item in listed.json()["items"])

    detail = client.get(f"/api/v1/reports/{reference}")
    assert detail.status_code == 200
    assert detail.json()["title"] == "Iwaya Flooding"


def test_search_by_title_or_tracking_id():
    create = client.post(
        "/api/v1/reports",
        json={"title": "Bariga Drain Search Case", "category": "waste_plastic", "latitude": 6.5, "longitude": 3.39},
    )
    reference = create.json()["reference"]

    by_title = client.get("/api/v1/reports/search", params={"q": "Bariga Drain Search"})
    assert any(item["reference"] == reference for item in by_title.json()["items"])

    by_reference = client.get("/api/v1/reports/search", params={"q": reference})
    assert any(item["reference"] == reference for item in by_reference.json()["items"])


def test_status_update_requires_admin_key():
    create = client.post(
        "/api/v1/reports",
        json={"title": "Needs Admin Key", "category": "other", "latitude": 6.5, "longitude": 3.39},
    )
    reference = create.json()["reference"]

    unauthorized = client.patch(f"/api/v1/reports/{reference}/status", json={"status": "resolved"})
    assert unauthorized.status_code == 401

    wrong_key = client.patch(
        f"/api/v1/reports/{reference}/status",
        json={"status": "resolved"},
        headers={"X-Admin-Key": "not-the-key"},
    )
    assert wrong_key.status_code == 401

    authorized = client.patch(
        f"/api/v1/reports/{reference}/status",
        json={"status": "resolved"},
        headers={"X-Admin-Key": "test-admin-key"},
    )
    assert authorized.status_code == 200
    assert authorized.json()["status"] == "resolved"
    assert authorized.json()["resolved_at"] is not None


def test_admin_login_validates_key():
    ok = client.post("/api/v1/admin/login", json={"admin_key": "test-admin-key"})
    assert ok.status_code == 200
    assert ok.json() == {"ok": True}

    bad = client.post("/api/v1/admin/login", json={"admin_key": "wrong"})
    assert bad.status_code == 401


def test_admin_analytics_requires_key_and_reports_counts():
    unauthorized = client.get("/api/v1/admin/analytics")
    assert unauthorized.status_code == 401

    response = client.get("/api/v1/admin/analytics", headers={"X-Admin-Key": "test-admin-key"})
    assert response.status_code == 200
    body = response.json()
    assert body["resolved"] + body["pending"] == body["total_reports"]
    assert len(body["monthly"]) == 6
