"""
Alembic environment for RootCopilot.

Wired to:
- DATABASE_URL from app.llm.config.get_settings()  (single source of truth)
- Base.metadata from app.models                    (registers all 7 tables)
- async engine via asyncpg                         (matches runtime driver)

Run from apps/api/:
    alembic revision --autogenerate -m "..."
    alembic upgrade head
    alembic downgrade -1
    alembic history
"""

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import settings + models. The `from app.models import Base` line is critical:
# importing the package executes every submodule, registering all 7 tables on
# Base.metadata. Without this, autogenerate would think the DB is empty.
from app.llm.config import get_settings
from app.models import Base  # noqa: F401  (side-effect: register all models)


config = context.config

# File logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inject DATABASE_URL from app settings → alembic config, so we don't have
# to duplicate the URL in alembic.ini.
_settings = get_settings()
if not _settings.database_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Add it to apps/api/.env, e.g.\n"
        "DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/rootcopilot"
    )
config.set_main_option("sqlalchemy.url", _settings.database_url)

target_metadata = Base.metadata


def _configure_context(connection: Connection) -> None:
    """Shared context configuration for online migrations."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # Detect column type changes (e.g. VARCHAR(255) → TEXT)
        compare_type=True,
        # Detect server_default changes (e.g. DEFAULT now() additions)
        compare_server_default=True,
        # Render batch ops for SQLite — no-op on Postgres but cheap to keep.
        render_as_batch=False,
    )


def run_migrations_offline() -> None:
    """Offline: emit SQL without connecting to the DB."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    _configure_context(connection)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Online: create an async engine, run migrations through it, dispose."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
