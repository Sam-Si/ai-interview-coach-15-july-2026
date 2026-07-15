from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from services.llm_service import get_next_interviewer_message

router = APIRouter(prefix="/interview", tags=["interview"])

class Message(BaseModel):
    role: str
    content: str

class InterviewRequest(BaseModel):
    topic: str
    difficulty: str
    conversation_history: List[Message]

class InterviewResponse(BaseModel):
    response: str
    is_complete: bool

@router.post("/next", response_model=InterviewResponse)
async def next_message(request: InterviewRequest):
    try:
        # Convert List[Message] to list[dict] for llm_service
        history = [msg.model_dump() for msg in request.conversation_history]
        response_text, is_complete = get_next_interviewer_message(
            topic=request.topic,
            difficulty=request.difficulty,
            conversation_history=history
        )
        return InterviewResponse(response=response_text, is_complete=is_complete)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Service Error: {str(e)}")
