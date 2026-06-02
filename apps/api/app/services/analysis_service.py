"""
Analysis domain service — DB-backed.

Bridges the analysis router and the LLM subsystem:
- Looks up the ticket via TicketRepository
- Computes similar tickets via the same heuristic
- Builds AnalysisContext + LLMRequest
- Calls the LLM subsystem (mock or real)
- Persists the AnalysisRun via AnalysisRunRepository
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.models import AnalysisContext, LLMRequest
from app.llm.subsystem import get_subsystem
from app.models import AnalysisRun, Ticket
from app.repositories import AnalysisRunRepository, TicketRepository
from app.schemas.analysis import SimilarTicketRef


DEFAULT_INSTRUCTION = (
    "Analyze this ticket. Identify the likely root cause, key evidence, "
    "suggested resolution steps, and write a short stakeholder summary."
)


def _to_similar_refs(target: Ticket, similar: List[Ticket]) -> List[SimilarTicketRef]:
    return [
        SimilarTicketRef(
            ticket_id=str(t.id),
            title=t.title,
            score=round(0.75 + 0.1 * (t.priority == target.priority), 2),
            explanation="Similar component and environment configuration.",
        )
        for t in similar
    ]


def _build_context(ticket: Ticket, similar: List[SimilarTicketRef]) -> AnalysisContext:
    return AnalysisContext(
        ticket_id=str(ticket.id),
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        environment=ticket.environment,
        component=ticket.component,
        service_name=ticket.service_name,
        client_name=ticket.client_name,
        labels=list(ticket.labels or []),
        similar_tickets=similar,
    )


def _render_markdown(result_json) -> str:
    steps = "\n".join(f"{i+1}. {s}" for i, s in enumerate(result_json.suggested_steps))
    return (
        f"### Summary\n{result_json.summary}\n\n"
        f"### Likely Root Cause\n{result_json.likely_root_cause}\n\n"
        f"### Suggested Steps\n{steps}"
    )


async def analyze_ticket(
    session: AsyncSession,
    ticket_id: UUID,
    instruction: Optional[str] = None,
    triggered_by: str = "user",
) -> AnalysisRun:
    """Run analysis, persist as AnalysisRun, return the ORM object."""
    ticket_repo = TicketRepository(session)
    ticket = await ticket_repo.get_by_id(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    final_instruction = instruction or DEFAULT_INSTRUCTION
    similar_tickets = await ticket_repo.find_similar(ticket, limit=3)
    similar_refs = _to_similar_refs(ticket, similar_tickets)
    context = _build_context(ticket, similar_refs)

    request = LLMRequest(
        context=context,
        instruction=final_instruction,
        triggered_by=triggered_by,
    )

    subsystem = get_subsystem()
    ticket_updated_at = ticket.updated_at.isoformat() if ticket.updated_at else None
    response = subsystem.analyze(request, ticket_updated_at=ticket_updated_at)

    now = datetime.now(timezone.utc)
    run = await AnalysisRunRepository(session).create(
        ticket_id=ticket.id,
        triggered_by=triggered_by,
        instruction=final_instruction,
        status="done",
        model=response.usage.model,
        result_markdown=_render_markdown(response.result_json) if response.result_json else None,
        result_json=response.result_json.model_dump() if response.result_json else None,
        similar_tickets=[s.model_dump() for s in similar_refs],
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
        latency_ms=response.usage.latency_ms,
        completed_at=now,
    )
    return run
