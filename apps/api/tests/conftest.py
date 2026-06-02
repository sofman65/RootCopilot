"""
Test fixtures.

Forces USE_MOCK_LLM=true and a placeholder ANTHROPIC_API_KEY *before*
any app imports, so the LLMSubsystem uses MockAnalysisAgent and tests
never make network calls.

When DATABASE_URL is set (Postgres reachable), runs the seed script
once at session start so DB-backed endpoints have data to read.
"""

import asyncio
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

# Seed the DB before importing the app. The seed uses its own short-lived
# engine, so it doesn't pollute app.db._engine — that one is created lazily
# inside the TestClient's event loop when the first request hits a DB-backed
# route.
_settings = get_settings()
if _settings.database_url:
    from app.scripts.seed_demo_data import seed
    asyncio.run(seed(verbose=False))

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    """Single TestClient shared across the session — avoids re-importing the app."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def created_ticket(client):
    """A ticket created fresh for tests that need a mutable resource."""
    from tests._demo_uuids import PROJECT_PAYMENTS
    r = client.post("/tickets", json={
        "project_id": PROJECT_PAYMENTS,
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
