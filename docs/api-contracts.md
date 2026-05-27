# RootCopilot — API Contracts

> **Status:** Design draft — based on `docs/data-model.md v0.1`.

---

## 1. API Design Principles

- **Canonical model first.** APIs are based on Workspace, Integration, Project, Ticket, AnalysisRun.
- **Frontend-friendly responses.** Some endpoints return derived/grouped views for UI convenience.
- **Integration-agnostic.** Jira, Azure DevOps, CSV, and manual entry map into the same internal contract.
- **MVP-friendly.** Manual tickets and mock/demo data come first. Jira/ADO sync comes later.
- **Analysis is async-ready.** MVP runs analysis synchronously, but the contract supports async later without breaking the frontend.
- **No secrets returned.** Integration credentials never leave the server.
- **Two API layers during migration.** Canonical API is built correctly from the new model. Legacy compatibility endpoints keep the current frontend sidebar working during the transition. Legacy endpoints are replaced once the frontend migrates to `GET /workspace/tree`.

---

## 2. Conventions

### Base URL
```
http://localhost:8000
```

### Format
All requests and responses use JSON.

### IDs
- **Canonical API:** uses `id` (UUID string).
- **Legacy compatibility endpoints:** continue to return `_id` so the existing frontend does not break.

### Error shape
```json
{ "detail": "Human-readable error message" }
```

### Timestamps
ISO 8601 strings everywhere in the canonical API.
```json
{ "created_at": "2026-05-27T12:00:00Z" }
```
Legacy endpoints may return epoch milliseconds (`number`) where the current frontend expects them.

### Search param compatibility
`GET /search` accepts **both** `q` and `term` so the existing frontend (`/search?term=...`) does not break:
```python
@app.get("/search")
def search(q: Optional[str] = None, term: Optional[str] = None):
    query = q or term or ""
```

---

## 3. Health

### `GET /health`
Checks if the API is running.

**Response**
```json
{ "status": "ok" }
```

---

## 4. Workspace

### `GET /workspace/current`
Returns the current workspace. MVP can return a single implicit demo workspace.

**Response**
```json
{
  "id": "ws_001",
  "name": "DemoBank Engineering",
  "created_at": "2026-05-27T12:00:00Z",
  "updated_at": "2026-05-27T12:00:00Z"
}
```

---

### `GET /workspace/tree`
Returns the derived UI tree: `Client → Project → Environment → Ticket`.

Computed from `Ticket.client_name`, `Ticket.environment`, and `Project.name` — not stored as a separate hierarchy. `client.id` and `environment.id` are generated grouping keys in MVP, not FK references.

**Response**
```json
{
  "clients": [
    {
      "id": "client_demobank",
      "name": "DemoBank",
      "projects": [
        {
          "id": "project_payments",
          "name": "Payments API",
          "environments": [
            {
              "id": "env_uat",
              "name": "UAT",
              "tickets": [
                {
                  "id": "ticket_001",
                  "title": "Transactions fail in UAT for one merchant",
                  "status": "In Progress",
                  "priority": "High",
                  "source_system": "manual",
                  "created_at": "2026-05-27T12:00:00Z",
                  "updated_at": "2026-05-27T12:00:00Z"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 5. Integrations

### `GET /integrations`
Lists configured integrations. Never returns `credentials`.

**Response**
```json
[
  {
    "id": "int_manual",
    "workspace_id": "ws_001",
    "type": "manual",
    "name": "Manual Entry",
    "config": {},
    "status": "active",
    "last_synced_at": null,
    "created_at": "2026-05-27T12:00:00Z",
    "updated_at": "2026-05-27T12:00:00Z"
  }
]
```

---

### `POST /integrations`
Creates an integration. `credentials` are accepted but never returned.

**Request**
```json
{
  "type": "manual",
  "name": "Manual Entry",
  "config": {}
}
```

**Response** — same shape as GET, without `credentials`.

> **Note:** For `type: "manual"`, `credentials` and `config` are optional and default to `{}`.

---

### `POST /integrations/{integration_id}/sync`
Triggers a sync for an external integration. **MVP: stub or omit.**

**Response**
```json
{
  "integration_id": "int_jira_001",
  "status": "queued",
  "message": "Sync started"
}
```

---

## 6. Projects

### `GET /projects`
Lists projects.

**Query params**

| Param | Type | Notes |
|---|---|---|
| `integration_id` | string | Filter by integration |
| `source_system` | string | `manual`, `jira`, `azure_devops` |

**Response**
```json
[
  {
    "id": "project_payments",
    "workspace_id": "ws_001",
    "integration_id": "int_manual",
    "external_id": null,
    "name": "Payments API",
    "created_at": "2026-05-27T12:00:00Z",
    "updated_at": "2026-05-27T12:00:00Z"
  }
]
```

---

### `POST /projects`

**Request**
```json
{
  "integration_id": "int_manual",
  "external_id": null,
  "name": "Payments API"
}
```

**Response** — same shape as list item.

---

### `GET /projects/{project_id}`
Returns a single project.

---

## 7. Tickets

### `GET /tickets`
Lists tickets. All params are optional filters.

**Query params**

| Param | Type | Notes |
|---|---|---|
| `project_id` | string | |
| `integration_id` | string | |
| `source_system` | string | `manual`, `jira`, `azure_devops` |
| `client_name` | string | |
| `environment` | string | |
| `component` | string | |
| `status` | string | |
| `priority` | string | |
| `q` | string | Basic text search on title/description |

**Response**
```json
[
  {
    "id": "ticket_001",
    "workspace_id": "ws_001",
    "project_id": "project_payments",
    "integration_id": "int_manual",
    "source_system": "manual",
    "external_id": null,
    "external_url": null,
    "title": "Transactions fail in UAT for one merchant",
    "description": "Authorization attempts fail only for merchant DEMO-102.",
    "status": "In Progress",
    "priority": "High",
    "client_name": "DemoBank",
    "environment": "UAT",
    "component": "Payments API",
    "service_name": "authorization-service",
    "labels": ["uat", "merchant-config"],
    "area_path": null,
    "assignee": null,
    "reporter": null,
    "source_created_at": null,
    "source_updated_at": null,
    "ingested_at": "2026-05-27T12:00:00Z",
    "created_at": "2026-05-27T12:00:00Z",
    "updated_at": "2026-05-27T12:00:00Z"
  }
]
```

---

### `POST /tickets`
Creates a manual ticket.

- `integration_id` is optional — if omitted, the backend uses the default manual integration.
- `source_system` is always set to `manual` by the server.
- `external_id` and `external_url` are always `null` for manual tickets.

**Request**
```json
{
  "project_id": "project_payments",
  "title": "Transactions fail in UAT for one merchant",
  "description": "Authorization attempts fail only for merchant DEMO-102.",
  "status": "Open",
  "priority": "High",
  "client_name": "DemoBank",
  "environment": "UAT",
  "component": "Payments API",
  "service_name": "authorization-service",
  "labels": ["uat", "merchant-config"],
  "assignee": null,
  "reporter": "Sofianos"
}
```

**Response** — full ticket shape (same as GET item).

---

### `GET /tickets/{ticket_id}`
Returns a single ticket.

---

### `PATCH /tickets/{ticket_id}`
Updates a manual ticket. Only provided fields are changed.

**Request** (partial)
```json
{
  "status": "In Progress",
  "priority": "Critical"
}
```

**Response** — updated ticket shape.

---

## 8. Ticket Comments

### `GET /tickets/{ticket_id}/comments`

**Response**
```json
[
  {
    "id": "comment_001",
    "ticket_id": "ticket_001",
    "source": "internal",
    "external_id": null,
    "author": "Sofianos",
    "body": "Checked logs. Looks isolated to one merchant.",
    "created_at": "2026-05-27T12:05:00Z",
    "updated_at": "2026-05-27T12:05:00Z"
  }
]
```

---

### `POST /tickets/{ticket_id}/comments`

**Request**
```json
{
  "body": "Checked logs. Looks isolated to one merchant."
}
```

**Response** — created comment shape.

---

## 9. Ticket Artifacts

### `GET /tickets/{ticket_id}/artifacts`

**Response**
```json
[
  {
    "id": "artifact_001",
    "ticket_id": "ticket_001",
    "name": "uat-error.log",
    "type": "log",
    "content": "ERROR: Missing terminal profile for merchant DEMO-102",
    "storage_url": null,
    "created_at": "2026-05-27T12:10:00Z"
  }
]
```

---

### `POST /tickets/{ticket_id}/artifacts`
Text-only in MVP (no file upload).

**Request**
```json
{
  "name": "uat-error.log",
  "type": "log",
  "content": "ERROR: Missing terminal profile for merchant DEMO-102"
}
```

**Response** — created artifact shape.

---

## 10. Analysis

### `POST /tickets/{ticket_id}/analyze`
Triggers an analysis run.

- `instruction` is optional — if omitted, the backend uses a default root-cause analysis prompt.
- `triggered_by` defaults to `"user"` if omitted.

**Request** (all fields optional)
```json
{
  "instruction": "Find likely root cause and suggest debugging steps.",
  "triggered_by": "user"
}
```

**MVP response** — synchronous, returns completed analysis immediately.
```json
{
  "id": "analysis_001",
  "ticket_id": "ticket_001",
  "triggered_by": "user",
  "instruction": "Find likely root cause and suggest debugging steps.",
  "status": "done",
  "model": "claude-opus-4-7",
  "result_markdown": "### Summary\nTransactions fail only for one merchant in UAT.\n\n### Likely Root Cause\nMerchant or terminal configuration issue.",
  "result_json": {
    "summary": "Transactions fail only for one merchant in UAT.",
    "likely_root_cause": "Merchant or terminal configuration issue.",
    "confidence": "high",
    "evidence": [
      "Error log mentions missing terminal profile.",
      "Issue is isolated to one merchant.",
      "Similar historical tickets caused by merchant config gaps."
    ],
    "suggested_steps": [
      "Check merchant profile setup.",
      "Validate terminal ID mapping.",
      "Compare UAT config against a working merchant."
    ],
    "stakeholder_summary": "Appears isolated to merchant setup, not a platform-wide outage."
  },
  "similar_tickets": [
    {
      "ticket_id": "ticket_002",
      "title": "Refund flow fails because terminal profile is missing",
      "score": 0.87,
      "explanation": "Both issues mention missing terminal profile and merchant-specific failures."
    }
  ],
  "created_at": "2026-05-27T12:15:00Z",
  "updated_at": "2026-05-27T12:15:00Z",
  "completed_at": "2026-05-27T12:15:02Z"
}
```

**Future async response** — returned immediately while analysis runs in background:
```json
{
  "id": "analysis_001",
  "ticket_id": "ticket_001",
  "status": "pending",
  "created_at": "2026-05-27T12:15:00Z"
}
```

The frontend should handle both shapes by checking `status`.

---

### `GET /tickets/{ticket_id}/analysis`
Returns the latest analysis run for a ticket.

**Response** — same shape as POST response above.

---

### `GET /analysis/{analysis_id}`
Returns a specific analysis run by ID.

**Response** — same shape.

---

## 11. Search

### `GET /search`
Searches across tickets, comments, artifacts, and analysis output.

Accepts **both** `q` and `term` params for frontend compatibility (see Section 2).

**Query params**

| Param | Type | Notes |
|---|---|---|
| `q` | string | Preferred param |
| `term` | string | Legacy alias — supported during migration |
| `scope` | string | `all` (default), `tickets`, `comments`, `artifacts`, `analysis` |

**Response**

During migration, `/search` returns both canonical keys and legacy aliases so the existing frontend does not break. Once the frontend is updated, the legacy keys (`issues`, `messages`) will be removed.

```json
{
  "tickets": [
    {
      "id": "ticket_001",
      "title": "Transactions fail in UAT for one merchant",
      "breadcrumb": "DemoBank / Payments API / UAT",
      "environment": "UAT",
      "priority": "High",
      "status": "In Progress"
    }
  ],
  "comments": [],
  "artifacts": [],
  "analysis": [],
  "issues": [],
  "messages": []
}
```

> `issues` mirrors `tickets`. `messages` mirrors `comments`. Both legacy keys are present during migration only.

---

## 12. RAG / Knowledge

### `POST /rag/ask`
Asks a question over indexed tickets, comments, artifacts, and analyses.

**Request**
```json
{
  "question": "Have we seen missing terminal profile issues before?",
  "filters": {
    "project_id": "project_payments",
    "environment": "UAT"
  }
}
```

**Response**
```json
{
  "answer": "Yes. Similar issues appeared in UAT and were usually related to merchant or terminal configuration.",
  "sources": [
    {
      "source_type": "ticket",
      "source_id": "ticket_001",
      "title": "Transactions fail in UAT for one merchant",
      "score": 0.88,
      "excerpt": "Logs mention missing terminal profile."
    }
  ]
}
```

---

## 13. Legacy Compatibility Endpoints

These endpoints support the **current frontend sidebar** during migration. They are replaced once the frontend migrates to `GET /workspace/tree`. They continue to return `_id` to match what the frontend currently expects.

### `GET /clients`
```json
[{ "_id": "client_demobank", "name": "DemoBank" }]
```

### `GET /clients/{client_id}/projects`
```json
[{ "_id": "project_payments", "client_id": "client_demobank", "name": "Payments API" }]
```

### `GET /projects/{project_id}/environments`
```json
[{ "_id": "env_uat", "project_id": "project_payments", "name": "UAT" }]
```

### `GET /environments/{environment_id}/issues`
Returns tickets as issues. `created_at` is epoch ms to match current frontend expectation.
```json
[
  {
    "_id": "ticket_001",
    "environment_id": "env_uat",
    "title": "Transactions fail in UAT for one merchant",
    "created_at": 1710000000000,
    "environment": "UAT",
    "breadcrumb": "DemoBank / Payments API / UAT",
    "priority": "High",
    "status": "In Progress"
  }
]
```

### `GET /issues/{issue_id}`
Returns a single ticket as an issue shape (legacy). Used by the thread page.

### `GET /issues/{issue_id}/thread` and thread message endpoints
Kept as-is during migration. Thread/message model is superseded by `AnalysisRun` in the canonical API, but these remain until the thread page migrates.

---

## 14. MVP Build Order

Implement in this sequence — each step leaves a working product:

1. `GET /health`
2. `GET /workspace/current`
3. Legacy sidebar endpoints (keep frontend working)
4. `GET /workspace/tree` (replace legacy sidebar)
5. `GET /tickets`, `POST /tickets`, `GET /tickets/{id}`, `PATCH /tickets/{id}`
6. `POST /tickets/{id}/comments`
7. `POST /tickets/{id}/artifacts`
8. `POST /tickets/{id}/analyze` (mock response first, real AI second)
9. `GET /tickets/{id}/analysis`
10. `GET /search`
11. `POST /rag/ask`
12. `GET /integrations`, `POST /integrations`

---

## 15. Open Questions

| # | Question | Current decision |
|---|---|---|
| 1 | `id` vs `_id` in canonical API? | `id` in canonical, `_id` in legacy endpoints only |
| 2 | `/search?q=` vs `?term=`? | Backend accepts both; `q` is canonical, `term` is legacy alias |
| 3 | Sync or async analysis in MVP? | Sync for MVP; frontend should check `status` field to be async-ready |
| 4 | Auto-create project/client groupings on ticket create? | Yes — if `project_id` references a valid project, derive tree groupings from ticket fields |
| 5 | Artifacts text-only in MVP? | Yes — `content` field only, no file upload |
