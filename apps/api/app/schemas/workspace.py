from pydantic import BaseModel


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str
