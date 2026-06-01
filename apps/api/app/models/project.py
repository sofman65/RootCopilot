"""Project — logical grouping of tickets, mapped from source system projects."""

import uuid
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.integration import Integration
    from app.models.ticket import Ticket


class Project(Base, TimestampMixin):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint(
            "integration_id",
            "external_id",
            name="uq_projects_integration_external_id",
        ),
        Index("idx_projects_workspace", "workspace_id"),
        Index("idx_projects_integration", "integration_id"),
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
    # RESTRICT: integrations with projects cannot be deleted — only paused.
    integration_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("integrations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    workspace: Mapped["Workspace"] = relationship(back_populates="projects")
    integration: Mapped["Integration"] = relationship(back_populates="projects")
    tickets: Mapped[List["Ticket"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
    )
