"""KnowledgeDocument — a user-uploaded document indexed for RAG retrieval.

The MVP retriever is lexical (keyword overlap) and reads `content` directly,
so no separate vector store is required. A chunk/embedding column can be added
later without changing the API surface.
"""

import uuid

from sqlalchemy import Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.mixins import TimestampMixin


class KnowledgeDocument(Base, TimestampMixin):
    __tablename__ = "knowledge_documents"
    __table_args__ = (
        Index("idx_knowledge_documents_namespace", "namespace", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    namespace: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="default",
        server_default=text("'default'"),
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
