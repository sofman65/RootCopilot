from typing import Optional
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    integration_id: str
    external_id: Optional[str] = None
    name: str


class ProjectResponse(BaseModel):
    id: str
    workspace_id: str
    integration_id: str
    external_id: Optional[str]
    name: str
    created_at: str
    updated_at: str
