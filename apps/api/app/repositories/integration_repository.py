"""IntegrationRepository — CRUD on the Integration table."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select

from app.models import Integration
from app.repositories.base import BaseRepository


class IntegrationRepository(BaseRepository):
    async def get_by_id(self, integration_id: UUID) -> Optional[Integration]:
        return await self.session.get(Integration, integration_id)

    async def list_by_workspace(self, workspace_id: UUID) -> List[Integration]:
        r = await self.session.execute(
            select(Integration).where(Integration.workspace_id == workspace_id)
        )
        return list(r.scalars().all())

    async def create(
        self,
        workspace_id: UUID,
        type: str,
        name: str,
        config: Optional[dict] = None,
        credentials_encrypted: Optional[str] = None,
    ) -> Integration:
        integration = Integration(
            workspace_id=workspace_id,
            type=type,
            name=name,
            config=config or {},
            credentials_encrypted=credentials_encrypted,
        )
        self.session.add(integration)
        await self.session.flush()
        return integration
