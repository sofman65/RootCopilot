"""
RAG service — real lexical retrieval over Postgres content + grounded answer.

Corpus: tickets (title + description), ticket comments (body), and uploaded
knowledge documents. Retrieval is a keyword-overlap ranker (no vector store
required for the MVP); the top chunks are handed to the LLM chat path, which
answers grounded strictly in the retrieved context.

The chunk/score contract matches the frontend's RagSource type:
    { chunk, score, doc: { name?, namespace } }
"""

import re
from typing import Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.subsystem import get_subsystem
from app.repositories import (
    KnowledgeDocumentRepository,
    TicketCommentRepository,
    TicketRepository,
)

_TOP_K = 5
_CHUNK_DISPLAY_CHARS = 600

RAG_SYSTEM_PROMPT = (
    "You are RootCopilot's knowledge assistant. Answer the user's question using "
    "ONLY the retrieved context below. Be specific and cite concrete details from "
    "the context. If the context does not contain enough information to answer, say "
    "so plainly and state what would need to be indexed. Never invent facts.\n\n"
    "RETRIEVED CONTEXT:\n"
)

_WORD_RE = re.compile(r"[a-z0-9]+")
# Common words that shouldn't drive retrieval scoring.
_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
    "was", "were", "why", "what", "how", "when", "which", "does", "do", "did",
    "this", "that", "with", "from", "it", "its", "be", "as", "at", "by", "we",
}


def _terms(text: str) -> List[str]:
    return [w for w in _WORD_RE.findall(text.lower()) if w not in _STOPWORDS and len(w) > 2]


def _score(text: str, terms: List[str]) -> float:
    if not terms:
        return 0.0
    tl = text.lower()
    matched = 0
    occurrences = 0
    for term in terms:
        c = tl.count(term)
        if c:
            matched += 1
            occurrences += c
    if matched == 0:
        return 0.0
    # Distinct-term coverage dominates; term frequency is a sublinear tie-breaker.
    raw = matched + min(occurrences, 10) * 0.1
    return min(raw / (len(terms) + 1.0), 1.0)


class _Candidate:
    __slots__ = ("text", "name", "namespace", "score")

    def __init__(self, text: str, name: str, namespace: str):
        self.text = text
        self.name = name
        self.namespace = namespace
        self.score = 0.0


async def _collect_candidates(
    session: AsyncSession, namespace: Optional[str]
) -> List[_Candidate]:
    candidates: List[_Candidate] = []

    tickets = await TicketRepository(session).list()
    ticket_title: Dict = {t.id: t.title for t in tickets}
    for t in tickets:
        body = t.description or ""
        meta = f"(status={t.status}, priority={t.priority}"
        if t.environment:
            meta += f", env={t.environment}"
        if t.component:
            meta += f", component={t.component}"
        meta += ")"
        candidates.append(_Candidate(
            text=f"Ticket: {t.title}. {body} {meta}",
            name=t.title,
            namespace="tickets",
        ))

    for c in await TicketCommentRepository(session).list_all():
        title = ticket_title.get(c.ticket_id, "unknown ticket")
        candidates.append(_Candidate(
            text=c.body,
            name=f"Comment on '{title}' by {c.author}",
            namespace="comments",
        ))

    for d in await KnowledgeDocumentRepository(session).list(namespace):
        candidates.append(_Candidate(
            text=d.content,
            name=d.name,
            namespace=d.namespace,
        ))

    return candidates


async def list_entries(session: AsyncSession, namespace: Optional[str] = None) -> List[dict]:
    docs = await KnowledgeDocumentRepository(session).list(namespace)
    return [
        {
            "entryId": str(d.id),
            "title": d.name,
            "namespace": d.namespace,
            "createdAt": int(d.created_at.timestamp() * 1000) if d.created_at else None,
        }
        for d in docs
    ]


async def add_document(
    session: AsyncSession,
    name: str,
    text: str,
    namespace: str = "default",
) -> dict:
    doc = await KnowledgeDocumentRepository(session).create(
        name=name or "Untitled document",
        content=text or "",
        namespace=namespace or "default",
    )
    return {
        "entryId": str(doc.id),
        "title": doc.name,
        "namespace": doc.namespace,
        "createdAt": int(doc.created_at.timestamp() * 1000) if doc.created_at else None,
    }


async def ask(
    session: AsyncSession,
    question: str,
    namespace: Optional[str] = None,
) -> dict:
    question = (question or "").strip()
    if not question:
        return {"answer": "Please ask a question.", "contexts": []}

    terms = _terms(question)
    candidates = await _collect_candidates(session, namespace)
    for c in candidates:
        c.score = _score(c.text, terms)

    ranked = sorted(
        (c for c in candidates if c.score > 0),
        key=lambda c: c.score,
        reverse=True,
    )[:_TOP_K]

    contexts = [
        {
            "chunk": c.text[:_CHUNK_DISPLAY_CHARS],
            "score": round(c.score, 3),
            "doc": {"name": c.name, "namespace": c.namespace},
        }
        for c in ranked
    ]

    if not ranked:
        return {
            "answer": (
                "I couldn't find any indexed information related to your question. "
                "Try uploading relevant documents, or ask about an existing ticket."
            ),
            "contexts": [],
        }

    context_block = "\n\n".join(
        f"[{i + 1}] ({c.namespace} — {c.name})\n{c.text[:1500]}"
        for i, c in enumerate(ranked)
    )
    result = get_subsystem().chat(
        system_prompt=RAG_SYSTEM_PROMPT + context_block,
        history=[],
        user_message=question,
    )

    return {"answer": result.content, "contexts": contexts}
