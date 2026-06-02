"""Integration CRUD — DB-backed via IntegrationRepository."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.repositories import IntegrationRepository, WorkspaceRepository
from app.schemas import IntegrationCreate

router = APIRouter()


def _integration_to_dict(i) -> dict:
    """credentials_encrypted is NEVER returned in API responses."""
    return {
        "id": str(i.id),
        "workspace_id": str(i.workspace_id),
        "type": i.type,
        "name": i.name,
        "config": i.config,
        "status": i.status,
        "last_synced_at": i.last_synced_at.isoformat() if i.last_synced_at else None,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
    }


@router.get("/integrations")
async def list_integrations(session: AsyncSession = Depends(get_session)):
    workspace = await WorkspaceRepository(session).get_current()
    if not workspace:
        return []
    integrations = await IntegrationRepository(session).list_by_workspace(workspace.id)
    return [_integration_to_dict(i) for i in integrations]


@router.post("/integrations", status_code=201)
async def create_integration(
    body: IntegrationCreate,
    session: AsyncSession = Depends(get_session),
):
    workspace = await WorkspaceRepository(session).get_current()
    if not workspace:
        raise HTTPException(status_code=404, detail="No workspace found")

    integration = await IntegrationRepository(session).create(
        workspace_id=workspace.id,
        type=body.type,
        name=body.name,
        config=body.config or {},
    )
    return _integration_to_dict(integration)


@router.post("/integrations/{integration_id}/sync")
async def sync_integration(
    integration_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    integration = await IntegrationRepository(session).get_by_id(integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    return {
        "integration_id": str(integration.id),
        "status": "queued",
        "message": "Sync started",
    }
