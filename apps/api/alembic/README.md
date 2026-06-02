# Alembic — RootCopilot Migrations

Async SQLAlchemy + asyncpg. `env.py` reads `DATABASE_URL` from `app.llm.config.get_settings()`,
so `alembic.ini` doesn't carry a connection string.

## Daily workflow

```bash
# From apps/api/ — alembic.ini lives here.

# 1. Edit a SQLAlchemy model in app/models/
# 2. Generate a migration
alembic revision --autogenerate -m "short description"

# 3. Open alembic/versions/<hash>_short_description.py and REVIEW IT.
#    Autogenerate misses: enum value renames, table renames, server defaults
#    that look identical to Postgres but aren't, custom CHECK constraints, etc.

# 4. Apply
alembic upgrade head

# 5. Roll back one revision if needed
alembic downgrade -1

# 6. Wipe test pollution from dev DB before a demo (keeps only the 3 seeded tickets)
uv run python -m app.scripts.seed_demo_data --prune
```

## Useful commands

```bash
alembic current             # which revision is HEAD on this DB
alembic history --verbose   # full migration history
alembic show <revision>     # inspect a specific revision
alembic upgrade <revision>  # apply up to a specific revision
alembic downgrade base      # roll everything back (drops all tables)
```

## What gets compared on autogenerate

`env.py` enables:
- `compare_type=True` — column type changes detected (`VARCHAR(255)` → `TEXT`)
- `compare_server_default=True` — server defaults detected
- Naming conventions from `app/db.py:NAMING_CONVENTION` ensure stable index/FK/PK names

## What does NOT get compared

Alembic autogenerate cannot detect:
- Table renames (looks like drop + create)
- Column renames (looks like drop + add)
- CHECK constraint text changes inside the same column
- Postgres extensions (e.g. `pgcrypto`, `pgvector`) — add via `op.execute()` manually
- Custom view/trigger DDL

When you do a rename, edit the migration by hand: replace `drop_column/add_column`
with `op.alter_column("table", "old", new_column_name="new")`.

## First-time setup on a fresh DB

```bash
# 1. Bring Postgres up (Docker or local)
# 2. Set DATABASE_URL in .env, e.g.:
#    DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/rootcopilot
# 3. Apply all migrations
alembic upgrade head
```

The first migration (`*_initial_schema.py`) creates the `pgcrypto` extension before any
table — required for `gen_random_uuid()`.

## Adding a new model

1. Create `app/models/your_model.py`
2. Import it in `app/models/__init__.py` so it's registered on `Base.metadata`
3. `alembic revision --autogenerate -m "add your_model"`
4. Review + apply.
