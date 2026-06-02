"""Analysis — DB-backed via AnalysisRunRepository + analysis_service."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.limiter import limiter
from app.repositories import AnalysisRunRepository, TicketRepository
from app.schemas import AnalysisRunRequest
from app.services import analysis_service

router = APIRouter()


def _analysis_to_dict(r) -> dict:
    return {
        "id": str(r.id),
        "ticket_id": str(r.ticket_id),
        "triggered_by": r.triggered_by,
        "instruction": r.instruction,
        "status": r.status,
        "model": r.model,
        "result_markdown": r.result_markdown,
        "result_json": r.result_json,
        "similar_tickets": list(r.similar_tickets or []),
        "input_tokens": r.input_tokens,
        "output_tokens": r.output_tokens,
        "latency_ms": r.latency_ms,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
    }


@router.post("/tickets/{ticket_id}/analyze")
@limiter.limit("10/minute")
async def analyze_ticket(
    request: Request,
    ticket_id: UUID,
    body: AnalysisRunRequest,
    session: AsyncSession = Depends(get_session),
):
    triggered = body.triggered_by.value if hasattr(body.triggered_by, "value") else body.triggered_by
    run = await analysis_service.analyze_ticket(
        session=session,
        ticket_id=ticket_id,
        instruction=body.instruction,
        triggered_by=triggered,
    )
    return _analysis_to_dict(run)


@router.get("/tickets/{ticket_id}/analysis")
async def get_ticket_analysis(
    ticket_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    if not await TicketRepository(session).get_by_id(ticket_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    run = await AnalysisRunRepository(session).get_latest_by_ticket(ticket_id)
    if not run:
        raise HTTPException(status_code=404, detail="No analysis found for this ticket")
    return _analysis_to_dict(run)


@router.get("/analysis/{analysis_id}")
async def get_analysis(
    analysis_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    run = await AnalysisRunRepository(session).get_by_id(analysis_id)
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")
    return _analysis_to_dict(run)
