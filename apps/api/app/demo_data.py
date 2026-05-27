"""
Canonical in-memory demo data.

Shape follows docs/data-model.md v0.1.
Legacy endpoints derive their output from this data at query time.
"""

WORKSPACE = {
    "id": "ws_demo",
    "name": "Demo Workspace",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}

INTEGRATIONS = [
    {
        "id": "int_manual",
        "workspace_id": "ws_demo",
        "type": "manual",
        "name": "Manual Entry",
        "config": {},
        # credentials intentionally absent — never stored in plaintext
        "status": "active",
        "last_synced_at": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
]

PROJECTS = [
    {
        "id": "project_payments",
        "workspace_id": "ws_demo",
        "integration_id": "int_manual",
        "external_id": None,
        "name": "Payments API",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": "project_checkout",
        "workspace_id": "ws_demo",
        "integration_id": "int_manual",
        "external_id": None,
        "name": "Checkout Platform",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    },
]

TICKETS = [
    {
        "id": "ticket_merchant_config",
        "workspace_id": "ws_demo",
        "project_id": "project_payments",
        "integration_id": "int_manual",
        "source_system": "manual",
        "external_id": None,
        "external_url": None,
        "title": "Transactions fail in UAT for one merchant",
        "description": "Authorization attempts fail only for merchant DEMO-102. Logs mention missing terminal profile.",
        "status": "In Progress",
        "priority": "High",
        "client_name": "DemoBank",
        "environment": "UAT",
        "component": "Payments API",
        "service_name": "authorization-service",
        "labels": ["uat", "merchant-config", "payments"],
        "area_path": None,
        "assignee": None,
        "reporter": None,
        "source_created_at": None,
        "source_updated_at": None,
        "ingested_at": "2026-03-10T00:00:00Z",
        "created_at": "2026-03-10T00:00:00Z",
        "updated_at": "2026-03-10T00:00:00Z",
    },
    {
        "id": "ticket_refund_timeout",
        "workspace_id": "ws_demo",
        "project_id": "project_payments",
        "integration_id": "int_manual",
        "source_system": "manual",
        "external_id": None,
        "external_url": None,
        "title": "Refund timeout during PSP callback",
        "description": "Refunds remain pending after external PSP callback latency.",
        "status": "Open",
        "priority": "Critical",
        "client_name": "DemoBank",
        "environment": "Production",
        "component": "Payments API",
        "service_name": "refund-service",
        "labels": ["production", "psp", "timeout"],
        "area_path": None,
        "assignee": None,
        "reporter": None,
        "source_created_at": None,
        "source_updated_at": None,
        "ingested_at": "2026-03-10T01:00:00Z",
        "created_at": "2026-03-10T01:00:00Z",
        "updated_at": "2026-03-10T01:00:00Z",
    },
    {
        "id": "ticket_batch_date",
        "workspace_id": "ws_demo",
        "project_id": "project_checkout",
        "integration_id": "int_manual",
        "source_system": "manual",
        "external_id": None,
        "external_url": None,
        "title": "Settlement batch fails due to invalid date format",
        "description": "Batch import fails when settlement file contains unexpected date format.",
        "status": "Resolved",
        "priority": "Medium",
        "client_name": "RetailCo",
        "environment": "SIT",
        "component": "Checkout Platform",
        "service_name": "batch-processor",
        "labels": ["sit", "batch", "date-format"],
        "area_path": None,
        "assignee": None,
        "reporter": None,
        "source_created_at": None,
        "source_updated_at": None,
        "ingested_at": "2026-03-10T02:00:00Z",
        "created_at": "2026-03-10T02:00:00Z",
        "updated_at": "2026-03-10T02:00:00Z",
    },
]

COMMENTS = [
    {
        "id": "comment_001",
        "ticket_id": "ticket_merchant_config",
        "source": "internal",
        "external_id": None,
        "author": "Sofianos",
        "body": "Can you analyze why this UAT transaction failure happens only for one merchant?",
        "created_at": "2026-03-10T00:00:00Z",
        "updated_at": "2026-03-10T00:00:00Z",
    },
    {
        "id": "comment_002",
        "ticket_id": "ticket_merchant_config",
        "source": "internal",
        "external_id": None,
        "author": "assistant",
        "body": "The most likely root cause is missing merchant or terminal configuration in UAT.",
        "created_at": "2026-03-10T00:01:40Z",
        "updated_at": "2026-03-10T00:01:40Z",
    },
]

ARTIFACTS = []

ANALYSIS_RUNS = []

# ---------------------------------------------------------------------------
# Legacy thread/message data — supports the existing thread page until it
# migrates to the canonical AnalysisRun model. issue_id references ticket ids.
# ---------------------------------------------------------------------------

THREADS = [
    {
        "_id": "thread_merchant_config",
        "issue_id": "ticket_merchant_config",
    }
]

MESSAGES = [
    {
        "_id": "msg_1",
        "thread_id": "thread_merchant_config",
        "role": "user",
        "content": "Can you analyze why this UAT transaction failure happens only for one merchant?",
        "created_at": 1710000000000,
        "issue_id": "ticket_merchant_config",
        "issue_title": "Transactions fail in UAT for one merchant",
        "environment": "UAT",
        "breadcrumb": "DemoBank / Payments API / UAT",
    },
    {
        "_id": "msg_2",
        "thread_id": "thread_merchant_config",
        "role": "assistant",
        "content": "The most likely root cause is missing merchant or terminal configuration in UAT.",
        "created_at": 1710000100000,
        "issue_id": "ticket_merchant_config",
        "issue_title": "Transactions fail in UAT for one merchant",
        "environment": "UAT",
        "breadcrumb": "DemoBank / Payments API / UAT",
    },
]

RAG_ENTRIES = [
    {
        "entryId": "rag_1",
        "title": "Merchant configuration incident notes",
        "namespace": "payments",
        "createdAt": 1710000000000,
    }
]

# ---------------------------------------------------------------------------
# Helpers for legacy endpoint derivation
# ---------------------------------------------------------------------------

def _iso_to_epoch_ms(iso: str) -> int:
    from datetime import datetime
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return int(dt.timestamp() * 1000)


def _project_by_id(project_id: str) -> dict:
    return next((p for p in PROJECTS if p["id"] == project_id), {})


def _ticket_breadcrumb(ticket: dict) -> str:
    project = _project_by_id(ticket["project_id"])
    return " / ".join(filter(None, [
        ticket.get("client_name"),
        project.get("name"),
        ticket.get("environment"),
    ]))


def legacy_clients() -> list:
    seen: dict = {}
    for t in TICKETS:
        name = t.get("client_name") or "Unknown"
        slug = name.lower().replace(" ", "_")
        client_id = f"client_{slug}"
        if client_id not in seen:
            seen[client_id] = {"_id": client_id, "name": name}
    return list(seen.values())


def legacy_projects_for_client(client_id: str) -> list:
    slug = client_id.removeprefix("client_")
    matching_project_ids = {
        t["project_id"]
        for t in TICKETS
        if (t.get("client_name") or "").lower().replace(" ", "_") == slug
    }
    return [
        {"_id": p["id"], "client_id": client_id, "name": p["name"]}
        for p in PROJECTS
        if p["id"] in matching_project_ids
    ]


def legacy_environments_for_project(project_id: str) -> list:
    if not any(p["id"] == project_id for p in PROJECTS):
        return []
    env_names = sorted(set(
        t["environment"]
        for t in TICKETS
        if t["project_id"] == project_id and t.get("environment")
    ))
    return [
        {
            "_id": f"env_{project_id}_{env.lower()}",
            "project_id": project_id,
            "name": env,
        }
        for env in env_names
    ]


def legacy_issues_for_environment(environment_id: str) -> list:
    # environment_id format: env_{project_id}_{env_name_lower}
    stripped = environment_id.removeprefix("env_")
    for p in PROJECTS:
        prefix = p["id"] + "_"
        if stripped.startswith(prefix):
            env_lower = stripped[len(prefix):]
            return [
                {
                    "_id": t["id"],
                    "environment_id": environment_id,
                    "title": t["title"],
                    "created_at": _iso_to_epoch_ms(t["created_at"]),
                    "environment": t["environment"],
                    "breadcrumb": _ticket_breadcrumb(t),
                    "priority": t.get("priority", ""),
                    "status": t.get("status", ""),
                }
                for t in TICKETS
                if t["project_id"] == p["id"]
                and (t.get("environment") or "").lower() == env_lower
            ]
    return []


def legacy_issue_by_id(issue_id: str) -> dict:
    t = next((t for t in TICKETS if t["id"] == issue_id), None)
    if not t:
        return {}
    return {
        "_id": t["id"],
        "title": t["title"],
        "created_at": _iso_to_epoch_ms(t["created_at"]),
        "environment": t.get("environment"),
        "breadcrumb": _ticket_breadcrumb(t),
        "priority": t.get("priority"),
        "status": t.get("status"),
    }
