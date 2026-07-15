import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

MODEL_NAME = "llama-3.3-70b-versatile"

_client: Groq | None = None


def _get_client() -> Groq:
    """Return a Groq client configured from GROQ_API_KEY."""
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY is not set. "
                "Copy .env.example to .env and add your Groq API key."
            )
        _client = Groq(api_key=api_key)
    return _client


INTERVIEWER_SYSTEM_PROMPT = """You are an expert technical interviewer conducting a live technical interview.

Interview parameters:
- Topic: {topic}
- Difficulty: {difficulty}

Your role and rules:
- Ask one clear, focused question at a time that is appropriate to the topic and difficulty.
- Difficulty guidance:
  - Easy: ask basic recall and definition questions.
  - Medium: ask applied understanding and problem-solving questions.
  - Hard: ask deep expertise, trade-off, and system-thinking questions.
- After each candidate answer, decide exactly one of the following:
  a. If the answer is strong: acknowledge briefly in one sentence, then ask a question on a different aspect of the topic.
  b. If the answer is partially correct: probe deeper with one specific follow-up. Do not reveal the correct answer.
  c. If the answer is incorrect: note the gap in one sentence, then move to a different question.
- Monitor overall performance throughout the interview.
  - If the candidate is clearly struggling across multiple topics, naturally conclude the interview early with a kind note.
  - If the candidate is performing very well, feel free to wrap up after covering the key areas rather than continuing unnecessarily.
- When concluding the interview early or naturally, end your message with the exact phrase: [INTERVIEW COMPLETE]
- Never teach, never give hints, never reveal answers.
- Keep your tone professional, neutral, and encouraging.
- Ask only one question per message.
"""

REPORT_SYSTEM_PROMPT = """You are an expert interview evaluator.

Read the full conversation transcript of a technical interview and evaluate the candidate.

Return ONLY a valid JSON object with no extra text, no markdown, and no code fences.

The JSON object must have exactly these fields:
- score: integer from 0 to 100
- strengths: string with 2 to 4 specific sentences referencing the candidate's actual answers
- weaknesses: string with 2 to 4 specific sentences referencing gaps in the candidate's answers
- revision_areas: string containing a comma-separated list of 3 to 5 specific topics
- verdict: string with 2 to 3 sentences of overall direct assessment
- recommendation: string that is exactly the word Pass or exactly the word Fail

Scoring guide:
- 85 to 100: excellent performance
- 70 to 84: good performance
- 55 to 69: adequate performance
- below 55: weak performance
"""


def get_next_interviewer_message(
    topic: str,
    difficulty: str,
    conversation_history: list[dict],
) -> tuple[str, bool]:
    """Generate the next interviewer message from Groq.

    Returns:
        A tuple of (response_text, is_complete).
        is_complete is True when the response contains [INTERVIEW COMPLETE].
        That phrase is stripped from response_text when present.
    """
    system_content = INTERVIEWER_SYSTEM_PROMPT.format(
        topic=topic,
        difficulty=difficulty,
    )

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_content},
        *conversation_history,
    ]

    completion = _get_client().chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0.7,
        max_tokens=500,
    )

    response_text = completion.choices[0].message.content or ""
    is_complete = "[INTERVIEW COMPLETE]" in response_text

    if is_complete:
        response_text = response_text.replace("[INTERVIEW COMPLETE]", "").strip()

    return response_text, is_complete


def _build_transcript(conversation_history: list[dict]) -> str:
    lines: list[str] = []
    for message in conversation_history:
        role = message.get("role", "unknown").upper()
        content = message.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


def _parse_report_json(response_text: str) -> dict[str, Any]:
    """Parse JSON from the model response, with regex fallback."""
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"Failed to parse interview report JSON after regex extraction: {exc}\n"
                    f"Raw response: {response_text}"
                ) from exc
        raise ValueError(
            f"Failed to parse interview report JSON and no JSON object found.\n"
            f"Raw response: {response_text}"
        )


def generate_interview_report(
    topic: str,
    difficulty: str,
    conversation_history: list[dict],
) -> dict[str, Any]:
    """Generate a structured interview evaluation report from the transcript.

    Returns:
        Parsed report dictionary with score, strengths, weaknesses,
        revision_areas, verdict, and recommendation.
    """
    transcript = _build_transcript(conversation_history)

    user_content = (
        f"Interview topic: {topic}\n"
        f"Interview difficulty: {difficulty}\n\n"
        f"Full conversation transcript:\n{transcript}"
    )

    messages: list[dict[str, str]] = [
        {"role": "system", "content": REPORT_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    completion = _get_client().chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        temperature=0.3,
        max_tokens=1000,
    )

    response_text = completion.choices[0].message.content or ""
    return _parse_report_json(response_text)
