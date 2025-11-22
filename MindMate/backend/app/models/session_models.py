"""
Session Models for Mental Health Platform
========================================
Models for appointment-based chat sessions
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Index, func, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
import uuid
from datetime import datetime, timezone

# Import your base model
from .base import Base, BaseModel


# ============================================================================
# ENUMERATIONS
# ============================================================================

class SessionStatusEnum(enum.Enum):
    """Session status states"""
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"
    EXPIRED = "expired"


class MessageTypeEnum(enum.Enum):
    """Message types"""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"
    TYPING = "typing"


# ============================================================================
# SESSION MODELS
# ============================================================================

class AppointmentSession(Base, BaseModel):
    """Appointment-based chat session model"""
    __tablename__ = "appointment_sessions"
    
    # Primary key
    id = Column(String(100), primary_key=True)  # Session ID
    appointment_id = Column(UUID(as_uuid=True), ForeignKey('appointments.id'), nullable=False)
    
    # Session metadata
    status = Column(Enum(SessionStatusEnum), default=SessionStatusEnum.ACTIVE, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Session configuration
    session_type = Column(String(50), default="appointment_chat", nullable=False)
    participant_count = Column(Integer, default=2, nullable=False)
    max_duration_minutes = Column(Integer, default=60, nullable=False)  # Default 1 hour
    
    # Session data
    session_notes = Column(Text, nullable=True)
    session_summary = Column(Text, nullable=True)
    
    # Relationships
    appointment = relationship("Appointment", back_populates="session")
    messages = relationship("SessionMessage", back_populates="session", cascade="all, delete-orphan")
    
    # Constraints and Indexes
    __table_args__ = (
        Index('idx_appointment_sessions_appointment_id', 'appointment_id'),
        Index('idx_appointment_sessions_status', 'status'),
        Index('idx_appointment_sessions_started_at', 'started_at'),
    )
    
    def __repr__(self):
        return f"<AppointmentSession(id={self.id}, appointment_id={self.appointment_id}, status={self.status})>"


class SessionMessage(Base, BaseModel):
    """Individual messages within a session"""
    __tablename__ = "session_messages"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(100), ForeignKey('appointment_sessions.id'), nullable=False)
    
    # Message content
    sender_id = Column(UUID(as_uuid=True), nullable=False)  # Patient or specialist ID
    sender_type = Column(String(20), nullable=False)  # 'patient' or 'specialist'
    message_type = Column(Enum(MessageTypeEnum), default=MessageTypeEnum.TEXT, nullable=False)
    content = Column(Text, nullable=False)
    
    # Message metadata
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    
    # File attachments (if any)
    attachment_url = Column(String(500), nullable=True)
    attachment_type = Column(String(50), nullable=True)
    attachment_size = Column(Integer, nullable=True)
    
    # Message status
    is_deleted = Column(Boolean, default=False, nullable=False)
    is_edited = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    session = relationship("AppointmentSession", back_populates="messages")
    
    # Constraints and Indexes
    __table_args__ = (
        Index('idx_session_messages_session_id', 'session_id'),
        Index('idx_session_messages_sender_id', 'sender_id'),
        Index('idx_session_messages_sent_at', 'sent_at'),
        Index('idx_session_messages_sender_type', 'sender_type'),
    )
    
    def __repr__(self):
        return f"<SessionMessage(id={self.id}, session_id={self.session_id}, sender_type={self.sender_type})>"


class SessionParticipant(Base, BaseModel):
    """Track participants in a session"""
    __tablename__ = "session_participants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(100), ForeignKey('appointment_sessions.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    user_type = Column(String(20), nullable=False)  # 'patient' or 'specialist'
    
    # Participation tracking
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    left_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Participant status
    is_active = Column(Boolean, default=True, nullable=False)
    is_typing = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    session = relationship("AppointmentSession")
    
    # Constraints and Indexes
    __table_args__ = (
        Index('idx_session_participants_session_id', 'session_id'),
        Index('idx_session_participants_user_id', 'user_id'),
        Index('idx_session_participants_user_type', 'user_type'),
    )
    
    def __repr__(self):
        return f"<SessionParticipant(id={self.id}, session_id={self.session_id}, user_type={self.user_type})>"
