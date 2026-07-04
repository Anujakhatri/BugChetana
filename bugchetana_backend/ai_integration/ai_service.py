import os
import logging
from groq import Groq, GroqError, RateLimitError

logger = logging.getLogger(__name__)

_client = None
_client_error = None

try:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")
    _client = Groq(api_key=api_key)
except Exception as e:
    _client_error = e

DEFAULT_MODEL = "openai/gpt-oss-20b"


def _chat(system_prompt: str, user_prompt: str, max_tokens: int = 300) -> str:
    """Shared low-level call. Raises on any failure, callers decide fallback behavior."""
    if _client is None:
        raise RuntimeError(f"Groq client not initialized: {_client_error}")
    try:
        completion = _client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[
                 {"role": "system", "content": system_prompt},
                 {"role": "user", "content": user_prompt},
            ],
            max_completion_tokens=max_tokens,
            temperature=0.7,
        )
        content = completion.choices[0].message.content
        if content is None:
            raise RuntimeError("Groq returned an empty response")
        return content.strip()

    except RateLimitError:
        logger.warning("Groq API rate limit reached")
        raise RuntimeError("Groq rate limit hit so try again shortly")



def generate_roast(bug_description: str) -> str:
    system_prompt = (
        "You are a witty but kind code-review comedian. Given a bug report, "
        "write a short, funny 'roast' (2-3 sentences max) poking fun at the bug itself "
        "— never at the person who reported it or wrote the code. Keep it light and "
        "team-friendly, not mean-spirited."
    )
    return _chat(system_prompt, bug_description, max_tokens=150)


def suggest_fix(bug_description: str, severity: str) -> str:
    system_prompt = (
        "You are a senior software engineer helping triage bugs. Given a bug "
        "description and its severity, suggest a concise, practical starting point "
        "for investigating and fixing it (3-5 sentences). Be specific and technical, "
        "not generic advice."
    )
    user_prompt = f"Severity: {severity}\n\nBug description: {bug_description}"
    return _chat(system_prompt, user_prompt, max_tokens=300)