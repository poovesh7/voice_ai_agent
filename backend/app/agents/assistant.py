import json
import re
from collections.abc import AsyncIterator
from datetime import datetime

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.messages import TextMessage
from autogen_agentchat.ui import Console
from groq import AsyncGroq

from app.config import get_settings

from .model_client import get_model_client
from .tools import get_current_time, web_search

CURRENT_INFO_RE = re.compile(
    r"\b(today|latest|current|now|live|news|score|scores|schedule|match|matches|fixture|fixtures|weather|price)\b",
    re.IGNORECASE,
)


def _system_message() -> str:
    settings = get_settings()
    current_time = datetime.now().strftime("%A, %B %d, %Y at %H:%M")
    return f"""You are {settings.assistant_name}, a spoken-voice AI assistant.
Your replies are converted to speech, so:
- Never use markdown, bullet points, code blocks, or emoji.
- Keep answers conversational, direct, and reasonably brief unless asked for detail.
- Never expose tool calls, JSON, hidden parameters, or internal reasoning.
- Today's local server time is {current_time}.
- If web search context is provided, use it carefully and say when results may need verification.
- If current information is needed and no web context is available, say you cannot verify live data instead of guessing."""


def build_assistant_agent() -> AssistantAgent:
    return AssistantAgent(
        name="assistant",
        model_client=get_model_client(),
        system_message=_system_message(),
        tools=[get_current_time],
        reflect_on_tool_use=True,
    )


async def run_agent_text(prompt: str, history: list[dict[str, str]] | None = None) -> str:
    chunks: list[str] = []
    async for chunk in stream_agent_text(prompt, history=history):
        chunks.append(chunk)
    return _clean_response("".join(chunks))


def _needs_current_info(prompt: str) -> bool:
    return bool(CURRENT_INFO_RE.search(prompt))


def _clean_response(text: str) -> str:
    text = re.sub(r"\{\s*\"name\"\s*:\s*\"[^\"]+\".*?\}", "", text, flags=re.DOTALL)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


async def _build_messages(prompt: str, history: list[dict[str, str]] | None = None) -> list[dict[str, str]]:
    settings = get_settings()
    messages = [{"role": "system", "content": _system_message()}]

    if history:
        for message in history[-10:]:
            content = _clean_response(message.get("content", ""))
            role = message.get("role")
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})

    if settings.enable_web_search and _needs_current_info(prompt):
        try:
            search_context = web_search(prompt)
        except Exception:
            search_context = "Web search failed for this request."
        messages.append(
            {
                "role": "system",
                "content": f"Web search context for the user's question:\n{search_context}",
            }
        )

    messages.append({"role": "user", "content": prompt})
    return messages


async def stream_agent_text(prompt: str, history: list[dict[str, str]] | None = None) -> AsyncIterator[str]:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is required to call the assistant model.")

    client = AsyncGroq(api_key=settings.groq_api_key)
    stream = await client.chat.completions.create(
        model=settings.groq_model,
        messages=await _build_messages(prompt, history),
        temperature=0.2,
        max_tokens=450,
        stream=True,
    )

    async for event in stream:
        delta = event.choices[0].delta.content
        if delta:
            yield delta


__all__ = ["Console", "build_assistant_agent", "run_agent_text", "stream_agent_text"]
