"""
SQLAlchemy Appointment Model for Mental Health Platform
======================================================
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Numeric, Text, Boolean, CheckConstraint, Index, func, UniqueConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import UUID
import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

# Import your base model (adjust import path as needed)
from .base import Base, BaseModel

# Import related models for relationships
from .session_models import AppointmentSession
# SpecialistReview now imported from specialist.py


# ============================================================================
# ENUMERATIONS
# ============================================================================

class AppointmentStatusEnum(enum.Enum):
    """Core appointment states"""
    PENDING_APPROVAL = "pending_approval"  # Waiting for specialist approval
    APPROVED = "approved"                   # Specialist approved the request
    REJECTED = "rejected"                   # Specialist rejected the request
    SCHEDULED = "scheduled"                # Scheduled appointment
    CONFIRMED = "confirmed"                # Patient confirmed
    IN_SESSION = "in_session"             # Active chat session
    COMPLETED = "completed"                # Session finished
    REVIEWED = "reviewed"                  # Patient submitted review
    CANCELLED = "cancelled"                # Cancelled
    NO_SHOW = "no_show"                   # Patient didn't show


class AppointmentTypeEnum(enum.Enum):
    """Consultation delivery methods"""
    VIRTUAL = "virtual"
    ONLINE = "online"  # For generated_time_slots table
    IN_PERSON = "in_person"


class PaymentStatusEnum(enum.Enum):
    """Payment states"""
    UNPAID = "unpaid"
    PAID = "paid"
    REFUNDED = "refunded"


# ============================================================================
# SQLALCHEMY MODEL
# ============================================================================

class Appointment(Base, BaseModel):
    """Core appointment model - MVP version"""
    __tablename__ = "appointments"
    
    # Primary key and metadata
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Foreign Key Relationships
    # Note: Adjust the table names to match your existing schema
    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id'), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id'), nullable=False)  # Links to your Patient model
    
    # Relationships
    specialist = relationship("Specialists", back_populates="appointments", foreign_keys=[specialist_id])
    patient = relationship("Patient", back_populates="appointments")
    time_slot = relationship("SpecialistTimeSlots", back_populates="appointment", uselist=False)
    session = relationship("AppointmentSession", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    review = relationship("SpecialistReview", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    
    # Enhanced appointment system relationships
    generated_time_slot = relationship("GeneratedTimeSlot", back_populates="appointment", uselist=False)  
    
    # Core appointment fields (only columns that exist in database)
    scheduled_start = Column(DateTime(timezone=True), nullable=False)
    scheduled_end = Column(DateTime(timezone=True), nullable=False)
    appointment_type = Column(Enum(AppointmentTypeEnum), nullable=False)
    status = Column(Enum(AppointmentStatusEnum), nullable=False)
    
    # Payment (only columns that exist in database)
    fee = Column(Numeric(10, 2), nullable=False)
    payment_status = Column(Enum(PaymentStatusEnum), nullable=False)
    
    # Additional fields (only columns that exist in database)
    notes = Column(Text, nullable=True)
    session_notes = Column(Text, nullable=True)
    cancellation_reason = Column(String(500), nullable=True)
    
    # Constraints and Indexes
    __table_args__ = (
        CheckConstraint('scheduled_end > scheduled_start', name='check_end_after_start'),
        CheckConstraint('fee >= 0', name='non_negative_fee'),
        Index('idx_appointment_specialist', 'specialist_id'),
        Index('idx_appointment_patient', 'patient_id'),
        Index('idx_appointment_status', 'status'),
        Index('idx_appointment_date', 'scheduled_start'),
        Index('idx_appointment_payment', 'payment_status'),
        Index('idx_appointment_type', 'appointment_type'),
    )
    
    # ========================================
    # VALIDATION METHODS
    # ========================================
    
    @validates('scheduled_start', 'scheduled_end')
    def validate_future_date(self, key, value):
        """Validate that appointment is scheduled in the future"""
        if value is not None:
            now = datetime.now(timezone.utc) if value.tzinfo else datetime.now()
            if value < now:
                raise ValueError("Appointment must be scheduled in the future")
        return value
    
    # ========================================
    # COMPUTED PROPERTIES
    # ========================================
    
    @property
    def is_active(self) -> bool:
        """Check if appointment is active"""
        return self.status in [
            AppointmentStatusEnum.PENDING_APPROVAL,
            AppointmentStatusEnum.SCHEDULED,
            AppointmentStatusEnum.CONFIRMED
        ]
    
    @property
    def duration_minutes(self) -> int:
        """Duration in minutes"""
        return int((self.scheduled_end - self.scheduled_start).total_seconds() / 60)
    
    @property
    def is_paid(self) -> bool:
        """Check if appointment is paid"""
        return self.payment_status == PaymentStatusEnum.PAID
    
    # ============================================================================
    # COMPATIBILITY PROPERTIES - These columns don't exist in DB but are accessed by code
    # ============================================================================
    # These properties return None to prevent AttributeError when code accesses them
    # They are not database columns, so SQLAlchemy won't try to query them
    
    @property
    def request_message(self) -> Optional[str]:
        return None
    
    @property
    def specialist_response(self) -> Optional[str]:
        return None
    
    @property
    def rejection_reason(self) -> Optional[str]:
        return None
    
    @property
    def presenting_concern(self) -> Optional[str]:
        return None
    
    @property
    def session_id(self) -> Optional[str]:
        return None
    
    @property
    def session_started_at(self) -> Optional[datetime]:
        return None
    
    @property
    def session_ended_at(self) -> Optional[datetime]:
        return None
    
    @property
    def patient_rating(self) -> Optional[int]:
        return None
    
    @property
    def patient_review(self) -> Optional[str]:
        return None
    
    @property
    def review_submitted_at(self) -> Optional[datetime]:
        return None
    
    @property
    def payment_method_id(self) -> Optional[str]:
        return None
    
    @property
    def payment_receipt(self) -> Optional[str]:
        return None
    
    @property
    def payment_confirmed_by(self) -> Optional[uuid.UUID]:
        return None
    
    @property
    def payment_confirmed_at(self) -> Optional[datetime]:
        return None
    
    @property
    def meeting_link(self) -> Optional[str]:
        return None
    
    # Setters to allow code to set these (they just won't persist to DB)
    @request_message.setter
    def request_message(self, value):
        pass
    
    @specialist_response.setter
    def specialist_response(self, value):
        pass
    
    @rejection_reason.setter
    def rejection_reason(self, value):
        pass
    
    @presenting_concern.setter
    def presenting_concern(self, value):
        pass
    
    @session_id.setter
    def session_id(self, value):
        pass
    
    @session_started_at.setter
    def session_started_at(self, value):
        pass
    
    @session_ended_at.setter
    def session_ended_at(self, value):
        pass
    
    @patient_rating.setter
    def patient_rating(self, value):
        pass
    
    @patient_review.setter
    def patient_review(self, value):
        pass
    
    @review_submitted_at.setter
    def review_submitted_at(self, value):
        pass
    
    @payment_method_id.setter
    def payment_method_id(self, value):
        pass
    
    @payment_receipt.setter
    def payment_receipt(self, value):
        pass
    
    @payment_confirmed_by.setter
    def payment_confirmed_by(self, value):
        pass
    
    @payment_confirmed_at.setter
    def payment_confirmed_at(self, value):
        pass
    
    @meeting_link.setter
    def meeting_link(self, value):
        pass
    
    # ========================================
    # BUSINESS LOGIC METHODS
    # ========================================
    
    def confirm(self):
        """Confirm a scheduled appointment"""
        if self.status != AppointmentStatusEnum.SCHEDULED:
            raise ValueError("Only scheduled appointments can be confirmed")
        self.status = AppointmentStatusEnum.CONFIRMED
    
    def complete(self, session_notes: str):
        """Complete an appointment"""
        if self.status not in [AppointmentStatusEnum.CONFIRMED, AppointmentStatusEnum.SCHEDULED]:
            raise ValueError("Only confirmed or scheduled appointments can be completed")
        
        self.status = AppointmentStatusEnum.COMPLETED
        self.session_notes = session_notes
        
        # Auto-mark as paid for MVP (can be enhanced later)
        if self.payment_status == PaymentStatusEnum.UNPAID:
            self.payment_status = PaymentStatusEnum.PAID
    
    def cancel(self, reason: str):
        """Cancel an appointment"""
        if self.status in [AppointmentStatusEnum.COMPLETED, AppointmentStatusEnum.CANCELLED]:
            raise ValueError("Cannot cancel completed or already cancelled appointments")
        
        self.status = AppointmentStatusEnum.CANCELLED
        self.cancellation_reason = reason
        
        # Handle refund for paid appointments
        if self.payment_status == PaymentStatusEnum.PAID:
            self.payment_status = PaymentStatusEnum.REFUNDED
    
    def mark_no_show(self):
        """Mark appointment as no-show"""
        if self.status != AppointmentStatusEnum.CONFIRMED:
            raise ValueError("Only confirmed appointments can be marked as no-show")
        self.status = AppointmentStatusEnum.NO_SHOW
    
    def mark_paid(self):
        """Mark appointment as paid"""
        self.payment_status = PaymentStatusEnum.PAID
    
    def __repr__(self):
        return f"<Appointment(id={self.id}, patient_id={self.patient_id}, scheduled_start={self.scheduled_start}, status={self.status.value})>"


# ============================================================================
# ADDITIONAL MODELS FOR ENHANCED APPOINTMENT SYSTEM
# ============================================================================

class DayOfWeekEnum(enum.Enum):
    """Days of the week"""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class SlotStatusEnum(enum.Enum):
    """Slot status"""
    AVAILABLE = "available"
    BOOKED = "booked"
    BLOCKED = "blocked"
    EXPIRED = "expired"


class SpecialistAvailabilityTemplate(Base, BaseModel):
    """Template for specialist availability patterns"""
    __tablename__ = "specialist_availability_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id'), nullable=False)
    appointment_type = Column(Enum(AppointmentTypeEnum), nullable=False)
    day_of_week = Column(Enum(DayOfWeekEnum), nullable=False)
    start_time = Column(String(5), nullable=False)  # HH:MM format
    end_time = Column(String(5), nullable=False)    # HH:MM format
    slot_length_minutes = Column(Integer, nullable=False, default=60)
    break_between_slots_minutes = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    specialist = relationship("Specialists", back_populates="availability_templates")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('specialist_id', 'appointment_type', 'day_of_week', name='uq_specialist_type_day'),
        Index('idx_specialist_template', 'specialist_id', 'appointment_type'),
    )


class GeneratedTimeSlot(Base, BaseModel):
    """Generated time slots based on templates"""
    __tablename__ = "generated_time_slots"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id'), nullable=False)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey('appointments.id'), nullable=True)
    appointment_type = Column(Enum(AppointmentTypeEnum), nullable=False)
    slot_date = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    status = Column(Enum(SlotStatusEnum), default=SlotStatusEnum.AVAILABLE, nullable=False)
    can_be_booked = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    specialist = relationship("Specialists", back_populates="generated_slots")
    appointment = relationship("Appointment", back_populates="generated_time_slot")
    
    # Constraints
    __table_args__ = (
        Index('idx_slot_specialist_date', 'specialist_id', 'slot_date'),
        Index('idx_slot_status', 'status'),
        Index('idx_slot_appointment_type', 'appointment_type'),
    )


# Helper functions
def get_weekday_enum(day_name: str) -> DayOfWeekEnum:
    """Convert day name to enum"""
    day_mapping = {
        'monday': DayOfWeekEnum.MONDAY,
        'tuesday': DayOfWeekEnum.TUESDAY,
        'wednesday': DayOfWeekEnum.WEDNESDAY,
        'thursday': DayOfWeekEnum.THURSDAY,
        'friday': DayOfWeekEnum.FRIDAY,
        'saturday': DayOfWeekEnum.SATURDAY,
        'sunday': DayOfWeekEnum.SUNDAY,
    }
    return day_mapping.get(day_name.lower(), DayOfWeekEnum.MONDAY)


def generate_slots_from_template(template, start_date, end_date):
    """Generate time slots from template for date range"""
    # This is a placeholder implementation
    # In a real implementation, this would generate actual slots
    return []
