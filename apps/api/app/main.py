from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    WorkspaceResponse,
    IntegrationCreate,
    IntegrationResponse,
    ProjectCreate,
    ProjectResponse,
    TicketCreate,
    TicketPatch,
    TicketResponse,
    AnalysisRunRequest,
    SearchResponse,
)
from app.schemas.search import TicketSearchResult
from app.demo_data import (
    WORKSPACE,
    INTEGRATIONS,
    PROJECTS,
    TICKETS,
    COMMENTS,
    ARTIFACTS,
    ANALYSIS_RUNS,
    THREADS,
    MESSAGES,
    RAG_ENTRIES,
    legacy_clients,
    legacy_projects_for_client,
    legacy_environments_for_project,
    legacy_issues_for_environment,
    legacy_issue_by_id,
    _ticket_breadcrumb,
)

app = FastAPI(title="RootCopilot API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_ANALYSIS_INSTRUCTION = (
    "Analyze this ticket. Identify the likely root cause, "
    "key evidence, suggested resolution steps, and write a short stakeholder summary."
)


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid4().hex[:12]}"


# ===========================================================================
# Health
# ===========================================================================

@app.get("/health")
def health():
    return {"status": "ok"}


# ===========================================================================
# Workspace
# ===========================================================================

@app.get("/workspace/current", response_model=WorkspaceResponse)
def workspace_current():
    return WORKSPACE


@app.get("/workspace/tree")
def workspace_tree():
    project_map = {p["id"]: p for p in PROJECTS}
    tree: dict = {}

    for t in TICKETS:
        client_name = t.get("client_name") or "Unknown"
        client_id = "client_" + client_name.lower().replace(" ", "_")
        project = project_map.get(t["project_id"], {})
        project_id = t["project_id"]
        project_name = project.get("name", "Unknown")
        env_name = t.get("environment") or "Unknown"
        env_id = f"env_{project_id}_{env_name.lower()}"

        if client_id not in tree:
            tree[client_id] = {"id": client_id, "name": client_name, "projects": {}}
        if project_id not in tree[client_id]["projects"]:
            tree[client_id]["projects"][project_id] = {
                "id": project_id,
                "name": project_name,
                "environments": {},
            }
        if env_id not in tree[client_id]["projects"][project_id]["environments"]:
            tree[client_id]["projects"][project_id]["environments"][env_id] = {
                "id": env_id,
                "name": env_name,
                "tickets": [],
            }

        tree[client_id]["projects"][project_id]["environments"][env_id]["tickets"].append({
            "id": t["id"],
            "title": t["title"],
            "status": t["status"],
            "priority": t["priority"],
            "source_system": t["source_system"],
            "created_at": t["created_at"],
            "updated_at": t["updated_at"],
        })

    clients = []
    for client_node in tree.values():
        projects = []
        for project_node in client_node["projects"].values():
            envs = list(project_node["environments"].values())
            projects.append({
                "id": project_node["id"],
                "name": project_node["name"],
                "environments": envs,
            })
        clients.append({"id": client_node["id"], "name": client_node["name"], "projects": projects})

    return {"clients": clients}


# ===========================================================================
# Integrations
# ===========================================================================

@app.get("/integrations")
def list_integrations():
    return INTEGRATIONS


@app.post("/integrations", response_model=IntegrationResponse, status_code=201)
def create_integration(body: IntegrationCreate):
    now = _now()
    integration = {
        "id": _new_id("int_"),
        "workspace_id": WORKSPACE["id"],
        "type": body.type,
        "name": body.name,
        "config": body.config,
        "status": "active",
        "last_synced_at": None,
        "created_at": now,
        "updated_at": now,
    }
    INTEGRATIONS.append(integration)
    return integration


@app.post("/integrations/{integration_id}/sync")
def sync_integration(integration_id: str):
    integration = next((i for i in INTEGRATIONS if i["id"] == integration_id), None)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    return {"integration_id": integration_id, "status": "queued", "message": "Sync started"}


# ===========================================================================
# Projects
# ===========================================================================

@app.get("/projects")
def list_projects(
    integration_id: Optional[str] = None,
    source_system: Optional[str] = None,
):
    result = PROJECTS
    if integration_id:
        result = [p for p in result if p["integration_id"] == integration_id]
    return result


@app.post("/projects", response_model=ProjectResponse, status_code=201)
def create_project(body: ProjectCreate):
    integration = next((i for i in INTEGRATIONS if i["id"] == body.integration_id), None)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    now = _now()
    project = {
        "id": _new_id("project_"),
        "workspace_id": WORKSPACE["id"],
        "integration_id": body.integration_id,
        "external_id": body.external_id,
        "name": body.name,
        "created_at": now,
        "updated_at": now,
    }
    PROJECTS.append(project)
    return project


@app.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    project = next((p for p in PROJECTS if p["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ===========================================================================
# Tickets
# ===========================================================================

@app.get("/tickets")
def list_tickets(
    project_id: Optional[str] = None,
    integration_id: Optional[str] = None,
    source_system: Optional[str] = None,
    client_name: Optional[str] = None,
    environment: Optional[str] = None,
    component: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    q: Optional[str] = None,
):
    result = TICKETS
    if project_id:
        result = [t for t in result if t["project_id"] == project_id]
    if integration_id:
        result = [t for t in result if t["integration_id"] == integration_id]
    if source_system:
        result = [t for t in result if t["source_system"] == source_system]
    if client_name:
        result = [t for t in result if (t.get("client_name") or "").lower() == client_name.lower()]
    if environment:
        result = [t for t in result if (t.get("environment") or "").lower() == environment.lower()]
    if component:
        result = [t for t in result if (t.get("component") or "").lower() == component.lower()]
    if status:
        result = [t for t in result if t.get("status") == status]
    if priority:
        result = [t for t in result if t.get("priority") == priority]
    if q:
        ql = q.lower()
        result = [
            t for t in result
            if ql in t["title"].lower() or ql in (t.get("description") or "").lower()
        ]
    return result


@app.post("/tickets", response_model=TicketResponse, status_code=201)
def create_ticket(body: TicketCreate):
    project = next((p for p in PROJECTS if p["id"] == body.project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    integration_id = body.integration_id or project["integration_id"]
    now = _now()
    ticket = {
        "id": _new_id("ticket_"),
        "workspace_id": WORKSPACE["id"],
        "project_id": body.project_id,
        "integration_id": integration_id,
        "source_system": "manual",
        "external_id": None,
        "external_url": None,
        "title": body.title,
        "description": body.description,
        "status": body.status,
        "priority": body.priority,
        "client_name": body.client_name,
        "environment": body.environment,
        "component": body.component,
        "service_name": body.service_name,
        "labels": body.labels,
        "area_path": None,
        "assignee": body.assignee,
        "reporter": body.reporter,
        "source_created_at": None,
        "source_updated_at": None,
        "ingested_at": now,
        "created_at": now,
        "updated_at": now,
    }
    TICKETS.append(ticket)
    return ticket


@app.get("/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: str):
    ticket = next((t for t in TICKETS if t["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.patch("/tickets/{ticket_id}", response_model=TicketResponse)
def patch_ticket(ticket_id: str, body: TicketPatch):
    ticket = next((t for t in TICKETS if t["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    updates = body.model_dump(exclude_none=True)
    ticket.update(updates)
    ticket["updated_at"] = _now()
    return ticket


# ===========================================================================
# Comments
# ===========================================================================

@app.get("/tickets/{ticket_id}/comments")
def list_comments(ticket_id: str):
    if not any(t["id"] == ticket_id for t in TICKETS):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return [c for c in COMMENTS if c["ticket_id"] == ticket_id]


@app.post("/tickets/{ticket_id}/comments", status_code=201)
def create_comment(ticket_id: str, body: dict):
    if not any(t["id"] == ticket_id for t in TICKETS):
        raise HTTPException(status_code=404, detail="Ticket not found")
    text = body.get("body", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="body is required")
    now = _now()
    comment = {
        "id": _new_id("comment_"),
        "ticket_id": ticket_id,
        "source": "internal",
        "external_id": None,
        "author": body.get("author", "user"),
        "body": text,
        "created_at": now,
        "updated_at": now,
    }
    COMMENTS.append(comment)
    return comment


# ===========================================================================
# Artifacts
# ===========================================================================

@app.get("/tickets/{ticket_id}/artifacts")
def list_artifacts(ticket_id: str):
    if not any(t["id"] == ticket_id for t in TICKETS):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return [a for a in ARTIFACTS if a["ticket_id"] == ticket_id]


@app.post("/tickets/{ticket_id}/artifacts", status_code=201)
def create_artifact(ticket_id: str, body: dict):
    if not any(t["id"] == ticket_id for t in TICKETS):
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not body.get("name") or not body.get("content"):
        raise HTTPException(status_code=400, detail="name and content are required")
    now = _now()
    artifact = {
        "id": _new_id("artifact_"),
        "ticket_id": ticket_id,
        "name": body["name"],
        "type": body.get("type", "other"),
        "content": body["content"],
        "storage_url": None,
        "created_at": now,
    }
    ARTIFACTS.append(artifact)
    return artifact


# ===========================================================================
# Analysis
# ===========================================================================

@app.post("/tickets/{ticket_id}/analyze")
def analyze_ticket(ticket_id: str, body: AnalysisRunRequest):
    ticket = next((t for t in TICKETS if t["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    instruction = body.instruction or DEFAULT_ANALYSIS_INSTRUCTION
    similar = [
        {
            "ticket_id": t["id"],
            "title": t["title"],
            "score": round(0.75 + 0.1 * (t["priority"] == ticket["priority"]), 2),
            "explanation": "Similar component and environment configuration.",
        }
        for t in TICKETS
        if t["id"] != ticket_id and t["project_id"] == ticket["project_id"]
    ][:3]

    now = _now()
    run = {
        "id": _new_id("analysis_"),
        "ticket_id": ticket_id,
        "triggered_by": body.triggered_by,
        "instruction": instruction,
        "status": "done",
        "model": "mock-model",
        "result_markdown": (
            f"### Summary\n{ticket['title']}\n\n"
            "### Likely Root Cause\n"
            "Based on the description and similar past tickets, this appears to be "
            "a configuration-related failure in the affected environment. "
            "Check environment-specific setup, recent changes, and related service mappings.\n\n"
            "### Suggested Steps\n"
            "1. Review environment configuration for the affected service.\n"
            "2. Compare against a working environment.\n"
            "3. Check recent deployments or config changes."
        ),
        "result_json": {
            "summary": ticket["title"],
            "likely_root_cause": "Configuration or environment-specific setup issue.",
            "confidence": "medium",
            "evidence": [
                "Issue is isolated to one environment.",
                "Description references a specific configuration artifact.",
                "Similar historical tickets were configuration-related.",
            ],
            "suggested_steps": [
                "Review environment-specific configuration.",
                "Compare against a working environment.",
                "Check recent deployments or config changes.",
            ],
            "stakeholder_summary": (
                "The issue appears isolated to configuration, not a platform-wide outage."
            ),
        },
        "similar_tickets": similar,
        "created_at": now,
        "updated_at": now,
        "completed_at": now,
    }
    ANALYSIS_RUNS.append(run)
    return run


@app.get("/tickets/{ticket_id}/analysis")
def get_ticket_analysis(ticket_id: str):
    if not any(t["id"] == ticket_id for t in TICKETS):
        raise HTTPException(status_code=404, detail="Ticket not found")
    run = next(
        (r for r in reversed(ANALYSIS_RUNS) if r["ticket_id"] == ticket_id), None
    )
    if not run:
        raise HTTPException(status_code=404, detail="No analysis found for this ticket")
    return run


@app.get("/analysis/{analysis_id}")
def get_analysis(analysis_id: str):
    run = next((r for r in ANALYSIS_RUNS if r["id"] == analysis_id), None)
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")
    return run


# ===========================================================================
# Search
# ===========================================================================

@app.get("/search")
def search(
    q: Optional[str] = None,
    term: Optional[str] = None,  # legacy alias
    scope: Optional[str] = "all",
):
    query = (q or term or "").lower().strip()
    if not query:
        return SearchResponse(
            tickets=[], comments=[], artifacts=[], analysis=[],
            issues=[], messages=[],
        )

    matched_tickets = [
        TicketSearchResult(
            id=t["id"],
            title=t["title"],
            breadcrumb=_ticket_breadcrumb(t),
            environment=t.get("environment"),
            priority=t.get("priority", ""),
            status=t.get("status", ""),
        )
        for t in TICKETS
        if query in t["title"].lower() or query in (t.get("description") or "").lower()
        or query in (t.get("environment") or "").lower()
        or query in (t.get("client_name") or "").lower()
    ]

    matched_comments = [
        c for c in COMMENTS if query in c["body"].lower()
    ]

    return SearchResponse(
        tickets=matched_tickets,
        comments=matched_comments,
        artifacts=[],
        analysis=[],
        # legacy aliases
        issues=matched_tickets,
        messages=matched_comments,
    )


# ===========================================================================
# RAG / Knowledge
# ===========================================================================

@app.get("/rag/entries")
def list_rag_entries(namespace: Optional[str] = None):
    if namespace:
        return [e for e in RAG_ENTRIES if e.get("namespace") == namespace]
    return RAG_ENTRIES


@app.post("/rag/documents", status_code=201)
def add_rag_document(payload: dict):
    entry = {
        "entryId": _new_id("rag_"),
        "title": payload.get("name", "Untitled document"),
        "namespace": payload.get("namespace", "default"),
        "createdAt": 1710000000000,
    }
    RAG_ENTRIES.append(entry)
    return entry


@app.post("/rag/ask")
def ask_rag(payload: dict):
    question = payload.get("question", "")
    return {
        "answer": (
            f"RootCopilot analyzed your question: '{question}'. "
            "In the production version, this response will be grounded in "
            "indexed tickets, logs, comments, and previous analyses."
        ),
        "sources": [
            {
                "source_type": "ticket",
                "source_id": "ticket_merchant_config",
                "title": "Transactions fail in UAT for one merchant",
                "score": 0.87,
                "excerpt": "Logs mention missing terminal profile for merchant DEMO-102.",
            }
        ],
    }


# ===========================================================================
# Legacy compatibility endpoints — support existing frontend sidebar
# during migration to GET /workspace/tree
# ===========================================================================

@app.get("/clients")
def list_clients_legacy():
    return legacy_clients()


@app.get("/clients/{client_id}/projects")
def list_projects_legacy(client_id: str):
    return legacy_projects_for_client(client_id)


@app.get("/projects/{project_id}/environments")
def list_environments_legacy(project_id: str):
    return legacy_environments_for_project(project_id)


@app.get("/environments/{environment_id}/issues")
def list_issues_legacy(environment_id: str):
    return legacy_issues_for_environment(environment_id)


@app.get("/issues/{issue_id}")
def get_issue_legacy(issue_id: str):
    issue = legacy_issue_by_id(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@app.get("/issues/{issue_id}/thread")
def get_thread_by_issue(issue_id: str):
    thread = next((t for t in THREADS if t["issue_id"] == issue_id), None)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@app.post("/issues/{issue_id}/thread")
def create_thread(issue_id: str):
    existing = next((t for t in THREADS if t["issue_id"] == issue_id), None)
    if existing:
        return existing
    new_thread = {"_id": f"thread_{issue_id}", "issue_id": issue_id}
    THREADS.append(new_thread)
    return new_thread


@app.get("/threads/{thread_id}/messages")
def list_thread_messages(thread_id: str):
    return [m for m in MESSAGES if m["thread_id"] == thread_id]


@app.post("/threads/{thread_id}/messages")
def send_thread_message(thread_id: str, payload: dict):
    content = payload.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Missing content")
    msg = {
        "_id": _new_id("msg_"),
        "thread_id": thread_id,
        "role": "user",
        "content": content,
        "created_at": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    MESSAGES.append(msg)
    return msg


@app.post("/threads/{thread_id}/assistant/reply")
def assistant_reply(thread_id: str):
    reply = {
        "_id": _new_id("msg_"),
        "thread_id": thread_id,
        "role": "assistant",
        "content": (
            "Based on similar historical issues, this looks like a configuration-related failure. "
            "Check environment-specific setup, recent changes, and related service mappings."
        ),
        "created_at": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    MESSAGES.append(reply)
    return reply


@app.post("/threads/{thread_id}/quick-action-message")
def quick_action_message(thread_id: str, payload: dict):
    instruction = payload.get("instruction", "Run quick action")
    msg = {
        "_id": _new_id("msg_"),
        "thread_id": thread_id,
        "role": "user",
        "content": instruction,
        "created_at": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    MESSAGES.append(msg)
    return msg


@app.post("/threads/{thread_id}/assistant/quick-action")
def assistant_quick_action(thread_id: str, payload: dict):
    instruction = payload.get("instruction", "quick action")
    reply = {
        "_id": _new_id("msg_"),
        "thread_id": thread_id,
        "role": "assistant",
        "content": (
            f"Quick action completed: {instruction}. "
            "Suggested next step: compare this issue with similar historical incidents."
        ),
        "created_at": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    MESSAGES.append(reply)
    return reply
