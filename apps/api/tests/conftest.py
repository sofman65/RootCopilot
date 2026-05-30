"""
Test fixtures.

Forces USE_MOCK_LLM=true and a placeholder ANTHROPIC_API_KEY *before*
any app imports, so the LLMSubsystem uses MockAnalysisAgent and tests
never make network calls.
"""

import os

os.environ.setdefault("USE_MOCK_LLM", "true")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-placeholder")
os.environ.setdefault("LANGCHAIN_TRACING_V2", "false")

import pytest
from fastapi.testclient import TestClient

# Drop the cached Settings so the env vars above take effect
from app.llm.config import get_settings
get_settings.cache_clear()

from app.llm.subsystem import reset_subsystem
reset_subsystem()

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
