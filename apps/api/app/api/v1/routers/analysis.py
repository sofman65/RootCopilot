from fastapi import APIRouter, HTTPException, Request

from app.schemas import AnalysisRunRequest
from app.demo_data import TICKETS, ANALYSIS_RUNS
from app.limiter import limiter
from app.services import analysis_service

router = APIRouter()


@router.post("/tickets/{ticket_id}/analyze")
@limiter.limit("10/minute")
def analyze_ticket(request: Request, ticket_id: str, body: AnalysisRunRequest):
    return analysis_service.analyze_ticket(
        ticket_id=ticket_id,
        instruction=body.instruction,
        triggered_by=body.triggered_by.value if hasattr(body.triggered_by, "value") else body.triggered_by,
    )


@router.get("/tickets/{ticket_id}/analysis")
def get_ticket_analysis(ticket_id: str):
    if not any(t["id"] == ticket_id for t in TICKETS):
        raise HTTPException(status_code=404, detail="Ticket not found")
    run = next(
        (r for r in reversed(ANALYSIS_RUNS) if r["ticket_id"] == ticket_id), None
    )
    if not run:
        raise HTTPException(status_code=404, detail="No analysis found for this ticket")
    return run


@router.get("/analysis/{analysis_id}")
def get_analysis(analysis_id: str):
    run = next((r for r in ANALYSIS_RUNS if r["id"] == analysis_id), None)
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")
    return run
