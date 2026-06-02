"""TicketArtifactRepository — list + create artifacts."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select

from app.models import TicketArtifact
from app.repositories.base import BaseRepository


class TicketArtifactRepository(BaseRepository):
    async def list_by_ticket(self, ticket_id: UUID) -> List[TicketArtifact]:
        r = await self.session.execute(
            select(TicketArtifact)
            .where(TicketArtifact.ticket_id == ticket_id)
            .order_by(TicketArtifact.created_at.desc())
        )
        return list(r.scalars().all())

    async def create(
        self,
        ticket_id: UUID,
        name: str,
        content: Optional[str] = None,
        storage_url: Optional[str] = None,
        type: str = "other",
    ) -> TicketArtifact:
        artifact = TicketArtifact(
            ticket_id=ticket_id,
            name=name,
            content=content,
            storage_url=storage_url,
            type=type,
        )
        self.session.add(artifact)
        await self.session.flush()
        return artifact
