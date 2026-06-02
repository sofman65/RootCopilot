"""Ticket comments — DB-backed."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.repositories import TicketCommentRepository, TicketRepository

router = APIRouter()


def _comment_to_dict(c) -> dict:
    return {
        "id": str(c.id),
        "ticket_id": str(c.ticket_id),
        "source": c.source,
        "external_id": c.external_id,
        "author": c.author,
        "body": c.body,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("/tickets/{ticket_id}/comments")
async def list_comments(
    ticket_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    if not await TicketRepository(session).get_by_id(ticket_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    comments = await TicketCommentRepository(session).list_by_ticket(ticket_id)
    return [_comment_to_dict(c) for c in comments]


@router.post("/tickets/{ticket_id}/comments", status_code=201)
async def create_comment(
    ticket_id: UUID,
    body: dict,
    session: AsyncSession = Depends(get_session),
):
    if not await TicketRepository(session).get_by_id(ticket_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    text = (body.get("body") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="body is required")

    comment = await TicketCommentRepository(session).create(
        ticket_id=ticket_id,
        author=body.get("author", "user"),
        body=text,
        source="internal",
    )
    return _comment_to_dict(comment)
