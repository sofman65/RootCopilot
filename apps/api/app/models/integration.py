"""Integration — connection to an external ticket system."""

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
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.project import Project
    from app.models.ticket import Ticket


class Integration(Base, TimestampMixin):
    __tablename__ = "integrations"
    __table_args__ = (
        CheckConstraint("type IN ('manual', 'jira', 'azure_devops')", name="type"),
        CheckConstraint("status IN ('active', 'paused', 'error')", name="status"),
        Index("idx_integrations_workspace", "workspace_id"),
        Index("idx_integrations_type", "type", "workspace_id"),
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
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    config: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    # AES-256-GCM ciphertext (base64). NEVER returned in API responses.
    credentials_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",
        server_default=text("'active'"),
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    workspace: Mapped["Workspace"] = relationship(back_populates="integrations")
    projects: Mapped[List["Project"]] = relationship(
        back_populates="integration",
        passive_deletes=True,  # RESTRICT enforced at DB level
    )
    tickets: Mapped[List["Ticket"]] = relationship(
        back_populates="integration",
        passive_deletes=True,  # SET NULL at DB level
    )
