"""
Internal Pydantic models for the LLM subsystem.

Boundary rule:
  app/schemas/  →  API contract (what routers send/receive)
  app/llm/models.py  →  LLM plumbing (what flows inside the subsystem)

AnalysisResultJson and SimilarTicketRef are imported from schemas — not redefined here.
"""

from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from app.schemas.analysis import AnalysisResultJson, SimilarTicketRef


# ---------------------------------------------------------------------------
# Context passed into the prompt builder
# ---------------------------------------------------------------------------


class AnalysisContext(BaseModel):
    """Structured ticket data injected into the LLM prompt."""

    ticket_id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    environment: Optional[str] = None
    component: Optional[str] = None
    service_name: Optional[str] = None
    client_name: Optional[str] = None
    labels: List[str] = Field(default_factory=list)
    similar_tickets: List[SimilarTicketRef] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# What gets sent to the provider
# ---------------------------------------------------------------------------


class LLMRequest(BaseModel):
    """Everything needed to make a single LLM call."""

    context: AnalysisContext
    instruction: str = Field(..., min_length=1, max_length=10000, description="Prompt instruction for the LLM")
    model: str = ""  # the agent chooses based on config; service callers don't set this
    max_tokens: int = 1024
    temperature: float = 0.2
    triggered_by: str = "user"


# ---------------------------------------------------------------------------
# Token usage + latency (feeds monitoring.py)
# ---------------------------------------------------------------------------


class UsageMetrics(BaseModel):
    input_tokens: int
    output_tokens: int
    latency_ms: int
    model: str
    estimated_cost_usd: Optional[float] = None


# ---------------------------------------------------------------------------
# Raw response from the provider (feeds cache.py and routers)
# ---------------------------------------------------------------------------


class LLMResponse(BaseModel):
    """Provider response after parsing."""

    content: str                                       # raw text output
    result_json: Optional[AnalysisResultJson] = None  # parsed structured result
    usage: UsageMetrics
    cached: bool = False
    provider: str                                      # "anthropic" | "openai"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Health check (used by health router + monitoring.py)
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """LLM subsystem health check response."""
    status: str = "healthy"           # "healthy" | "degraded" | "unhealthy"
    environment: str
    version: str = "0.2.0"
    checks: dict = Field(default_factory=dict)  # e.g. {"anthropic": "ok", "cache": "ok"}


# ---------------------------------------------------------------------------
# Aggregated metrics (used by monitoring.py + a future /metrics endpoint)
# ---------------------------------------------------------------------------

class MetricsResponse(BaseModel):
    """Metrics endpoint response."""
    total_requests: int
    total_errors: int
    error_rate: str                   # e.g. "2.50%"
    avg_latency_ms: float
    cache_hit_rate: str               # e.g. "40.00%"
    total_input_tokens: int
    total_output_tokens: int


# ---------------------------------------------------------------------------
# Standard error shape (used across the subsystem)
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    """Standard error response for LLM subsystem failures."""
    error: str
    detail: Optional[str] = None
    request_id: Optional[str] = None  # correlates to a specific LLM call for tracing


# ---------------------------------------------------------------------------
# Cache entry shape (used by cache.py)
# ---------------------------------------------------------------------------


class CacheEntry(BaseModel):
    key: str
    response: LLMResponse
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ttl_seconds: int
    hits: int = 0
