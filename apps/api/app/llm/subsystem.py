"""
LLM Subsystem orchestrator.

Wires SecurityPipeline + ResponseCache + AnalysisAgent + MetricsCollector
into a single analyze() pipeline. One global instance, accessed via
get_subsystem() and initialised in the FastAPI lifespan.
"""

import hashlib
from typing import Optional

from fastapi import HTTPException

from app.llm.agent import AnalysisAgent, MockAnalysisAgent
from app.llm.cache import ResponseCache
from app.llm.config import get_settings
from app.llm.models import LLMRequest, LLMResponse, UsageMetrics
from app.llm.monitoring import MetricsCollector, RequestTimer, get_logger
from app.llm.security import SecurityPipeline

logger = get_logger("rootcopilot.llm")


def _cache_key(request: LLMRequest, ticket_updated_at: Optional[str]) -> str:
    """
    Cache key is sha256(ticket_id + ticket_updated_at + instruction).
    Cache invalidates automatically if the ticket data changes.
    """
    signature = "|".join([
        request.context.ticket_id,
        ticket_updated_at or "",
        request.instruction,
    ])
    return hashlib.sha256(signature.encode()).hexdigest()


class LLMSubsystem:
    """
    Production wrapper around the analysis agent.
    Owns SecurityPipeline, ResponseCache, MetricsCollector, AnalysisAgent.
    """

    def __init__(self):
        settings = get_settings()
        self.security = SecurityPipeline()
        self.cache = ResponseCache(ttl_seconds=settings.cache_ttl_seconds)
        self.metrics = MetricsCollector()
        self.agent = MockAnalysisAgent() if settings.use_mock_llm else AnalysisAgent()
        self.use_mock = settings.use_mock_llm

        logger.info("LLMSubsystem initialised", extra={"extra_data": {
            "mock": settings.use_mock_llm,
            "primary_model": getattr(self.agent, "primary_model_name", "unknown"),
            "fallback_provider": getattr(self.agent, "fallback_provider_name", None),
        }})

    def analyze(self, request: LLMRequest, ticket_updated_at: Optional[str] = None) -> LLMResponse:
        with RequestTimer() as timer:
            # 1) Security: scan input
            is_allowed, cleaned_instruction, sec_notes = self.security.check_input(request.instruction)
            if not is_allowed:
                self.metrics.record_request(latency_ms=0, error=True)
                logger.warning("Analysis blocked by security", extra={"extra_data": {
                    "ticket_id": request.context.ticket_id,
                    "notes": sec_notes,
                }})
                raise HTTPException(status_code=400, detail="Instruction blocked by security filters")

            # 2) Cache lookup
            key = _cache_key(request, ticket_updated_at)
            cached_raw = self.cache.get(key)
            if cached_raw is not None:
                self.metrics.record_request(latency_ms=0, cache_hit=True)
                logger.info("Cache hit", extra={"extra_data": {
                    "ticket_id": request.context.ticket_id,
                }})
                cached = LLMResponse.model_validate_json(cached_raw)
                cached.cached = True
                return cached

            # 3) Agent call
            try:
                agent_out = self.agent.analyze(request.context, cleaned_instruction)
            except Exception as e:
                self.metrics.record_request(latency_ms=0, error=True)
                logger.error("Agent invocation failed", extra={"extra_data": {
                    "ticket_id": request.context.ticket_id,
                    "error": str(e),
                }})
                raise HTTPException(status_code=500, detail="Analysis failed")

            if agent_out.get("error") and agent_out.get("result") is None:
                self.metrics.record_request(latency_ms=0, error=True)
                logger.error("LLM returned error", extra={"extra_data": {
                    "ticket_id": request.context.ticket_id,
                    "error": agent_out["error"],
                }})
                raise HTTPException(status_code=502, detail="LLM provider error")

            result_json = agent_out["result"]
            model_used = agent_out["model_used"]
            input_tokens = agent_out.get("input_tokens", 0) or int(len(cleaned_instruction.split()) * 1.3)
            content = result_json.model_dump_json()
            output_tokens = agent_out.get("output_tokens", 0) or int(len(content.split()) * 1.3)

            # 4) Security: scan output
            validated_content, output_notes = self.security.check_output(content)

            # 5) Compose response
            model_name = self._resolve_model_name(model_used)
            usage = UsageMetrics(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                latency_ms=int(getattr(timer, "elapsed_ms", 0) or 0),
                model=model_name,
            )
            response = LLMResponse(
                content=validated_content,
                result_json=result_json,
                usage=usage,
                cached=False,
                provider=model_used,
            )

        # 6) Cache + metrics (outside timer)
        self.cache.set(key, response.model_dump_json())
        self.metrics.record_request(
            latency_ms=timer.elapsed_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cache_hit=False,
        )

        notes = sec_notes + output_notes
        if notes:
            logger.info("Security notes", extra={"extra_data": {
                "ticket_id": request.context.ticket_id,
                "notes": notes,
            }})
        logger.info("Analysis complete", extra={"extra_data": {
            "ticket_id": request.context.ticket_id,
            "model": model_used,
            "latency_ms": round(timer.elapsed_ms, 2),
        }})
        return response

    def _resolve_model_name(self, model_used: str) -> str:
        if model_used == "anthropic":
            return getattr(self.agent, "primary_model_name", "anthropic")
        if model_used == "openai":
            return getattr(self.agent, "fallback_model_name", "openai")
        return "mock-model"


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_subsystem: Optional[LLMSubsystem] = None


def get_subsystem() -> LLMSubsystem:
    global _subsystem
    if _subsystem is None:
        _subsystem = LLMSubsystem()
    return _subsystem


def reset_subsystem() -> None:
    """Drop the cached instance — only used in tests."""
    global _subsystem
    _subsystem = None
