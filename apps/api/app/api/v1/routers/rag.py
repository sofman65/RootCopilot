from typing import Optional

from fastapi import APIRouter

from app.demo_data import RAG_ENTRIES
from app.utils import _new_id

router = APIRouter()


@router.get("/rag/entries")
def list_rag_entries(namespace: Optional[str] = None):
    if namespace:
        return [e for e in RAG_ENTRIES if e.get("namespace") == namespace]
    return RAG_ENTRIES


@router.post("/rag/documents", status_code=201)
def add_rag_document(payload: dict):
    entry = {
        "entryId": _new_id("rag_"),
        "title": payload.get("name", "Untitled document"),
        "namespace": payload.get("namespace", "default"),
        "createdAt": 1710000000000,
    }
    RAG_ENTRIES.append(entry)
    return entry


@router.post("/rag/ask")
def ask_rag(payload: dict):
    question = payload.get("question", "")
    return {
        "answer": (
            f"RootCopilot analyzed your question: '{question}'. "
            "In the production version, this response will be grounded in "
            "indexed tickets, logs, comments, and previous analyses."
        ),
        "sources": [
            {
                "source_type": "ticket",
                "source_id": "ticket_merchant_config",
                "title": "Transactions fail in UAT for one merchant",
                "score": 0.87,
                "excerpt": "Logs mention missing terminal profile for merchant DEMO-102.",
            }
        ],
    }
