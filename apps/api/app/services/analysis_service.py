"""
Analysis domain service.

Bridges the analysis router and the LLM subsystem:
- Looks up the ticket
- Computes similar tickets (cheap deterministic heuristic)
- Builds AnalysisContext and LLMRequest
- Calls the LLM subsystem
- Persists the AnalysisRun in ANALYSIS_RUNS
"""

from typing import List, Optional

from fastapi import HTTPException

from app.demo_data import TICKETS, ANALYSIS_RUNS
from app.llm.subsystem import get_subsystem
from app.llm.models import AnalysisContext, LLMRequest
from app.schemas.analysis import SimilarTicketRef
from app.utils import _now, _new_id


DEFAULT_INSTRUCTION = (
    "Analyze this ticket. Identify the likely root cause, key evidence, "
    "suggested resolution steps, and write a short stakeholder summary."
)


def _find_similar_tickets(target: dict, max_results: int = 3) -> List[SimilarTicketRef]:
    """Heuristic: same-project tickets, ranked by priority match."""
    return [
        SimilarTicketRef(
            ticket_id=t["id"],
            title=t["title"],
            score=round(0.75 + 0.1 * (t["priority"] == target["priority"]), 2),
            explanation="Similar component and environment configuration.",
        )
        for t in TICKETS
        if t["id"] != target["id"] and t["project_id"] == target["project_id"]
    ][:max_results]


def _build_context(ticket: dict, similar: List[SimilarTicketRef]) -> AnalysisContext:
    return AnalysisContext(
        ticket_id=ticket["id"],
        title=ticket["title"],
        description=ticket.get("description"),
        status=ticket["status"],
        priority=ticket["priority"],
        environment=ticket.get("environment"),
        component=ticket.get("component"),
        service_name=ticket.get("service_name"),
        client_name=ticket.get("client_name"),
        labels=ticket.get("labels", []),
        similar_tickets=similar,
    )


def _render_markdown(result_json) -> str:
    steps = "\n".join(f"{i+1}. {s}" for i, s in enumerate(result_json.suggested_steps))
    return (
        f"### Summary\n{result_json.summary}\n\n"
        f"### Likely Root Cause\n{result_json.likely_root_cause}\n\n"
        f"### Suggested Steps\n{steps}"
    )


def analyze_ticket(
    ticket_id: str,
    instruction: Optional[str] = None,
    triggered_by: str = "user",
) -> dict:
    """Run analysis and persist an AnalysisRun. Returns the AnalysisRun dict."""
    ticket = next((t for t in TICKETS if t["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    final_instruction = instruction or DEFAULT_INSTRUCTION
    similar = _find_similar_tickets(ticket)
    context = _build_context(ticket, similar)

    request = LLMRequest(
        context=context,
        instruction=final_instruction,
        triggered_by=triggered_by,
    )

    subsystem = get_subsystem()
    response = subsystem.analyze(request, ticket_updated_at=ticket.get("updated_at"))

    now = _now()
    run = {
        "id": _new_id("analysis_"),
        "ticket_id": ticket_id,
        "triggered_by": triggered_by,
        "instruction": final_instruction,
        "status": "done",
        "model": response.usage.model,
        "result_markdown": _render_markdown(response.result_json) if response.result_json else None,
        "result_json": response.result_json.model_dump() if response.result_json else None,
        "similar_tickets": [s.model_dump() for s in similar],
        "created_at": now,
        "updated_at": now,
        "completed_at": now,
    }
    ANALYSIS_RUNS.append(run)
    return run
