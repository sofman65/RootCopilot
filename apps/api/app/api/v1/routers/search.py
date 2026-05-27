from typing import Optional

from fastapi import APIRouter

from app.schemas import SearchResponse
from app.schemas.search import TicketSearchResult
from app.demo_data import TICKETS, COMMENTS, _ticket_breadcrumb

router = APIRouter()


@router.get("/search")
def search(
    q: Optional[str] = None,
    term: Optional[str] = None,
    scope: Optional[str] = "all",
):
    query = (q or term or "").lower().strip()
    if not query:
        return SearchResponse(
            tickets=[], comments=[], artifacts=[], analysis=[],
            issues=[], messages=[],
        )

    matched_tickets = [
        TicketSearchResult(
            id=t["id"],
            title=t["title"],
            breadcrumb=_ticket_breadcrumb(t),
            environment=t.get("environment"),
            priority=t.get("priority", ""),
            status=t.get("status", ""),
        )
        for t in TICKETS
        if query in t["title"].lower() or query in (t.get("description") or "").lower()
        or query in (t.get("environment") or "").lower()
        or query in (t.get("client_name") or "").lower()
    ]

    matched_comments = [
        c for c in COMMENTS if query in c["body"].lower()
    ]

    return SearchResponse(
        tickets=matched_tickets,
        comments=matched_comments,
        artifacts=[],
        analysis=[],
        issues=matched_tickets,
        messages=matched_comments,
    )
