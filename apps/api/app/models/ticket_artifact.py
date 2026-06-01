"""TicketArtifact — logs, stack traces, screenshots, configs attached to a ticket."""

import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket


class TicketArtifact(Base):
    """
    Note: only `created_at` — no `updated_at`. Artifacts are immutable once stored.
    """

    __tablename__ = "ticket_artifacts"
    __table_args__ = (
        CheckConstraint(
            "type IN ('log', 'screenshot', 'stacktrace', 'config', 'other')",
            name="type",
        ),
        CheckConstraint(
            "content IS NOT NULL OR storage_url IS NOT NULL",
            name="content_or_url",
        ),
        Index("idx_artifacts_ticket", "ticket_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="other",
        server_default=text("'other'"),
    )
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    storage_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    ticket: Mapped["Ticket"] = relationship(back_populates="artifacts")
