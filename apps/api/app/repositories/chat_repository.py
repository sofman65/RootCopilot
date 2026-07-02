"""ChatThreadRepository + ChatMessageRepository — Copilot conversations."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select

from app.models import ChatMessage, ChatThread
from app.repositories.base import BaseRepository


class ChatThreadRepository(BaseRepository):
    async def get_by_id(self, thread_id: UUID) -> Optional[ChatThread]:
        return await self.session.get(ChatThread, thread_id)

    async def get_by_ticket(self, ticket_id: UUID) -> Optional[ChatThread]:
        r = await self.session.execute(
            select(ChatThread).where(ChatThread.ticket_id == ticket_id)
        )
        return r.scalar_one_or_none()

    async def create(self, ticket_id: UUID) -> ChatThread:
        thread = ChatThread(ticket_id=ticket_id)
        self.session.add(thread)
        await self.session.flush()
        return thread

    async def get_or_create(self, ticket_id: UUID) -> ChatThread:
        existing = await self.get_by_ticket(ticket_id)
        if existing is not None:
            return existing
        return await self.create(ticket_id)


class ChatMessageRepository(BaseRepository):
    async def list_by_thread(self, thread_id: UUID) -> List[ChatMessage]:
        r = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at)
        )
        return list(r.scalars().all())

    async def create(
        self,
        thread_id: UUID,
        role: str,
        content: str,
        model: Optional[str] = None,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        latency_ms: Optional[int] = None,
    ) -> ChatMessage:
        message = ChatMessage(
            thread_id=thread_id,
            role=role,
            content=content,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
        )
        self.session.add(message)
        await self.session.flush()
        return message

    async def search(self, query: str, limit: int = 20) -> List[ChatMessage]:
        r = await self.session.execute(
            select(ChatMessage)
            .where(ChatMessage.content.ilike(f"%{query}%"))
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        return list(r.scalars().all())
