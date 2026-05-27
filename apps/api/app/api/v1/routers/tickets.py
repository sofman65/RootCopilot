from typing import Optional

from fastapi import APIRouter, HTTPException

from app.schemas import TicketCreate, TicketPatch, TicketResponse
from app.demo_data import WORKSPACE, PROJECTS, TICKETS
from app.utils import _now, _new_id

router = APIRouter()


@router.get("/tickets")
def list_tickets(
    project_id: Optional[str] = None,
    integration_id: Optional[str] = None,
    source_system: Optional[str] = None,
    client_name: Optional[str] = None,
    environment: Optional[str] = None,
    component: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    q: Optional[str] = None,
):
    result = TICKETS
    if project_id:
        result = [t for t in result if t["project_id"] == project_id]
    if integration_id:
        result = [t for t in result if t["integration_id"] == integration_id]
    if source_system:
        result = [t for t in result if t["source_system"] == source_system]
    if client_name:
        result = [t for t in result if (t.get("client_name") or "").lower() == client_name.lower()]
    if environment:
        result = [t for t in result if (t.get("environment") or "").lower() == environment.lower()]
    if component:
        result = [t for t in result if (t.get("component") or "").lower() == component.lower()]
    if status:
        result = [t for t in result if t.get("status") == status]
    if priority:
        result = [t for t in result if t.get("priority") == priority]
    if q:
        ql = q.lower()
        result = [
            t for t in result
            if ql in t["title"].lower() or ql in (t.get("description") or "").lower()
        ]
    return result


@router.post("/tickets", response_model=TicketResponse, status_code=201)
def create_ticket(body: TicketCreate):
    project = next((p for p in PROJECTS if p["id"] == body.project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    integration_id = body.integration_id or project["integration_id"]
    now = _now()
    ticket = {
        "id": _new_id("ticket_"),
        "workspace_id": WORKSPACE["id"],
        "project_id": body.project_id,
        "integration_id": integration_id,
        "source_system": "manual",
        "external_id": None,
        "external_url": None,
        "title": body.title,
        "description": body.description,
        "status": body.status,
        "priority": body.priority,
        "client_name": body.client_name,
        "environment": body.environment,
        "component": body.component,
        "service_name": body.service_name,
        "labels": body.labels,
        "area_path": None,
        "assignee": body.assignee,
        "reporter": body.reporter,
        "source_created_at": None,
        "source_updated_at": None,
        "ingested_at": now,
        "created_at": now,
        "updated_at": now,
    }
    TICKETS.append(ticket)
    return ticket


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: str):
    ticket = next((t for t in TICKETS if t["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
def patch_ticket(ticket_id: str, body: TicketPatch):
    ticket = next((t for t in TICKETS if t["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    updates = body.model_dump(exclude_none=True)
    ticket.update(updates)
    ticket["updated_at"] = _now()
    return ticket
