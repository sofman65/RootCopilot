"""
Repository tests against a live Postgres.

Skipped automatically when DATABASE_URL is not set.

Assumes the seed (app.scripts.seed_demo_data) has been run at least once.
Tests are read-only against the seeded data plus a scoped test workspace
that gets created + cleaned up per session.
"""

from uuid import UUID

import pytest

# Skip the whole module if no DB configured. We check Settings (which loads
# .env) rather than os.environ directly because pydantic-settings doesn't
# export to the process env.
from app.llm.config import get_settings

pytestmark = pytest.mark.skipif(
    not get_settings().database_url,
    reason="DATABASE_URL not set — DB integration tests skipped",
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
async def session():
    """
    Per-test session backed by a fresh async engine.

    We can't reuse the cached engine across tests because pytest-asyncio
    creates a new event loop per test by default, and asyncpg connection
    pools are bound to the loop they were created in. Spinning up a new
    engine per test is fast enough and keeps each test fully isolated.
    """
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    engine = create_async_engine(get_settings().database_url, pool_pre_ping=True)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as s:
            yield s
    finally:
        await engine.dispose()


@pytest.fixture
def workspace_id() -> UUID:
    from app.scripts.seed_demo_data import uuid_for
    return uuid_for("ws_demo")


@pytest.fixture
def demo_ticket_id() -> UUID:
    from app.scripts.seed_demo_data import uuid_for
    return uuid_for("ticket_merchant_config")


# ---------------------------------------------------------------------------
# WorkspaceRepository
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_workspace_get_current(session):
    from app.repositories import WorkspaceRepository
    repo = WorkspaceRepository(session)
    ws = await repo.get_current()
    assert ws is not None
    assert ws.name == "Demo Workspace"


@pytest.mark.asyncio
async def test_workspace_get_tree_shape(session, workspace_id):
    from app.repositories import WorkspaceRepository
    repo = WorkspaceRepository(session)
    tree = await repo.get_tree(workspace_id)
    assert "clients" in tree
    assert len(tree["clients"]) >= 1


@pytest.mark.asyncio
async def test_workspace_tree_has_demobank(session, workspace_id):
    from app.repositories import WorkspaceRepository
    tree = await WorkspaceRepository(session).get_tree(workspace_id)
    client_names = {c["name"] for c in tree["clients"]}
    assert "DemoBank" in client_names


# ---------------------------------------------------------------------------
# TicketRepository
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ticket_list_returns_seeded_tickets(session, workspace_id):
    from app.repositories import TicketRepository
    tickets = await TicketRepository(session).list(workspace_id=workspace_id)
    assert len(tickets) >= 3


@pytest.mark.asyncio
async def test_ticket_get_by_id(session, demo_ticket_id):
    from app.repositories import TicketRepository
    ticket = await TicketRepository(session).get_by_id(demo_ticket_id)
    assert ticket is not None
    assert "merchant" in ticket.title.lower()


@pytest.mark.asyncio
async def test_ticket_list_filter_by_priority(session, workspace_id):
    from app.repositories import TicketRepository
    high = await TicketRepository(session).list(workspace_id=workspace_id, priority="High")
    assert all(t.priority == "High" for t in high)


@pytest.mark.asyncio
async def test_ticket_list_filter_by_environment(session, workspace_id):
    from app.repositories import TicketRepository
    uat = await TicketRepository(session).list(workspace_id=workspace_id, environment="UAT")
    assert all(t.environment == "UAT" for t in uat)


@pytest.mark.asyncio
async def test_ticket_text_search(session, workspace_id):
    from app.repositories import TicketRepository
    results = await TicketRepository(session).list(workspace_id=workspace_id, q="merchant")
    assert len(results) >= 1
    assert any("merchant" in t.title.lower() for t in results)


@pytest.mark.asyncio
async def test_find_similar_tickets(session, demo_ticket_id):
    from app.repositories import TicketRepository
    repo = TicketRepository(session)
    ticket = await repo.get_by_id(demo_ticket_id)
    similar = await repo.find_similar(ticket, limit=3)
    assert all(t.id != ticket.id for t in similar)
    assert all(t.project_id == ticket.project_id for t in similar)


# ---------------------------------------------------------------------------
# TicketCommentRepository
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_comments_for_demo_ticket(session, demo_ticket_id):
    from app.repositories import TicketCommentRepository
    comments = await TicketCommentRepository(session).list_by_ticket(demo_ticket_id)
    assert len(comments) >= 1
    assert all(c.ticket_id == demo_ticket_id for c in comments)


# ---------------------------------------------------------------------------
# AnalysisRunRepository — create + read back
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_and_get_latest_analysis(session, demo_ticket_id):
    from app.repositories import AnalysisRunRepository
    repo = AnalysisRunRepository(session)
    run = await repo.create(
        ticket_id=demo_ticket_id,
        triggered_by="user",
        instruction="repository test instruction",
        status="done",
        model="mock-model",
        # Full AnalysisResultJson contract — partial shapes must never be
        # persisted (clients read this JSONB back through the API).
        result_json={
            "summary": "test",
            "likely_root_cause": "test root cause",
            "confidence": "high",
            "evidence": ["test evidence"],
            "suggested_steps": ["test step"],
            "stakeholder_summary": "test stakeholder summary",
        },
        similar_tickets=[],
    )
    # flush (not commit): the read-back below sees the row inside the same
    # transaction, and session close rolls it back — no dev-DB pollution.
    await session.flush()

    latest = await repo.get_latest_by_ticket(demo_ticket_id)
    assert latest is not None
    assert latest.id == run.id
    assert latest.result_json["summary"] == "test"


# ---------------------------------------------------------------------------
# ProjectRepository / IntegrationRepository
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_projects_by_workspace(session, workspace_id):
    from app.repositories import ProjectRepository
    projects = await ProjectRepository(session).list_by_workspace(workspace_id)
    assert len(projects) >= 2
    names = {p.name for p in projects}
    assert "Payments API" in names


@pytest.mark.asyncio
async def test_list_integrations_by_workspace(session, workspace_id):
    from app.repositories import IntegrationRepository
    integrations = await IntegrationRepository(session).list_by_workspace(workspace_id)
    assert len(integrations) >= 1
    types = {i.type for i in integrations}
    assert "manual" in types
