"""
Seed demo data into Postgres.

Idempotent: re-running updates existing rows rather than creating duplicates.
UUIDs are derived deterministically from the legacy string IDs in demo_data.py
via uuid5(NAMESPACE, legacy_id), so the mapping is stable across runs and
references between rows stay consistent.

Run:
    uv run python -m app.scripts.seed_demo_data
"""

import asyncio
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import delete

from app.db import get_session_factory
from app.demo_data import (
    WORKSPACE,
    INTEGRATIONS,
    PROJECTS,
    TICKETS,
    COMMENTS,
)
from app.models import (
    Workspace,
    Integration,
    Project,
    Ticket,
    TicketComment,
)


# Fixed namespace for deterministic UUIDs. Do NOT change after first seed —
# would invalidate every existing reference.
SEED_NAMESPACE = uuid.UUID("00000000-0000-0000-0000-000000000001")


def uuid_for(legacy_id: str) -> uuid.UUID:
    """Map a legacy string ID to a deterministic UUID."""
    return uuid.uuid5(SEED_NAMESPACE, legacy_id)


def _parse_iso(s: Optional[str]) -> Optional[datetime]:
    if s is None:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


async def seed():
    factory = get_session_factory()
    async with factory() as session:
        ws_id = uuid_for(WORKSPACE["id"])

        # ---- Workspace ---------------------------------------------------
        ws = await session.get(Workspace, ws_id)
        if ws is None:
            ws = Workspace(id=ws_id, name=WORKSPACE["name"])
            session.add(ws)
        else:
            ws.name = WORKSPACE["name"]

        # ---- Integrations ------------------------------------------------
        for intg in INTEGRATIONS:
            iid = uuid_for(intg["id"])
            obj = await session.get(Integration, iid)
            fields = dict(
                workspace_id=ws_id,
                type=intg["type"],
                name=intg["name"],
                config=intg.get("config", {}),
                status=intg.get("status", "active"),
                last_synced_at=_parse_iso(intg.get("last_synced_at")),
            )
            if obj is None:
                session.add(Integration(id=iid, **fields))
            else:
                for k, v in fields.items():
                    setattr(obj, k, v)

        # ---- Projects ----------------------------------------------------
        for p in PROJECTS:
            pid = uuid_for(p["id"])
            obj = await session.get(Project, pid)
            fields = dict(
                workspace_id=ws_id,
                integration_id=uuid_for(p["integration_id"]),
                external_id=p.get("external_id"),
                name=p["name"],
            )
            if obj is None:
                session.add(Project(id=pid, **fields))
            else:
                for k, v in fields.items():
                    setattr(obj, k, v)

        # ---- Tickets -----------------------------------------------------
        for t in TICKETS:
            tid = uuid_for(t["id"])
            obj = await session.get(Ticket, tid)
            fields = dict(
                workspace_id=ws_id,
                project_id=uuid_for(t["project_id"]),
                integration_id=uuid_for(t["integration_id"]) if t.get("integration_id") else None,
                source_system=t["source_system"],
                external_id=t.get("external_id"),
                external_url=t.get("external_url"),
                source_created_at=_parse_iso(t.get("source_created_at")),
                source_updated_at=_parse_iso(t.get("source_updated_at")),
                ingested_at=_parse_iso(t["ingested_at"]) or datetime.utcnow(),
                title=t["title"],
                description=t.get("description"),
                status=t["status"],
                priority=t["priority"],
                client_name=t.get("client_name"),
                environment=t.get("environment"),
                component=t.get("component"),
                service_name=t.get("service_name"),
                area_path=t.get("area_path"),
                labels=list(t.get("labels", [])),
                assignee=t.get("assignee"),
                reporter=t.get("reporter"),
            )
            if obj is None:
                session.add(Ticket(id=tid, **fields))
            else:
                for k, v in fields.items():
                    setattr(obj, k, v)

        # ---- Comments ----------------------------------------------------
        # Wipe + reinsert comments rather than upsert — easier and matches
        # how the source-system sync will work later (replace by ticket).
        for t in TICKETS:
            tid = uuid_for(t["id"])
            await session.execute(
                delete(TicketComment).where(TicketComment.ticket_id == tid)
            )

        for c in COMMENTS:
            session.add(TicketComment(
                id=uuid_for(c["id"]),
                ticket_id=uuid_for(c["ticket_id"]),
                source=c.get("source", "internal"),
                external_id=c.get("external_id"),
                author=c["author"],
                body=c["body"],
            ))

        await session.commit()

    print(
        f"Seeded: 1 workspace, "
        f"{len(INTEGRATIONS)} integrations, "
        f"{len(PROJECTS)} projects, "
        f"{len(TICKETS)} tickets, "
        f"{len(COMMENTS)} comments"
    )
    print(f"Workspace UUID: {ws_id}")
    print(f"Demo ticket UUIDs:")
    for t in TICKETS:
        print(f"  {t['id']:30s}  →  {uuid_for(t['id'])}")


if __name__ == "__main__":
    asyncio.run(seed())
