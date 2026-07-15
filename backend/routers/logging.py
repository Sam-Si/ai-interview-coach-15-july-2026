from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

router = APIRouter(prefix="/log", tags=["logging"])

# Use the uvicorn.error logger to ensure client logs print directly to the console uvicorn terminal
logger = logging.getLogger("uvicorn.error")

class LogPayload(BaseModel):
    level: str
    message: str
    context: Optional[str] = None
    extra_details: Optional[Dict[str, Any]] = None

@router.post("")
async def log_client_event(payload: LogPayload):
    log_msg = f"[{payload.level.upper()}] {payload.message}"
    if payload.context:
        log_msg += f" | Context: {payload.context}"
    if payload.extra_details:
        log_msg += f" | Details: {payload.extra_details}"

    level = payload.level.upper()
    if level == "DEBUG":
        logger.debug(log_msg)
    elif level == "INFO":
        logger.info(log_msg)
    elif level == "WARNING" or level == "WARN":
        logger.warning(log_msg)
    elif level == "ERROR":
        logger.error(log_msg)
    else:
        logger.info(log_msg)

    return {"status": "logged"}
