from typing import Optional

from fastapi import APIRouter, HTTPException

from app.schemas import ProjectCreate, ProjectResponse
from app.demo_data import WORKSPACE, INTEGRATIONS, PROJECTS
from app.utils import _now, _new_id

router = APIRouter()


@router.get("/projects")
def list_projects(
    integration_id: Optional[str] = None,
    source_system: Optional[str] = None,
):
    result = PROJECTS
    if integration_id:
        result = [p for p in result if p["integration_id"] == integration_id]
    return result


@router.post("/projects", response_model=ProjectResponse, status_code=201)
def create_project(body: ProjectCreate):
    integration = next((i for i in INTEGRATIONS if i["id"] == body.integration_id), None)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    now = _now()
    project = {
        "id": _new_id("project_"),
        "workspace_id": WORKSPACE["id"],
        "integration_id": body.integration_id,
        "external_id": body.external_id,
        "name": body.name,
        "created_at": now,
        "updated_at": now,
    }
    PROJECTS.append(project)
    return project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    project = next((p for p in PROJECTS if p["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
