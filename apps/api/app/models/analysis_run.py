"""AnalysisRun — one AI analysis execution per row. Multiple runs per ticket allowed."""

import uuid
from datetime import datetime
from typing import Any, Optional, TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.ticket import Ticket


class AnalysisRun(Base, TimestampMixin):
    __tablename__ = "analysis_runs"
    __table_args__ = (
        CheckConstraint(
            "triggered_by IN ('user', 'auto', 'quick_action')",
            name="triggered_by",
        ),
        CheckConstraint(
            "status IN ('pending', 'running', 'done', 'failed', 'error')",
            name="status",
        ),
        # Most common read: "latest analysis for ticket X"
        Index(
            "idx_analysis_ticket_latest",
            "ticket_id",
            text("created_at DESC"),
        ),
        # Background worker picks up pending/running jobs
        Index(
            "idx_analysis_pending",
            "status",
            "created_at",
            postgresql_where=text("status IN ('pending', 'running')"),
        ),
        # JSONB search on result_json (e.g. filter by confidence)
        Index(
            "idx_analysis_result",
            "result_json",
            postgresql_using="gin",
        ),
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
    triggered_by: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="user",
        server_default=text("'user'"),
    )
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending",
        server_default=text("'pending'"),
    )
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    result_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # MVP: list of SimilarTicketRef dicts. Migrate to own table when cross-run queries are needed.
    similar_tickets: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    input_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    ticket: Mapped["Ticket"] = relationship(back_populates="analysis_runs")
