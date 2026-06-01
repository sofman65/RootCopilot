"""
SQLAlchemy models for RootCopilot.

Importing this package registers all tables with Base.metadata,
which is what Alembic autogenerate inspects.
"""

from app.db import Base
from app.models.workspace import Workspace
from app.models.integration import Integration
from app.models.project import Project
from app.models.ticket import Ticket
from app.models.ticket_comment import TicketComment
from app.models.ticket_artifact import TicketArtifact
from app.models.analysis_run import AnalysisRun

__all__ = [
    "Base",
    "Workspace",
    "Integration",
    "Project",
    "Ticket",
    "TicketComment",
    "TicketArtifact",
    "AnalysisRun",
]
