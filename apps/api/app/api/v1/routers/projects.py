"""Project CRUD — DB-backed via ProjectRepository."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.repositories import IntegrationRepository, ProjectRepository, WorkspaceRepository
from app.schemas import ProjectCreate

router = APIRouter()


def _project_to_dict(p) -> dict:
    return {
        "id": str(p.id),
        "workspace_id": str(p.workspace_id),
        "integration_id": str(p.integration_id),
        "external_id": p.external_id,
        "name": p.name,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _maybe_uuid(value: Optional[str]) -> Optional[UUID]:
    if not value:
        return None
    try:
        return UUID(value)
    except (ValueError, AttributeError):
        return None


@router.get("/projects")
async def list_projects(
    integration_id: Optional[str] = None,
    source_system: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    workspace = await WorkspaceRepository(session).get_current()
    if not workspace:
        return []

    repo = ProjectRepository(session)
    integration_uuid = _maybe_uuid(integration_id)
    if integration_id and not integration_uuid:
        return []

    if integration_uuid:
        projects = await repo.list_by_integration(integration_uuid)
    else:
        projects = await repo.list_by_workspace(workspace.id)
    return [_project_to_dict(p) for p in projects]


@router.post("/projects", status_code=201)
async def create_project(
    body: ProjectCreate,
    session: AsyncSession = Depends(get_session),
):
    try:
        integration_uuid = UUID(body.integration_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="integration_id must be a valid UUID")

    integration = await IntegrationRepository(session).get_by_id(integration_uuid)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    project = await ProjectRepository(session).create(
        workspace_id=integration.workspace_id,
        integration_id=integration.id,
        external_id=body.external_id,
        name=body.name,
    )
    return _project_to_dict(project)


@router.get("/projects/{project_id}")
async def get_project(
    project_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    project = await ProjectRepository(session).get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_to_dict(project)
