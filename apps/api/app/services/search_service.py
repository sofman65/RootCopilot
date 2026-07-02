"""
Search service — DB-backed full-text-ish search over Postgres.

Replaces the in-memory demo search. Matches tickets (title/description),
ticket comments (body), and Copilot chat messages (content), returning the
canonical shape plus the legacy `issues`/`messages` aliases the search page
still consumes (see lib/rootcopilot-api.ts).
"""

from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Ticket
from app.repositories import (
    ChatMessageRepository,
    ChatThreadRepository,
    ProjectRepository,
    TicketCommentRepository,
    TicketRepository,
)
from app.schemas.search import SearchResponse, TicketSearchResult


def _breadcrumb(ticket: Ticket, project_name: Optional[str]) -> str:
    return " / ".join(
        p for p in [ticket.client_name, project_name, ticket.environment] if p
    )


class _ProjectNameCache:
    """Lazily resolves project_id → name, batching the initial lookup."""

    def __init__(self, session: AsyncSession):
        self._repo = ProjectRepository(session)
        self._names: Dict[UUID, Optional[str]] = {}

    async def prime(self, project_ids: List[UUID]) -> None:
        missing = [pid for pid in set(project_ids) if pid not in self._names]
        for p in await self._repo.list_by_ids(missing):
            self._names[p.id] = p.name
        for pid in missing:
            self._names.setdefault(pid, None)

    async def get(self, project_id: UUID) -> Optional[str]:
        if project_id not in self._names:
            await self.prime([project_id])
        return self._names.get(project_id)


async def search(session: AsyncSession, query: Optional[str]) -> SearchResponse:
    query = (query or "").strip()
    empty = SearchResponse(
        tickets=[], comments=[], artifacts=[], analysis=[], issues=[], messages=[]
    )
    if not query:
        return empty

    ticket_repo = TicketRepository(session)
    tickets = await ticket_repo.list(q=query)

    names = _ProjectNameCache(session)
    await names.prime([t.project_id for t in tickets])

    ticket_results = [
        TicketSearchResult(
            id=str(t.id),
            title=t.title,
            breadcrumb=_breadcrumb(t, await names.get(t.project_id)),
            environment=t.environment,
            priority=t.priority,
            status=t.status,
        )
        for t in tickets
    ]

    comments = await TicketCommentRepository(session).search(query)
    comment_dicts = [
        {
            "id": str(c.id),
            "ticket_id": str(c.ticket_id),
            "source": c.source,
            "author": c.author,
            "body": c.body,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in comments
    ]

    # Chat messages → legacy `messages` alias, enriched with ticket context.
    messages = await ChatMessageRepository(session).search(query)
    thread_repo = ChatThreadRepository(session)
    ticket_by_id: Dict[UUID, Optional[Ticket]] = {t.id: t for t in tickets}
    thread_ticket: Dict[UUID, Optional[UUID]] = {}
    message_dicts: List[dict] = []

    for m in messages:
        if m.thread_id not in thread_ticket:
            thread = await thread_repo.get_by_id(m.thread_id)
            thread_ticket[m.thread_id] = thread.ticket_id if thread else None
        ticket_id = thread_ticket[m.thread_id]

        ticket = None
        if ticket_id is not None:
            if ticket_id not in ticket_by_id:
                ticket_by_id[ticket_id] = await ticket_repo.get_by_id(ticket_id)
            ticket = ticket_by_id[ticket_id]

        breadcrumb = (
            _breadcrumb(ticket, await names.get(ticket.project_id)) if ticket else None
        )
        message_dicts.append({
            "_id": str(m.id),
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "issue_id": str(ticket_id) if ticket_id else None,
            "issue_title": ticket.title if ticket else None,
            "environment": ticket.environment if ticket else None,
            "breadcrumb": breadcrumb,
        })

    return SearchResponse(
        tickets=ticket_results,
        comments=comment_dicts,
        artifacts=[],
        analysis=[],
        issues=ticket_results,   # legacy alias — mirrors tickets
        messages=message_dicts,  # legacy alias — chat messages
    )
