from fastapi import APIRouter, HTTPException

from app.demo_data import TICKETS, COMMENTS
from app.utils import _now, _new_id

router = APIRouter()


@router.get("/tickets/{ticket_id}/comments")
def list_comments(ticket_id: str):
    if not any(t["id"] == ticket_id for t in TICKETS):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return [c for c in COMMENTS if c["ticket_id"] == ticket_id]


@router.post("/tickets/{ticket_id}/comments", status_code=201)
def create_comment(ticket_id: str, body: dict):
    if not any(t["id"] == ticket_id for t in TICKETS):
        raise HTTPException(status_code=404, detail="Ticket not found")
    text = body.get("body", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="body is required")
    now = _now()
    comment = {
        "id": _new_id("comment_"),
        "ticket_id": ticket_id,
        "source": "internal",
        "external_id": None,
        "author": body.get("author", "user"),
        "body": text,
        "created_at": now,
        "updated_at": now,
    }
    COMMENTS.append(comment)
    return comment
