from fastapi import APIRouter, HTTPException

from app.schemas import AnalysisRunRequest
from app.demo_data import TICKETS, ANALYSIS_RUNS
from app.utils import _now, _new_id

router = APIRouter()

_DEFAULT_INSTRUCTION = (
    "Analyze this ticket. Identify the likely root cause, "
    "key evidence, suggested resolution steps, and write a short stakeholder summary."
)


@router.post("/tickets/{ticket_id}/analyze")
def analyze_ticket(ticket_id: str, body: AnalysisRunRequest):
    ticket = next((t for t in TICKETS if t["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    instruction = body.instruction or _DEFAULT_INSTRUCTION
    similar = [
        {
            "ticket_id": t["id"],
            "title": t["title"],
            "score": round(0.75 + 0.1 * (t["priority"] == ticket["priority"]), 2),
            "explanation": "Similar component and environment configuration.",
        }
        for t in TICKETS
        if t["id"] != ticket_id and t["project_id"] == ticket["project_id"]
    ][:3]

    now = _now()
    run = {
        "id": _new_id("analysis_"),
        "ticket_id": ticket_id,
        "triggered_by": body.triggered_by,
        "instruction": instruction,
        "status": "done",
        "model": "mock-model",
        "result_markdown": (
            f"### Summary\n{ticket['title']}\n\n"
            "### Likely Root Cause\n"
            "Based on the description and similar past tickets, this appears to be "
            "a configuration-related failure in the affected environment. "
            "Check environment-specific setup, recent changes, and related service mappings.\n\n"
            "### Suggested Steps\n"
            "1. Review environment configuration for the affected service.\n"
            "2. Compare against a working environment.\n"
            "3. Check recent deployments or config changes."
        ),
        "result_json": {
            "summary": ticket["title"],
            "likely_root_cause": "Configuration or environment-specific setup issue.",
            "confidence": "medium",
            "evidence": [
                "Issue is isolated to one environment.",
                "Description references a specific configuration artifact.",
                "Similar historical tickets were configuration-related.",
            ],
            "suggested_steps": [
                "Review environment-specific configuration.",
                "Compare against a working environment.",
                "Check recent deployments or config changes.",
            ],
            "stakeholder_summary": (
                "The issue appears isolated to configuration, not a platform-wide outage."
            ),
        },
        "similar_tickets": similar,
        "created_at": now,
        "updated_at": now,
        "completed_at": now,
    }
    ANALYSIS_RUNS.append(run)
    return run


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
