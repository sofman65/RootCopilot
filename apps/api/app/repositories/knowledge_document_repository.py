"""KnowledgeDocumentRepository — list + create RAG-indexed documents."""

from typing import List, Optional

from sqlalchemy import select

from app.models import KnowledgeDocument
from app.repositories.base import BaseRepository


class KnowledgeDocumentRepository(BaseRepository):
    async def list(self, namespace: Optional[str] = None) -> List[KnowledgeDocument]:
        stmt = select(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc())
        if namespace:
            stmt = stmt.where(KnowledgeDocument.namespace == namespace)
        r = await self.session.execute(stmt)
        return list(r.scalars().all())

    async def create(
        self,
        name: str,
        content: str,
        namespace: str = "default",
    ) -> KnowledgeDocument:
        doc = KnowledgeDocument(name=name, content=content, namespace=namespace)
        self.session.add(doc)
        await self.session.flush()
        return doc
