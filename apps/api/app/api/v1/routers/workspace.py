from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.repositories import WorkspaceRepository

router = APIRouter()


@router.get("/workspace/current")
async def workspace_current(session: AsyncSession = Depends(get_session)):
    ws = await WorkspaceRepository(session).get_current()
    if ws is None:
        raise HTTPException(status_code=404, detail="No workspace found")
    return {
        "id": str(ws.id),
        "name": ws.name,
        "created_at": ws.created_at.isoformat() if ws.created_at else None,
        "updated_at": ws.updated_at.isoformat() if ws.updated_at else None,
    }


@router.get("/workspace/tree")
async def workspace_tree(session: AsyncSession = Depends(get_session)):
    repo = WorkspaceRepository(session)
    ws = await repo.get_current()
    if ws is None:
        return {"clients": []}
    return await repo.get_tree(ws.id)
