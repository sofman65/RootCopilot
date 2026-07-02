"""RAG — DB-backed retrieval + grounded answer via rag_service."""

from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.limiter import limiter
from app.services import rag_service

router = APIRouter()


@router.get("/rag/entries")
async def list_rag_entries(
    namespace: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    return await rag_service.list_entries(session, namespace)


@router.post("/rag/documents", status_code=201)
async def add_rag_document(payload: dict, session: AsyncSession = Depends(get_session)):
    return await rag_service.add_document(
        session,
        name=payload.get("name", "Untitled document"),
        text=payload.get("text", ""),
        namespace=payload.get("namespace", "default"),
    )


@router.post("/rag/ask")
@limiter.limit("20/minute")
async def ask_rag(
    request: Request,
    payload: dict,
    session: AsyncSession = Depends(get_session),
):
    return await rag_service.ask(
        session,
        question=payload.get("question", ""),
        namespace=payload.get("namespace"),
    )
