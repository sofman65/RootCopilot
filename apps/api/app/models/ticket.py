"""Ticket — central entity. Bug, incident, or work item from any source."""

import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.project import Project
    from app.models.integration import Integration
    from app.models.ticket_comment import TicketComment
    from app.models.ticket_artifact import TicketArtifact
    from app.models.analysis_run import AnalysisRun


class Ticket(Base, TimestampMixin):
    __tablename__ = "tickets"
    __table_args__ = (
        CheckConstraint(
            "source_system IN ('manual', 'jira', 'azure_devops')",
            name="source_system",
        ),
        # Filtering indexes
        Index("idx_tickets_workspace", "workspace_id"),
        Index("idx_tickets_project", "project_id"),
        Index("idx_tickets_integration", "integration_id"),
        Index("idx_tickets_status", "status", "priority"),
        # Workspace tree query
        Index("idx_tickets_tree", "workspace_id", "client_name", "environment"),
        # Label search (GIN on TEXT[])
        Index("idx_tickets_labels", "labels", postgresql_using="gin"),
        # Full-text search
        Index(
            "idx_tickets_fts",
            text("to_tsvector('english', title || ' ' || coalesce(description, ''))"),
            postgresql_using="gin",
        ),
        # Partial unique: same external_id can't repeat per integration,
        # but NULL is allowed any number of times (manual tickets).
        Index(
            "uq_tickets_integration_external_id",
            "integration_id",
            "external_id",
            unique=True,
            postgresql_where=text("external_id IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    # SET NULL: deleting an integration (rare — only after pause) leaves tickets intact.
    integration_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("integrations.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Source provenance
    source_system: Mapped[str] = mapped_column(String(50), nullable=False)
    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    external_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    source_updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    # Content
    title: Mapped[str] = mapped_column(String(1000), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Open",
        server_default=text("'Open'"),
    )
    priority: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Medium",
        server_default=text("'Medium'"),
    )

    # Grouping metadata (drives workspace tree)
    client_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    environment: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    component: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    service_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    area_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    labels: Mapped[List[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        default=list,
        server_default=text("'{}'::text[]"),
    )

    # People
    assignee: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reporter: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    workspace: Mapped["Workspace"] = relationship(back_populates="tickets")
    project: Mapped["Project"] = relationship(back_populates="tickets")
    integration: Mapped[Optional["Integration"]] = relationship(
        back_populates="tickets",
        passive_deletes=True,
    )
    comments: Mapped[List["TicketComment"]] = relationship(
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketComment.created_at.desc()",
    )
    artifacts: Mapped[List["TicketArtifact"]] = relationship(
        back_populates="ticket",
        cascade="all, delete-orphan",
    )
    analysis_runs: Mapped[List["AnalysisRun"]] = relationship(
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="AnalysisRun.created_at.desc()",
    )
