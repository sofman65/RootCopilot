"""TicketRepository — list, get, create, patch, find-similar."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import or_, select

from app.models import Ticket
from app.repositories.base import BaseRepository


class TicketRepository(BaseRepository):
    async def get_by_id(self, ticket_id: UUID) -> Optional[Ticket]:
        return await self.session.get(Ticket, ticket_id)

    async def list(
        self,
        workspace_id: Optional[UUID] = None,
        project_id: Optional[UUID] = None,
        integration_id: Optional[UUID] = None,
        source_system: Optional[str] = None,
        client_name: Optional[str] = None,
        environment: Optional[str] = None,
        component: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        q: Optional[str] = None,
    ) -> List[Ticket]:
        stmt = select(Ticket)
        if workspace_id:
            stmt = stmt.where(Ticket.workspace_id == workspace_id)
        if project_id:
            stmt = stmt.where(Ticket.project_id == project_id)
        if integration_id:
            stmt = stmt.where(Ticket.integration_id == integration_id)
        if source_system:
            stmt = stmt.where(Ticket.source_system == source_system)
        if client_name:
            stmt = stmt.where(Ticket.client_name.ilike(client_name))
        if environment:
            stmt = stmt.where(Ticket.environment.ilike(environment))
        if component:
            stmt = stmt.where(Ticket.component.ilike(component))
        if status:
            stmt = stmt.where(Ticket.status == status)
        if priority:
            stmt = stmt.where(Ticket.priority == priority)
        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(or_(
                Ticket.title.ilike(pattern),
                Ticket.description.ilike(pattern),
            ))
        r = await self.session.execute(stmt)
        return list(r.scalars().all())

    async def create(self, **fields) -> Ticket:
        ticket = Ticket(**fields)
        self.session.add(ticket)
        await self.session.flush()
        return ticket

    async def patch(self, ticket_id: UUID, **updates) -> Optional[Ticket]:
        ticket = await self.get_by_id(ticket_id)
        if ticket is None:
            return None
        for k, v in updates.items():
            if v is not None:
                setattr(ticket, k, v)
        await self.session.flush()
        return ticket

    async def find_similar(self, ticket: Ticket, limit: int = 3) -> List[Ticket]:
        """MVP heuristic: same project, ranked by priority match."""
        r = await self.session.execute(
            select(Ticket)
            .where(
                Ticket.project_id == ticket.project_id,
                Ticket.id != ticket.id,
            )
            .limit(limit)
        )
        return list(r.scalars().all())
