"""
Copilot chat service — DB-backed conversations grounded in ticket context.

Bridges the thread endpoints and the LLM subsystem:
- get-or-create a thread per ticket
- persist user turns
- build a ticket-grounded system prompt + conversation history
- call the LLM subsystem's free-text chat path
- persist the assistant turn with provenance
"""

from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.models import ChatTurn
from app.llm.subsystem import get_subsystem
from app.models import ChatMessage, ChatThread, Ticket
from app.repositories import (
    ChatMessageRepository,
    ChatThreadRepository,
    TicketCommentRepository,
    TicketRepository,
)

DEFAULT_INSTRUCTION = (
    "Provide an initial root-cause analysis for this ticket: the likely cause, "
    "the key evidence, and the first remediation steps to try."
)

SYSTEM_PROMPT_HEADER = (
    "You are RootCopilot, an expert root-cause analysis assistant embedded in an "
    "incident-triage tool. You help an engineer investigate a specific ticket.\n"
    "Answer conversationally but concisely. Be technical, specific, and actionable. "
    "Ground every claim in the ticket data and conversation below — never invent "
    "details, log lines, or configuration that isn't provided. If the data is "
    "insufficient, say what additional information you would need.\n"
)


def _ticket_context_block(ticket: Ticket, comments: List) -> str:
    parts = ["TICKET UNDER INVESTIGATION:", f"- Title: {ticket.title}"]
    if ticket.description:
        parts.append(f"- Description: {ticket.description}")
    parts.append(f"- Status: {ticket.status}")
    parts.append(f"- Priority: {ticket.priority}")
    if ticket.environment:
        parts.append(f"- Environment: {ticket.environment}")
    if ticket.component:
        parts.append(f"- Component: {ticket.component}")
    if ticket.service_name:
        parts.append(f"- Service: {ticket.service_name}")
    if ticket.client_name:
        parts.append(f"- Client: {ticket.client_name}")
    if ticket.labels:
        parts.append(f"- Labels: {', '.join(ticket.labels)}")

    if comments:
        parts.append("")
        parts.append("EXISTING COMMENTS (most recent first):")
        for c in comments[:5]:
            parts.append(f"- [{c.author}] {c.body}")

    return "\n".join(parts)


async def _build_system_prompt(session: AsyncSession, ticket: Ticket) -> str:
    comments = await TicketCommentRepository(session).list_by_ticket(ticket.id)
    return SYSTEM_PROMPT_HEADER + "\n" + _ticket_context_block(ticket, comments)


async def get_or_create_thread(session: AsyncSession, ticket_id: UUID) -> ChatThread:
    """Return the ticket's conversation, creating it if absent. 404 if no ticket."""
    if not await TicketRepository(session).get_by_id(ticket_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return await ChatThreadRepository(session).get_or_create(ticket_id)


async def get_thread(session: AsyncSession, ticket_id: UUID) -> ChatThread:
    """Return the ticket's existing conversation. 404 if none yet."""
    if not await TicketRepository(session).get_by_id(ticket_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    thread = await ChatThreadRepository(session).get_by_ticket(ticket_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread


async def list_messages(session: AsyncSession, thread_id: UUID) -> List[ChatMessage]:
    if not await ChatThreadRepository(session).get_by_id(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
    return await ChatMessageRepository(session).list_by_thread(thread_id)


async def post_user_message(
    session: AsyncSession,
    thread_id: UUID,
    content: str,
) -> ChatMessage:
    content = (content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Missing content")
    if not await ChatThreadRepository(session).get_by_id(thread_id):
        raise HTTPException(status_code=404, detail="Thread not found")
    return await ChatMessageRepository(session).create(
        thread_id=thread_id, role="user", content=content
    )


async def generate_assistant_reply(
    session: AsyncSession,
    thread_id: UUID,
    instruction: Optional[str] = None,
) -> ChatMessage:
    """
    Produce the assistant's next turn via the LLM, grounded in the ticket.

    If `instruction` is given (quick action) it becomes the prompt and the full
    history is replayed as context. Otherwise the latest user message is used.
    """
    thread_repo = ChatThreadRepository(session)
    thread = await thread_repo.get_by_id(thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    ticket = await TicketRepository(session).get_by_id(thread.ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    message_repo = ChatMessageRepository(session)
    messages = await message_repo.list_by_thread(thread_id)

    if instruction and instruction.strip():
        user_message = instruction.strip()
        history_rows = messages
    else:
        # Use the most recent user turn as the prompt; everything before it is context.
        last_user_idx = next(
            (i for i in range(len(messages) - 1, -1, -1) if messages[i].role == "user"),
            None,
        )
        if last_user_idx is None:
            user_message = DEFAULT_INSTRUCTION
            history_rows = messages
        else:
            user_message = messages[last_user_idx].content
            history_rows = messages[:last_user_idx]

    history = [ChatTurn(role=m.role, content=m.content) for m in history_rows]
    system_prompt = await _build_system_prompt(session, ticket)

    result = get_subsystem().chat(
        system_prompt=system_prompt,
        history=history,
        user_message=user_message,
    )

    return await message_repo.create(
        thread_id=thread_id,
        role="assistant",
        content=result.content,
        model=result.model,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        latency_ms=result.latency_ms,
    )
