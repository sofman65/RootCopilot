"""
RootCopilot chat agent.

Free-text conversational completions (Copilot threads + RAG answers),
distinct from the structured-output AnalysisAgent. Anthropic primary with
OpenAI fallback, mirroring the analysis agent's provider strategy.

Two implementations:
- ChatAgent:     real LLM calls (production)
- MockChatAgent: deterministic, no network (tests / offline dev)
"""

from typing import Any, List, Sequence, Tuple

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langsmith import traceable

from app.llm.config import get_settings
from app.llm.models import ChatTurn


def _to_lc_messages(
    system_prompt: str,
    history: Sequence[ChatTurn],
    user_message: str,
) -> list:
    messages: list = [SystemMessage(content=system_prompt)]
    for turn in history:
        if turn.role == "assistant":
            messages.append(AIMessage(content=turn.content))
        else:
            messages.append(HumanMessage(content=turn.content))
    messages.append(HumanMessage(content=user_message))
    return messages


class ChatAgent:
    """Production chat agent: Anthropic → OpenAI fallback, free-text output."""

    def __init__(self):
        settings = get_settings()

        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is required to instantiate ChatAgent. "
                "Set it in .env or use USE_MOCK_LLM=true for tests."
            )

        self.primary_model_name = settings.primary_model
        self.max_retries = settings.max_retries

        self.primary = ChatAnthropic(
            model=settings.primary_model,
            temperature=0.3,
            timeout=30,
            max_retries=0,
            api_key=settings.anthropic_api_key,
        )

        if settings.openai_api_key:
            self.fallback = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.3,
                timeout=30,
                max_retries=0,
                api_key=settings.openai_api_key,
            )
            self.fallback_model_name = "gpt-4o-mini"
        else:
            self.fallback = None
            self.fallback_model_name = ""

    def _invoke(
        self, llm: Any, messages: list
    ) -> Tuple[str, int, int]:
        raw = llm.invoke(messages)
        usage = getattr(raw, "usage_metadata", None) or {}
        content = raw.content if isinstance(raw.content, str) else str(raw.content)
        return (
            content.strip(),
            int(usage.get("input_tokens", 0)),
            int(usage.get("output_tokens", 0)),
        )

    @traceable(name="chat_agent_reply")
    def reply(
        self,
        system_prompt: str,
        history: List[ChatTurn],
        user_message: str,
    ) -> dict:
        messages = _to_lc_messages(system_prompt, history, user_message)
        try:
            content, in_tok, out_tok = self._invoke(self.primary, messages)
            return {
                "content": content,
                "model_used": "anthropic",
                "model_name": self.primary_model_name,
                "input_tokens": in_tok,
                "output_tokens": out_tok,
            }
        except Exception as primary_error:
            if self.fallback is None:
                raise primary_error
            content, in_tok, out_tok = self._invoke(self.fallback, messages)
            return {
                "content": content,
                "model_used": "openai",
                "model_name": self.fallback_model_name,
                "input_tokens": in_tok,
                "output_tokens": out_tok,
            }


class MockChatAgent:
    """Deterministic chat agent — echoes context awareness. No network calls."""

    primary_model_name = "mock-model"
    fallback_model_name = "mock-model"

    def reply(
        self,
        system_prompt: str,
        history: List[ChatTurn],
        user_message: str,
    ) -> dict:
        content = (
            "Based on the ticket context and this conversation, the most likely "
            "cause is an environment- or configuration-specific issue. "
            f'Regarding "{user_message.strip()[:120]}": review the environment '
            "setup, compare against a known-good environment, and check recent "
            "deployments or configuration changes for the affected component."
        )
        return {
            "content": content,
            "model_used": "mock",
            "model_name": "mock-model",
            "input_tokens": 0,
            "output_tokens": 0,
        }
