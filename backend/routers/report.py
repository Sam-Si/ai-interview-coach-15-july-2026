from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from services.llm_service import generate_interview_report

router = APIRouter(prefix="/report", tags=["report"])

class Message(BaseModel):
    role: str
    content: str

class ReportRequest(BaseModel):
    topic: str
    difficulty: str
    conversation_history: List[Message]

@router.post("/generate")
async def generate_report(request: ReportRequest):
    try:
        # Convert List[Message] to list[dict] for llm_service
        history = [msg.model_dump() for msg in request.conversation_history]
        report_data = generate_interview_report(
            topic=request.topic,
            difficulty=request.difficulty,
            conversation_history=history
        )
        return report_data
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Service Error: {str(e)}")
