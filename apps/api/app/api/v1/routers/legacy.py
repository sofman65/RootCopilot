"""
Legacy sidebar hierarchy — clients → projects → environments → issues.

Still derived from in-memory demo_data. The copilot thread/message endpoints
that used to live here are now DB-backed in routers/chat.py; the issue detail
and thread lifecycle resolve against the canonical Ticket table there.
"""

from fastapi import APIRouter

from app.demo_data import (
    legacy_clients,
    legacy_projects_for_client,
    legacy_environments_for_project,
    legacy_issues_for_environment,
)

router = APIRouter()


@router.get("/clients")
def list_clients_legacy():
    return legacy_clients()


@router.get("/clients/{client_id}/projects")
def list_projects_legacy(client_id: str):
    return legacy_projects_for_client(client_id)


@router.get("/projects/{project_id}/environments")
def list_environments_legacy(project_id: str):
    return legacy_environments_for_project(project_id)


@router.get("/environments/{environment_id}/issues")
def list_issues_legacy(environment_id: str):
    return legacy_issues_for_environment(environment_id)
