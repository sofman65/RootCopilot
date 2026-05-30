from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.v1.api import api_router
from app.limiter import limiter
from app.llm.config import get_settings
from app.llm.monitoring import get_logger
from app.llm.subsystem import get_subsystem

logger = get_logger("rootcopilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Starting RootCopilot API", extra={"extra_data": {
        "environment": settings.app_env,
        "primary_model": settings.primary_model,
        "use_mock_llm": settings.use_mock_llm,
    }})
    # Eagerly initialise the subsystem so first request doesn't pay the cost
    subsystem = get_subsystem()
    logger.info("LLM subsystem ready", extra={"extra_data": {
        "mock": subsystem.use_mock,
    }})
    yield
    logger.info("Shutting down RootCopilot API", extra={"extra_data": subsystem.metrics.summary})


app = FastAPI(title="RootCopilot API", version="0.2.0", lifespan=lifespan)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning("Rate limit exceeded")
    return JSONResponse(
        status_code=429,
        content={"error": "Rate limit exceeded", "detail": "Too many requests"},
    )


app.include_router(api_router)
