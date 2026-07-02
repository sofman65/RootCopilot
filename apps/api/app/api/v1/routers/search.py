"""Search — DB-backed via search_service (tickets, comments, chat messages)."""

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas import SearchResponse
from app.services import search_service

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
async def search(
    q: Optional[str] = None,
    term: Optional[str] = None,
    scope: Optional[str] = "all",
    session: AsyncSession = Depends(get_session),
):
    return await search_service.search(session, q or term)
