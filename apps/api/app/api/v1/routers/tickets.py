"""Ticket CRUD — DB-backed via TicketRepository."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.repositories import ProjectRepository, TicketRepository, WorkspaceRepository
from app.schemas import TicketCreate, TicketPatch

router = APIRouter()


def _ticket_to_dict(t) -> dict:
    return {
        "id": str(t.id),
        "workspace_id": str(t.workspace_id),
        "project_id": str(t.project_id),
        "integration_id": str(t.integration_id) if t.integration_id else None,
        "source_system": t.source_system,
        "external_id": t.external_id,
        "external_url": t.external_url,
        "title": t.title,
        "description": t.description,
        "status": t.status,
        "priority": t.priority,
        "client_name": t.client_name,
        "environment": t.environment,
        "component": t.component,
        "service_name": t.service_name,
        "labels": list(t.labels),
        "area_path": t.area_path,
        "assignee": t.assignee,
        "reporter": t.reporter,
        "source_created_at": t.source_created_at.isoformat() if t.source_created_at else None,
        "source_updated_at": t.source_updated_at.isoformat() if t.source_updated_at else None,
        "ingested_at": t.ingested_at.isoformat() if t.ingested_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _maybe_uuid(value: Optional[str]) -> Optional[UUID]:
    """Parse a string param as UUID; return None for empty input.
    Returns None for invalid UUIDs (treated as a filter that matches nothing)."""
    if value is None or value == "":
        return None
    try:
        return UUID(value)
    except (ValueError, AttributeError):
        return None


@router.get("/tickets")
async def list_tickets(
    project_id: Optional[str] = None,
    integration_id: Optional[str] = None,
    source_system: Optional[str] = None,
    client_name: Optional[str] = None,
    environment: Optional[str] = None,
    component: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    q: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    # If a legacy/invalid id is passed, filter resolves to None → empty result
    # rather than crashing. Real UUIDs flow through normally.
    project_uuid = _maybe_uuid(project_id)
    integration_uuid = _maybe_uuid(integration_id)

    if project_id and not project_uuid:
        return []
    if integration_id and not integration_uuid:
        return []

    repo = TicketRepository(session)
    workspace = await WorkspaceRepository(session).get_current()
    workspace_id = workspace.id if workspace else None

    tickets = await repo.list(
        workspace_id=workspace_id,
        project_id=project_uuid,
        integration_id=integration_uuid,
        source_system=source_system,
        client_name=client_name,
        environment=environment,
        component=component,
        status=status,
        priority=priority,
        q=q,
    )
    return [_ticket_to_dict(t) for t in tickets]


@router.post("/tickets", status_code=201)
async def create_ticket(
    body: TicketCreate,
    session: AsyncSession = Depends(get_session),
):
    try:
        project_uuid = UUID(body.project_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="project_id must be a valid UUID")

    project_repo = ProjectRepository(session)
    project = await project_repo.get_by_id(project_uuid)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # If integration_id is provided, validate it. Otherwise inherit project's.
    if body.integration_id:
        try:
            integration_uuid = UUID(body.integration_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="integration_id must be a valid UUID")
    else:
        integration_uuid = project.integration_id

    ticket = await TicketRepository(session).create(
        workspace_id=project.workspace_id,
        project_id=project.id,
        integration_id=integration_uuid,
        source_system="manual",
        title=body.title,
        description=body.description,
        status=body.status,
        priority=body.priority,
        client_name=body.client_name,
        environment=body.environment,
        component=body.component,
        service_name=body.service_name,
        labels=list(body.labels),
        assignee=body.assignee,
        reporter=body.reporter,
    )
    return _ticket_to_dict(ticket)


@router.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    ticket = await TicketRepository(session).get_by_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _ticket_to_dict(ticket)


@router.patch("/tickets/{ticket_id}")
async def patch_ticket(
    ticket_id: UUID,
    body: TicketPatch,
    session: AsyncSession = Depends(get_session),
):
    updates = body.model_dump(exclude_none=True)
    ticket = await TicketRepository(session).patch(ticket_id, **updates)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return _ticket_to_dict(ticket)
