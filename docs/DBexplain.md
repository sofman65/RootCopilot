# RootCopilot — Database Relationships Explained

> **Status:** v0.1  
> This document explains the purpose of each database table, why it exists, how it connects to the rest of the system, and how the schema supports the RootCopilot product model.

---

## 1. High-Level Model

RootCopilot is built around engineering tickets and AI analysis.

The core MVP schema is:

```text
Workspace
  → Integrations
    → Projects
      → Tickets
        → TicketComments
        → TicketArtifacts
        → AnalysisRuns
```

The central entity is the `tickets` table.

Everything else either:

- Organizes tickets
- Describes where tickets came from
- Adds context to tickets
- Stores AI-generated analysis about tickets

The main design principle is:

```text
Ticket = source of truth
Client / Environment = ticket metadata
Analysis = additive AI layer
Integration = source/provenance layer
```

This avoids locking RootCopilot into one specific external system such as Jira or Azure DevOps.

---

## 2. `workspaces`

### What it is

The `workspaces` table is the top-level tenant boundary.

A workspace represents a company, team, or demo organization using RootCopilot.

Example:

```text
DemoBank Engineering
```

In the MVP, RootCopilot can run with a single implicit workspace. Later, in a SaaS model, every customer or organization can have its own workspace.

### Why it exists

The workspace exists to isolate data by organization.

```text
Workspace A tickets ≠ Workspace B tickets
```

This is important for:

- Multi-tenancy
- Security
- Permissions
- Billing
- Integrations
- Reporting
- Analytics

### How it connects

Most tables include `workspace_id`, so every important record belongs to a workspace.

Relationships:

```text
Workspace 1 → N Integrations
Workspace 1 → N Projects
Workspace 1 → N Tickets
Workspace 1 → N EmbeddingChunks later
Workspace 1 → N WebhookSubscriptions later
```

High-level flow:

```text
workspaces
  → integrations
  → projects
  → tickets
```

---

## 3. `integrations`

### What it is

The `integrations` table represents a connection to an external ticketing system or data source.

Examples:

```text
Manual Entry
DemoBank Jira
Azure DevOps - Payments Team
```

### Why it exists

RootCopilot must support tickets from different sources:

```text
manual
jira
azure_devops
```

The integration stores source-level information such as:

```text
type
name
config
credentials_encrypted
status
last_synced_at
```

`config` contains non-secret settings, such as:

- Base URL
- Project keys
- Custom field mappings
- Sync configuration

`credentials_encrypted` stores encrypted secrets and must never be returned from the API.

### How it connects

An integration provides projects. Projects contain tickets.

```text
Integration
  → Project
    → Ticket
```

Example:

```text
DemoBank Jira
  → PAY Project
    → PAY-1042 ticket
```

Relationships:

```text
Workspace 1 → N Integrations
Integration 1 → N Projects
Integration 1 → N Tickets
```

### Why it connects to Project and Ticket

The integration gives RootCopilot provenance.

It answers:

```text
Where did this ticket come from?
Which external system owns it?
How do we sync or deduplicate it?
Should this ticket link back to Jira, Azure DevOps, or manual entry?
```

Without `integration_id`, RootCopilot cannot reliably sync external tickets or prevent duplicates.

---

## 4. `projects`

### What it is

The `projects` table is a logical grouping of tickets.

It usually maps to:

- Jira project
- Azure DevOps project
- Azure DevOps board
- Manual project created inside RootCopilot

Examples:

```text
Payments API
Checkout Platform
Core Banking
```

### Why it exists

Tickets should not exist as a flat list inside a workspace.

Projects group tickets by product, system, team, or business domain.

Example:

```text
DemoBank Engineering workspace
  → Payments API project
  → Checkout Platform project
```

### How it connects

```text
Integration
  → Project
    → Ticket
```

A project stores:

```text
workspace_id
integration_id
external_id
name
```

`external_id` is usually the source-system project identifier.

Examples:

```text
PAY
CHECKOUT
OPS
```

Relationships:

```text
Workspace 1 → N Projects
Integration 1 → N Projects
Project 1 → N Tickets
```

### Why it connects to Integration

A project may come from a specific external source.

Example:

```text
Integration: Jira
Project external_id: PAY
Project name: Payments API
```

If RootCopilot later connects to multiple systems, two projects may have similar names but different origins. `integration_id` keeps the source clear.

---

## 5. `tickets`

### What it is

The `tickets` table is the central entity of RootCopilot.

A ticket can represent:

```text
bug
incident
issue
work item
support ticket
debugging ticket
```

Examples:

```text
Transactions fail in UAT for one merchant
Refund timeout during PSP callback
Settlement batch fails due to invalid date format
```

### Why it exists

RootCopilot is built around tickets.

Tickets are the core objects used for:

- Root cause analysis
- Similar ticket search
- Debugging assistance
- Comments
- Artifacts/logs
- RAG
- Reports
- Clustering later

### What it stores

#### Source provenance

```text
source_system
external_id
external_url
source_created_at
source_updated_at
ingested_at
```

These fields explain where the ticket came from and how it maps back to the source system.

#### Content

```text
title
description
status
priority
```

These fields describe the actual issue.

#### Grouping metadata

```text
client_name
environment
component
service_name
area_path
labels
```

These fields power filtering, grouping, dashboard views, and the workspace tree.

#### People

```text
assignee
reporter
```

These fields preserve ownership and reporting metadata from the source system.

#### Internal timestamps

```text
created_at
updated_at
```

These represent RootCopilot’s own database lifecycle timestamps.

### How it connects

```text
Project
  → Ticket
    → Comments
    → Artifacts
    → AnalysisRuns
```

Relationships:

```text
Workspace 1 → N Tickets
Project 1 → N Tickets
Integration 1 → N Tickets
Ticket 1 → N TicketComments
Ticket 1 → N TicketArtifacts
Ticket 1 → N AnalysisRuns
```

### Why it has `workspace_id`, `project_id`, and `integration_id`

#### `workspace_id`

Identifies which organization owns the ticket.

```text
Which workspace does this ticket belong to?
```

#### `project_id`

Groups the ticket under a product, system, or source-system project.

```text
Which project/system does this ticket concern?
```

#### `integration_id`

Tracks where the ticket came from.

```text
Was this ticket created manually, imported from Jira, or imported from Azure DevOps?
```

### Why Client and Environment are not separate tables in MVP

The MVP does not have separate `clients` or `environments` tables.

Instead, `client_name` and `environment` are metadata fields on the ticket.

The UI tree:

```text
Client → Project → Environment → Ticket
```

is derived from:

```text
tickets.client_name
projects.name
tickets.environment
tickets.title
```

This keeps the model flexible because Jira and Azure DevOps do not always provide clean `Client` or `Environment` entities. These values may come from:

- Custom fields
- Labels
- Area paths
- Components
- Ticket descriptions
- Manual entry

---

## 6. `ticket_comments`

### What it is

The `ticket_comments` table stores comments or notes related to a ticket.

These can be:

```text
external comments from Jira or Azure DevOps
internal notes created inside RootCopilot
debugging notes
updates from engineers or support teams
```

### Why it exists

Ticket comments often contain the most useful debugging knowledge.

Example:

```text
Checked UAT config. Terminal profile missing for DEMO-102.
```

This kind of information may be more valuable than the original ticket description.

### How it connects

```text
Ticket 1 → N TicketComments
```

Each comment belongs to exactly one ticket.

Main fields:

```text
ticket_id
source
external_id
author
body
created_at
updated_at
```

### Why it connects to Ticket

A comment has no useful meaning without the ticket context.

Comments become part of the analysis context:

```text
Ticket description + comments + artifacts → LLM analysis context
```

### External vs internal comments

The `source` field identifies where the comment came from:

```text
external
internal
```

This matters because later RootCopilot may need to decide whether a comment should be synced back to Jira or Azure DevOps.

---

## 7. `ticket_artifacts`

### What it is

The `ticket_artifacts` table stores logs, stack traces, config snippets, screenshots, or other files/text associated with a ticket.

Examples:

```text
uat-error.log
stacktrace.txt
merchant-config.json
screenshot.png
```

### Why it exists

In real debugging, the root cause is often not found in the ticket title or description.

It may be found in:

- Logs
- Stack traces
- Config files
- Error payloads
- Screenshots
- Attached notes

Example:

```text
ERROR: Missing terminal profile for merchant DEMO-102
```

This is strong evidence for an AI-generated root cause analysis.

### How it connects

```text
Ticket 1 → N TicketArtifacts
```

Each artifact belongs to exactly one ticket.

Main fields:

```text
ticket_id
name
type
content
storage_url
created_at
```

### Why it has both `content` and `storage_url`

For MVP, RootCopilot can store small text artifacts directly in `content`.

Later, for large files or binary files, RootCopilot should store the file in object storage and keep only a reference:

```text
storage_url
```

The schema enforces that at least one of the following exists:

```text
content
storage_url
```

### How it is used by the LLM

Artifacts become part of the ticket analysis context:

```text
Ticket
+ Comments
+ Artifacts/logs
+ Similar tickets
→ LLM analysis
```

Artifacts often provide the evidence needed for a high-confidence diagnosis.

---

## 8. `analysis_runs`

### What it is

The `analysis_runs` table stores every AI analysis execution for a ticket.

Every time the user triggers one of these actions:

```text
Analyze ticket
Re-analyze
Quick action
Auto-analysis
```

RootCopilot creates a new analysis run.

### Why it exists

RootCopilot should not store only one analysis result directly on the ticket.

A ticket can have multiple analyses over time because:

- The instruction may change
- The ticket may be updated
- The model may change
- A user may re-run the analysis
- Quick actions may create specialized analyses
- The system may need analysis history

Therefore:

```text
Ticket 1 → N AnalysisRuns
```

### What it stores

```text
ticket_id
triggered_by
instruction
status
model
result_markdown
result_json
similar_tickets
input_tokens
output_tokens
latency_ms
created_at
updated_at
completed_at
```

### Why it has both `result_markdown` and `result_json`

#### `result_markdown`

`result_markdown` is for human-readable rendering.

Example:

```markdown
### Summary
Transactions fail only for one merchant in UAT.

### Likely Root Cause
Merchant terminal profile is missing.
```

#### `result_json`

`result_json` is for structured UI rendering.

Example:

```json
{
  "summary": "...",
  "likely_root_cause": "...",
  "confidence": "high",
  "evidence": [],
  "suggested_steps": [],
  "stakeholder_summary": ""
}
```

The frontend can use `result_json` to render dedicated UI sections:

```text
Root Cause
Evidence
Suggested Steps
Stakeholder Summary
Similar Tickets
```

### Why `similar_tickets` is JSONB in MVP

In the MVP, similar tickets are stored inline inside `analysis_runs.similar_tickets`.

This avoids creating an extra table too early.

Later, if RootCopilot needs clustering, analytics, or cross-run queries, this can be migrated to a separate relational table:

```text
similar_ticket_results
```

### How it connects

```text
Ticket 1 → N AnalysisRuns
```

An analysis run belongs to one ticket, but it may reference other tickets through `similar_tickets`.

---

## 9. `embedding_chunks` — Post-MVP

### What it is

The `embedding_chunks` table will store vector embeddings for searchable chunks of text.

Possible sources:

```text
ticket.description
ticket_comment.body
ticket_artifact.content
analysis_run.result_markdown
```

### Why it exists

This table enables semantic search and RAG.

Example user question:

```text
Have we seen missing terminal profile issues before?
```

The system should find relevant historical context even if the exact words do not match.

### How it connects

```text
Workspace 1 → N EmbeddingChunks
```

It uses a polymorphic reference:

```text
source_type = ticket | comment | artifact | analysis
source_id = id of the source record
```

### Why it is post-MVP

The MVP can operate with basic ticket analysis and simple search.

`embedding_chunks` becomes necessary when RootCopilot adds serious semantic search, vector retrieval, and RAG over tickets, comments, artifacts, and previous analyses.

---

## 10. `similar_ticket_results` — Post-MVP

### What it is

The `similar_ticket_results` table stores similar-ticket matches as relational rows.

In MVP, these are stored inside:

```text
analysis_runs.similar_tickets JSONB
```

Later, they can be moved into:

```text
similar_ticket_results
```

### Why it exists

A separate table is useful when RootCopilot needs to query similarity data directly.

Examples:

```text
Which tickets are most often similar to others?
Which recurring root causes appear across multiple tickets?
Which issue clusters exist?
Which components produce repeated failure patterns?
```

These queries are harder if similarity data stays only inside JSONB.

### How it connects

```text
AnalysisRun 1 → N SimilarTicketResults
Ticket 1 → N SimilarTicketResults as similar_ticket
```

Each row belongs to an analysis run and references another ticket as the similar ticket.

---

## 11. `webhook_subscriptions` — Post-MVP

### What it is

The `webhook_subscriptions` table stores inbound webhook configuration.

Examples:

```text
Jira issue created
Jira issue updated
Azure DevOps work item updated
```

### Why it exists

Without webhooks, RootCopilot must poll external systems repeatedly.

With webhooks, external systems can notify RootCopilot when something changes.

This enables:

- Faster sync
- Auto-analysis
- Lower polling overhead
- Better integration with Jira and Azure DevOps

### How it connects

```text
Workspace 1 → N WebhookSubscriptions
```

Later, webhook subscriptions may also connect directly to integrations.

For MVP/post-MVP design, workspace-level webhooks are enough.

---

## 12. How a Ticket Moves Through the System

### Manual ticket flow

```text
User creates ticket
  → INSERT tickets
  → optionally INSERT ticket_comments
  → optionally INSERT ticket_artifacts
  → user clicks Analyze
  → INSERT analysis_runs
  → UI renders result_json
```

### Jira ticket flow

```text
Jira integration sync
  → find integration
  → find or create project
  → upsert ticket by integration_id + external_id
  → import comments
  → import artifacts or text attachments
  → optional auto-analysis
  → create analysis_run
```

### Workspace tree flow

```text
Query tickets + projects
  → group by client_name
  → group by project.name
  → group by environment
  → return Client → Project → Environment → Ticket tree
```

---

## 13. Why This Schema Works for RootCopilot

This schema supports the core RootCopilot product direction:

```text
Connect engineering ticket systems
Import tickets
Analyze recurring root causes
Find similar historical issues
Preserve engineering knowledge
Help teams debug faster
```

It stays flexible because:

```text
Ticket = source of truth
Client / Environment = metadata
Analysis = additive layer
Integrations = provenance and sync layer
```

This means RootCopilot can support:

- Manual tickets
- Jira imports
- Azure DevOps imports
- Ticket analysis
- RAG
- Similar tickets
- Root cause clustering
- Engineering reports

without changing the core database architecture.
