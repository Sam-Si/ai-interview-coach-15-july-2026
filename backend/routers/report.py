from typing import List
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm_service import generate_interview_report

router = APIRouter(tags=["report"])

# Get the standard uvicorn console logger
logger = logging.getLogger("uvicorn.error")


class Message(BaseModel):
    role: str
    content: str


class ReportRequest(BaseModel):
    topic: str
    difficulty: str
    conversation_history: List[Message]


@router.post("/generate")
async def generate_report(request: ReportRequest):
    logger.info(
        f"API CALL: /api/report/generate | Topic: '{request.topic}' | "
        f"Difficulty: '{request.difficulty}' | History length: {len(request.conversation_history)}"
    )
    try:
        history = [msg.model_dump() for msg in request.conversation_history]
        report_data = generate_interview_report(
            topic=request.topic,
            difficulty=request.difficulty,
            conversation_history=history,
        )
        logger.info(f"API SUCCESS: /api/report/generate | Topic: '{request.topic}' | Score: {report_data.get('score')}")
        return report_data
    except ValueError as val_err:
        logger.error(f"API ERROR: /api/report/generate | Topic: '{request.topic}' | ValueError: {str(val_err)}")
        raise HTTPException(status_code=400, detail=str(val_err)) from val_err
    except Exception as exc:
        logger.exception(f"API EXCEPTION: /api/report/generate | Topic: '{request.topic}'")
        raise HTTPException(
            status_code=500,
            detail=f"LLM Service Error: {str(exc)}",
        ) from exc
