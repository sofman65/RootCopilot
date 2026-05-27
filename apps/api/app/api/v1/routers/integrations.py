from fastapi import APIRouter, HTTPException

from app.schemas import IntegrationCreate, IntegrationResponse
from app.demo_data import WORKSPACE, INTEGRATIONS
from app.utils import _now, _new_id

router = APIRouter()


@router.get("/integrations")
def list_integrations():
    return INTEGRATIONS


@router.post("/integrations", response_model=IntegrationResponse, status_code=201)
def create_integration(body: IntegrationCreate):
    now = _now()
    integration = {
        "id": _new_id("int_"),
        "workspace_id": WORKSPACE["id"],
        "type": body.type,
        "name": body.name,
        "config": body.config,
        "status": "active",
        "last_synced_at": None,
        "created_at": now,
        "updated_at": now,
    }
    INTEGRATIONS.append(integration)
    return integration


@router.post("/integrations/{integration_id}/sync")
def sync_integration(integration_id: str):
    integration = next((i for i in INTEGRATIONS if i["id"] == integration_id), None)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    return {"integration_id": integration_id, "status": "queued", "message": "Sync started"}
