from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class TicketSearchResult(BaseModel):
    id: str
    title: str
    breadcrumb: Optional[str]
    environment: Optional[str]
    priority: str
    status: str


class SearchResponse(BaseModel):
    # Canonical keys
    tickets: List[TicketSearchResult]
    comments: List[Dict[str, Any]]
    artifacts: List[Dict[str, Any]]
    analysis: List[Dict[str, Any]]
    # Legacy aliases — present during frontend migration only
    issues: List[TicketSearchResult]   # mirrors tickets
    messages: List[Dict[str, Any]]     # mirrors comments
