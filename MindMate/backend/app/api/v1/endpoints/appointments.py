"""
Appointments Management API
==========================
Complete appointment booking and management system for patients and specialists.
Handles instant booking, slot management, and appointment lifecycle.

Author: Mental Health Platform Team
Version: 2.0.0 - Unified appointments system
"""

import uuid
import logging
import os
from datetime import datetime, timedelta, timezone, date, time, tzinfo
from typing import Optional, List, Dict, Any
from enum import Enum

# Pakistan Standard Time (PKT) - UTC+5
PKT = timezone(timedelta(hours=5))

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc, select
from pydantic import BaseModel, Field, validator
from typing import Optional as TypingOptional

from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_user_from_token
from app.utils.email_utils import send_appointment_confirmation_emails, send_appointment_pending_approval_emails
from app.models.appointment import (
    Appointment, AppointmentStatusEnum, AppointmentTypeEnum,
    GeneratedTimeSlot, SlotStatusEnum, DayOfWeekEnum,
    SpecialistAvailabilityTemplate, PaymentStatusEnum
)
from app.models.specialist import Specialists, ApprovalStatusEnum, SpecialistReview, ReviewStatusEnum
from app.models.patient import Patient

# ============================================================================
# ENUMS AND CONSTANTS
# ============================================================================

# Use the existing AppointmentTypeEnum from the model

class AppointmentStatus(str, Enum):
    """Appointment status enumeration"""
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class AppointmentBookingRequest(BaseModel):
    """Request to book an appointment"""
    specialist_id: str = Field(..., description="Specialist ID")
    slot_id: str = Field(..., description="Time slot ID to book")
    appointment_type: str = Field(..., description="Type of appointment (online/in_person)")
    presenting_concern: str = Field(..., description="Primary concern for the appointment")
    patient_notes: Optional[str] = Field(None, description="Additional notes from patient")
    payment_method_id: Optional[str] = Field(None, description="Payment method (easypaisa, jazzcash, etc.) - required for online appointments")
    payment_receipt: Optional[str] = Field(None, description="Payment receipt/transaction ID - required for online appointments")

class AppointmentBookingResponse(BaseModel):
    """Response after booking an appointment"""
    success: bool
    appointment_id: str
    specialist_name: str
    scheduled_start: str
    scheduled_end: str
    appointment_type: str
    fee: float
    status: str  # Changed from AppointmentStatus to str for consistency with AppointmentResponse
    meeting_link: Optional[str] = None

class AvailableSlotResponse(BaseModel):
    """Response for available time slots"""
    slot_id: str
    specialist_id: str
    slot_date: str
    start_time: str
    end_time: str
    appointment_type: str
    duration_minutes: int
    is_available: bool
    can_be_booked: bool = Field(..., description="Whether slot can be booked (alias for is_available)")

class AppointmentResponse(BaseModel):
    """Response for appointment details"""
    id: str
    specialist_id: str
    specialist_name: str
    patient_id: str
    patient_name: Optional[str] = None  # Added for specialist view
    scheduled_start: str
    scheduled_end: str
    appointment_type: str
    status: str
    presenting_concern: str
    request_message: Optional[str]
    fee: float
    payment_status: Optional[str] = None
    payment_method_id: Optional[str] = None
    payment_receipt: Optional[str] = None
    meeting_link: Optional[str] = None
    created_at: str
    updated_at: str

class SpecialistAvailabilityRequest(BaseModel):
    """Request to set specialist availability"""
    online_availability: Dict[str, Dict[str, Any]] = Field(..., description="Online availability schedule")
    in_person_availability: Dict[str, Dict[str, Any]] = Field(..., description="In-person availability schedule")

class PaymentReceiptUploadResponse(BaseModel):
    """Response after uploading payment receipt"""
    success: bool
    file_url: str
    message: str

class PaymentRejectionRequest(BaseModel):
    """Request to reject payment for an appointment"""
    reason: str = Field(..., min_length=1, max_length=500, description="Reason for rejecting the payment")

class SubmitReviewRequest(BaseModel):
    """Request to submit a review for a completed appointment"""
    rating: int = Field(..., ge=1, le=5, description="Overall rating (1-5 stars)")
    review_text: Optional[str] = Field(None, max_length=2000, description="Review text")
    communication_rating: Optional[int] = Field(None, ge=1, le=5, description="Communication rating")
    professionalism_rating: Optional[int] = Field(None, ge=1, le=5, description="Professionalism rating")
    effectiveness_rating: Optional[int] = Field(None, ge=1, le=5, description="Effectiveness rating")
    is_anonymous: bool = Field(False, description="Submit anonymously")
    
    @validator('review_text', pre=True, always=True)
    def validate_review_text(cls, v):
        if v and len(v.strip()) < 5:
            raise ValueError('Review text must be at least 5 characters if provided')
        return v.strip() if v else v

class ReviewResponse(BaseModel):
    """Response for review submission"""
    review_id: str
    appointment_id: str
    message: str
    rating: int

# ============================================================================
# ROUTER SETUP
# ============================================================================

router = APIRouter(prefix="/appointments", tags=["Appointments Management"])
logger = logging.getLogger(__name__)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_weekday_enum(weekday_str: str) -> DayOfWeekEnum:
    """Convert weekday string to enum"""
    weekday_map = {
        "monday": DayOfWeekEnum.MONDAY,
        "tuesday": DayOfWeekEnum.TUESDAY,
        "wednesday": DayOfWeekEnum.WEDNESDAY,
        "thursday": DayOfWeekEnum.THURSDAY,
        "friday": DayOfWeekEnum.FRIDAY,
        "saturday": DayOfWeekEnum.SATURDAY,
        "sunday": DayOfWeekEnum.SUNDAY
    }
    return weekday_map.get(weekday_str.lower(), DayOfWeekEnum.MONDAY)


def create_default_template_for_weekday(
    specialist_id: str,
    weekday_enum: DayOfWeekEnum,
    appointment_type_enum: AppointmentTypeEnum,
    db: Session
) -> Optional[SpecialistAvailabilityTemplate]:
    """
    Create a default availability template for a weekday if none exists.
    First checks specialist's availability_schedule, then falls back to defaults.
    """
    try:
        # Convert specialist_id to UUID if it's a string
        if isinstance(specialist_id, str):
            specialist_id_uuid = uuid.UUID(specialist_id)
        else:
            specialist_id_uuid = specialist_id
        
        # Check if template already exists
        existing = db.query(SpecialistAvailabilityTemplate).filter(
            SpecialistAvailabilityTemplate.specialist_id == specialist_id_uuid,
            SpecialistAvailabilityTemplate.appointment_type == appointment_type_enum,
            SpecialistAvailabilityTemplate.day_of_week == weekday_enum
        ).first()
        
        if existing:
            return existing
        
        # Try to get schedule from specialist's availability_schedule
        from app.models.specialist import Specialists
        specialist = db.query(Specialists).filter(Specialists.id == specialist_id_uuid).first()
        
        start_time = "09:00"
        end_time = "17:00"
        slot_length_minutes = 60
        is_active = True
        
        # Map weekday enum to schedule key
        weekday_map = {
            DayOfWeekEnum.MONDAY: "monday",
            DayOfWeekEnum.TUESDAY: "tuesday",
            DayOfWeekEnum.WEDNESDAY: "wednesday",
            DayOfWeekEnum.THURSDAY: "thursday",
            DayOfWeekEnum.FRIDAY: "friday",
            DayOfWeekEnum.SATURDAY: "saturday",
            DayOfWeekEnum.SUNDAY: "sunday"
        }
        
        schedule_key = weekday_map.get(weekday_enum, "monday")
        
        # Map appointment type enum to schedule key
        schedule_type_map = {
            AppointmentTypeEnum.VIRTUAL: "online",
            AppointmentTypeEnum.IN_PERSON: "in_person",
        }
        schedule_type_key = schedule_type_map.get(appointment_type_enum, "online")
        
        # Check if specialist has availability_schedule
        if specialist and specialist.availability_schedule:
            schedule = specialist.availability_schedule
            if isinstance(schedule, dict):
                # Check if it's new format (nested) or old format (flat)
                if schedule_type_key in schedule:
                    # New format: nested with online/in_person
                    type_schedule = schedule[schedule_type_key]
                    if isinstance(type_schedule, dict) and schedule_key in type_schedule:
                        day_schedule = type_schedule[schedule_key]
                        if isinstance(day_schedule, dict):
                            is_available = day_schedule.get("is_available", False)
                            if is_available:
                                start_time = day_schedule.get("start_time", "09:00")
                                end_time = day_schedule.get("end_time", "17:00")
                                slot_length_minutes = day_schedule.get("slot_duration_minutes", 60)
                                is_active = True
                            else:
                                is_active = False
                                logger.info(f"Day {schedule_key} is unavailable in {schedule_type_key} schedule for specialist {specialist_id}")
                elif schedule_key in schedule:
                    # Old format: flat structure - use for both types
                    day_schedule = schedule[schedule_key]
                    if isinstance(day_schedule, dict):
                        is_available = day_schedule.get("is_available", False)
                        if is_available:
                            start_time = day_schedule.get("start_time", "09:00")
                            end_time = day_schedule.get("end_time", "17:00")
                            slot_length_minutes = day_schedule.get("slot_duration_minutes", 60)
                            is_active = True
                        else:
                            is_active = False
                            logger.info(f"Day {schedule_key} is unavailable in schedule for specialist {specialist_id}")
        
        # Create template from schedule or defaults
        default_template = SpecialistAvailabilityTemplate(
            specialist_id=specialist_id_uuid,
            appointment_type=appointment_type_enum,
            day_of_week=weekday_enum,
            start_time=start_time,
            end_time=end_time,
            slot_length_minutes=slot_length_minutes,
            break_between_slots_minutes=0,
            is_active=is_active
        )
        
        db.add(default_template)
        db.commit()
        db.refresh(default_template)
        
        logger.info(f"Created template for specialist {specialist_id}, weekday {weekday_enum.value}, type {appointment_type_enum.value} from {'availability_schedule' if specialist and specialist.availability_schedule else 'defaults'}")
        return default_template
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating template: {str(e)}")
        return None


def ensure_template_exists(
    specialist_id: str,
    weekday_enum: DayOfWeekEnum,
    appointment_type_enum: AppointmentTypeEnum,
    db: Session
) -> Optional[SpecialistAvailabilityTemplate]:
    """
    Ensure a template exists for the given parameters.
    Returns existing template or creates a default one.
    """
    # Convert specialist_id to UUID if it's a string
    if isinstance(specialist_id, str):
        specialist_id_uuid = uuid.UUID(specialist_id)
    else:
        specialist_id_uuid = specialist_id
    
    # Try to find existing template
    template = db.query(SpecialistAvailabilityTemplate).filter(
        SpecialistAvailabilityTemplate.specialist_id == specialist_id_uuid,
        SpecialistAvailabilityTemplate.appointment_type == appointment_type_enum,
        SpecialistAvailabilityTemplate.day_of_week == weekday_enum,
        SpecialistAvailabilityTemplate.is_active == True
    ).first()
    
    if template:
        return template
    
    # No template found - check if we should create default templates
    # Check if specialist has ANY templates for THIS appointment_type (not globally)
    # This allows creating defaults for online even if in_person exists, and vice versa
    any_templates_for_type = db.query(SpecialistAvailabilityTemplate).filter(
        SpecialistAvailabilityTemplate.specialist_id == specialist_id_uuid,
        SpecialistAvailabilityTemplate.appointment_type == appointment_type_enum
    ).first()
    
    # If no templates exist for this appointment_type, create default for this weekday
    if not any_templates_for_type:
        logger.info(f"No templates found for specialist {specialist_id}, type {appointment_type_enum.value}, creating default template for {weekday_enum.value}")
        return create_default_template_for_weekday(
            specialist_id=specialist_id,
            weekday_enum=weekday_enum,
            appointment_type_enum=appointment_type_enum,
            db=db
        )
    
    # Specialist has templates for this type but not for this weekday
    # Still create default for this weekday to ensure slots can be generated
    logger.info(f"No template found for specialist {specialist_id}, weekday {weekday_enum.value}, type {appointment_type_enum.value}, creating default")
    return create_default_template_for_weekday(
        specialist_id=specialist_id,
        weekday_enum=weekday_enum,
        appointment_type_enum=appointment_type_enum,
        db=db
    )


def generate_slots_for_single_date(
    specialist_id: str,
    target_date: date,
    appointment_type_enum: AppointmentTypeEnum,
    db: Session
) -> List[GeneratedTimeSlot]:
    """
    Generate slots for a single date based on specialist availability templates.
    
    Args:
        specialist_id: Specialist UUID
        target_date: Date to generate slots for
        appointment_type_enum: AppointmentTypeEnum (ONLINE or IN_PERSON)
        db: Database session
        
    Returns:
        List of GeneratedTimeSlot objects (already added to session, not committed)
    """
    # Use Pakistan Standard Time
    today = datetime.now(PKT).date()
    
    # Validate date is not in past
    if target_date < today:
        logger.warning(f"Cannot generate slots for past date: {target_date}")
        return []
    
    # Validate date is within 7 days
    max_date = today + timedelta(days=7)
    if target_date > max_date:
        logger.warning(f"Cannot generate slots more than 7 days ahead: {target_date}")
        return []
    
    # Convert specialist_id to UUID if it's a string
    if isinstance(specialist_id, str):
        specialist_id_uuid = uuid.UUID(specialist_id)
    else:
        specialist_id_uuid = specialist_id
    
    # Check if slots already exist for this date (check count, not first)
    existing_slots_count = db.query(GeneratedTimeSlot).filter(
        GeneratedTimeSlot.specialist_id == specialist_id_uuid,
        GeneratedTimeSlot.appointment_type == appointment_type_enum,
        func.date(GeneratedTimeSlot.slot_date) == target_date
    ).count()
    
    if existing_slots_count > 0:
        # Slots already exist, return empty list (caller should query existing slots)
        logger.debug(f"Slots already exist ({existing_slots_count}) for specialist {specialist_id}, date {target_date}")
        return []
    
    # Get weekday from date
    weekday = target_date.strftime("%A").lower()
    weekday_enum = get_weekday_enum(weekday)
    
    # Ensure template exists (will create default if none exist)
    template = ensure_template_exists(
        specialist_id=specialist_id,
        weekday_enum=weekday_enum,
        appointment_type_enum=appointment_type_enum,
        db=db
    )
    
    if not template:
        logger.debug(f"No template available for specialist {specialist_id}, weekday {weekday}, type {appointment_type_enum}")
        return []
    
    # Generate slots from template
    generated_slots = []
    try:
        # Parse start and end times
        start_time_parts = template.start_time.split(':')
        end_time_parts = template.end_time.split(':')
        
        if len(start_time_parts) != 2 or len(end_time_parts) != 2:
            logger.warning(f"Invalid time format in template for specialist {specialist_id}, day {weekday}")
            return []
        
        start_hour, start_minute = map(int, start_time_parts)
        end_hour, end_minute = map(int, end_time_parts)
        
        # Validate time values
        if not (0 <= start_hour < 24 and 0 <= start_minute < 60):
            logger.warning(f"Invalid start time {template.start_time} for specialist {specialist_id}")
            return []
            
        if not (0 <= end_hour < 24 and 0 <= end_minute < 60):
            logger.warning(f"Invalid end time {template.end_time} for specialist {specialist_id}")
            return []
        
        # Create timezone-aware datetime objects in Pakistan Standard Time
        start_datetime = datetime.combine(target_date, time(start_hour, start_minute), tzinfo=PKT)
        end_datetime = datetime.combine(target_date, time(end_hour, end_minute), tzinfo=PKT)
        
        # Validate that end time is after start time
        if end_datetime <= start_datetime:
            logger.warning(f"End time {template.end_time} is not after start time {template.start_time} for specialist {specialist_id}")
            return []
        
        # Generate slots for this date
        current_time = start_datetime
        now_pkt = datetime.now(PKT)
        
        while current_time + timedelta(minutes=template.slot_length_minutes) <= end_datetime:
            slot_end = current_time + timedelta(minutes=template.slot_length_minutes)
            
            # Only create slots for future times (in PKT)
            if current_time > now_pkt:
                slot = GeneratedTimeSlot(
                    specialist_id=specialist_id_uuid,
                    slot_date=current_time,
                    appointment_type=appointment_type_enum,
                    duration_minutes=template.slot_length_minutes,
                    status=SlotStatusEnum.AVAILABLE,
                    can_be_booked=True
                )
                generated_slots.append(slot)
            
            # Move to next slot (with break between slots)
            current_time = slot_end + timedelta(minutes=template.break_between_slots_minutes)
        
        # Add all slots to session (but don't commit yet)
        if generated_slots:
            db.add_all(generated_slots)
            logger.info(f"Generated {len(generated_slots)} slots for specialist {specialist_id}, date {target_date}, type {appointment_type_enum}")
        
    except (ValueError, AttributeError) as e:
        logger.error(f"Error parsing template times for specialist {specialist_id}, day {weekday}: {str(e)}")
        return []
    
    return generated_slots

def generate_slots_from_template(
    specialist_id: str,
    appointment_type: str,
    start_date: date,
    end_date: date,
    db: Session
) -> List[GeneratedTimeSlot]:
    """Generate time slots from specialist availability template"""
    slots = []
    current_date = start_date
    today = datetime.now(PKT).date()
    
    # Validate dates - don't generate slots for past dates
    if end_date < today:
        return slots  # Return empty if all dates are in the past
    
    if start_date < today:
        current_date = today  # Start from today if start_date is in the past
    
    while current_date <= end_date:
        weekday = current_date.strftime("%A").lower()
        weekday_enum = get_weekday_enum(weekday)
        
        # Convert string to enum
        # Database enum only supports VIRTUAL and IN_PERSON
        appointment_type_enum = AppointmentTypeEnum.VIRTUAL if appointment_type == "online" else AppointmentTypeEnum.IN_PERSON
        
        # Get availability template for this weekday and appointment type
        template = db.query(SpecialistAvailabilityTemplate).filter(
            SpecialistAvailabilityTemplate.specialist_id == specialist_id,
            SpecialistAvailabilityTemplate.day_of_week == weekday_enum,
            SpecialistAvailabilityTemplate.appointment_type == appointment_type_enum,
            SpecialistAvailabilityTemplate.is_active == True
        ).first()
        
        if template:
            try:
                # Parse start and end times with error handling
                start_time_parts = template.start_time.split(':')
                end_time_parts = template.end_time.split(':')
                
                if len(start_time_parts) != 2 or len(end_time_parts) != 2:
                    logger.warning(f"Invalid time format in template for specialist {specialist_id}, day {weekday}")
                    current_date += timedelta(days=1)
                    continue
                
                start_hour, start_minute = map(int, start_time_parts)
                end_hour, end_minute = map(int, end_time_parts)
                
                # Validate time values
                if not (0 <= start_hour < 24 and 0 <= start_minute < 60):
                    logger.warning(f"Invalid start time {template.start_time} for specialist {specialist_id}")
                    current_date += timedelta(days=1)
                    continue
                    
                if not (0 <= end_hour < 24 and 0 <= end_minute < 60):
                    logger.warning(f"Invalid end time {template.end_time} for specialist {specialist_id}")
                    current_date += timedelta(days=1)
                    continue
                
                # Create timezone-aware datetime objects
                start_datetime = datetime.combine(current_date, time(start_hour, start_minute), tzinfo=PKT)
                end_datetime = datetime.combine(current_date, time(end_hour, end_minute), tzinfo=PKT)
                
                # Validate that end time is after start time
                if end_datetime <= start_datetime:
                    logger.warning(f"End time {template.end_time} is not after start time {template.start_time} for specialist {specialist_id}")
                    current_date += timedelta(days=1)
                    continue
                
                # Generate slots
                current_time = start_datetime
                while current_time + timedelta(minutes=template.slot_length_minutes) <= end_datetime:
                    slot_end = current_time + timedelta(minutes=template.slot_length_minutes)
                    
                    # Only create slots for future times
                    if current_time > datetime.now(PKT):
                        slot = GeneratedTimeSlot(
                            specialist_id=specialist_id,
                            slot_date=current_time,
                            appointment_type=appointment_type_enum,
                            duration_minutes=template.slot_length_minutes,
                            status=SlotStatusEnum.AVAILABLE
                        )
                        slots.append(slot)
                    
                    current_time = slot_end + timedelta(minutes=template.break_between_slots_minutes)
                    
            except (ValueError, AttributeError) as e:
                logger.error(f"Error parsing template times for specialist {specialist_id}, day {weekday}: {str(e)}")
                # Continue to next date instead of failing completely
                current_date += timedelta(days=1)
                continue
        
        current_date += timedelta(days=1)
    
    return slots

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/available-slots")
async def get_available_slots(
    specialist_id: str = Query(..., description="Specialist ID"),
    appointment_type: str = Query(..., description="Type of appointment"),
    date: date = Query(..., description="Date to get slots for"),
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get available time slots for a specialist on a specific date.
    """
    try:
        # Verify specialist exists and is active
        specialist = db.query(Specialists).filter(Specialists.id == specialist_id).first()
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )
        # Check if specialist is approved (only approved specialists can receive bookings)
        if hasattr(specialist, 'approval_status') and specialist.approval_status != ApprovalStatusEnum.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Specialist is not approved for bookings"
            )
        # Check if specialist is active (if field exists)
        if hasattr(specialist, 'is_active') and not specialist.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Specialist is not active"
            )
        
        # Convert string to enum
        # Database enum only supports VIRTUAL and IN_PERSON
        appointment_type_enum = AppointmentTypeEnum.VIRTUAL if appointment_type == "online" else AppointmentTypeEnum.IN_PERSON
        
        # Validate date is not in the past
        today = datetime.now(PKT).date()
        if date < today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot get slots for past dates"
            )
        
        # Check if slots exist for this date
        existing_slots = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.specialist_id == specialist_id,
            GeneratedTimeSlot.appointment_type == appointment_type_enum,
            func.date(GeneratedTimeSlot.slot_date) == date,
            GeneratedTimeSlot.status == SlotStatusEnum.AVAILABLE
        ).all()
        
        # If no slots exist, generate them
        if not existing_slots:
            slots = generate_slots_from_template(
                specialist_id, appointment_type, date, date, db
            )
            
            # Save generated slots
            for slot in slots:
                db.add(slot)
            db.commit()
            
            # Refresh the query
            existing_slots = db.query(GeneratedTimeSlot).filter(
                GeneratedTimeSlot.specialist_id == specialist_id,
                GeneratedTimeSlot.appointment_type == appointment_type_enum,
                func.date(GeneratedTimeSlot.slot_date) == date,
                GeneratedTimeSlot.status == SlotStatusEnum.AVAILABLE
            ).all()
        
        # Convert to response format
        response_slots = []
        for slot in existing_slots:
            if slot.can_be_booked:
                # slot_date is a DateTime with timezone, it contains both date and time
                # Ensure it's timezone-aware and in PKT
                slot_start_dt = slot.slot_date
                
                # Handle different datetime formats and convert to PKT
                if isinstance(slot_start_dt, date) and not isinstance(slot_start_dt, datetime):
                    # If it's just a date (shouldn't happen but handle it), combine with time in PKT
                    slot_start_dt = datetime.combine(slot_start_dt, time(0, 0), tzinfo=PKT)
                elif isinstance(slot_start_dt, datetime):
                    # If it's a datetime, ensure it's in PKT timezone
                    if slot_start_dt.tzinfo is None:
                        # Naive datetime - assume it's in PKT
                        slot_start_dt = slot_start_dt.replace(tzinfo=PKT)
                    else:
                        # Timezone-aware datetime - convert to PKT
                        slot_start_dt = slot_start_dt.astimezone(PKT)
                else:
                    # Fallback: create PKT datetime
                    slot_start_dt = datetime.now(PKT).replace(hour=0, minute=0, second=0, microsecond=0)
                
                # Calculate end time from start time + duration
                slot_end_dt = slot_start_dt + timedelta(minutes=slot.duration_minutes)
                
                # Format dates for response (ISO format with timezone)
                slot_date_str = slot_start_dt.date().isoformat()  # Just the date part
                start_time_str = slot_start_dt.isoformat()  # Full datetime with timezone
                end_time_str = slot_end_dt.isoformat()  # Full datetime with timezone
                
                response_slots.append(AvailableSlotResponse(
                    slot_id=str(slot.id),
                    specialist_id=str(slot.specialist_id),
                    slot_date=slot_date_str,
                    start_time=start_time_str,
                    end_time=end_time_str,
                    appointment_type=slot.appointment_type.value,
                    duration_minutes=slot.duration_minutes,
                    is_available=slot.can_be_booked,
                    can_be_booked=slot.can_be_booked
                ))
        
        return response_slots
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting available slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available slots: {str(e)}"
        )

@router.get("/payment-receipt/{filename}")
async def get_payment_receipt(
    filename: str,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Serve payment receipt files with proper CORS headers and authentication.
    This endpoint ensures media files are served with CORS headers and access control.
    Uses authenticated API route instead of static file serving to avoid CORS issues.
    """
    from fastapi.responses import FileResponse
    
    try:
        # Security: Sanitize filename to prevent directory traversal
        # Only allow alphanumeric, dashes, underscores, and dots (UUID format)
        import re
        # Allow UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.ext
        if not re.match(r'^[a-zA-Z0-9._-]+$', filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        # Find the uploads directory (same logic as upload endpoint)
        upload_dir = "uploads/payment_receipts"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Construct file path
        full_path = os.path.join(upload_dir, filename)
        
        # Security: Normalize path and verify it's within upload directory
        full_path = os.path.normpath(os.path.abspath(full_path))
        upload_dir_abs = os.path.normpath(os.path.abspath(upload_dir))
        
        # Verify the file is within the upload directory (prevent directory traversal)
        if not full_path.startswith(upload_dir_abs):
            logger.warning(f"Directory traversal attempt detected: {filename}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Check if file exists
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            logger.warning(f"Payment receipt not found: {filename} at {full_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Determine content type based on file extension
        _, file_ext = os.path.splitext(full_path)
        file_ext = file_ext.lower()
        media_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf'
        }
        media_type = media_types.get(file_ext, 'application/octet-stream')
        
        # Return file with proper headers
        # CORS middleware should handle CORS headers automatically
        return FileResponse(
            path=full_path,
            media_type=media_type,
            filename=filename,
            headers={
                "Cache-Control": "private, max-age=3600",
                "Content-Disposition": f'inline; filename="{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving payment receipt: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to serve file: {str(e)}"
        )

@router.post("/upload-payment-receipt", response_model=PaymentReceiptUploadResponse)
async def upload_payment_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Upload payment receipt file for appointment booking.
    Returns file URL to be used in booking request.
    """
    try:
        # Validate file is provided
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Validate file type
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only PDF, JPEG, PNG allowed."
            )
        
        # Read and validate file size (max 5MB)
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File too large. Maximum size is 5MB."
            )
        
        # Create upload directory
        upload_dir = "uploads/payment_receipts"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Return file URL (use /media/ path for serving)
        # Backend serves uploads at /media/, so payment_receipts will be at /media/payment_receipts/
        file_url = f"/media/payment_receipts/{unique_filename}"
        
        return PaymentReceiptUploadResponse(
            success=True,
            file_url=file_url,
            message="Payment receipt uploaded successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading payment receipt: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload payment receipt: {str(e)}"
        )

# Optional authentication for viewing slots (booking still requires auth)
async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> TypingOptional[dict]:
    """Get current user if authenticated, otherwise return None"""
    if not credentials or not credentials.credentials:
        return None
    try:
        # get_current_user_from_token is async, so await it
        return await get_current_user_from_token(credentials, db)
    except (HTTPException, Exception):
        # If auth fails, return None (allow viewing slots without auth)
        logger.debug(f"Optional auth failed, allowing unauthenticated access to slots")
        return None

@router.get("/specialists/{specialist_id}/available-slots", response_model=List[AvailableSlotResponse])
async def get_specialist_slots(
    specialist_id: str,
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    appointment_type: Optional[str] = Query("online", description="Type of appointment"),
    current_user: TypingOptional[dict] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get available slots for a specific specialist (public endpoint - no auth required to view)"""
    try:
        # Verify specialist exists and is active
        specialist = db.query(Specialists).filter(Specialists.id == specialist_id).first()
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )
        # Check if specialist is approved (only approved specialists can receive bookings)
        if hasattr(specialist, 'approval_status') and specialist.approval_status != ApprovalStatusEnum.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Specialist is not approved for bookings"
            )
        # Check if specialist is active (if field exists)
        if hasattr(specialist, 'is_active') and not specialist.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Specialist is not active"
            )
        
        # Set default date range to next 7 days if not provided
        today = datetime.now(PKT).date()
        if not start_date:
            start_date = today.strftime("%Y-%m-%d")
        if not end_date:
            # Default to 7 days from today (including today = 7 days total)
            end_date = (today + timedelta(days=6)).strftime("%Y-%m-%d")
        
        # Convert appointment type
        # Database enum only supports VIRTUAL and IN_PERSON, so use VIRTUAL for "online"
        appointment_type_enum = AppointmentTypeEnum.VIRTUAL if appointment_type == "online" else AppointmentTypeEnum.IN_PERSON
        
        # Generate slots for the date range
        # Parse dates and ensure timezone-aware
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        # Validate dates (no past dates)
        today = datetime.now(PKT).date()
        if start_dt < today:
            start_dt = today
        if end_dt < start_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date must be after start date"
            )
        
        # Optimize: Query all existing slots for the entire date range at once
        # This reduces database queries from N (one per date) to 1
        existing_slots = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.specialist_id == specialist_id,
            GeneratedTimeSlot.appointment_type == appointment_type_enum,
            func.date(GeneratedTimeSlot.slot_date) >= start_dt,
            func.date(GeneratedTimeSlot.slot_date) <= end_dt,
            GeneratedTimeSlot.status == SlotStatusEnum.AVAILABLE
        ).all()
        
        # Group existing slots by date
        slots_by_date = {}
        for slot in existing_slots:
            slot_date = slot.slot_date.date() if isinstance(slot.slot_date, datetime) else slot.slot_date
            if slot_date not in slots_by_date:
                slots_by_date[slot_date] = []
            slots_by_date[slot_date].append(slot)
        
        # Determine which dates need slot generation
        dates_to_generate = []
        current_date = start_dt
        while current_date <= end_dt:
            if current_date not in slots_by_date:
                dates_to_generate.append(current_date)
            current_date += timedelta(days=1)
        
        # Generate slots for all missing dates using the helper function
        if dates_to_generate:
            all_generated_slots = []
            for date_to_gen in dates_to_generate:
                # Use the helper function to generate slots for each date
                generated = generate_slots_for_single_date(
                    specialist_id=specialist_id,
                    target_date=date_to_gen,
                    appointment_type_enum=appointment_type_enum,
                    db=db
                )
                all_generated_slots.extend(generated)
            
            # Commit all generated slots at once
            if all_generated_slots:
                try:
                    db.commit()
                    logger.info(f"Generated {len(all_generated_slots)} slots for {len(dates_to_generate)} dates")
                except Exception as e:
                    db.rollback()
                    logger.error(f"Error committing generated slots: {str(e)}")
            
            # Refresh query to get all slots including newly generated ones
            existing_slots = db.query(GeneratedTimeSlot).filter(
                GeneratedTimeSlot.specialist_id == specialist_id,
                GeneratedTimeSlot.appointment_type == appointment_type_enum,
                func.date(GeneratedTimeSlot.slot_date) >= start_dt,
                func.date(GeneratedTimeSlot.slot_date) <= end_dt,
                GeneratedTimeSlot.status == SlotStatusEnum.AVAILABLE
            ).all()
        
        # Convert all slots to response format
        response_slots = []
        for slot in existing_slots:
            if slot.can_be_booked:
                # slot_date is a DateTime with timezone, it contains both date and time
                # Ensure it's timezone-aware and in PKT
                slot_start_dt = slot.slot_date
                
                # Handle different datetime formats and convert to PKT
                if isinstance(slot_start_dt, date) and not isinstance(slot_start_dt, datetime):
                    # If it's just a date (shouldn't happen but handle it), combine with time in PKT
                    slot_start_dt = datetime.combine(slot_start_dt, time(0, 0), tzinfo=PKT)
                elif isinstance(slot_start_dt, datetime):
                    # If it's a datetime, ensure it's in PKT timezone
                    if slot_start_dt.tzinfo is None:
                        # Naive datetime - assume it's in PKT
                        slot_start_dt = slot_start_dt.replace(tzinfo=PKT)
                    else:
                        # Timezone-aware datetime - convert to PKT
                        slot_start_dt = slot_start_dt.astimezone(PKT)
                else:
                    # Fallback: create PKT datetime
                    slot_start_dt = datetime.now(PKT).replace(hour=0, minute=0, second=0, microsecond=0)
                
                # Calculate end time from start time + duration
                slot_end_dt = slot_start_dt + timedelta(minutes=slot.duration_minutes)
                
                # Format dates for response (ISO format with timezone)
                slot_date_str = slot_start_dt.date().isoformat()  # Just the date part
                start_time_str = slot_start_dt.isoformat()  # Full datetime with timezone
                end_time_str = slot_end_dt.isoformat()  # Full datetime with timezone
                
                response_slots.append(AvailableSlotResponse(
                    slot_id=str(slot.id),
                    specialist_id=str(slot.specialist_id),
                    slot_date=slot_date_str,
                    start_time=start_time_str,
                    end_time=end_time_str,
                    appointment_type=slot.appointment_type.value,
                    duration_minutes=slot.duration_minutes,
                    is_available=slot.status == SlotStatusEnum.AVAILABLE,
                    can_be_booked=slot.can_be_booked
                ))
        
        logger.info(f"Returning {len(response_slots)} available slots for specialist {specialist_id}, type {appointment_type}, date range {start_date} to {end_date}")
        return response_slots
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting specialist slots: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get specialist slots: {str(e)}"
        )

@router.get("/specialists/{specialist_id}/available-slots/date", response_model=List[AvailableSlotResponse])
async def get_slots_for_date(
    specialist_id: str,
    date_str: str = Query(..., alias="date", description="Date in YYYY-MM-DD format"),
    appointment_type: str = Query(..., description="Type of appointment: online or in_person"),
    current_user: TypingOptional[dict] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Get available slots for a specific date (on-demand generation).
    Generates slots immediately if they don't exist.
    Only allows dates within the next 7 days.
    """
    try:
        # Validate specialist exists and is approved
        specialist = db.query(Specialists).filter(Specialists.id == specialist_id).first()
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )
        
        if hasattr(specialist, 'approval_status') and specialist.approval_status != ApprovalStatusEnum.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Specialist is not approved for bookings"
            )
        
        if hasattr(specialist, 'is_active') and not specialist.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Specialist is not active"
            )
        
        # Parse and validate date
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD format"
            )
        
        # Validate date is not in past
        today = datetime.now(PKT).date()
        if target_date < today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot get slots for past dates"
            )
        
        # Validate date is within 7 days
        max_date = today + timedelta(days=7)
        if target_date > max_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot get slots more than 7 days in advance"
            )
        
        # Convert appointment type
        # Database enum only supports VIRTUAL and IN_PERSON
        appointment_type_enum = AppointmentTypeEnum.VIRTUAL if appointment_type == "online" else AppointmentTypeEnum.IN_PERSON
        
        # Generate slots for the date if they don't exist
        generated_slots = generate_slots_for_single_date(
            specialist_id=specialist_id,
            target_date=target_date,
            appointment_type_enum=appointment_type_enum,
            db=db
        )
        
        # Commit generated slots if any
        if generated_slots:
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Error committing generated slots: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to save generated slots"
                )
        
        # Query all available slots for this date
        slots = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.specialist_id == specialist_id,
            GeneratedTimeSlot.appointment_type == appointment_type_enum,
            func.date(GeneratedTimeSlot.slot_date) == target_date,
            GeneratedTimeSlot.status == SlotStatusEnum.AVAILABLE,
            GeneratedTimeSlot.can_be_booked == True
        ).order_by(asc(GeneratedTimeSlot.slot_date)).all()
        
        # Convert to response format
        response_slots = []
        for slot in slots:
            # Ensure slot_date is a datetime and convert to PKT
            slot_date_dt = slot.slot_date
            
            # Handle different datetime formats
            if isinstance(slot_date_dt, date) and not isinstance(slot_date_dt, datetime):
                # If it's just a date, combine with time in PKT
                slot_date_dt = datetime.combine(slot_date_dt, time(0, 0), tzinfo=PKT)
            elif isinstance(slot_date_dt, datetime):
                # If it's a datetime, ensure it's in PKT timezone
                if slot_date_dt.tzinfo is None:
                    # Naive datetime - assume it's in PKT
                    slot_date_dt = slot_date_dt.replace(tzinfo=PKT)
                else:
                    # Timezone-aware datetime - convert to PKT
                    slot_date_dt = slot_date_dt.astimezone(PKT)
            else:
                # Fallback: create PKT datetime
                slot_date_dt = datetime.now(PKT).replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Calculate end time from start time + duration
            slot_end_dt = slot_date_dt + timedelta(minutes=slot.duration_minutes)
            
            # Format dates for response (ISO format with timezone)
            slot_date_str = slot_date_dt.date().isoformat()  # Just the date part
            start_time_str = slot_date_dt.isoformat()  # Full datetime with timezone
            end_time_str = slot_end_dt.isoformat()  # Full datetime with timezone
            
            response_slots.append(AvailableSlotResponse(
                slot_id=str(slot.id),
                specialist_id=str(slot.specialist_id),
                slot_date=slot_date_str,
                start_time=start_time_str,
                end_time=end_time_str,
                appointment_type=slot.appointment_type.value,
                duration_minutes=slot.duration_minutes,
                is_available=slot.status == SlotStatusEnum.AVAILABLE,
                can_be_booked=slot.can_be_booked
            ))
        
        logger.info(f"Returning {len(response_slots)} available slots for specialist {specialist_id}, date {date_str}, type {appointment_type}")
        return response_slots
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting slots for date: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get slots for date: {str(e)}"
        )

@router.post("/book", response_model=AppointmentBookingResponse)
async def book_appointment(
    booking_request: AppointmentBookingRequest,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Book an appointment with a specialist.
    """
    try:
        patient_id = current_user.get("user_id") or current_user.get("token_payload", {}).get("sub")
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Patient ID not found in token"
            )
        
        # Convert string to enum for slot lookup (database enum only supports VIRTUAL and IN_PERSON)
        slot_appointment_type_enum = AppointmentTypeEnum.VIRTUAL if booking_request.appointment_type == "online" else AppointmentTypeEnum.IN_PERSON
        
        # For Appointment model, use VIRTUAL for online appointments
        appointment_type_enum = AppointmentTypeEnum.VIRTUAL if booking_request.appointment_type == "online" else AppointmentTypeEnum.IN_PERSON
        
        # Get the slot with row-level locking
        slot_record = db.execute(
            select(GeneratedTimeSlot)
            .filter(
                GeneratedTimeSlot.id == booking_request.slot_id,
                GeneratedTimeSlot.specialist_id == booking_request.specialist_id,
                GeneratedTimeSlot.appointment_type == slot_appointment_type_enum,
                GeneratedTimeSlot.status == SlotStatusEnum.AVAILABLE
            )
            .with_for_update()
        ).scalar_one_or_none()
        
        if not slot_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slot not found or not available"
            )
        
        if not slot_record.can_be_booked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slot cannot be booked"
            )
        
        # Get specialist information BEFORE creating appointment (needed for fee)
        specialist = db.query(Specialists).filter(Specialists.id == booking_request.specialist_id).first()
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )
        
        # Get consultation fee from specialist (with fallback)
        consultation_fee = float(specialist.consultation_fee) if specialist.consultation_fee is not None else 100.0
        specialist_name = f"Dr. {specialist.first_name} {specialist.last_name}" if specialist else "Dr. Specialist"
        
        # For online/virtual appointments, payment info is required
        is_online = booking_request.appointment_type == "online"
        if is_online:
            if not booking_request.payment_method_id or not booking_request.payment_receipt:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment method and receipt are required for online appointments"
                )
            # For online appointments, status starts as PENDING_APPROVAL until specialist confirms payment
            appointment_status = AppointmentStatusEnum.PENDING_APPROVAL
            payment_status = PaymentStatusEnum.UNPAID
        else:
            # For in-person appointments, can be scheduled directly
            appointment_status = AppointmentStatusEnum.SCHEDULED
            payment_status = PaymentStatusEnum.UNPAID
        
        # Create appointment
        appointment_id = str(uuid.uuid4())
        
        # Generate meeting link for online appointments
        meeting_link = None
        if is_online:
            meeting_link = f"https://meet.mindmate.com/{appointment_id}"
        appointment = Appointment(
            id=appointment_id,
            patient_id=patient_id,
            specialist_id=booking_request.specialist_id,
            scheduled_start=slot_record.slot_date,
            scheduled_end=slot_record.slot_date + timedelta(minutes=slot_record.duration_minutes),
            appointment_type=AppointmentTypeEnum.VIRTUAL if booking_request.appointment_type == "online" else AppointmentTypeEnum.IN_PERSON,
            status=appointment_status,
            presenting_concern=booking_request.presenting_concern,
            request_message=booking_request.patient_notes,
            fee=consultation_fee,
            payment_status=payment_status,
            payment_method_id=booking_request.payment_method_id if is_online else None,
            payment_receipt=booking_request.payment_receipt if is_online else None,
            meeting_link=meeting_link
        )
        
        # Book the slot
        slot_record.status = SlotStatusEnum.BOOKED
        slot_record.appointment_id = appointment_id
        # Note: booked_by_patient_id and booked_at fields don't exist in GeneratedTimeSlot model
        # The appointment_id link is sufficient to track booking
        
        # Save to database
        db.add(appointment)
        db.commit()
        
        # Get patient and specialist emails for notification
        from app.models.patient import Patient
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        
        # Send emails for both SCHEDULED and PENDING_APPROVAL appointments
        # For PENDING_APPROVAL (online appointments), send notification that payment is pending
        # For SCHEDULED (in-person appointments), send confirmation email
        try:
            if appointment.status == AppointmentStatusEnum.PENDING_APPROVAL:
                # Send pending approval notification emails
                send_appointment_pending_approval_emails(
                    appointment=appointment,
                    patient_email=patient.email if patient else None,
                    patient_name=f"{patient.first_name} {patient.last_name}" if patient else "Patient",
                    specialist_email=specialist.email if specialist else None,
                    specialist_name=specialist_name
                )
            elif appointment.status == AppointmentStatusEnum.SCHEDULED:
                # Send confirmation emails for scheduled appointments
                send_appointment_confirmation_emails(
                    appointment=appointment,
                    patient_email=patient.email if patient else None,
                    patient_name=f"{patient.first_name} {patient.last_name}" if patient else "Patient",
                    specialist_email=specialist.email if specialist else None,
                    specialist_name=specialist_name
                )
        except Exception as e:
            logger.error(f"Failed to send appointment emails: {str(e)}")
            # Don't fail the booking if email fails
        
        # Return appointment type from stored appointment (virtual/in_person) for consistency
        # Frontend will convert "virtual" to "online" in mapAppointmentFields
        return AppointmentBookingResponse(
            success=True,
            appointment_id=appointment_id,
            specialist_name=specialist_name,
            scheduled_start=slot_record.slot_date.isoformat(),
            scheduled_end=(slot_record.slot_date + timedelta(minutes=slot_record.duration_minutes)).isoformat(),
            appointment_type=appointment.appointment_type.value,  # Use stored enum value for consistency
            fee=consultation_fee,  # Use actual specialist fee
            status=appointment.status.value,  # Use actual appointment status (PENDING_APPROVAL for online, SCHEDULED for in-person)
            meeting_link=appointment.meeting_link
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error booking appointment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to book appointment: {str(e)}"
        )

@router.get("/my-appointments", response_model=List[AppointmentResponse])
async def get_my_appointments(
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, description="Number of appointments to return"),
    offset: int = Query(0, description="Number of appointments to skip")
):
    """Get appointments for current user with optional filtering"""
    try:
        user_id = current_user.get("user_id") or current_user.get("token_payload", {}).get("sub")
        user_type = current_user.get("user_type")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        # Build query based on user type - use explicit column selection to avoid missing columns
        # Use select() with only columns that exist in the database
        from sqlalchemy import select
        
        if user_type == "patient":
            query = select(Appointment).filter(Appointment.patient_id == user_id)
        elif user_type == "specialist":
            query = select(Appointment).filter(Appointment.specialist_id == user_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid user type"
            )
        
        # Apply status filter if provided
        # Convert string to enum if needed
        if status_filter:
            try:
                # Try to match the status string to enum
                status_enum = None
                for status in AppointmentStatusEnum:
                    if status.value.lower() == status_filter.lower():
                        status_enum = status
                        break
                
                if status_enum:
                    query = query.filter(Appointment.status == status_enum)
                else:
                    # If no match, try direct enum creation
                    query = query.filter(Appointment.status == AppointmentStatusEnum(status_filter))
            except (ValueError, AttributeError):
                # If status_filter doesn't match any enum, ignore it
                logger.warning(f"Invalid status filter: {status_filter}")
        
        # Apply ordering (most recent first)
        query = query.order_by(desc(Appointment.created_at))
        
        # Apply pagination
        query = query.order_by(desc(Appointment.created_at)).offset(offset).limit(limit)
        appointments = db.execute(query).scalars().all()
        
        # Convert to response format
        response_appointments = []
        for appointment in appointments:
            # Get specialist name
            specialist = db.query(Specialists).filter(Specialists.id == appointment.specialist_id).first()
            specialist_name = f"{specialist.first_name} {specialist.last_name}" if specialist else "Unknown Specialist"
            
            # Get patient name (for specialist view)
            patient_name = None
            if user_type == "specialist":
                patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()
                patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown Patient"
            
            # Use stored meeting link or generate if not set
            meeting_link = appointment.meeting_link
            if appointment.appointment_type == AppointmentTypeEnum.VIRTUAL and not meeting_link:
                meeting_link = f"https://meet.mindmate.com/{appointment.id}"
                # Update appointment record with meeting link
                appointment.meeting_link = meeting_link
                db.commit()
            
            # Create response dict with all fields
            # Handle potentially missing request_message column gracefully
            try:
                request_msg = appointment.request_message or ""
            except (AttributeError, Exception):
                request_msg = ""
            
            response_data = {
                "id": str(appointment.id),
                "specialist_id": str(appointment.specialist_id),
                "specialist_name": specialist_name,
                "patient_id": str(appointment.patient_id),
                "scheduled_start": appointment.scheduled_start.isoformat() if appointment.scheduled_start else "",
                "scheduled_end": appointment.scheduled_end.isoformat() if appointment.scheduled_end else "",
                "appointment_type": appointment.appointment_type.value,
                "status": appointment.status.value,
                "presenting_concern": appointment.presenting_concern or "",
                "request_message": request_msg,
                "fee": float(appointment.fee),
                "payment_status": appointment.payment_status.value if appointment.payment_status else None,
                "payment_method_id": getattr(appointment, 'payment_method_id', None),
                "payment_receipt": getattr(appointment, 'payment_receipt', None),
                "meeting_link": appointment.meeting_link,
                "created_at": appointment.created_at.isoformat() if appointment.created_at else "",
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else ""
            }
            
            # Add patient_name if available (for specialist view)
            if patient_name:
                response_data["patient_name"] = patient_name
            
            response_appointments.append(AppointmentResponse(**response_data))
        
        return response_appointments
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting appointments: {e}")
        # Rollback the session to clear any failed transaction state
        try:
            db.rollback()
        except:
            pass
        # Return empty list instead of 500 error
        return []

# NOTE: Duplicate endpoint /api/appointments/ removed
# Use /api/appointments/my-appointments instead (has filtering and pagination)

@router.put("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    cancellation_data: dict = Body(...),
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Cancel a specific appointment"""
    try:
        user_id = current_user.get("user_id") or current_user.get("token_payload", {}).get("sub")
        user_type = current_user.get("user_type")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        # Get the appointment
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Check if user has permission to cancel this appointment
        if user_type == "patient" and str(appointment.patient_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own appointments"
            )
        elif user_type == "specialist" and str(appointment.specialist_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own appointments"
            )
        
        # Check if appointment can be cancelled
        if appointment.status in [AppointmentStatusEnum.COMPLETED, AppointmentStatusEnum.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Appointment cannot be cancelled. Current status: {appointment.status.value}"
            )
        
        # Update appointment status
        appointment.status = AppointmentStatusEnum.CANCELLED
        appointment.cancellation_reason = cancellation_data.get("reason", "Cancelled by user")
        appointment.updated_at = datetime.now(PKT)
        
        # Release the time slot if it exists
        slot = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.appointment_id == appointment_id
        ).first()
        if slot:
            slot.status = SlotStatusEnum.AVAILABLE
            slot.appointment_id = None
        
        db.commit()
        
        return {
            "success": True,
            "message": "Appointment cancelled successfully",
            "appointment_id": appointment_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling appointment: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel appointment: {str(e)}"
        )

@router.put("/{appointment_id}/reschedule")
async def reschedule_appointment(
    appointment_id: str,
    reschedule_data: dict = Body(...),
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Reschedule a specific appointment"""
    try:
        user_id = current_user.get("user_id") or current_user.get("token_payload", {}).get("sub")
        user_type = current_user.get("user_type")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        # Get the appointment
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Check if user has permission to reschedule this appointment
        if user_type == "patient" and str(appointment.patient_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only reschedule your own appointments"
            )
        elif user_type == "specialist" and str(appointment.specialist_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only reschedule your own appointments"
            )
        
        # Check if appointment can be rescheduled
        if appointment.status in [AppointmentStatusEnum.COMPLETED, AppointmentStatusEnum.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Appointment cannot be rescheduled. Current status: {appointment.status.value}"
            )
        
        # Get new slot information
        new_slot_id = reschedule_data.get("new_slot_id")
        if not new_slot_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New slot ID is required for rescheduling"
            )
        
        # Get the new slot
        new_slot = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.id == new_slot_id,
            GeneratedTimeSlot.status == SlotStatusEnum.AVAILABLE
        ).first()
        
        if not new_slot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New slot not found or not available"
            )
        
        # Release old slot if it exists
        old_slot = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.appointment_id == appointment_id
        ).first()
        
        if old_slot:
            old_slot.status = SlotStatusEnum.AVAILABLE
            old_slot.appointment_id = None
            # Commit the old slot release first
            db.commit()
        
        # Book new slot
        new_slot.status = SlotStatusEnum.BOOKED
        new_slot.appointment_id = appointment_id
        
        # Update appointment
        appointment.scheduled_start = new_slot.slot_date
        appointment.scheduled_end = new_slot.slot_date + timedelta(minutes=new_slot.duration_minutes)
        appointment.updated_at = datetime.now(PKT)
        
        # Commit the new slot booking and appointment update
        db.commit()
        
        return {
            "success": True,
            "message": "Appointment rescheduled successfully",
            "appointment_id": appointment_id,
            "new_scheduled_start": appointment.scheduled_start.isoformat(),
            "new_scheduled_end": appointment.scheduled_end.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rescheduling appointment: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reschedule appointment: {str(e)}"
        )

@router.post("/{appointment_id}/complete")
async def complete_appointment(
    appointment_id: str,
    completion_data: dict = Body(...),
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Mark an appointment as completed (specialist only)"""
    try:
        user_id = current_user.get("user_id") or current_user.get("token_payload", {}).get("sub")
        user_type = current_user.get("user_type")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only specialists can complete appointments"
            )
        
        # Get the appointment
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Check if specialist owns this appointment
        if str(appointment.specialist_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only complete your own appointments"
            )
        
        # Check if appointment can be completed
        if appointment.status in [AppointmentStatusEnum.COMPLETED, AppointmentStatusEnum.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Appointment cannot be completed. Current status: {appointment.status.value}"
            )
        
        # Update appointment status
        appointment.status = AppointmentStatusEnum.COMPLETED
        appointment.completion_notes = completion_data.get("notes", "")
        appointment.updated_at = datetime.now(PKT)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Appointment marked as completed",
            "appointment_id": appointment_id,
            "status": "completed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing appointment: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete appointment: {str(e)}"
        )

@router.get("/specialists/search")
async def search_specialists(
    query: Optional[str] = Query(None, description="Search query for specialist name or specialization"),
    specialization: Optional[str] = Query(None, description="Filter by specialization"),
    location: Optional[str] = Query(None, description="Filter by location"),
    limit: int = Query(20, description="Number of specialists to return"),
    offset: int = Query(0, description="Number of specialists to skip"),
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Search for specialists with optional filters"""
    try:
        # Build query
        specialist_query = db.query(Specialists)
        
        # Apply search filters
        if query:
            specialist_query = specialist_query.filter(
                or_(
                    Specialists.first_name.ilike(f"%{query}%"),
                    Specialists.last_name.ilike(f"%{query}%")
                )
            )
        
        if specialization:
            specialist_query = specialist_query.filter(
                Specialists.specialist_type == specialization
            )
        
        if location:
            specialist_query = specialist_query.filter(
                or_(
                    Specialists.city.ilike(f"%{location}%"),
                    Specialists.state.ilike(f"%{location}%"),
                    Specialists.country.ilike(f"%{location}%")
                )
            )
        
        # Apply pagination
        specialists = specialist_query.offset(offset).limit(limit).all()
        
        # Convert to response format
        response_specialists = []
        for specialist in specialists:
            response_specialists.append({
                "id": str(specialist.id),
                "first_name": specialist.first_name,
                "last_name": specialist.last_name,
                "specialization": specialist.specialist_type.value if specialist.specialist_type else "General",
                "city": getattr(specialist, 'city', ''),
                "state": getattr(specialist, 'state', ''),
                "country": getattr(specialist, 'country', ''),
                "profile_picture": getattr(specialist, 'profile_picture', ''),
                "rating": getattr(specialist, 'rating', 4.5),  # Default rating if not available
                "experience_years": specialist.years_experience or 5,  # Use years_experience field
                "is_available_online": True,  # Default to true for now
                "is_available_in_person": True  # Default to true for now
            })
        
        return {
            "specialists": response_specialists,
            "total": len(response_specialists),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error searching specialists: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search specialists: {str(e)}"
        )

@router.post("/specialists/availability")
async def set_specialist_availability(
    availability_request: SpecialistAvailabilityRequest,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Set specialist availability for online and in-person appointments.
    """
    try:
        user_id = current_user.get("user_id") or current_user.get("token_payload", {}).get("sub")
        user_type = current_user.get("user_type")
        
        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )
        
        # Clear existing availability templates
        db.query(SpecialistAvailabilityTemplate).filter(
            SpecialistAvailabilityTemplate.specialist_id == user_id
        ).delete()
        
        # Create online availability templates
        # Use ONLINE for GeneratedTimeSlot compatibility (which uses ONLINE enum)
        for weekday, schedule in availability_request.online_availability.items():
            if schedule.get('is_available', True):
                template = SpecialistAvailabilityTemplate(
                    specialist_id=user_id,
                    day_of_week=get_weekday_enum(weekday),
                    appointment_type=AppointmentTypeEnum.VIRTUAL,  # VIRTUAL for slot generation (database enum only supports VIRTUAL and IN_PERSON)
                    start_time=schedule['start_time'],
                    end_time=schedule['end_time'],
                    slot_length_minutes=schedule.get('slot_length_minutes', 60),
                    break_between_slots_minutes=schedule.get('break_between_slots_minutes', 0),
                    is_active=True
                )
                db.add(template)
        
        # Create in-person availability templates
        for weekday, schedule in availability_request.in_person_availability.items():
            if schedule.get('is_available', True):
                template = SpecialistAvailabilityTemplate(
                    specialist_id=user_id,
                    day_of_week=get_weekday_enum(weekday),
                    appointment_type=AppointmentTypeEnum.IN_PERSON,
                    start_time=schedule['start_time'],
                    end_time=schedule['end_time'],
                    slot_length_minutes=schedule.get('slot_length_minutes', 60),
                    break_between_slots_minutes=schedule.get('break_between_slots_minutes', 0),
                    is_active=True
                )
                db.add(template)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Availability set successfully",
            "specialist_id": user_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error setting specialist availability: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set availability: {str(e)}"
        )

@router.get("/pending-payments")
async def get_pending_payments(
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get appointments with pending payments (specialist only).
    Returns appointments with payment_receipt but payment_status = UNPAID
    """
    try:
        user_id = current_user.get("user_id") or current_user.get("token_payload", {}).get("sub")
        user_type = current_user.get("user_type")
        
        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )
        
        # Get appointments for this specialist that are unpaid
        # Note: payment_receipt is a property, not a database column, so we can't filter by it
        appointments = db.query(Appointment).filter(
            Appointment.specialist_id == user_id,
            Appointment.payment_status == PaymentStatusEnum.UNPAID,
            Appointment.appointment_type == AppointmentTypeEnum.VIRTUAL,
            Appointment.status == AppointmentStatusEnum.PENDING_APPROVAL
        ).order_by(desc(Appointment.created_at)).all()
        
        response_appointments = []
        for appointment in appointments:
            # Get patient name
            patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()
            patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown Patient"
            
            response_appointments.append({
                "id": str(appointment.id),
                "patient_id": str(appointment.patient_id),
                "patient_name": patient_name,
                "scheduled_start": appointment.scheduled_start.isoformat() if appointment.scheduled_start else "",
                "scheduled_end": appointment.scheduled_end.isoformat() if appointment.scheduled_end else "",
                "fee": float(appointment.fee),
                "payment_method_id": getattr(appointment, 'payment_method_id', None),
                "payment_receipt": getattr(appointment, 'payment_receipt', None),
                "presenting_concern": appointment.presenting_concern or "",
                "request_message": appointment.request_message or "",
                "created_at": appointment.created_at.isoformat() if appointment.created_at else ""
            })
        
        return {
            "pending_payments": response_appointments,
            "total": len(response_appointments)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pending payments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get pending payments: {str(e)}"
        )

@router.post("/{appointment_id}/confirm-payment")
async def confirm_payment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Confirm payment for an appointment (specialist only).
    This confirms payment and approves the appointment booking.
    """
    try:
        user_id = current_user.get("user_id") or current_user.get("token_payload", {}).get("sub")
        user_type = current_user.get("user_type")
        
        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )
        
        # Get the appointment
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Check if specialist owns this appointment
        if str(appointment.specialist_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only confirm payment for your own appointments"
            )
        
        # Check if payment is already confirmed
        if appointment.payment_status == PaymentStatusEnum.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment already confirmed"
            )
        
        # Check if appointment has payment receipt
        if not getattr(appointment, 'payment_receipt', None):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No payment receipt found for this appointment"
            )
        
        # Confirm payment and approve appointment
        appointment.payment_status = PaymentStatusEnum.PAID
        appointment.payment_confirmed_by = user_id
        appointment.payment_confirmed_at = datetime.now(PKT)
        
        # Change status from PENDING_APPROVAL to SCHEDULED
        if appointment.status == AppointmentStatusEnum.PENDING_APPROVAL:
            appointment.status = AppointmentStatusEnum.SCHEDULED
            # Generate meeting link if not already set (for online appointments)
            if appointment.appointment_type == AppointmentTypeEnum.VIRTUAL and not appointment.meeting_link:
                appointment.meeting_link = f"https://meet.mindmate.com/{appointment_id}"
        
        appointment.updated_at = datetime.now(PKT)
        
        db.commit()
        
        # Send confirmation emails to both patient and specialist
        try:
            # Get patient and specialist details
            patient = db.query(Patient).filter(Patient.id == appointment.patient_id).first()
            specialist = db.query(Specialists).filter(Specialists.id == appointment.specialist_id).first()
            
            send_appointment_confirmation_emails(
                appointment=appointment,
                patient_email=patient.email if patient else None,
                patient_name=f"{patient.first_name} {patient.last_name}" if patient else "Patient",
                specialist_email=specialist.email if specialist else None,
                specialist_name=f"{specialist.first_name} {specialist.last_name}" if specialist else "Specialist"
            )
        except Exception as e:
            logger.error(f"Failed to send appointment confirmation emails: {str(e)}")
            # Don't fail the payment confirmation if email fails
        
        return {
            "success": True,
            "message": "Payment confirmed and appointment approved",
            "appointment_id": appointment_id,
            "payment_status": "paid",
            "appointment_status": appointment.status.value
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error confirming payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm payment: {str(e)}"
        )

@router.post("/{appointment_id}/reject-payment")
async def reject_payment(
    appointment_id: str,
    rejection_data: PaymentRejectionRequest,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Reject payment for an appointment (specialist only).
    This rejects the payment and cancels the appointment.
    """
    try:
        user_id = current_user.get("user_id") or current_user.get("token_payload", {}).get("sub")
        user_type = current_user.get("user_type")
        
        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )
        
        # Get the appointment
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Check if specialist owns this appointment
        if str(appointment.specialist_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only reject payment for your own appointments"
            )
        
        # Check if appointment is in pending approval status
        if appointment.status != AppointmentStatusEnum.PENDING_APPROVAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Appointment cannot be rejected. Current status: {appointment.status.value}"
            )
        
        # Reject payment and cancel appointment
        appointment.status = AppointmentStatusEnum.REJECTED
        appointment.rejection_reason = rejection_data.reason
        appointment.updated_at = datetime.now(PKT)
        
        # Release the time slot
        slot = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.appointment_id == appointment_id
        ).first()
        if slot:
            slot.status = SlotStatusEnum.AVAILABLE
            slot.appointment_id = None
        
        db.commit()
        
        return {
            "success": True,
            "message": "Payment rejected and appointment cancelled",
            "appointment_id": appointment_id,
            "status": "rejected"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error rejecting payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reject payment: {str(e)}"
        )


# ============================================================================
# REVIEW SYSTEM
# ============================================================================

@router.post("/{appointment_id}/review", response_model=ReviewResponse)
async def submit_review(
    appointment_id: str,
    review_request: SubmitReviewRequest,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Submit a review for a completed appointment.
    Only patients can submit reviews for their own completed appointments.
    """
    try:
        
        user_id = current_user.get("user_id") or current_user.get("token_payload", {}).get("sub")
        user_type = current_user.get("user_type")
        
        # Verify user is a patient
        if user_type != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only patients can submit reviews"
            )
        
        # Get the appointment
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found"
            )
        
        # Verify appointment belongs to the patient
        if str(appointment.patient_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only review your own appointments"
            )
        
        # Check if appointment is completed
        if appointment.status != AppointmentStatusEnum.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Can only review completed appointments. Current status: {appointment.status.value}"
            )
        
        # Check if review already exists for this appointment
        existing_review = db.query(SpecialistReview).filter(
            SpecialistReview.appointment_id == uuid.UUID(appointment_id)
        ).first()
        
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Review already submitted for this appointment"
            )
        
        # Create review record - Auto-approve since it's from an authenticated patient for a completed appointment
        review_id = uuid.uuid4()
        review = SpecialistReview(
            id=review_id,
            appointment_id=uuid.UUID(appointment_id),
            specialist_id=appointment.specialist_id,
            patient_id=uuid.UUID(user_id),
            rating=review_request.rating,
            review_text=review_request.review_text,
            communication_rating=review_request.communication_rating,
            professionalism_rating=review_request.professionalism_rating,
            effectiveness_rating=review_request.effectiveness_rating,
            is_anonymous=review_request.is_anonymous,
            status=ReviewStatusEnum.APPROVED  # Auto-approve reviews from authenticated patients
        )
        
        db.add(review)
        db.flush()  # Flush to ensure review is available for query
        
        # Update appointment with patient rating (for backward compatibility)
        appointment.patient_rating = review_request.rating
        appointment.patient_review = review_request.review_text
        appointment.review_submitted_at = datetime.now(PKT)
        
        # Update specialist's average rating and total reviews count
        specialist = db.query(Specialists).filter(Specialists.id == appointment.specialist_id).first()
        if specialist:
            # Get all approved reviews for this specialist (including the one we just added)
            all_approved_reviews = db.query(SpecialistReview).filter(
                SpecialistReview.specialist_id == appointment.specialist_id,
                SpecialistReview.status == ReviewStatusEnum.APPROVED
            ).all()
            
            if all_approved_reviews:
                # Calculate new average rating
                total_ratings = sum(r.rating for r in all_approved_reviews)
                new_average_rating = total_ratings / len(all_approved_reviews)
                specialist.average_rating = round(new_average_rating, 2)
                specialist.total_reviews = len(all_approved_reviews)
                # Also update the alias fields
                specialist.rating = round(new_average_rating, 2)
                specialist.reviews_count = len(all_approved_reviews)
            else:
                # This shouldn't happen, but handle it just in case
                specialist.average_rating = float(review_request.rating)
                specialist.total_reviews = 1
                specialist.rating = float(review_request.rating)
                specialist.reviews_count = 1
        
        db.commit()
        
        return {
            "review_id": str(review_id),
            "appointment_id": appointment_id,
            "message": "Review submitted successfully.",
            "rating": review_request.rating
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error submitting review: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit review: {str(e)}"
        )
