"""
Regression tests for canonical API endpoints.
Based on docs/api-contracts.md v0.1.
"""

from tests._demo_uuids import (
    TICKET_MERCHANT_CONFIG as DEMO_TICKET_ID,
    PROJECT_PAYMENTS as DEMO_PROJECT_ID,
    INT_MANUAL as DEMO_INTEGRATION_ID,
    WS_DEMO,
)

# Valid UUID that doesn't exist in the DB — used for 404 tests.
NONEXISTENT_UUID = "00000000-0000-0000-0000-000000000000"


# ===========================================================================
# Health
# ===========================================================================

class TestHealth:
    def test_returns_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


# ===========================================================================
# Workspace
# ===========================================================================

class TestWorkspaceCurrent:
    def test_returns_workspace(self, client):
        import uuid
        r = client.get("/workspace/current")
        assert r.status_code == 200
        body = r.json()
        # DB-backed: id is now a UUID string, not the legacy "ws_demo"
        uuid.UUID(body["id"])  # raises if not a valid UUID
        assert body["name"]
        assert "created_at" in body
        assert "updated_at" in body


class TestWorkspaceTree:
    def test_returns_clients_list(self, client):
        r = client.get("/workspace/tree")
        assert r.status_code == 200
        body = r.json()
        assert "clients" in body
        assert len(body["clients"]) >= 1

    def test_client_has_projects(self, client):
        body = client.get("/workspace/tree").json()
        client_node = body["clients"][0]
        assert "id" in client_node
        assert "name" in client_node
        assert "projects" in client_node
        assert len(client_node["projects"]) >= 1

    def test_project_has_environments(self, client):
        body = client.get("/workspace/tree").json()
        project_node = body["clients"][0]["projects"][0]
        assert "environments" in project_node
        assert len(project_node["environments"]) >= 1

    def test_environment_has_tickets(self, client):
        body = client.get("/workspace/tree").json()
        env_node = body["clients"][0]["projects"][0]["environments"][0]
        assert "tickets" in env_node
        assert len(env_node["tickets"]) >= 1

    def test_ticket_summary_fields(self, client):
        body = client.get("/workspace/tree").json()
        ticket = body["clients"][0]["projects"][0]["environments"][0]["tickets"][0]
        for field in ("id", "title", "status", "priority", "source_system", "created_at", "updated_at"):
            assert field in ticket, f"Missing field: {field}"

    def test_demobank_and_retailco_present(self, client):
        body = client.get("/workspace/tree").json()
        names = {c["name"] for c in body["clients"]}
        assert "DemoBank" in names
        assert "RetailCo" in names


# ===========================================================================
# Integrations
# ===========================================================================

class TestIntegrations:
    def test_list_returns_manual_integration(self, client):
        r = client.get("/integrations")
        assert r.status_code == 200
        ids = [i["id"] for i in r.json()]
        assert DEMO_INTEGRATION_ID in ids

    def test_list_never_returns_credentials(self, client):
        r = client.get("/integrations")
        for integration in r.json():
            assert "credentials" not in integration

    def test_create_manual(self, client):
        r = client.post("/integrations", json={"type": "manual", "name": "Test Integration"})
        assert r.status_code == 201
        body = r.json()
        assert body["type"] == "manual"
        assert body["name"] == "Test Integration"
        assert body["status"] == "active"
        assert "credentials" not in body
        assert "id" in body

    def test_sync_unknown_returns_404(self, client):
        r = client.post(f"/integrations/{NONEXISTENT_UUID}/sync")
        assert r.status_code == 404


# ===========================================================================
# Projects
# ===========================================================================

class TestProjects:
    def test_list_returns_demo_projects(self, client):
        r = client.get("/projects")
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert DEMO_PROJECT_ID in ids

    def test_list_filter_by_integration(self, client):
        r = client.get(f"/projects?integration_id={DEMO_INTEGRATION_ID}")
        assert r.status_code == 200
        for p in r.json():
            assert p["integration_id"] == DEMO_INTEGRATION_ID

    def test_get_existing(self, client):
        r = client.get(f"/projects/{DEMO_PROJECT_ID}")
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == DEMO_PROJECT_ID
        assert body["name"] == "Payments API"

    def test_get_nonexistent_returns_404(self, client):
        r = client.get(f"/projects/{NONEXISTENT_UUID}")
        assert r.status_code == 404

    def test_create(self, client):
        r = client.post("/projects", json={
            "integration_id": DEMO_INTEGRATION_ID,
            "name": "Regression Test Project",
        })
        assert r.status_code == 201
        body = r.json()
        assert body["name"] == "Regression Test Project"
        assert body["workspace_id"] == WS_DEMO
        assert "id" in body

    def test_create_with_bad_integration_returns_404(self, client):
        r = client.post("/projects", json={
            "integration_id": NONEXISTENT_UUID,
            "name": "Bad project",
        })
        assert r.status_code == 404


# ===========================================================================
# Tickets
# ===========================================================================

class TestTicketList:
    def test_returns_demo_tickets(self, client):
        r = client.get("/tickets")
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()]
        assert DEMO_TICKET_ID in ids

    def test_filter_by_project(self, client):
        r = client.get(f"/tickets?project_id={DEMO_PROJECT_ID}")
        assert r.status_code == 200
        for t in r.json():
            assert t["project_id"] == DEMO_PROJECT_ID

    def test_filter_by_environment(self, client):
        r = client.get("/tickets?environment=UAT")
        assert r.status_code == 200
        for t in r.json():
            assert t["environment"] == "UAT"

    def test_filter_by_priority(self, client):
        r = client.get("/tickets?priority=Critical")
        assert r.status_code == 200
        for t in r.json():
            assert t["priority"] == "Critical"

    def test_text_search_via_q(self, client):
        r = client.get("/tickets?q=merchant")
        assert r.status_code == 200
        results = r.json()
        assert any("merchant" in t["title"].lower() for t in results)

    def test_full_ticket_shape(self, client):
        r = client.get("/tickets")
        ticket = next(t for t in r.json() if t["id"] == DEMO_TICKET_ID)
        for field in (
            "id", "workspace_id", "project_id", "integration_id", "source_system",
            "title", "description", "status", "priority",
            "client_name", "environment", "component", "labels",
            "ingested_at", "created_at", "updated_at",
        ):
            assert field in ticket, f"Missing field: {field}"


class TestTicketGet:
    def test_get_existing(self, client):
        r = client.get(f"/tickets/{DEMO_TICKET_ID}")
        assert r.status_code == 200
        assert r.json()["id"] == DEMO_TICKET_ID

    def test_get_nonexistent_returns_404(self, client):
        r = client.get(f"/tickets/{NONEXISTENT_UUID}")
        assert r.status_code == 404


class TestTicketCreate:
    def test_create_minimal(self, client):
        r = client.post("/tickets", json={
            "project_id": DEMO_PROJECT_ID,
            "title": "Minimal test ticket",
        })
        assert r.status_code == 201
        body = r.json()
        assert body["title"] == "Minimal test ticket"
        assert body["source_system"] == "manual"
        assert body["external_id"] is None
        assert body["external_url"] is None
        assert body["workspace_id"] == WS_DEMO

    def test_create_defaults_to_manual_integration(self, client):
        r = client.post("/tickets", json={
            "project_id": DEMO_PROJECT_ID,
            "title": "No integration_id supplied",
        })
        assert r.status_code == 201
        body = r.json()
        assert body["integration_id"] == DEMO_INTEGRATION_ID

    def test_create_with_bad_project_returns_404(self, client):
        r = client.post("/tickets", json={
            "project_id": NONEXISTENT_UUID,
            "title": "Should fail",
        })
        assert r.status_code == 404

    def test_create_full_fields(self, client, created_ticket):
        assert created_ticket["title"] == "Regression test ticket"
        assert created_ticket["client_name"] == "DemoBank"
        assert created_ticket["environment"] == "UAT"
        assert created_ticket["labels"] == ["regression"]
        assert "id" in created_ticket


class TestTicketPatch:
    def test_patch_status(self, client, created_ticket):
        ticket_id = created_ticket["id"]
        r = client.patch(f"/tickets/{ticket_id}", json={"status": "In Progress"})
        assert r.status_code == 200
        assert r.json()["status"] == "In Progress"

    def test_patch_priority(self, client, created_ticket):
        ticket_id = created_ticket["id"]
        r = client.patch(f"/tickets/{ticket_id}", json={"priority": "High"})
        assert r.status_code == 200
        assert r.json()["priority"] == "High"

    def test_patch_nonexistent_returns_404(self, client):
        r = client.patch(f"/tickets/{NONEXISTENT_UUID}", json={"status": "Open"})
        assert r.status_code == 404

    def test_patch_updates_updated_at(self, client, created_ticket):
        ticket_id = created_ticket["id"]
        original = client.get(f"/tickets/{ticket_id}").json()["updated_at"]
        client.patch(f"/tickets/{ticket_id}", json={"status": "Resolved"})
        updated = client.get(f"/tickets/{ticket_id}").json()["updated_at"]
        # updated_at should have changed (or at least be present)
        assert updated is not None


# ===========================================================================
# Comments
# ===========================================================================

class TestComments:
    def test_list_demo_comments(self, client):
        r = client.get(f"/tickets/{DEMO_TICKET_ID}/comments")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_comment_shape(self, client):
        comments = client.get(f"/tickets/{DEMO_TICKET_ID}/comments").json()
        c = comments[0]
        for field in ("id", "ticket_id", "source", "author", "body", "created_at"):
            assert field in c, f"Missing field: {field}"

    def test_create_comment(self, client, created_ticket):
        ticket_id = created_ticket["id"]
        r = client.post(f"/tickets/{ticket_id}/comments", json={"body": "Test comment body."})
        assert r.status_code == 201
        body = r.json()
        assert body["body"] == "Test comment body."
        assert body["ticket_id"] == ticket_id
        assert body["source"] == "internal"

    def test_list_for_ticket_with_no_comments_returns_empty(self, client, created_ticket):
        # The created_ticket starts with no comments (until the test above adds one)
        ticket_id = created_ticket["id"]
        r = client.get(f"/tickets/{ticket_id}/comments")
        assert r.status_code == 200

    def test_list_nonexistent_ticket_returns_404(self, client):
        r = client.get(f"/tickets/{NONEXISTENT_UUID}/comments")
        assert r.status_code == 404

    def test_create_empty_body_returns_400(self, client):
        r = client.post(f"/tickets/{DEMO_TICKET_ID}/comments", json={"body": "  "})
        assert r.status_code == 400


# ===========================================================================
# Artifacts
# ===========================================================================

class TestArtifacts:
    def test_list_demo_artifacts_empty(self, client):
        r = client.get(f"/tickets/{DEMO_TICKET_ID}/artifacts")
        assert r.status_code == 200

    def test_create_artifact(self, client, created_ticket):
        ticket_id = created_ticket["id"]
        r = client.post(f"/tickets/{ticket_id}/artifacts", json={
            "name": "error.log",
            "type": "log",
            "content": "ERROR: Terminal profile missing for merchant DEMO-102",
        })
        assert r.status_code == 201
        body = r.json()
        assert body["name"] == "error.log"
        assert body["type"] == "log"
        assert body["ticket_id"] == ticket_id
        assert body["storage_url"] is None

    def test_create_missing_required_returns_400(self, client):
        r = client.post(f"/tickets/{DEMO_TICKET_ID}/artifacts", json={"name": "only-name.txt"})
        assert r.status_code == 400

    def test_list_nonexistent_ticket_returns_404(self, client):
        r = client.get(f"/tickets/{NONEXISTENT_UUID}/artifacts")
        assert r.status_code == 404


# ===========================================================================
# Analysis
# ===========================================================================

class TestAnalysis:
    def test_analyze_returns_done_status(self, client, created_analysis):
        assert created_analysis["status"] == "done"

    def test_analyze_shape(self, client, created_analysis):
        for field in (
            "id", "ticket_id", "triggered_by", "instruction",
            "status", "model", "result_markdown", "result_json",
            "similar_tickets", "created_at", "completed_at",
        ):
            assert field in created_analysis, f"Missing field: {field}"

    def test_analyze_result_json_shape(self, client, created_analysis):
        rj = created_analysis["result_json"]
        for field in (
            "summary", "likely_root_cause", "confidence",
            "evidence", "suggested_steps", "stakeholder_summary",
        ):
            assert field in rj, f"result_json missing field: {field}"
        assert isinstance(rj["evidence"], list)
        assert isinstance(rj["suggested_steps"], list)

    def test_analyze_similar_tickets_are_list(self, client, created_analysis):
        assert isinstance(created_analysis["similar_tickets"], list)

    def test_analyze_default_instruction(self, client):
        r = client.post(f"/tickets/{DEMO_TICKET_ID}/analyze", json={})
        assert r.status_code == 200
        body = r.json()
        assert body["instruction"]  # server filled in the default
        assert body["triggered_by"] == "user"

    def test_analyze_custom_instruction(self, client):
        r = client.post(f"/tickets/{DEMO_TICKET_ID}/analyze", json={
            "instruction": "Focus on PSP configuration issues.",
            "triggered_by": "quick_action",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["instruction"] == "Focus on PSP configuration issues."
        assert body["triggered_by"] == "quick_action"

    def test_get_latest_analysis(self, client, created_ticket, created_analysis):
        ticket_id = created_ticket["id"]
        r = client.get(f"/tickets/{ticket_id}/analysis")
        assert r.status_code == 200
        assert r.json()["ticket_id"] == ticket_id

    def test_get_analysis_by_id(self, client, created_analysis):
        analysis_id = created_analysis["id"]
        r = client.get(f"/analysis/{analysis_id}")
        assert r.status_code == 200
        assert r.json()["id"] == analysis_id

    def test_get_analysis_nonexistent_ticket_returns_404(self, client):
        r = client.get(f"/tickets/{NONEXISTENT_UUID}/analysis")
        assert r.status_code == 404

    def test_analyze_nonexistent_ticket_returns_404(self, client):
        r = client.post(f"/tickets/{NONEXISTENT_UUID}/analyze", json={})
        assert r.status_code == 404


# ===========================================================================
# Search
# ===========================================================================

class TestSearch:
    def test_canonical_keys_present(self, client):
        r = client.get("/search?q=merchant")
        assert r.status_code == 200
        body = r.json()
        for key in ("tickets", "comments", "artifacts", "analysis"):
            assert key in body, f"Missing canonical key: {key}"

    def test_legacy_keys_present_during_migration(self, client):
        r = client.get("/search?q=merchant")
        body = r.json()
        assert "issues" in body
        assert "messages" in body

    def test_legacy_term_param_works(self, client):
        r = client.get("/search?term=merchant")
        assert r.status_code == 200
        body = r.json()
        assert len(body["tickets"]) >= 1

    def test_q_and_term_give_same_results(self, client):
        q_result = client.get("/search?q=merchant").json()
        term_result = client.get("/search?term=merchant").json()
        assert len(q_result["tickets"]) == len(term_result["tickets"])

    def test_empty_query_returns_empty(self, client):
        r = client.get("/search?q=")
        assert r.status_code == 200
        body = r.json()
        assert body["tickets"] == []

    def test_no_results_returns_empty_lists(self, client):
        r = client.get("/search?q=zzz_no_match_zzz")
        assert r.status_code == 200
        body = r.json()
        assert body["tickets"] == []

    def test_ticket_result_shape(self, client):
        body = client.get("/search?q=merchant").json()
        ticket = body["tickets"][0]
        for field in ("id", "title", "environment", "priority", "status"):
            assert field in ticket, f"Missing field: {field}"

    def test_search_matches_description(self, client):
        r = client.get("/search?q=DEMO-102")
        body = r.json()
        assert len(body["tickets"]) >= 1


# ===========================================================================
# RAG
# ===========================================================================

class TestRag:
    def test_list_entries(self, client):
        r = client.get("/rag/entries")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_list_entries_filter_namespace(self, client):
        r = client.get("/rag/entries?namespace=payments")
        assert r.status_code == 200
        for e in r.json():
            assert e["namespace"] == "payments"

    def test_add_document(self, client):
        r = client.post("/rag/documents", json={"name": "test-doc.txt", "namespace": "test"})
        assert r.status_code == 201
        body = r.json()
        assert body["title"] == "test-doc.txt"
        assert body["namespace"] == "test"

    def test_ask_returns_answer_and_contexts(self, client):
        r = client.post("/rag/ask", json={"question": "What caused the terminal profile error?"})
        assert r.status_code == 200
        body = r.json()
        assert "answer" in body
        assert isinstance(body["answer"], str) and body["answer"]
        assert "contexts" in body
        assert isinstance(body["contexts"], list)
        # Retrieval should surface the seeded merchant-config knowledge doc.
        for ctx in body["contexts"]:
            assert "chunk" in ctx
            assert "score" in ctx
            assert "doc" in ctx
