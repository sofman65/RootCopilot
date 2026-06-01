"""TicketCommentRepository — list + create comments."""

from typing import List
from uuid import UUID

from sqlalchemy import select

from app.models import TicketComment
from app.repositories.base import BaseRepository


class TicketCommentRepository(BaseRepository):
    async def list_by_ticket(self, ticket_id: UUID) -> List[TicketComment]:
        r = await self.session.execute(
            select(TicketComment)
            .where(TicketComment.ticket_id == ticket_id)
            .order_by(TicketComment.created_at.desc())
        )
        return list(r.scalars().all())

    async def create(
        self,
        ticket_id: UUID,
        author: str,
        body: str,
        source: str = "internal",
    ) -> TicketComment:
        comment = TicketComment(
            ticket_id=ticket_id,
            author=author,
            body=body,
            source=source,
        )
        self.session.add(comment)
        await self.session.flush()
        return comment
