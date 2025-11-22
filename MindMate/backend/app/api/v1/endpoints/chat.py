"""
Chat Router - Legacy Chat Functionality
======================================

This router provides legacy chat functionality for backward compatibility.
The new assessment system is handled by the dedicated assessment router.

Author: Mental Health Platform Team
Version: 2.0.0
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import logging

from app.api.v1.endpoints.auth import get_current_user_from_token

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/chat", tags=["Chat & Chatbot"])

# ============================================================================
# LEGACY CHAT ENDPOINTS (Backward Compatibility)
# ============================================================================

class SendMessageRequest(BaseModel):
    """Send message request (legacy compatibility)"""
    message: str
    session_id: str
    is_first_message: bool = False

class SendMessageResponse(BaseModel):
    """Send message response (legacy compatibility)"""
    response: str
    session_id: str
    message_type: str = "text"
    assessment_status: Optional[Dict[str, Any]] = None

@router.post("/send", response_model=SendMessageResponse)
async def send_message(
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user_from_token)
):
    """
    Legacy chat endpoint for backward compatibility
    """
    # Redirect to assessment system
    return SendMessageResponse(
        response="Please use the new assessment system at /api/assessment/chat",
        session_id=request.session_id,
        message_type="system",
        assessment_status={
            "redirect": "/api/assessment/chat",
            "message": "Legacy chat endpoint deprecated. Please use assessment system."
        }
    )

@router.get("/health")
async def chat_health():
    """
    Health check for chat system
    """
    return {
        "status": "healthy",
        "service": "legacy-chat",
        "message": "Legacy chat system active. Please use /api/assessment/chat for new functionality.",
        "redirect": "/api/assessment/chat"
    }

# ============================================================================
# DEPRECATION NOTICE
# ============================================================================

@router.get("/")
async def chat_root():
    """
    Root endpoint with deprecation notice
    """
    return {
        "message": "Legacy chat system",
        "status": "deprecated",
        "redirect": "/api/assessment/chat",
        "notice": "Please use the new assessment system at /api/assessment/chat for full functionality."
    }
