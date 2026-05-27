from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from enum import Enum


class TriggeredBy(str, Enum):
    user = "user"
    auto = "auto"
    quick_action = "quick_action"


class AnalysisStatus(str, Enum):
    pending = "pending"
    running = "running"
    done = "done"
    error = "error"


class AnalysisRunRequest(BaseModel):
    instruction: Optional[str] = None  # defaults to root-cause prompt on server
    triggered_by: TriggeredBy = TriggeredBy.user


class AnalysisResultJson(BaseModel):
    summary: str
    likely_root_cause: str
    confidence: str  # "high" | "medium" | "low"
    evidence: List[str]
    suggested_steps: List[str]
    stakeholder_summary: str


class SimilarTicketRef(BaseModel):
    ticket_id: str
    title: str
    score: float
    explanation: Optional[str] = None


class AnalysisRunResponse(BaseModel):
    id: str
    ticket_id: str
    triggered_by: TriggeredBy
    instruction: Optional[str]
    status: AnalysisStatus
    model: Optional[str]
    result_markdown: Optional[str]
    result_json: Optional[Dict[str, Any]]  # AnalysisResultJson shape
    similar_tickets: List[SimilarTicketRef]
    created_at: str
    updated_at: str
    completed_at: Optional[str]
