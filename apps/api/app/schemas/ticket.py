from typing import List, Optional
from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    project_id: str
    integration_id: Optional[str] = None  # defaults to manual integration on server
    title: str
    description: Optional[str] = None
    status: str = "Open"
    priority: str = "Medium"
    client_name: Optional[str] = None
    environment: Optional[str] = None
    component: Optional[str] = None
    service_name: Optional[str] = None
    labels: List[str] = Field(default_factory=list)
    assignee: Optional[str] = None
    reporter: Optional[str] = None


class TicketPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    client_name: Optional[str] = None
    environment: Optional[str] = None
    component: Optional[str] = None
    service_name: Optional[str] = None
    labels: Optional[List[str]] = None
    assignee: Optional[str] = None
    reporter: Optional[str] = None


class TicketSummary(BaseModel):
    """Lightweight shape used inside workspace tree."""
    id: str
    title: str
    status: str
    priority: str
    source_system: str
    created_at: str
    updated_at: str


class TicketResponse(BaseModel):
    id: str
    workspace_id: str
    project_id: str
    integration_id: str
    source_system: str
    external_id: Optional[str]
    external_url: Optional[str]
    title: str
    description: Optional[str]
    status: str
    priority: str
    client_name: Optional[str]
    environment: Optional[str]
    component: Optional[str]
    service_name: Optional[str]
    labels: List[str]
    area_path: Optional[str]
    assignee: Optional[str]
    reporter: Optional[str]
    source_created_at: Optional[str]
    source_updated_at: Optional[str]
    ingested_at: str
    created_at: str
    updated_at: str
