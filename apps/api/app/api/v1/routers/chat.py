"""
Copilot chat — DB-backed threads + messages, grounded LLM replies.

An "issue" here is a ticket (issue_id == ticket UUID). The frontend reaches a
conversation via search → /issues/{ticket_id}/thread, so these endpoints resolve
against the canonical Ticket table and route assistant turns through the LLM
subsystem (app/services/chat_service.py).

Response shapes keep the legacy `_id` / epoch-friendly keys the thread page
still expects (see lib/rootcopilot-api.ts legacy section).
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.limiter import limiter
from app.models import ChatMessage, ChatThread, Ticket
from app.repositories import ProjectRepository, TicketRepository
from app.services import chat_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Serializers → legacy-compatible JSON
# ---------------------------------------------------------------------------

def _epoch_ms(dt) -> int:
    return int(dt.timestamp() * 1000) if dt else 0


def _message_to_dict(m: ChatMessage) -> dict:
    return {
        "_id": str(m.id),
        "thread_id": str(m.thread_id),
        "role": m.role,
        "content": m.content,
        "created_at": _epoch_ms(m.created_at),
    }


def _thread_to_dict(t: ChatThread) -> dict:
    return {"_id": str(t.id), "issue_id": str(t.ticket_id)}


def _breadcrumb(ticket: Ticket, project_name: Optional[str]) -> str:
    return " / ".join(
        p for p in [ticket.client_name, project_name, ticket.environment] if p
    )


async def _issue_to_dict(session: AsyncSession, ticket: Ticket) -> dict:
    project = await ProjectRepository(session).get_by_id(ticket.project_id)
    return {
        "_id": str(ticket.id),
        "title": ticket.title,
        "created_at": _epoch_ms(ticket.created_at),
        "environment": ticket.environment,
        "breadcrumb": _breadcrumb(ticket, project.name if project else None),
        "priority": ticket.priority,
        "status": ticket.status,
    }


# ---------------------------------------------------------------------------
# Issue (= ticket) + thread lifecycle
# ---------------------------------------------------------------------------

@router.get("/issues/{issue_id}")
async def get_issue(issue_id: UUID, session: AsyncSession = Depends(get_session)):
    ticket = await TicketRepository(session).get_by_id(issue_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Issue not found")
    return await _issue_to_dict(session, ticket)


@router.get("/issues/{issue_id}/thread")
async def get_thread_by_issue(issue_id: UUID, session: AsyncSession = Depends(get_session)):
    thread = await chat_service.get_thread(session, issue_id)
    return _thread_to_dict(thread)


@router.post("/issues/{issue_id}/thread")
async def create_thread(issue_id: UUID, session: AsyncSession = Depends(get_session)):
    thread = await chat_service.get_or_create_thread(session, issue_id)
    return _thread_to_dict(thread)


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

@router.get("/threads/{thread_id}/messages")
async def list_thread_messages(thread_id: UUID, session: AsyncSession = Depends(get_session)):
    messages = await chat_service.list_messages(session, thread_id)
    return [_message_to_dict(m) for m in messages]


@router.post("/threads/{thread_id}/messages")
async def send_thread_message(
    thread_id: UUID,
    payload: dict,
    session: AsyncSession = Depends(get_session),
):
    message = await chat_service.post_user_message(
        session, thread_id, payload.get("content", "")
    )
    return _message_to_dict(message)


@router.post("/threads/{thread_id}/quick-action-message")
async def quick_action_message(
    thread_id: UUID,
    payload: dict,
    session: AsyncSession = Depends(get_session),
):
    instruction = (payload.get("instruction") or "Run quick action").strip()
    message = await chat_service.post_user_message(session, thread_id, instruction)
    return _message_to_dict(message)


# ---------------------------------------------------------------------------
# Assistant turns (LLM) — rate-limited like /analyze
# ---------------------------------------------------------------------------

@router.post("/threads/{thread_id}/assistant/reply")
@limiter.limit("20/minute")
async def assistant_reply(
    request: Request,
    thread_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    message = await chat_service.generate_assistant_reply(session, thread_id)
    return _message_to_dict(message)


@router.post("/threads/{thread_id}/assistant/quick-action")
@limiter.limit("20/minute")
async def assistant_quick_action(
    request: Request,
    thread_id: UUID,
    payload: dict,
    session: AsyncSession = Depends(get_session),
):
    instruction = (payload.get("instruction") or "").strip() or None
    message = await chat_service.generate_assistant_reply(
        session, thread_id, instruction=instruction
    )
    return _message_to_dict(message)
