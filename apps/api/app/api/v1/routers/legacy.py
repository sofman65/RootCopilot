from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.demo_data import (
    THREADS,
    MESSAGES,
    legacy_clients,
    legacy_projects_for_client,
    legacy_environments_for_project,
    legacy_issues_for_environment,
    legacy_issue_by_id,
)
from app.utils import _now, _new_id

router = APIRouter()


# ---------------------------------------------------------------------------
# Legacy sidebar: clients → projects → environments → issues
# ---------------------------------------------------------------------------

@router.get("/clients")
def list_clients_legacy():
    return legacy_clients()


@router.get("/clients/{client_id}/projects")
def list_projects_legacy(client_id: str):
    return legacy_projects_for_client(client_id)


@router.get("/projects/{project_id}/environments")
def list_environments_legacy(project_id: str):
    return legacy_environments_for_project(project_id)


@router.get("/environments/{environment_id}/issues")
def list_issues_legacy(environment_id: str):
    return legacy_issues_for_environment(environment_id)


@router.get("/issues/{issue_id}")
def get_issue_legacy(issue_id: str):
    issue = legacy_issue_by_id(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


# ---------------------------------------------------------------------------
# Legacy threads & messages
# ---------------------------------------------------------------------------

@router.get("/issues/{issue_id}/thread")
def get_thread_by_issue(issue_id: str):
    thread = next((t for t in THREADS if t["issue_id"] == issue_id), None)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@router.post("/issues/{issue_id}/thread")
def create_thread(issue_id: str):
    existing = next((t for t in THREADS if t["issue_id"] == issue_id), None)
    if existing:
        return existing
    new_thread = {"_id": f"thread_{issue_id}", "issue_id": issue_id}
    THREADS.append(new_thread)
    return new_thread


@router.get("/threads/{thread_id}/messages")
def list_thread_messages(thread_id: str):
    return [m for m in MESSAGES if m["thread_id"] == thread_id]


@router.post("/threads/{thread_id}/messages")
def send_thread_message(thread_id: str, payload: dict):
    content = payload.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Missing content")
    msg = {
        "_id": _new_id("msg_"),
        "thread_id": thread_id,
        "role": "user",
        "content": content,
        "created_at": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    MESSAGES.append(msg)
    return msg


@router.post("/threads/{thread_id}/assistant/reply")
def assistant_reply(thread_id: str):
    reply = {
        "_id": _new_id("msg_"),
        "thread_id": thread_id,
        "role": "assistant",
        "content": (
            "Based on similar historical issues, this looks like a configuration-related failure. "
            "Check environment-specific setup, recent changes, and related service mappings."
        ),
        "created_at": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    MESSAGES.append(reply)
    return reply


@router.post("/threads/{thread_id}/quick-action-message")
def quick_action_message(thread_id: str, payload: dict):
    instruction = payload.get("instruction", "Run quick action")
    msg = {
        "_id": _new_id("msg_"),
        "thread_id": thread_id,
        "role": "user",
        "content": instruction,
        "created_at": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    MESSAGES.append(msg)
    return msg


@router.post("/threads/{thread_id}/assistant/quick-action")
def assistant_quick_action(thread_id: str, payload: dict):
    instruction = payload.get("instruction", "quick action")
    reply = {
        "_id": _new_id("msg_"),
        "thread_id": thread_id,
        "role": "assistant",
        "content": (
            f"Quick action completed: {instruction}. "
            "Suggested next step: compare this issue with similar historical incidents."
        ),
        "created_at": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    MESSAGES.append(reply)
    return reply
