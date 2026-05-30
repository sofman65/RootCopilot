"""
RootCopilot analysis agent.

LangGraph state machine: Anthropic primary → OpenAI fallback,
structured output via Pydantic schema (AnalysisResultJson).

Two implementations:
- AnalysisAgent:     real LLM calls (production)
- MockAnalysisAgent: deterministic, no network (tests / offline dev)
"""

from typing import Optional, Any, Dict
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, START, END
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langsmith import traceable

from app.llm.config import get_settings
from app.llm.models import AnalysisContext
from app.schemas.analysis import AnalysisResultJson


SYSTEM_PROMPT = (
    "You are RootCopilot, an expert root-cause analysis assistant for incident tickets.\n"
    "You analyze structured ticket data and return a JSON response with:\n"
    "- summary: one-sentence restatement of the issue\n"
    "- likely_root_cause: most probable cause from context + similar tickets\n"
    "- confidence: 'high' | 'medium' | 'low'\n"
    "- evidence: array of strings — supporting facts from the ticket data\n"
    "- suggested_steps: array of strings — ordered remediation steps\n"
    "- stakeholder_summary: one-sentence non-technical summary\n\n"
    "Always reason from provided context. Never invent details.\n\n"
    "IMPORTANT: Respond ONLY with a valid JSON object. "
    "No markdown fences, no explanation, no extra text — just the JSON."
)


def _build_user_prompt(context: AnalysisContext, instruction: str) -> str:
    parts = [f"INSTRUCTION: {instruction}", "", "TICKET DATA:"]
    parts.append(f"- ID: {context.ticket_id}")
    parts.append(f"- Title: {context.title}")
    if context.description:
        parts.append(f"- Description: {context.description}")
    parts.append(f"- Status: {context.status}")
    parts.append(f"- Priority: {context.priority}")
    if context.environment:
        parts.append(f"- Environment: {context.environment}")
    if context.component:
        parts.append(f"- Component: {context.component}")
    if context.service_name:
        parts.append(f"- Service: {context.service_name}")
    if context.client_name:
        parts.append(f"- Client: {context.client_name}")
    if context.labels:
        parts.append(f"- Labels: {', '.join(context.labels)}")

    if context.similar_tickets:
        parts.append("")
        parts.append("SIMILAR PAST TICKETS:")
        for st in context.similar_tickets:
            parts.append(f"- [{st.score:.2f}] {st.title}")
            if st.explanation:
                parts.append(f"  {st.explanation}")

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# LangGraph state
# ---------------------------------------------------------------------------

class _AgentState(TypedDict):
    context: AnalysisContext
    instruction: str
    result: Optional[AnalysisResultJson]
    error: Optional[str]
    model_used: str          # "anthropic" | "openai" | ""
    input_tokens: int
    output_tokens: int
    retries: int


# ---------------------------------------------------------------------------
# Real LLM agent (Anthropic primary, OpenAI fallback)
# ---------------------------------------------------------------------------

class AnalysisAgent:
    """Production LangGraph agent: Anthropic → OpenAI fallback, structured output."""

    def __init__(self):
        settings = get_settings()

        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is required to instantiate AnalysisAgent. "
                "Set it in .env or use USE_MOCK_LLM=true for tests."
            )

        self.primary_model_name = settings.primary_model
        self.fallback_provider_name = "openai" if settings.openai_api_key else None
        self.max_retries = settings.max_retries

        self.primary = ChatAnthropic(
            model=settings.primary_model,
            temperature=0,
            timeout=30,
            max_retries=0,
            api_key=settings.anthropic_api_key,
        )

        if settings.openai_api_key:
            self.fallback = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0,
                timeout=30,
                max_retries=0,
                api_key=settings.openai_api_key,
            )
            self.fallback_model_name = "gpt-4o-mini"
        else:
            self.fallback = None
            self.fallback_model_name = ""

        self.graph = self._build_graph()

    def _invoke_llm(self, llm: Any, context: AnalysisContext, instruction: str) -> Dict[str, Any]:
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=_build_user_prompt(context, instruction)),
        ]
        raw = llm.invoke(messages)
        content = raw.content

        # Strip markdown fences if the model wrapped the JSON anyway
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        parsed = AnalysisResultJson.model_validate_json(content)
        usage = getattr(raw, "usage_metadata", None) or {}
        return {
            "parsed": parsed,
            "input_tokens": int(usage.get("input_tokens", 0)),
            "output_tokens": int(usage.get("output_tokens", 0)),
        }

    def _build_graph(self):
        def call_primary(state: _AgentState) -> dict:
            try:
                r = self._invoke_llm(self.primary, state["context"], state["instruction"])
                return {
                    "result": r["parsed"],
                    "error": None,
                    "model_used": "anthropic",
                    "input_tokens": r["input_tokens"],
                    "output_tokens": r["output_tokens"],
                }
            except Exception as e:
                return {"error": str(e), "retries": state["retries"] + 1}

        def call_fallback(state: _AgentState) -> dict:
            if self.fallback is None:
                return {"error": "No fallback model configured"}
            try:
                r = self._invoke_llm(self.fallback, state["context"], state["instruction"])
                return {
                    "result": r["parsed"],
                    "error": None,
                    "model_used": "openai",
                    "input_tokens": r["input_tokens"],
                    "output_tokens": r["output_tokens"],
                }
            except Exception as e:
                return {"error": str(e)}

        def route_after_primary(state: _AgentState) -> str:
            if state.get("error") is None:
                return "done"
            if state["retries"] < self.max_retries and self.fallback is not None:
                return "fallback"
            return "done"

        g = StateGraph(_AgentState)
        g.add_node("primary", call_primary)
        g.add_node("fallback", call_fallback)
        g.add_edge(START, "primary")
        g.add_conditional_edges("primary", route_after_primary, {"done": END, "fallback": "fallback"})
        g.add_edge("fallback", END)
        return g.compile()

    @traceable(name="analysis_agent_invoke")
    def analyze(self, context: AnalysisContext, instruction: str) -> dict:
        return self.graph.invoke({
            "context": context,
            "instruction": instruction,
            "result": None,
            "error": None,
            "model_used": "",
            "input_tokens": 0,
            "output_tokens": 0,
            "retries": 0,
        })


# ---------------------------------------------------------------------------
# Mock agent (tests, offline development)
# ---------------------------------------------------------------------------

class MockAnalysisAgent:
    """Deterministic agent — returns canned analysis. No network calls."""

    primary_model_name = "mock-model"
    fallback_model_name = "mock-model"
    fallback_provider_name = None

    def analyze(self, context: AnalysisContext, instruction: str) -> dict:
        result = AnalysisResultJson(
            summary=context.title,
            likely_root_cause="Configuration or environment-specific setup issue.",
            confidence="medium",
            evidence=[
                "Issue is isolated to one environment.",
                "Description references a specific configuration artifact.",
                "Similar historical tickets were configuration-related.",
            ],
            suggested_steps=[
                "Review environment-specific configuration.",
                "Compare against a working environment.",
                "Check recent deployments or config changes.",
            ],
            stakeholder_summary=(
                "The issue appears isolated to configuration, not a platform-wide outage."
            ),
        )
        return {
            "result": result,
            "error": None,
            "model_used": "mock",
            "input_tokens": 0,
            "output_tokens": 0,
            "retries": 0,
        }
