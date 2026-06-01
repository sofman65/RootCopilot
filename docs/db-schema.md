# RootCopilot — Database Schema

> **Status:** v0.1 — drives SQLAlchemy models and Alembic migrations.
> Derived from `docs/data-model.md` v0.1.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Primary keys | `UUID` (gen_random_uuid()) | No enumerable IDs; distributed-safe |
| PK extension | `pgcrypto` (`gen_random_uuid()`) | Required in Postgres < 14; safe to add in 14+ too |
| Timestamps | `TIMESTAMPTZ` | Always timezone-aware; no ambiguity |
| `updated_at` | Managed by SQLAlchemy `onupdate` | No DB trigger in MVP; add trigger post-MVP if needed |
| JSON columns | `JSONB` | Indexable; supports GIN; faster than JSON |
| Labels | `TEXT[]` | Native Postgres array; GIN-indexable |
| Full-text search | `tsvector` GIN on `title + description` with `'english'` | MVP assumes English tickets; switch to `'simple'` if multilingual |
| Credentials | `TEXT` (AES-256-GCM ciphertext, base64) | Encrypted at application layer; never returned in API |
| Integration deletes | RESTRICT — integrations can only be **paused**, not deleted, while projects exist | Preserves provenance; tickets always traceable to their integration |
| `similar_tickets` | `JSONB` in `analysis_runs` (MVP) | Avoids extra table in MVP; migrate to own table when cross-run queries are needed |
| Soft deletes | Not in MVP | Hard deletes with CASCADE; add `deleted_at` column post-MVP if needed |

---

## Tables

### Extensions

Must be present before any table creation:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
```

---

### `workspaces`

Top-level tenant boundary. MVP runs as a single workspace per deployment.

```sql
CREATE TABLE workspaces (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `name` | VARCHAR(255) | NOT NULL | e.g. "My Company" |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**Indexes:** PK only (small table, single row in MVP).

---

### `integrations`

Connections to external ticket systems.

```sql
CREATE TABLE integrations (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id          UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type                  VARCHAR(50)  NOT NULL CHECK (type IN ('manual', 'jira', 'azure_devops')),
    name                  VARCHAR(255) NOT NULL,
    config                JSONB        NOT NULL DEFAULT '{}',
    credentials_encrypted TEXT,
    status                VARCHAR(50)  NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'paused', 'error')),
    last_synced_at        TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_integrations_workspace ON integrations(workspace_id);
CREATE INDEX idx_integrations_type      ON integrations(type, workspace_id);
```

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `workspace_id` | UUID | NOT NULL, FK → workspaces | ON DELETE CASCADE |
| `type` | VARCHAR(50) | NOT NULL, CHECK | `manual` \| `jira` \| `azure_devops` |
| `name` | VARCHAR(255) | NOT NULL | Display label |
| `config` | JSONB | NOT NULL DEFAULT '{}' | Non-secret settings: `base_url`, `project_keys`, field mappings. **Returned in API.** |
| `credentials_encrypted` | TEXT | NULLABLE | AES-256-GCM ciphertext (base64). **Never returned in API.** |
| `status` | VARCHAR(50) | NOT NULL, CHECK | `active` \| `paused` \| `error` |
| `last_synced_at` | TIMESTAMPTZ | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

> **Rule:** `credentials_encrypted` is decrypted only inside the sync worker. API responses return `config` only.

---

### `projects`

Logical groupings of tickets, mapped from source system projects/boards.

```sql
CREATE TABLE projects (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    integration_id UUID         NOT NULL REFERENCES integrations(id) ON DELETE RESTRICT,
    external_id    VARCHAR(255),
    name           VARCHAR(255) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (integration_id, external_id)
);

CREATE INDEX idx_projects_workspace   ON projects(workspace_id);
CREATE INDEX idx_projects_integration ON projects(integration_id);
```

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `workspace_id` | UUID | NOT NULL, FK → workspaces | ON DELETE CASCADE |
| `integration_id` | UUID | NOT NULL, FK → integrations | ON DELETE RESTRICT. **Integrations with projects cannot be deleted in MVP — only paused. This preserves provenance.** |
| `external_id` | VARCHAR(255) | NULLABLE | Project key in source system (e.g. `PAY`). UNIQUE per integration. |
| `name` | VARCHAR(255) | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### `tickets`

Central entity. Represents a bug, incident, or work item from any source.

```sql
CREATE TABLE tickets (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id      UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id        UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    integration_id    UUID          REFERENCES integrations(id) ON DELETE SET NULL,

    -- Source provenance
    source_system     VARCHAR(50)   NOT NULL CHECK (source_system IN ('manual', 'jira', 'azure_devops')),
    external_id       VARCHAR(255),
    external_url      TEXT,
    source_created_at TIMESTAMPTZ,
    source_updated_at TIMESTAMPTZ,
    ingested_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

    -- Content
    title             VARCHAR(1000) NOT NULL,
    description       TEXT,
    status            VARCHAR(100)  NOT NULL DEFAULT 'Open',
    priority          VARCHAR(50)   NOT NULL DEFAULT 'Medium',

    -- Grouping metadata (drives workspace tree)
    client_name       VARCHAR(255),
    environment       VARCHAR(100),
    component         VARCHAR(255),
    service_name      VARCHAR(255),
    area_path         TEXT,
    labels            TEXT[]        NOT NULL DEFAULT '{}',

    -- People
    assignee          VARCHAR(255),
    reporter          VARCHAR(255),

    -- Internal timestamps
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Filtering
CREATE INDEX idx_tickets_workspace   ON tickets(workspace_id);
CREATE INDEX idx_tickets_project     ON tickets(project_id);
CREATE INDEX idx_tickets_integration ON tickets(integration_id);
CREATE INDEX idx_tickets_status      ON tickets(status, priority);

-- Partial unique: same external_id cannot appear twice for the same integration,
-- but NULL external_id (manual tickets) is allowed any number of times.
-- Must be a standalone index — WHERE clause is not valid inside CREATE TABLE.
CREATE UNIQUE INDEX uq_tickets_integration_external_id
    ON tickets(integration_id, external_id)
    WHERE external_id IS NOT NULL;

-- Workspace tree query (GROUP BY client_name, environment)
CREATE INDEX idx_tickets_tree ON tickets(workspace_id, client_name, environment);

-- Label search
CREATE INDEX idx_tickets_labels ON tickets USING GIN(labels);

-- Full-text search
CREATE INDEX idx_tickets_fts ON tickets
    USING GIN(to_tsvector('english', title || ' ' || coalesce(description, '')));
```

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `workspace_id` | UUID | NOT NULL, FK → workspaces | ON DELETE CASCADE |
| `project_id` | UUID | NOT NULL, FK → projects | ON DELETE CASCADE |
| `integration_id` | UUID | NULLABLE, FK → integrations | ON DELETE SET NULL |
| `source_system` | VARCHAR(50) | NOT NULL, CHECK | `manual` \| `jira` \| `azure_devops` |
| `external_id` | VARCHAR(255) | NULLABLE | e.g. `PAY-1042`. UNIQUE per integration (partial index). |
| `external_url` | TEXT | NULLABLE | Link to source ticket |
| `source_created_at` | TIMESTAMPTZ | NULLABLE | Creation time in source system |
| `source_updated_at` | TIMESTAMPTZ | NULLABLE | Last update in source system |
| `ingested_at` | TIMESTAMPTZ | NOT NULL | When RootCopilot first imported it |
| `title` | VARCHAR(1000) | NOT NULL | |
| `description` | TEXT | NULLABLE | |
| `status` | VARCHAR(100) | NOT NULL | Preserved from source |
| `priority` | VARCHAR(50) | NOT NULL | Preserved from source |
| `client_name` | VARCHAR(255) | NULLABLE | Drives tree grouping |
| `environment` | VARCHAR(100) | NULLABLE | e.g. `UAT`, `Production` |
| `component` | VARCHAR(255) | NULLABLE | |
| `service_name` | VARCHAR(255) | NULLABLE | |
| `area_path` | TEXT | NULLABLE | ADO-specific |
| `labels` | TEXT[] | NOT NULL DEFAULT '{}' | GIN-indexed |
| `assignee` | VARCHAR(255) | NULLABLE | |
| `reporter` | VARCHAR(255) | NULLABLE | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Set by SQLAlchemy `onupdate`; Postgres does **not** update this automatically |

> **`updated_at` rule (applies to all tables):** Postgres does not auto-update `updated_at` on `UPDATE`. It is maintained by the SQLAlchemy ORM via `onupdate=lambda: datetime.now(timezone.utc)` on every model that has the column. A DB-level trigger may replace this post-MVP.

---

### `ticket_comments`

Comments from the source system or added manually in RootCopilot.

```sql
CREATE TABLE ticket_comments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    source      VARCHAR(50) NOT NULL DEFAULT 'internal'
                CHECK (source IN ('external', 'internal')),
    external_id VARCHAR(255),
    author      VARCHAR(255) NOT NULL,
    body        TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id, created_at DESC);
```

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `ticket_id` | UUID | NOT NULL, FK → tickets | ON DELETE CASCADE |
| `source` | VARCHAR(50) | NOT NULL, CHECK | `external` \| `internal` |
| `external_id` | VARCHAR(255) | NULLABLE | ID in source system |
| `author` | VARCHAR(255) | NOT NULL | |
| `body` | TEXT | NOT NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### `ticket_artifacts`

Logs, stack traces, screenshots, or config files attached to a ticket.

```sql
CREATE TABLE ticket_artifacts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(100) NOT NULL DEFAULT 'other'
                CHECK (type IN ('log', 'screenshot', 'stacktrace', 'config', 'other')),
    content     TEXT,
    storage_url TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CHECK (content IS NOT NULL OR storage_url IS NOT NULL)
);

CREATE INDEX idx_artifacts_ticket ON ticket_artifacts(ticket_id);
```

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `ticket_id` | UUID | NOT NULL, FK → tickets | ON DELETE CASCADE |
| `name` | VARCHAR(255) | NOT NULL | Filename or label |
| `type` | VARCHAR(100) | NOT NULL, CHECK | `log` \| `screenshot` \| `stacktrace` \| `config` \| `other` |
| `content` | TEXT | NULLABLE | Inline text content for small artifacts |
| `storage_url` | TEXT | NULLABLE | S3/GCS URL for large files |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

> **Constraint:** At least one of `content` or `storage_url` must be set.

---

### `analysis_runs`

One AI analysis execution per run. Multiple runs per ticket allowed.

```sql
CREATE TABLE analysis_runs (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id        UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    triggered_by     VARCHAR(50) NOT NULL DEFAULT 'user'
                     CHECK (triggered_by IN ('user', 'auto', 'quick_action')),
    instruction      TEXT        NOT NULL,
    status           VARCHAR(50) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'running', 'done', 'failed', 'error')),
    model            VARCHAR(100),
    result_markdown  TEXT,
    result_json      JSONB,
    similar_tickets  JSONB       NOT NULL DEFAULT '[]',
    input_tokens     INTEGER,
    output_tokens    INTEGER,
    latency_ms       INTEGER,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at     TIMESTAMPTZ
);

-- Most common read: "latest analysis for ticket X"
CREATE INDEX idx_analysis_ticket_latest
    ON analysis_runs(ticket_id, created_at DESC);

-- Background worker: pick up pending/running jobs
CREATE INDEX idx_analysis_pending
    ON analysis_runs(status, created_at)
    WHERE status IN ('pending', 'running');

-- JSONB search on result_json (e.g. filter by confidence)
CREATE INDEX idx_analysis_result
    ON analysis_runs USING GIN(result_json);
```

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `ticket_id` | UUID | NOT NULL, FK → tickets | ON DELETE CASCADE |
| `triggered_by` | VARCHAR(50) | NOT NULL, CHECK | `user` \| `auto` \| `quick_action` |
| `instruction` | TEXT | NOT NULL | Prompt used for this run |
| `status` | VARCHAR(50) | NOT NULL, CHECK | `pending` \| `running` \| `done` \| `failed` \| `error` |
| `model` | VARCHAR(100) | NULLABLE | e.g. `claude-sonnet-4-6` |
| `result_markdown` | TEXT | NULLABLE | Prose rendering |
| `result_json` | JSONB | NULLABLE | Structured result (AnalysisResultJson shape) |
| `similar_tickets` | JSONB | NOT NULL DEFAULT '[]' | `SimilarTicketRef[]` — MVP inline; migrate to table later |
| `input_tokens` | INTEGER | NULLABLE | From LLM provider usage |
| `output_tokens` | INTEGER | NULLABLE | From LLM provider usage |
| `latency_ms` | INTEGER | NULLABLE | Wall-clock from request to parsed response |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |
| `completed_at` | TIMESTAMPTZ | NULLABLE | Set when status → done/failed/error |

---

## Post-MVP Tables

Do not implement until the MVP tables are stable and deployed.

### `embedding_chunks`

```sql
-- Requires pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embedding_chunks (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_type  VARCHAR(50) NOT NULL CHECK (source_type IN ('ticket', 'comment', 'artifact')),
    source_id    UUID        NOT NULL,
    chunk_index  INTEGER     NOT NULL,
    text         TEXT        NOT NULL,
    embedding    vector(1536),
    model        VARCHAR(100),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (source_type, source_id, chunk_index)
);

-- ANN search (HNSW — faster queries, more memory)
CREATE INDEX idx_chunks_embedding ON embedding_chunks
    USING hnsw(embedding vector_cosine_ops);
CREATE INDEX idx_chunks_source ON embedding_chunks(source_type, source_id);
```

### `similar_ticket_results`

Migrate from JSONB in `analysis_runs.similar_tickets` when cross-run queries are needed.

```sql
CREATE TABLE similar_ticket_results (
    id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id  UUID  NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    similar_ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    score            FLOAT NOT NULL CHECK (score BETWEEN 0 AND 1),
    explanation      TEXT,
    computed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (analysis_run_id, similar_ticket_id)
);
```

### `webhook_subscriptions`

```sql
CREATE TABLE webhook_subscriptions (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID    NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    url          TEXT    NOT NULL,
    events       TEXT[]  NOT NULL DEFAULT '{}',
    secret_encrypted TEXT,
    active       BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Relationships Summary

```
workspaces (1)
  ├── integrations (N)          ON DELETE CASCADE
  │     └── projects (N)        ON DELETE RESTRICT
  │           └── tickets (N)   ON DELETE CASCADE
  │                 ├── ticket_comments (N)     ON DELETE CASCADE
  │                 ├── ticket_artifacts (N)    ON DELETE CASCADE
  │                 └── analysis_runs (N)       ON DELETE CASCADE
  └── embedding_chunks (N)      ON DELETE CASCADE   [post-MVP]
```

---

## Workspace Tree Query (no hierarchy table needed)

```sql
SELECT
    t.client_name,
    p.id          AS project_id,
    p.name        AS project_name,
    t.environment,
    t.id,
    t.title,
    t.status,
    t.priority,
    t.updated_at
FROM tickets t
JOIN projects p ON t.project_id = p.id
WHERE t.workspace_id = :workspace_id
ORDER BY t.client_name, p.name, t.environment, t.updated_at DESC;
```

Group in application layer (same logic as current `workspace_tree` endpoint).

---

## SQLAlchemy ↔ Schema Mapping

```
docs/db-schema.md         →  app/models/           (SQLAlchemy ORM models)
app/schemas/              →  API request/response   (Pydantic — unchanged)
app/services/             →  domain logic           (queries + business rules)
app/api/v1/routers/       →  HTTP layer             (thin, delegates to services)
```

**The three layers for tickets:**

```python
# 1. HTTP input  →  Pydantic TicketCreate  (app/schemas/ticket.py)
# 2. DB row      →  SQLAlchemy Ticket      (app/models/ticket.py)
# 3. HTTP output →  Pydantic TicketResponse (app/schemas/ticket.py)
```

`TicketCreate ≠ Ticket (ORM) ≠ TicketResponse` — three separate things.

---

## Next Steps

1. `uv add sqlalchemy asyncpg alembic`
2. `app/db.py` — async engine + `get_session()` dependency
3. `app/models/` — one file per table, inheriting a `Base` declarative
4. `alembic init alembic` → `alembic revision --autogenerate -m "initial"`
5. `alembic upgrade head` against a local Postgres
6. Replace `demo_data.py` lists with real DB queries in services, one table at a time
