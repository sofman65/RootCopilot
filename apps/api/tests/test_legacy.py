"""
Regression tests for legacy compatibility endpoints.

The sidebar tree (clients → projects → environments → issues) is still derived
from in-memory demo_data. The issue detail + copilot thread/message endpoints
are now DB-backed (routers/chat.py) and key on ticket UUIDs.
"""

import pytest

from tests._demo_uuids import TICKET_MERCHANT_CONFIG

DEMO_TICKET_ID = "ticket_merchant_config"
NONEXISTENT_UUID = "00000000-0000-0000-0000-0000000000ff"


@pytest.fixture(scope="module")
def demo_thread_id(client):
    """Create (idempotently) the copilot thread for the merchant-config ticket
    and seed one user message, so message-list tests have content."""
    r = client.post(f"/issues/{TICKET_MERCHANT_CONFIG}/thread")
    assert r.status_code == 200
    thread_id = r.json()["_id"]
    client.post(
        f"/threads/{thread_id}/messages",
        json={"content": "Seed message for regression tests."},
    )
    return thread_id


# ===========================================================================
# Legacy sidebar tree: clients → projects → environments → issues
# ===========================================================================

class TestLegacyClients:
    def test_list_returns_clients(self, client):
        r = client.get("/clients")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_client_shape_has_underscore_id(self, client):
        clients = client.get("/clients").json()
        for c in clients:
            assert "_id" in c, "Legacy endpoint must return _id not id"
            assert "name" in c

    def test_demobank_present(self, client):
        clients = client.get("/clients").json()
        names = {c["name"] for c in clients}
        assert "DemoBank" in names

    def test_retailco_present(self, client):
        clients = client.get("/clients").json()
        names = {c["name"] for c in clients}
        assert "RetailCo" in names


class TestLegacyProjects:
    def _get_demobank_id(self, client):
        return next(
            c["_id"] for c in client.get("/clients").json()
            if c["name"] == "DemoBank"
        )

    def test_list_returns_projects_for_client(self, client):
        client_id = self._get_demobank_id(client)
        r = client.get(f"/clients/{client_id}/projects")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_project_shape_has_underscore_id(self, client):
        client_id = self._get_demobank_id(client)
        projects = client.get(f"/clients/{client_id}/projects").json()
        for p in projects:
            assert "_id" in p
            assert "name" in p
            assert "client_id" in p

    def test_unknown_client_returns_empty_not_404(self, client):
        r = client.get("/clients/client_unknown_xyz/projects")
        assert r.status_code == 200
        assert r.json() == []


class TestLegacyEnvironments:
    def test_list_environments_for_payments_project(self, client):
        r = client.get("/projects/project_payments/environments")
        assert r.status_code == 200
        envs = r.json()
        assert len(envs) >= 1

    def test_environment_shape_has_underscore_id(self, client):
        envs = client.get("/projects/project_payments/environments").json()
        for e in envs:
            assert "_id" in e
            assert "name" in e
            assert "project_id" in e

    def test_uat_environment_present(self, client):
        envs = client.get("/projects/project_payments/environments").json()
        names = {e["name"] for e in envs}
        assert "UAT" in names

    def test_production_environment_present(self, client):
        envs = client.get("/projects/project_payments/environments").json()
        names = {e["name"] for e in envs}
        assert "Production" in names

    def test_unknown_project_returns_empty(self, client):
        r = client.get("/projects/project_nonexistent/environments")
        assert r.status_code == 200
        assert r.json() == []


class TestLegacyIssues:
    def _get_uat_env_id(self, client):
        envs = client.get("/projects/project_payments/environments").json()
        return next(e["_id"] for e in envs if e["name"] == "UAT")

    def test_list_issues_for_environment(self, client):
        env_id = self._get_uat_env_id(client)
        r = client.get(f"/environments/{env_id}/issues")
        assert r.status_code == 200
        issues = r.json()
        assert len(issues) >= 1

    def test_issue_shape_has_underscore_id(self, client):
        env_id = self._get_uat_env_id(client)
        issues = client.get(f"/environments/{env_id}/issues").json()
        for i in issues:
            assert "_id" in i
            assert "title" in i
            assert "environment" in i
            assert "breadcrumb" in i

    def test_created_at_is_epoch_ms(self, client):
        env_id = self._get_uat_env_id(client)
        issues = client.get(f"/environments/{env_id}/issues").json()
        for i in issues:
            assert isinstance(i["created_at"], int)
            assert i["created_at"] > 1_000_000_000_000  # reasonable epoch ms

    def test_demo_ticket_appears_in_uat_issues(self, client):
        env_id = self._get_uat_env_id(client)
        issues = client.get(f"/environments/{env_id}/issues").json()
        ids = [i["_id"] for i in issues]
        assert DEMO_TICKET_ID in ids

    def test_unknown_environment_returns_empty(self, client):
        r = client.get("/environments/env_nonexistent_zzz/issues")
        assert r.status_code == 200
        assert r.json() == []


class TestIssueGet:
    def test_get_issue_by_ticket_uuid(self, client):
        r = client.get(f"/issues/{TICKET_MERCHANT_CONFIG}")
        assert r.status_code == 200
        body = r.json()
        assert body["_id"] == TICKET_MERCHANT_CONFIG
        assert "title" in body
        assert "breadcrumb" in body

    def test_get_nonexistent_issue_returns_404(self, client):
        r = client.get(f"/issues/{NONEXISTENT_UUID}")
        assert r.status_code == 404


# ===========================================================================
# Copilot thread & messages (DB-backed, keyed on ticket UUIDs)
# ===========================================================================

class TestChatThread:
    def test_get_thread_after_create(self, client):
        client.post(f"/issues/{TICKET_MERCHANT_CONFIG}/thread")
        r = client.get(f"/issues/{TICKET_MERCHANT_CONFIG}/thread")
        assert r.status_code == 200
        body = r.json()
        assert body["issue_id"] == TICKET_MERCHANT_CONFIG
        assert "_id" in body

    def test_create_thread_idempotent(self, client):
        r1 = client.post(f"/issues/{TICKET_MERCHANT_CONFIG}/thread")
        r2 = client.post(f"/issues/{TICKET_MERCHANT_CONFIG}/thread")
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["_id"] == r2.json()["_id"]

    def test_get_thread_for_nonexistent_ticket_returns_404(self, client):
        r = client.get(f"/issues/{NONEXISTENT_UUID}/thread")
        assert r.status_code == 404


class TestChatMessages:
    def test_list_messages_for_thread(self, client, demo_thread_id):
        r = client.get(f"/threads/{demo_thread_id}/messages")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_message_shape(self, client, demo_thread_id):
        msgs = client.get(f"/threads/{demo_thread_id}/messages").json()
        for m in msgs:
            assert "_id" in m
            assert m["role"] in ("user", "assistant")
            assert "content" in m
            assert isinstance(m["created_at"], int)

    def test_send_user_message(self, client, demo_thread_id):
        r = client.post(
            f"/threads/{demo_thread_id}/messages",
            json={"content": "What is the likely fix?"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["role"] == "user"
        assert body["content"] == "What is the likely fix?"
        assert body["thread_id"] == demo_thread_id

    def test_send_empty_message_returns_400(self, client, demo_thread_id):
        r = client.post(
            f"/threads/{demo_thread_id}/messages",
            json={"content": ""},
        )
        assert r.status_code == 400

    def test_assistant_reply(self, client, demo_thread_id):
        r = client.post(f"/threads/{demo_thread_id}/assistant/reply")
        assert r.status_code == 200
        body = r.json()
        assert body["role"] == "assistant"
        assert body["content"]

    def test_quick_action_user_message(self, client, demo_thread_id):
        r = client.post(
            f"/threads/{demo_thread_id}/quick-action-message",
            json={"instruction": "Summarize"},
        )
        assert r.status_code == 200
        assert r.json()["role"] == "user"

    def test_quick_action_assistant_reply(self, client, demo_thread_id):
        r = client.post(
            f"/threads/{demo_thread_id}/assistant/quick-action",
            json={"instruction": "Summarize"},
        )
        assert r.status_code == 200
        assert r.json()["role"] == "assistant"
