from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_resident_can_create_report():
    response = client.post(
        "/api/v1/reports",
        json={
            "category": "blocked_drain",
            "severity": "high",
            "description": "Plastic waste is blocking the entrance.",
            "latitude": 6.5249,
            "longitude": 3.3897,
            "evidence_paths": ["reports/demo/photo-1.jpg"],
        },
    )
    assert response.status_code == 201
    assert response.json()["status"] == "received"
    assert response.json()["reference"].startswith("DF-")


def test_only_authority_can_change_status():
    payload = {"status": "verified", "note": "Confirmed by field volunteer."}
    response = client.patch("/api/v1/reports/00000000-0000-0000-0000-000000000001/status", json=payload)
    assert response.status_code == 403
    response = client.patch(
        "/api/v1/reports/00000000-0000-0000-0000-000000000001/status",
        json=payload,
        headers={"x-user-role": "authority"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "verified"
