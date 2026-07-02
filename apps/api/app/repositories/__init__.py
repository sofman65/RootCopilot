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
from app.repositories.ticket_artifact_repository import TicketArtifactRepository
from app.repositories.analysis_run_repository import AnalysisRunRepository
from app.repositories.chat_repository import (
    ChatThreadRepository,
    ChatMessageRepository,
)
from app.repositories.knowledge_document_repository import KnowledgeDocumentRepository

__all__ = [
    "WorkspaceRepository",
    "IntegrationRepository",
    "ProjectRepository",
    "TicketRepository",
    "TicketCommentRepository",
    "TicketArtifactRepository",
    "AnalysisRunRepository",
    "ChatThreadRepository",
    "ChatMessageRepository",
    "KnowledgeDocumentRepository",
]
