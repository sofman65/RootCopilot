from typing import Any, Dict, Optional
from pydantic import BaseModel
from enum import Enum


class IntegrationType(str, Enum):
    jira = "jira"
    azure_devops = "azure_devops"
    manual = "manual"


class IntegrationStatus(str, Enum):
    active = "active"
    paused = "paused"
    error = "error"


class IntegrationCreate(BaseModel):
    type: IntegrationType
    name: str
    config: Dict[str, Any] = {}
    # credentials accepted but never stored in plaintext or returned


class IntegrationResponse(BaseModel):
    id: str
    workspace_id: str
    type: IntegrationType
    name: str
    config: Dict[str, Any]
    status: IntegrationStatus
    last_synced_at: Optional[str]
    created_at: str
    updated_at: str
