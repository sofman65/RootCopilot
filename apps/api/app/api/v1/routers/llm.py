"""
LLM subsystem observability endpoints: health, metrics, cache stats.
"""

from fastapi import APIRouter

from app.llm.config import get_settings
from app.llm.subsystem import get_subsystem
from app.llm.models import HealthResponse, MetricsResponse

router = APIRouter(prefix="/llm")


@router.get("/health", response_model=HealthResponse)
def llm_health():
    settings = get_settings()
    s = get_subsystem()
    checks = {
        "security": s.security is not None,
        "cache": s.cache is not None,
        "agent": s.agent is not None,
        "metrics": s.metrics is not None,
        "mock_mode": s.use_mock,
    }
    healthy = all(v for k, v in checks.items() if k != "mock_mode")
    return HealthResponse(
        status="healthy" if healthy else "degraded",
        environment=settings.app_env,
        checks=checks,
    )


@router.get("/metrics", response_model=MetricsResponse)
def llm_metrics():
    return MetricsResponse(**get_subsystem().metrics.summary)


@router.get("/cache/stats")
def llm_cache_stats():
    return get_subsystem().cache.stats
