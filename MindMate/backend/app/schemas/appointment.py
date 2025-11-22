"""
Enhanced Appointment Schemas
============================
Pydantic models for the professional appointment workflow
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


# ============================================================================
# ENUMS
# ============================================================================

class AppointmentStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_SESSION = "in_session"
    COMPLETED = "completed"
    REVIEWED = "reviewed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class ConsultationMode(str, Enum):
    ONLINE = "online"
    IN_PERSON = "in_person"
    HYBRID = "hybrid"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"
    EXPIRED = "expired"


class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"
    TYPING = "typing"


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class AppointmentRequestRequest(BaseModel):
    """Request an appointment with a specialist"""
    specialist_id: uuid.UUID = Field(..., description="Specialist ID")
    presenting_concern: str = Field(..., min_length=10, max_length=1000, description="Main concern")
    request_message: Optional[str] = Field(None, max_length=2000, description="Additional message")
    consultation_mode: ConsultationMode = Field(..., description="Preferred consultation mode")
    preferred_date: Optional[datetime] = Field(None, description="Preferred appointment date")
    preferred_time: Optional[str] = Field(None, description="Preferred time slot")
    fee: Optional[float] = Field(None, ge=0, description="Expected fee")
    
    @validator('presenting_concern')
    def validate_presenting_concern(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Presenting concern must be at least 10 characters')
        return v.strip()


class ApproveAppointmentRequest(BaseModel):
    """Approve an appointment request"""
    scheduled_start: datetime = Field(..., description="Appointment start time")
    scheduled_end: datetime = Field(..., description="Appointment end time")
    response_message: Optional[str] = Field(None, max_length=1000, description="Response message")
    consultation_mode: Optional[ConsultationMode] = Field(None, description="Confirmed consultation mode")
    fee: Optional[float] = Field(None, ge=0, description="Confirmed fee")
    
    @validator('scheduled_end')
    def validate_end_after_start(cls, v, values):
        if 'scheduled_start' in values and v <= values['scheduled_start']:
            raise ValueError('End time must be after start time')
        return v


class RejectAppointmentRequest(BaseModel):
    """Reject an appointment request"""
    rejection_reason: str = Field(..., min_length=10, max_length=1000, description="Reason for rejection")
    alternative_suggestion: Optional[str] = Field(None, max_length=500, description="Alternative suggestion")
    
    @validator('rejection_reason')
    def validate_rejection_reason(cls, v):
        if len(v.strip()) < 10:
            raise ValueError('Rejection reason must be at least 10 characters')
        return v.strip()


class SubmitReviewRequest(BaseModel):
    """Submit a review for a completed appointment"""
    rating: int = Field(..., ge=1, le=5, description="Overall rating (1-5 stars)")
    review_text: Optional[str] = Field(None, max_length=2000, description="Review text")
    communication_rating: Optional[int] = Field(None, ge=1, le=5, description="Communication rating")
    professionalism_rating: Optional[int] = Field(None, ge=1, le=5, description="Professionalism rating")
    effectiveness_rating: Optional[int] = Field(None, ge=1, le=5, description="Effectiveness rating")
    is_anonymous: bool = Field(False, description="Submit anonymously")
    
    @validator('review_text')
    def validate_review_text(cls, v):
        if v and len(v.strip()) < 5:
            raise ValueError('Review text must be at least 5 characters if provided')
        return v.strip() if v else v


class StartSessionRequest(BaseModel):
    """Start a chat session for an appointment"""
    session_notes: Optional[str] = Field(None, max_length=1000, description="Initial session notes")
    max_duration_minutes: Optional[int] = Field(60, ge=15, le=180, description="Maximum session duration")


class SendMessageRequest(BaseModel):
    """Send a message in a session"""
    content: str = Field(..., min_length=1, max_length=2000, description="Message content")
    message_type: MessageType = Field(MessageType.TEXT, description="Message type")
    attachment_url: Optional[str] = Field(None, description="Attachment URL if any")


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class AppointmentRequestResponse(BaseModel):
    """Response for appointment request"""
    appointment_id: uuid.UUID
    status: str
    message: str
    estimated_response_time: Optional[str] = None


class AppointmentApprovalResponse(BaseModel):
    """Response for appointment approval"""
    appointment_id: uuid.UUID
    status: str
    scheduled_start: datetime
    scheduled_end: datetime
    message: str


class AppointmentRejectionResponse(BaseModel):
    """Response for appointment rejection"""
    appointment_id: uuid.UUID
    status: str
    rejection_reason: str
    message: str


class SessionStartResponse(BaseModel):
    """Response for starting a session"""
    session_id: str
    appointment_id: uuid.UUID
    status: str
    message: str
    max_duration_minutes: int


class SessionMessageResponse(BaseModel):
    """Response for session message"""
    message_id: uuid.UUID
    session_id: str
    content: str
    sender_type: str
    sent_at: datetime
    message_type: MessageType


class ReviewResponse(BaseModel):
    """Response for review submission"""
    review_id: uuid.UUID
    appointment_id: uuid.UUID
    message: str
    rating: int


class AppointmentDetailResponse(BaseModel):
    """Detailed appointment information"""
    id: uuid.UUID
    specialist_id: uuid.UUID
    patient_id: uuid.UUID
    status: AppointmentStatus
    presenting_concern: str
    request_message: Optional[str]
    specialist_response: Optional[str]
    rejection_reason: Optional[str]
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    consultation_mode: ConsultationMode
    fee: float
    session_id: Optional[str]
    session_status: Optional[SessionStatus]
    patient_rating: Optional[int]
    patient_review: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # Related data
    specialist_name: Optional[str] = None
    patient_name: Optional[str] = None
    session_messages_count: Optional[int] = None


class AppointmentListResponse(BaseModel):
    """List of appointments with pagination"""
    appointments: List[AppointmentDetailResponse]
    total_count: int
    page: int
    size: int
    total_pages: int
    has_more: bool


class SessionDetailResponse(BaseModel):
    """Detailed session information"""
    id: str
    appointment_id: uuid.UUID
    status: SessionStatus
    started_at: datetime
    ended_at: Optional[datetime]
    last_activity_at: datetime
    participant_count: int
    max_duration_minutes: int
    session_notes: Optional[str]
    session_summary: Optional[str]
    messages_count: int


class ReviewDetailResponse(BaseModel):
    """Detailed review information"""
    id: uuid.UUID
    appointment_id: uuid.UUID
    specialist_id: uuid.UUID
    patient_id: uuid.UUID
    rating: int
    review_text: Optional[str]
    communication_rating: Optional[int]
    professionalism_rating: Optional[int]
    effectiveness_rating: Optional[int]
    is_anonymous: bool
    specialist_response: Optional[str]
    specialist_response_at: Optional[datetime]
    created_at: datetime
    
    # Related data
    patient_name: Optional[str] = None
    specialist_name: Optional[str] = None


class StatusUpdateResponse(BaseModel):
    """Response for status updates"""
    success: bool
    message: str
    appointment_id: uuid.UUID
    new_status: str
    updated_at: datetime


# ============================================================================
# FILTER SCHEMAS
# ============================================================================

class AppointmentFilterRequest(BaseModel):
    """Filter appointments"""
    status: Optional[AppointmentStatus] = None
    specialist_id: Optional[uuid.UUID] = None
    patient_id: Optional[uuid.UUID] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    consultation_mode: Optional[ConsultationMode] = None
    has_review: Optional[bool] = None
    has_session: Optional[bool] = None
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)


class SessionFilterRequest(BaseModel):
    """Filter sessions"""
    status: Optional[SessionStatus] = None
    appointment_id: Optional[uuid.UUID] = None
    specialist_id: Optional[uuid.UUID] = None
    patient_id: Optional[uuid.UUID] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)


class ReviewFilterRequest(BaseModel):
    """Filter reviews"""
    specialist_id: Optional[uuid.UUID] = None
    patient_id: Optional[uuid.UUID] = None
    rating_min: Optional[int] = Field(None, ge=1, le=5)
    rating_max: Optional[int] = Field(None, ge=1, le=5)
    has_text: Optional[bool] = None
    is_anonymous: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)
