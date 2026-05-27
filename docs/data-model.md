# RootCopilot — Canonical Data Model

> **Status:** v0.1 locked — API contracts and DB schema build from this.

---

## 1. Design Principles

- **Integration-agnostic.** Tickets come from Jira, Azure DevOps, or manual entry. The internal model must not be shaped by any one source system.
- **Flat tickets, rich metadata.** Client, Environment, Component are *fields on Ticket*, not separate tables in MVP. This avoids rigid hierarchies that external systems cannot guarantee.
- **Workspace-scoped.** Everything belongs to a Workspace. Multi-tenancy is handled at this boundary.
- **Analysis is additive.** Tickets are immutable snapshots from the source. Analysis (embeddings, root cause, similarity) is layered on top without mutating the ticket record.
- **Tree view is derived, not stored.** The UI tree `Client → Project → Environment → Ticket` is computed from ticket metadata at query time, not from a separate hierarchy table.
- **Timestamps are explicit.** Source system timestamps (`source_created_at`, `source_updated_at`) are kept separate from internal DB timestamps (`created_at`, `updated_at`). No ambiguity in syncs or sorting.
- **Secrets are never mixed into config.** Integration credentials are stored in a separate field and must be encrypted at rest.

---

## 2. Canonical Entities (MVP)

### Workspace
The top-level container. In MVP this is a single implicit workspace per deployment. Multi-workspace support is a post-MVP concern.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `name` | string | e.g. "My Company" |
| `created_at` | timestamp | Row creation time |
| `updated_at` | timestamp | Last modification time |

---

### Integration
A connection to an external ticket system or data source.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK → Workspace |
| `type` | enum | `jira`, `azure_devops`, `manual` |
| `name` | string | Display label, e.g. "Prod Jira" |
| `config` | JSON | Non-secret settings: `base_url`, `project_keys`, field mapping rules |
| `credentials` | JSON | **Encrypted** secrets: API tokens, OAuth data — never exposed in API responses |
| `status` | enum | `active`, `paused`, `error` |
| `last_synced_at` | timestamp | Nullable |
| `created_at` | timestamp | Row creation time |
| `updated_at` | timestamp | Last modification time (config, status changes) |

> **Rule:** `config` may be returned in API responses (sanitized). `credentials` must never leave the server.

---

### Project
A logical grouping of tickets, mapped from source system projects/boards.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK → Workspace |
| `integration_id` | UUID | FK → Integration |
| `external_id` | string | Project key in source system (e.g. `PAY`, `CHECKOUT`) |
| `name` | string | Human-readable name |
| `created_at` | timestamp | Row creation time |
| `updated_at` | timestamp | Last modification time |

---

### Ticket
The central entity. Represents a bug, incident, issue, or work item.

**Internal DB timestamps** (always set by RootCopilot):

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK (internal) |
| `workspace_id` | UUID | FK → Workspace |
| `project_id` | UUID | FK → Project |
| `integration_id` | UUID | FK → Integration |
| `created_at` | timestamp | Row creation time in RootCopilot DB |
| `updated_at` | timestamp | Last modification time in RootCopilot DB |
| `ingested_at` | timestamp | When RootCopilot first imported this ticket |

**Source system provenance:**

| Field | Type | Notes |
|---|---|---|
| `source_system` | enum | `jira`, `azure_devops`, `manual` |
| `external_id` | string | e.g. `PAY-1042` — nullable for manual |
| `external_url` | string | Link back to source — nullable for manual |
| `source_created_at` | timestamp | Ticket creation time in the source system |
| `source_updated_at` | timestamp | Last update time in the source system |

**Content:**

| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `description` | text | Raw text or markdown |
| `status` | string | Preserved from source (e.g. `Open`, `In Progress`, `Closed`) |
| `priority` | string | Preserved from source (e.g. `Critical`, `High`, `Medium`, `Low`) |

**Grouping metadata** (used for derived tree view):

| Field | Type | Notes |
|---|---|---|
| `client_name` | string | Nullable — used to group tickets under a client in the tree |
| `environment` | string | e.g. `UAT`, `Production`, `SIT` |
| `component` | string | e.g. `Payments API`, `Checkout` — nullable |
| `service_name` | string | Finer-grained than component — nullable |
| `area_path` | string | Azure DevOps area path — nullable |
| `labels` | string[] | Tags or labels from source system |

**People:**

| Field | Type | Notes |
|---|---|---|
| `assignee` | string | Nullable |
| `reporter` | string | Nullable |

---

### TicketComment
Comments or activity from the source system, or manual notes added in RootCopilot.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `ticket_id` | UUID | FK → Ticket |
| `source` | enum | `external`, `internal` |
| `external_id` | string | Nullable — ID in source system |
| `author` | string | |
| `body` | text | |
| `created_at` | timestamp | Row creation time |
| `updated_at` | timestamp | Last modification time |

---

### TicketArtifact
Attached files, logs, stack traces, or any binary/text blob associated with a ticket.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `ticket_id` | UUID | FK → Ticket |
| `name` | string | Filename or label |
| `type` | enum | `log`, `screenshot`, `stacktrace`, `config`, `other` |
| `content` | text | Extracted text content |
| `storage_url` | string | Nullable — if stored in object storage |
| `created_at` | timestamp | Row creation time |

---

### AnalysisRun
A single AI analysis execution for a ticket. Multiple runs can exist per ticket.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `ticket_id` | UUID | FK → Ticket |
| `triggered_by` | enum | `user`, `auto`, `quick_action` |
| `instruction` | string | User prompt or quick-action label |
| `status` | enum | `pending`, `running`, `done`, `error` |
| `result_markdown` | text | Full AI response in markdown — for rendering |
| `result_json` | JSON | Structured analysis output — for UI cards (see schema below) |
| `model` | string | e.g. `claude-opus-4-7` |
| `created_at` | timestamp | Row creation time |
| `updated_at` | timestamp | Last modification time |
| `completed_at` | timestamp | Nullable |

**`result_json` schema:**
```json
{
  "summary": "One sentence description of the issue.",
  "likely_root_cause": "...",
  "confidence": "high | medium | low",
  "evidence": ["...", "..."],
  "suggested_steps": ["...", "..."],
  "stakeholder_summary": "Non-technical summary for clients or managers."
}
```

Both `result_markdown` and `result_json` are populated by the same AI call. `result_markdown` is the prose rendering; `result_json` drives structured UI components (confidence badge, evidence list, suggested steps card).

---

### SimilarTicketResult
Similarity matches surfaced during an AnalysisRun.

**MVP-lite:** In MVP, similar tickets are returned inline in the `AnalysisRun` API response — no separate DB table required until persistence or cross-run querying is needed. The schema below defines the shape regardless of storage strategy.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `analysis_run_id` | UUID | FK → AnalysisRun |
| `similar_ticket_id` | UUID | FK → Ticket |
| `score` | float | Cosine similarity (0–1) |
| `explanation` | text | Nullable — AI explanation of why it's similar |

> **MVP decision:** Return as `similar_tickets: [...]` array in `GET /tickets/{id}/analysis` response. Persist to table when filtering, bookmarking, or cluster analysis is needed.

---

### EmbeddingChunk
Vector embedding chunks for semantic search across tickets, comments, and artifacts.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `workspace_id` | UUID | FK → Workspace |
| `source_type` | enum | `ticket`, `comment`, `artifact` |
| `source_id` | UUID | FK to the corresponding source entity |
| `chunk_index` | int | Position within the source document |
| `text` | text | The chunk text that was embedded |
| `embedding` | vector(1536) | pgvector column |
| `created_at` | timestamp | Row creation time |

---

## 3. Optional Entities (Post-MVP)

| Entity | Purpose |
|---|---|
| `Client` | Explicit client table when multi-client workspace management is needed |
| `Environment` | Explicit environment table with config (e.g. DB URLs, flags) |
| `Component` | Service/component registry |
| `RootCauseCluster` | Grouped tickets that share a root cause, built from SimilarTicketResult |
| `Report` | Saved/exported analysis reports |
| `WebhookSubscription` | Inbound webhooks from Jira/ADO to trigger auto-analysis |

---

## 4. Relationships

```
Workspace
  ├── Integration (1:N)
  │     └── Project (1:N)
  │           └── Ticket (1:N)
  │                 ├── TicketComment (1:N)
  │                 ├── TicketArtifact (1:N)
  │                 └── AnalysisRun (1:N)
  │                       └── SimilarTicketResult (1:N) → Ticket
  └── EmbeddingChunk (1:N, denormalized for search)
```

---

## 5. How the UI Tree is Derived

The sidebar tree `Client → Project → Environment → Ticket` is **not stored** — it is computed at query time from ticket metadata:

```sql
SELECT
  t.client_name,
  p.name     AS project_name,
  t.environment,
  t.*
FROM ticket t
JOIN project p ON t.project_id = p.id
WHERE t.workspace_id = :workspace_id
ORDER BY t.client_name, p.name, t.environment, t.source_created_at DESC
```

`GET /workspace/tree` groups this result in memory and returns a nested JSON structure. No separate hierarchy table is needed in MVP.

---

## 6. Source System Mappings

### Jira → RootCopilot

| Jira Field | RootCopilot Field |
|---|---|
| `issue.key` | `external_id` |
| `issue.self` (API URL) | `external_url` |
| `issue.fields.summary` | `title` |
| `issue.fields.description` | `description` |
| `issue.fields.status.name` | `status` |
| `issue.fields.priority.name` | `priority` |
| `issue.fields.labels` | `labels` |
| `issue.fields.components[0].name` | `component` |
| `issue.fields.customfield_XXXXX` (client) | `client_name` |
| `issue.fields.environment` | `environment` |
| `issue.fields.assignee.displayName` | `assignee` |
| `issue.fields.reporter.displayName` | `reporter` |
| `issue.fields.created` | `source_created_at` |
| `issue.fields.updated` | `source_updated_at` |
| `issue.fields.comment.comments[]` | `TicketComment` |
| `issue.fields.attachment[]` | `TicketArtifact` |

**Note:** `client_name` and `environment` often live in Jira custom fields. The Integration `config.field_mappings` stores the custom field key → RootCopilot field mapping per project.

---

### Azure DevOps → RootCopilot

| ADO Field | RootCopilot Field |
|---|---|
| `workItem.id` | `external_id` |
| `workItem._links.html.href` | `external_url` |
| `workItem.fields["System.Title"]` | `title` |
| `workItem.fields["System.Description"]` | `description` |
| `workItem.fields["System.State"]` | `status` |
| `workItem.fields["Microsoft.VSTS.Common.Priority"]` | `priority` |
| `workItem.fields["System.Tags"]` | `labels` (split by `;`) |
| `workItem.fields["System.AreaPath"]` | `area_path` + used to derive `component` |
| `workItem.fields["System.AssignedTo"].displayName` | `assignee` |
| `workItem.fields["System.CreatedBy"].displayName` | `reporter` |
| `workItem.fields["System.CreatedDate"]` | `source_created_at` |
| `workItem.fields["System.ChangedDate"]` | `source_updated_at` |
| Comments via `_apis/wit/workItems/{id}/comments` | `TicketComment` |
| Attachments via `_apis/wit/attachments` | `TicketArtifact` |

**Note:** `client_name` and `environment` are derived from AreaPath segments or custom fields. The Integration `config.area_path_mapping` defines the derivation rules.

---

### Manual Entry → RootCopilot

Manual tickets are created directly via the RootCopilot UI or API.

| UI Field | RootCopilot Field |
|---|---|
| Title input | `title` |
| Description textarea | `description` |
| Client field | `client_name` |
| Environment dropdown | `environment` |
| Component field | `component` |
| Priority selector | `priority` |
| Status selector | `status` |
| Labels input | `labels` |

`source_system = "manual"`, `external_id = null`, `external_url = null`, `source_created_at = ingested_at`.

---

## 7. MVP vs Post-MVP

### MVP (ship with)
- All Ticket fields
- TicketComment (internal/manual comments at minimum)
- AnalysisRun with `result_markdown` + `result_json`
- SimilarTicketResult returned inline in API response (table optional)
- EmbeddingChunk for semantic search
- Integration with `manual` type; Jira/ADO sync is Phase 2

### Post-MVP
- SimilarTicketResult persisted as DB table (for cross-run queries, clusters)
- TicketArtifact (requires file handling / object storage)
- Full Jira sync (OAuth + webhook)
- Full Azure DevOps sync
- RootCauseCluster
- Report export
- Multi-workspace

---

## 8. Next Step

`docs/api-contracts.md` — endpoints built from this model, not from the old Convex mock:

```
GET  /workspace/tree
GET  /integrations
POST /integrations
GET  /projects
GET  /tickets
POST /tickets
GET  /tickets/{id}
POST /tickets/{id}/analyze
GET  /tickets/{id}/analysis
GET  /search?q=
POST /rag/ask
```
