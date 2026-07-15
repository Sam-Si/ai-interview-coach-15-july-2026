from typing import List
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm_service import get_next_interviewer_message

router = APIRouter(tags=["interview"])

# Get the standard uvicorn console logger
logger = logging.getLogger("uvicorn.error")

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
    logger.info(f"API CALL: /api/interview/start | Topic: '{request.topic}' | Difficulty: '{request.difficulty}'")
    try:
        first_message, _is_complete = get_next_interviewer_message(
            topic=request.topic,
            difficulty=request.difficulty,
            conversation_history=[],
        )
        conversation_history = [
            {"role": "assistant", "content": first_message},
        ]
        logger.info(f"API SUCCESS: /api/interview/start | Topic: '{request.topic}' | Response Length: {len(first_message)}")
        return StartInterviewResponse(
            first_message=first_message,
            conversation_history=conversation_history,
        )
    except ValueError as val_err:
        logger.error(f"API ERROR: /api/interview/start | Topic: '{request.topic}' | ValueError: {str(val_err)}")
        raise HTTPException(status_code=400, detail=str(val_err)) from val_err
    except Exception as exc:
        logger.exception(f"API EXCEPTION: /api/interview/start | Topic: '{request.topic}'")
        raise HTTPException(
            status_code=500,
            detail=f"LLM Service Error: {str(exc)}",
        ) from exc


@router.post("/answer", response_model=AnswerInterviewResponse)
async def answer_interview(request: AnswerInterviewRequest):
    logger.info(
        f"API CALL: /api/interview/answer | Topic: '{request.topic}' | "
        f"Difficulty: '{request.difficulty}' | History length: {len(request.conversation_history)}"
    )
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

        logger.info(
            f"API SUCCESS: /api/interview/answer | Topic: '{request.topic}' | "
            f"Response Length: {len(ai_message)} | is_complete: {is_complete}"
        )
        return AnswerInterviewResponse(
            ai_message=ai_message,
            is_complete=is_complete,
            conversation_history=conversation_history,
        )
    except ValueError as val_err:
        logger.error(f"API ERROR: /api/interview/answer | Topic: '{request.topic}' | ValueError: {str(val_err)}")
        raise HTTPException(status_code=400, detail=str(val_err)) from val_err
    except Exception as exc:
        logger.exception(f"API EXCEPTION: /api/interview/answer | Topic: '{request.topic}'")
        raise HTTPException(
            status_code=500,
            detail=f"LLM Service Error: {str(exc)}",
        ) from exc
