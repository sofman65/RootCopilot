import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client():
    """Single TestClient shared across the session — avoids re-importing the app."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def created_ticket(client):
    """A ticket created fresh for tests that need a mutable resource."""
    r = client.post("/tickets", json={
        "project_id": "project_payments",
        "title": "Regression test ticket",
        "description": "Created by the test suite.",
        "status": "Open",
        "priority": "Low",
        "client_name": "DemoBank",
        "environment": "UAT",
        "component": "Payments API",
        "labels": ["regression"],
    })
    assert r.status_code == 201
    return r.json()


@pytest.fixture(scope="module")
def created_analysis(client, created_ticket):
    """An analysis run triggered for the created_ticket."""
    r = client.post(f"/tickets/{created_ticket['id']}/analyze", json={})
    assert r.status_code == 200
    return r.json()
