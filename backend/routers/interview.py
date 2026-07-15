from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm_service import get_next_interviewer_message

router = APIRouter(tags=["interview"])


class Message(BaseModel):
    role: str
    content: str


class StartInterviewRequest(BaseModel):
    topic: str
    difficulty: str


class StartInterviewResponse(BaseModel):
    first_message: str
    conversation_history: List[Message]


class AnswerInterviewRequest(BaseModel):
    topic: str
    difficulty: str
    user_answer: str
    conversation_history: List[Message]


class AnswerInterviewResponse(BaseModel):
    ai_message: str
    is_complete: bool
    conversation_history: List[Message]


@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(request: StartInterviewRequest):
    try:
        first_message, _is_complete = get_next_interviewer_message(
            topic=request.topic,
            difficulty=request.difficulty,
            conversation_history=[],
        )
        conversation_history = [
            {"role": "assistant", "content": first_message},
        ]
        return StartInterviewResponse(
            first_message=first_message,
            conversation_history=conversation_history,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err)) from val_err
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM Service Error: {str(exc)}",
        ) from exc


@router.post("/answer", response_model=AnswerInterviewResponse)
async def answer_interview(request: AnswerInterviewRequest):
    try:
        conversation_history = [msg.model_dump() for msg in request.conversation_history]
        conversation_history.append(
            {"role": "user", "content": request.user_answer},
        )

        ai_message, is_complete = get_next_interviewer_message(
            topic=request.topic,
            difficulty=request.difficulty,
            conversation_history=conversation_history,
        )

        conversation_history.append(
            {"role": "assistant", "content": ai_message},
        )

        return AnswerInterviewResponse(
            ai_message=ai_message,
            is_complete=is_complete,
            conversation_history=conversation_history,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err)) from val_err
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM Service Error: {str(exc)}",
        ) from exc
