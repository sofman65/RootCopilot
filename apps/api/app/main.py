from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.demo_data import (
    clients,
    environments,
    issues,
    messages,
    projects,
    rag_entries,
    threads,
)

app = FastAPI(title="RootCopilot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/clients")
def list_clients():
    return clients


@app.get("/clients/{client_id}/projects")
def list_projects(client_id: str):
    return [p for p in projects if p["client_id"] == client_id]


@app.get("/projects/{project_id}/environments")
def list_environments(project_id: str):
    return [e for e in environments if e["project_id"] == project_id]


@app.get("/environments/{environment_id}/issues")
def list_issues(environment_id: str):
    return [i for i in issues if i["environment_id"] == environment_id]


@app.get("/issues/{issue_id}")
def get_issue(issue_id: str):
    issue = next((i for i in issues if i["_id"] == issue_id), None)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@app.get("/search")
def search(term: str = ""):
    q = term.lower().strip()

    matched_issues = [
        i
        for i in issues
        if q in i["title"].lower()
        or q in i.get("description", "").lower()
        or q in i.get("environment", "").lower()
        or q in i.get("breadcrumb", "").lower()
    ]

    matched_messages = [m for m in messages if q in m["content"].lower()]

    return {
        "issues": matched_issues,
        "messages": matched_messages,
    }


@app.get("/issues/{issue_id}/thread")
def get_thread_by_issue(issue_id: str):
    thread = next((t for t in threads if t["issue_id"] == issue_id), None)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


@app.post("/issues/{issue_id}/thread")
def create_thread(issue_id: str):
    existing = next((t for t in threads if t["issue_id"] == issue_id), None)
    if existing:
        return existing

    new_thread = {
        "_id": f"thread_{issue_id}",
        "issue_id": issue_id,
    }
    threads.append(new_thread)
    return new_thread


@app.get("/threads/{thread_id}/messages")
def list_thread_messages(thread_id: str):
    return [m for m in messages if m["thread_id"] == thread_id]


@app.post("/threads/{thread_id}/messages")
def send_thread_message(thread_id: str, payload: dict):
    content = payload.get("content")
    if not content:
        raise HTTPException(status_code=400, detail="Missing content")

    msg = {
        "_id": f"msg_{len(messages) + 1}",
        "thread_id": thread_id,
        "role": "user",
        "content": content,
        "created_at": 1710000000000 + len(messages) * 1000,
    }
    messages.append(msg)
    return msg


@app.post("/threads/{thread_id}/assistant/reply")
def assistant_reply(thread_id: str):
    reply = {
        "_id": f"msg_{len(messages) + 1}",
        "thread_id": thread_id,
        "role": "assistant",
        "content": (
            "Based on similar historical issues, this looks like a configuration-related failure. "
            "Check environment-specific setup, recent changes, and related merchant/service mappings."
        ),
        "created_at": 1710000000000 + len(messages) * 1000,
    }
    messages.append(reply)
    return reply


@app.post("/threads/{thread_id}/quick-action-message")
def quick_action_message(thread_id: str, payload: dict):
    instruction = payload.get("instruction", "Run quick action")
    msg = {
        "_id": f"msg_{len(messages) + 1}",
        "thread_id": thread_id,
        "role": "user",
        "content": instruction,
        "created_at": 1710000000000 + len(messages) * 1000,
    }
    messages.append(msg)
    return msg


@app.post("/threads/{thread_id}/assistant/quick-action")
def assistant_quick_action(thread_id: str, payload: dict):
    instruction = payload.get("instruction", "quick action")
    reply = {
        "_id": f"msg_{len(messages) + 1}",
        "thread_id": thread_id,
        "role": "assistant",
        "content": f"Quick action completed: {instruction}. Suggested next step: compare this issue with similar historical incidents.",
        "created_at": 1710000000000 + len(messages) * 1000,
    }
    messages.append(reply)
    return reply


@app.get("/rag/entries")
def list_rag_entries(namespace: Optional[str] = None):
    if namespace:
        return [e for e in rag_entries if e.get("namespace") == namespace]
    return rag_entries


@app.post("/rag/documents")
def add_rag_document(payload: dict):
    entry = {
        "entryId": f"rag_{len(rag_entries) + 1}",
        "title": payload.get("name", "Untitled document"),
        "namespace": payload.get("namespace", "default"),
        "createdAt": 1710000000000,
    }
    rag_entries.append(entry)
    return entry


@app.post("/rag/ask")
def ask_rag(payload: dict):
    question = payload.get("question", "")

    return {
        "answer": (
            f"RootCopilot analyzed your question: '{question}'. "
            "In the production version, this response will be grounded in indexed tickets, logs, comments, and previous analyses."
        ),
        "contexts": [
            {
                "chunk": "Historical UAT issues often relate to missing configuration or environment-specific setup.",
                "score": 0.87,
                "doc": {
                    "name": "Demo incident knowledge base",
                    "namespace": payload.get("namespace", "default"),
                },
            }
        ],
    }
