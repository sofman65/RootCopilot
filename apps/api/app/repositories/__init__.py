"""
Repository layer — thin abstraction over SQLAlchemy queries.

One repository per aggregate. Services compose multiple repositories;
repositories never call each other. Each repository takes an AsyncSession
in its constructor and exposes domain operations (no raw SQL leaks out).
"""

from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.integration_repository import IntegrationRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.ticket_repository import TicketRepository
from app.repositories.ticket_comment_repository import TicketCommentRepository
from app.repositories.analysis_run_repository import AnalysisRunRepository

__all__ = [
    "WorkspaceRepository",
    "IntegrationRepository",
    "ProjectRepository",
    "TicketRepository",
    "TicketCommentRepository",
    "AnalysisRunRepository",
]
