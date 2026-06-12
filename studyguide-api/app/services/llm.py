"""Groq LLM client (free tier) via langchain-groq, plus JSON helpers."""
import json
import re
from functools import lru_cache
from typing import Iterator

from langchain_groq import ChatGroq

from app.config import settings


@lru_cache(maxsize=1)
def get_llm() -> ChatGroq:
    if not settings.groq_configured:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to studyguide-api/.env "
            "(get a free key at https://console.groq.com/keys)."
        )
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=0.3,
    )


def _llm_at(temperature: float | None):
    """Default cached client, or a one-off client at a specific temperature."""
    if temperature is None:
        return get_llm()
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=temperature,
    )


def complete(system: str, user: str, temperature: float | None = None) -> str:
    """Single-shot completion, returns the full text."""
    llm = _llm_at(temperature)
    resp = llm.invoke([("system", system), ("human", user)])
    return resp.content


def stream(system: str, user: str) -> Iterator[str]:
    """Stream completion token chunks."""
    llm = get_llm()
    for chunk in llm.stream([("system", system), ("human", user)]):
        if chunk.content:
            yield chunk.content


def complete_json(system: str, user: str, temperature: float | None = None):
    """Completion that must return JSON. Strips code fences and parses."""
    raw = complete(
        system + "\n\nRespond with valid JSON only, no prose.", user, temperature
    )
    return _extract_json(raw)


def _extract_json(raw: str):
    raw = raw.strip()
    # strip ```json ... ``` fences if present
    fence = re.search(r"```(?:json)?\s*(.*?)```", raw, re.DOTALL)
    if fence:
        raw = fence.group(1).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # last-ditch: grab the outermost JSON array/object
        match = re.search(r"(\[.*\]|\{.*\})", raw, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise
