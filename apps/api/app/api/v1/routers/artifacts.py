"""Ticket artifacts — DB-backed."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.repositories import TicketArtifactRepository, TicketRepository

router = APIRouter()


def _artifact_to_dict(a) -> dict:
    return {
        "id": str(a.id),
        "ticket_id": str(a.ticket_id),
        "name": a.name,
        "type": a.type,
        "content": a.content,
        "storage_url": a.storage_url,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("/tickets/{ticket_id}/artifacts")
async def list_artifacts(
    ticket_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    if not await TicketRepository(session).get_by_id(ticket_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    artifacts = await TicketArtifactRepository(session).list_by_ticket(ticket_id)
    return [_artifact_to_dict(a) for a in artifacts]


@router.post("/tickets/{ticket_id}/artifacts", status_code=201)
async def create_artifact(
    ticket_id: UUID,
    body: dict,
    session: AsyncSession = Depends(get_session),
):
    if not await TicketRepository(session).get_by_id(ticket_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not body.get("name") or not body.get("content"):
        raise HTTPException(status_code=400, detail="name and content are required")

    artifact = await TicketArtifactRepository(session).create(
        ticket_id=ticket_id,
        name=body["name"],
        content=body["content"],
        type=body.get("type", "other"),
    )
    return _artifact_to_dict(artifact)
