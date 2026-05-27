from fastapi import APIRouter, HTTPException

from app.demo_data import TICKETS, ARTIFACTS
from app.utils import _now, _new_id

router = APIRouter()


@router.get("/tickets/{ticket_id}/artifacts")
def list_artifacts(ticket_id: str):
    if not any(t["id"] == ticket_id for t in TICKETS):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return [a for a in ARTIFACTS if a["ticket_id"] == ticket_id]


@router.post("/tickets/{ticket_id}/artifacts", status_code=201)
def create_artifact(ticket_id: str, body: dict):
    if not any(t["id"] == ticket_id for t in TICKETS):
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not body.get("name") or not body.get("content"):
        raise HTTPException(status_code=400, detail="name and content are required")
    now = _now()
    artifact = {
        "id": _new_id("artifact_"),
        "ticket_id": ticket_id,
        "name": body["name"],
        "type": body.get("type", "other"),
        "content": body["content"],
        "storage_url": None,
        "created_at": now,
    }
    ARTIFACTS.append(artifact)
    return artifact
