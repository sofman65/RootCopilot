"""AnalysisRunRepository — persist + query analysis runs."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select

from app.models import AnalysisRun
from app.repositories.base import BaseRepository


class AnalysisRunRepository(BaseRepository):
    async def get_by_id(self, analysis_id: UUID) -> Optional[AnalysisRun]:
        return await self.session.get(AnalysisRun, analysis_id)

    async def list_by_ticket(self, ticket_id: UUID) -> List[AnalysisRun]:
        r = await self.session.execute(
            select(AnalysisRun)
            .where(AnalysisRun.ticket_id == ticket_id)
            .order_by(AnalysisRun.created_at.desc())
        )
        return list(r.scalars().all())

    async def get_latest_by_ticket(self, ticket_id: UUID) -> Optional[AnalysisRun]:
        r = await self.session.execute(
            select(AnalysisRun)
            .where(AnalysisRun.ticket_id == ticket_id)
            .order_by(AnalysisRun.created_at.desc())
            .limit(1)
        )
        return r.scalar_one_or_none()

    async def create(self, **fields) -> AnalysisRun:
        run = AnalysisRun(**fields)
        self.session.add(run)
        await self.session.flush()
        return run
