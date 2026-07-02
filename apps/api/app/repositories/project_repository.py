"""ProjectRepository — CRUD on the Project table."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select

from app.models import Project
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository):
    async def get_by_id(self, project_id: UUID) -> Optional[Project]:
        return await self.session.get(Project, project_id)

    async def list_by_workspace(self, workspace_id: UUID) -> List[Project]:
        r = await self.session.execute(
            select(Project).where(Project.workspace_id == workspace_id)
        )
        return list(r.scalars().all())

    async def list_by_integration(self, integration_id: UUID) -> List[Project]:
        r = await self.session.execute(
            select(Project).where(Project.integration_id == integration_id)
        )
        return list(r.scalars().all())

    async def list_by_ids(self, project_ids: List[UUID]) -> List[Project]:
        if not project_ids:
            return []
        r = await self.session.execute(
            select(Project).where(Project.id.in_(project_ids))
        )
        return list(r.scalars().all())

    async def create(
        self,
        workspace_id: UUID,
        integration_id: UUID,
        name: str,
        external_id: Optional[str] = None,
    ) -> Project:
        project = Project(
            workspace_id=workspace_id,
            integration_id=integration_id,
            external_id=external_id,
            name=name,
        )
        self.session.add(project)
        await self.session.flush()
        return project
