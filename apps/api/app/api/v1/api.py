from fastapi import APIRouter

from app.api.v1.routers import (
    health,
    workspace,
    integrations,
    projects,
    tickets,
    comments,
    artifacts,
    analysis,
    search,
    rag,
    legacy,
    llm,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(workspace.router)
api_router.include_router(integrations.router)
api_router.include_router(projects.router)
api_router.include_router(tickets.router)
api_router.include_router(comments.router)
api_router.include_router(artifacts.router)
api_router.include_router(analysis.router)
api_router.include_router(search.router)
api_router.include_router(rag.router)
api_router.include_router(legacy.router)
api_router.include_router(llm.router)
