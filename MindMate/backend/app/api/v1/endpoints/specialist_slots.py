"""
Enhanced Specialist Slots Management API
========================================
Robust weekday-wise slots management system with advanced scheduling capabilities.
Provides comprehensive slot management for specialists with recurring patterns,
availability templates, and intelligent slot generation.

Author: Mental Health Platform Team
Version: 2.0.0 - Advanced slots management system
"""

import os
import uuid
import logging
from datetime import datetime, timedelta, timezone, date, time
from typing import Optional, List, Dict, Any
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from pydantic import BaseModel, Field, field_validator, validator

from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_user_from_token
from app.models.specialist import Specialists
from app.models.appointment import (
    GeneratedTimeSlot, SlotStatusEnum as AppointmentSlotStatusEnum,
    AppointmentTypeEnum, DayOfWeekEnum, SpecialistAvailabilityTemplate
)

# ============================================================================
# ENUMS AND CONSTANTS
# ============================================================================

class WeekdayEnum(str, Enum):
    """Weekday enumeration"""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

# Use SlotStatusEnum from appointment model
SlotStatusEnum = AppointmentSlotStatusEnum

class RecurrenceTypeEnum(str, Enum):
    """Recurrence type enumeration"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class TimeSlotTemplate(BaseModel):
    """Template for creating recurring time slots"""
    weekday: WeekdayEnum = Field(..., description="Day of the week")
    start_time: str = Field(..., description="Start time in HH:MM format")
    end_time: str = Field(..., description="End time in HH:MM format")
    duration_minutes: int = Field(30, description="Duration of each slot in minutes")
    is_active: bool = Field(True, description="Whether this template is active")
    max_appointments: int = Field(1, description="Maximum appointments per slot")

class WeeklySchedule(BaseModel):
    """Weekly schedule configuration"""
    templates: List[TimeSlotTemplate] = Field(..., description="Time slot templates for each day")
    timezone: str = Field("UTC", description="Timezone for the schedule")
    is_active: bool = Field(True, description="Whether the weekly schedule is active")

class SlotGenerationRequest(BaseModel):
    """Request to generate slots for a date range"""
    start_date: date = Field(..., description="Start date for slot generation")
    end_date: date = Field(..., description="End date for slot generation")
    use_weekly_template: bool = Field(True, description="Use weekly template for generation")
    custom_slots: Optional[List[Dict[str, Any]]] = Field(None, description="Custom slots if not using template")

class SlotUpdateRequest(BaseModel):
    """Request to update slot status"""
    status: SlotStatusEnum = Field(..., description="New status for the slot")
    notes: Optional[str] = Field(None, description="Notes for the status change (not used, kept for compatibility)")

class BulkSlotUpdateRequest(BaseModel):
    """Request for bulk slot updates"""
    slot_ids: List[str] = Field(..., description="List of slot IDs to update")
    status: SlotStatusEnum = Field(..., description="New status for all slots")
    notes: Optional[str] = Field(None, description="Notes for the status change (not used, kept for compatibility)")

class SlotResponse(BaseModel):
    """Response model for individual slot (using GeneratedTimeSlot)"""
    id: str
    specialist_id: str
    slot_date: str  # ISO format datetime
    start_time: str  # ISO format datetime
    end_time: str  # ISO format datetime
    appointment_type: str
    duration_minutes: int
    status: str
    can_be_booked: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class WeeklyScheduleResponse(BaseModel):
    """Response model for weekly schedule"""
    specialist_id: uuid.UUID
    templates: List[TimeSlotTemplate]
    timezone: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

class SlotsSummaryResponse(BaseModel):
    """Response model for slots summary"""
    total_slots: int
    available_slots: int
    booked_slots: int
    blocked_slots: int
    upcoming_slots: int
    slots_by_status: Dict[str, int]
    slots_by_weekday: Dict[str, int]

# ============================================================================
# ROUTER SETUP
# ============================================================================

router = APIRouter(prefix="/specialists/slots", tags=["Specialist Slots"])
logger = logging.getLogger(__name__)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_weekday_from_date(date_obj: date) -> WeekdayEnum:
    """Get weekday enum from date object"""
    weekdays = {
        0: WeekdayEnum.MONDAY,
        1: WeekdayEnum.TUESDAY,
        2: WeekdayEnum.WEDNESDAY,
        3: WeekdayEnum.THURSDAY,
        4: WeekdayEnum.FRIDAY,
        5: WeekdayEnum.SATURDAY,
        6: WeekdayEnum.SUNDAY
    }
    return weekdays[date_obj.weekday()]

# Note: Slot generation is now handled by appointments.py generate_slots_for_single_date()
# This function is kept for backward compatibility but should use GeneratedTimeSlot
# For new implementations, use the appointments endpoint for slot generation

# ============================================================================
# API ENDPOINTS
# ============================================================================

# NOTE: Weekly schedule endpoints moved to /api/specialists/schedule/*
# Use weekly_schedule.py router for schedule management

@router.post("/generate", response_model=List[SlotResponse], deprecated=True)
async def generate_slots(
    request: SlotGenerationRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    DEPRECATED: Generate time slots for a date range.
    This endpoint is deprecated. Use /api/appointments/specialists/{id}/available-slots endpoint instead.
    Creates slots based on availability templates using GeneratedTimeSlot model.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        # Import the helper function from appointments.py
        from app.api.v1.endpoints.appointments import generate_slots_for_single_date

        generated_slots = []
        current_date = request.start_date
        today = datetime.now(timezone.utc).date()
        
        # Limit to 7 days ahead
        max_date = today + timedelta(days=7)
        if request.end_date > max_date:
            request.end_date = max_date

        # Default to online appointment type (can be extended)
        # Database enum only supports VIRTUAL and IN_PERSON
        appointment_type_enum = AppointmentTypeEnum.VIRTUAL

        while current_date <= request.end_date:
            if current_date < today:
                current_date += timedelta(days=1)
                continue
            
            # Use the helper function from appointments.py
            slots = generate_slots_for_single_date(
                specialist_id=str(user.id),
                target_date=current_date,
                appointment_type_enum=appointment_type_enum,
                db=db
            )
            generated_slots.extend(slots)
            
            current_date += timedelta(days=1)

        # Commit all generated slots
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

        # Query generated slots to return
        all_slots = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.specialist_id == user.id,
            GeneratedTimeSlot.appointment_type == appointment_type_enum,
            func.date(GeneratedTimeSlot.slot_date) >= request.start_date,
            func.date(GeneratedTimeSlot.slot_date) <= request.end_date
        ).all()

        # Convert to response format
        response_slots = []
        for slot in all_slots:
            slot_date_dt = slot.slot_date
            if isinstance(slot_date_dt, date) and not isinstance(slot_date_dt, datetime):
                slot_date_dt = datetime.combine(slot_date_dt, time(0, 0), tzinfo=timezone.utc)
            end_time_dt = slot_date_dt + timedelta(minutes=slot.duration_minutes)
            
            response_slots.append(SlotResponse(
                id=str(slot.id),
                specialist_id=str(slot.specialist_id),
                slot_date=slot_date_dt.isoformat(),
                start_time=slot_date_dt.isoformat(),
                end_time=end_time_dt.isoformat(),
                appointment_type=slot.appointment_type.value,
                duration_minutes=slot.duration_minutes,
                status=slot.status.value,
                can_be_booked=slot.can_be_booked,
                created_at=slot.created_at.isoformat() if slot.created_at else None,
                updated_at=slot.updated_at.isoformat() if slot.updated_at else None
            ))

        return response_slots

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate slots: {str(e)}"
        )

@router.get("/", response_model=List[SlotResponse])
async def get_slots(
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    status_filter: Optional[SlotStatusEnum] = Query(None, description="Status filter"),
    appointment_type: Optional[str] = Query(None, description="Appointment type filter: online or in_person"),
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get specialist's time slots with optional filtering.
    Returns slots based on date range and status filters.
    Uses GeneratedTimeSlot model.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        # Build query using GeneratedTimeSlot
        query = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.specialist_id == user.id
        )

        # Apply appointment type filter
        if appointment_type:
            appointment_type_enum = AppointmentTypeEnum.VIRTUAL if appointment_type == "online" else AppointmentTypeEnum.IN_PERSON  # Database enum only supports VIRTUAL and IN_PERSON
            query = query.filter(GeneratedTimeSlot.appointment_type == appointment_type_enum)

        # Apply date filters
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(func.date(GeneratedTimeSlot.slot_date) >= start_dt)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use YYYY-MM-DD"
                )
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
                query = query.filter(func.date(GeneratedTimeSlot.slot_date) <= end_dt)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use YYYY-MM-DD"
                )

        # Apply status filter
        if status_filter:
            query = query.filter(GeneratedTimeSlot.status == status_filter)

        slots = query.order_by(GeneratedTimeSlot.slot_date).all()

        # Convert to response format
        response_slots = []
        for slot in slots:
            slot_date_dt = slot.slot_date
            if isinstance(slot_date_dt, date) and not isinstance(slot_date_dt, datetime):
                slot_date_dt = datetime.combine(slot_date_dt, time(0, 0), tzinfo=timezone.utc)
            
            end_time_dt = slot_date_dt + timedelta(minutes=slot.duration_minutes)
            
            response_slots.append(SlotResponse(
                id=str(slot.id),
                specialist_id=str(slot.specialist_id),
                slot_date=slot_date_dt.isoformat(),
                start_time=slot_date_dt.isoformat(),
                end_time=end_time_dt.isoformat(),
                appointment_type=slot.appointment_type.value,
                duration_minutes=slot.duration_minutes,
                status=slot.status.value,
                can_be_booked=slot.can_be_booked,
                created_at=slot.created_at.isoformat() if slot.created_at else None,
                updated_at=slot.updated_at.isoformat() if slot.updated_at else None
            ))

        return response_slots

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get slots: {str(e)}"
        )

@router.put("/{slot_id}", response_model=SlotResponse)
async def update_slot(
    slot_id: str,
    request: SlotUpdateRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Update a specific time slot.
    Allows updating slot status.
    Uses GeneratedTimeSlot model.
    Note: Use PUT /{slot_id}/status endpoint instead for status updates.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        # Get the slot
        slot = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.id == slot_id,
            GeneratedTimeSlot.specialist_id == user.id
        ).first()

        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slot not found"
            )

        # Update slot status
        slot.status = request.status
        slot.can_be_booked = (request.status == SlotStatusEnum.AVAILABLE)

        db.commit()

        # Convert to response format
        slot_date_dt = slot.slot_date
        if isinstance(slot_date_dt, date) and not isinstance(slot_date_dt, datetime):
            slot_date_dt = datetime.combine(slot_date_dt, time(0, 0), tzinfo=timezone.utc)
        end_time_dt = slot_date_dt + timedelta(minutes=slot.duration_minutes)

        return SlotResponse(
            id=str(slot.id),
            specialist_id=str(slot.specialist_id),
            slot_date=slot_date_dt.isoformat(),
            start_time=slot_date_dt.isoformat(),
            end_time=end_time_dt.isoformat(),
            appointment_type=slot.appointment_type.value,
            duration_minutes=slot.duration_minutes,
            status=slot.status.value,
            can_be_booked=slot.can_be_booked,
            created_at=slot.created_at.isoformat() if slot.created_at else None,
            updated_at=slot.updated_at.isoformat() if slot.updated_at else None
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating slot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update slot: {str(e)}"
        )

@router.put("/bulk-update", response_model=List[SlotResponse])
async def bulk_update_slots(
    request: BulkSlotUpdateRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Bulk update multiple time slots.
    Efficiently updates multiple slots with the same status.
    Uses GeneratedTimeSlot model.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        # Get all slots belonging to the specialist
        slots = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.id.in_(request.slot_ids),
            GeneratedTimeSlot.specialist_id == user.id
        ).all()

        if not slots:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No slots found"
            )

        # Update all slots
        updated_slots = []
        for slot in slots:
            # Skip booked slots (cannot change status of booked slots)
            if slot.status == SlotStatusEnum.BOOKED:
                continue
            
            slot.status = request.status
            slot.can_be_booked = (request.status == SlotStatusEnum.AVAILABLE)
            updated_slots.append(slot)

        db.commit()

        # Convert to response format
        response_slots = []
        for slot in updated_slots:
            slot_date_dt = slot.slot_date
            if isinstance(slot_date_dt, date) and not isinstance(slot_date_dt, datetime):
                slot_date_dt = datetime.combine(slot_date_dt, time(0, 0), tzinfo=timezone.utc)
            end_time_dt = slot_date_dt + timedelta(minutes=slot.duration_minutes)
            
            response_slots.append(SlotResponse(
                id=str(slot.id),
                specialist_id=str(slot.specialist_id),
                slot_date=slot_date_dt.isoformat(),
                start_time=slot_date_dt.isoformat(),
                end_time=end_time_dt.isoformat(),
                appointment_type=slot.appointment_type.value,
                duration_minutes=slot.duration_minutes,
                status=slot.status.value,
                can_be_booked=slot.can_be_booked,
                created_at=slot.created_at.isoformat() if slot.created_at else None,
                updated_at=slot.updated_at.isoformat() if slot.updated_at else None
            ))

        return response_slots

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error bulk updating slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk update slots: {str(e)}"
        )

@router.get("/summary", response_model=SlotsSummaryResponse)
async def get_slots_summary(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive summary of specialist's slots.
    Returns statistics and counts for different slot statuses.
    Uses GeneratedTimeSlot model.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        # Get all slots for the specialist
        slots = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.specialist_id == user.id
        ).all()

        # Calculate statistics
        today = datetime.now(timezone.utc).date()
        total_slots = len(slots)
        available_slots = len([s for s in slots if s.status == SlotStatusEnum.AVAILABLE and s.can_be_booked])
        booked_slots = len([s for s in slots if s.status == SlotStatusEnum.BOOKED])
        blocked_slots = len([s for s in slots if s.status == SlotStatusEnum.BLOCKED])
        
        # Upcoming slots (next 7 days)
        upcoming_date = today + timedelta(days=7)
        upcoming_slots = len([s for s in slots if 
                            (s.slot_date.date() if isinstance(s.slot_date, datetime) else s.slot_date) >= today and
                            (s.slot_date.date() if isinstance(s.slot_date, datetime) else s.slot_date) <= upcoming_date])

        # Slots by status
        slots_by_status = {
            "available": available_slots,
            "booked": booked_slots,
            "blocked": blocked_slots,
            "expired": len([s for s in slots if s.status == SlotStatusEnum.EXPIRED]),
            "unavailable": total_slots - available_slots - booked_slots - blocked_slots
        }

        # Slots by weekday
        slots_by_weekday = {}
        for slot in slots:
            slot_date = slot.slot_date.date() if isinstance(slot.slot_date, datetime) else slot.slot_date
            weekday = get_weekday_from_date(slot_date).value
            slots_by_weekday[weekday] = slots_by_weekday.get(weekday, 0) + 1

        return SlotsSummaryResponse(
            total_slots=total_slots,
            available_slots=available_slots,
            booked_slots=booked_slots,
            blocked_slots=blocked_slots,
            upcoming_slots=upcoming_slots,
            slots_by_status=slots_by_status,
            slots_by_weekday=slots_by_weekday
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting slots summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get slots summary: {str(e)}"
        )

@router.delete("/{slot_id}")
async def delete_slot(
    slot_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Delete a specific time slot.
    Permanently removes the slot from the database.
    Uses GeneratedTimeSlot model.
    Note: Instead of deleting, consider blocking the slot to preserve history.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        # Get the slot
        slot = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.id == slot_id,
            GeneratedTimeSlot.specialist_id == user.id
        ).first()

        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slot not found"
            )

        # Check if slot is booked
        if slot.status == SlotStatusEnum.BOOKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete booked slot"
            )

        db.delete(slot)
        db.commit()

        return {"message": "Slot deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting slot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete slot: {str(e)}"
        )


# ============================================================================
# SLOT BLOCK/UNBLOCK ENDPOINTS (Using GeneratedTimeSlot)
# ============================================================================

class SlotStatusUpdateRequest(BaseModel):
    """Request to update slot status"""
    status: SlotStatusEnum = Field(..., description="New status for the slot")
    notes: Optional[str] = Field(None, description="Optional notes for the status change")

class BulkSlotStatusUpdateRequest(BaseModel):
    """Request for bulk slot status updates"""
    slot_ids: List[str] = Field(..., description="List of slot IDs to update")
    status: SlotStatusEnum = Field(..., description="New status for all slots")
    notes: Optional[str] = Field(None, description="Optional notes for the status change")

class SlotStatusResponse(BaseModel):
    """Response model for slot status update"""
    slot_id: str
    specialist_id: str
    status: str
    can_be_booked: bool
    message: str

@router.post("/{slot_id}/block", response_model=SlotStatusResponse)
async def block_slot(
    slot_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Block a specific time slot.
    Only the specialist who owns the slot can block it.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        # Get the slot
        slot = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.id == slot_id,
            GeneratedTimeSlot.specialist_id == user.id
        ).first()

        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slot not found or you don't have permission to access it"
            )

        # Check if slot is already booked
        if slot.status == SlotStatusEnum.BOOKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot block a booked slot"
            )

        # Update slot status
        slot.status = SlotStatusEnum.BLOCKED
        slot.can_be_booked = False
        db.commit()

        return SlotStatusResponse(
            slot_id=str(slot.id),
            specialist_id=str(slot.specialist_id),
            status=slot.status.value,
            can_be_booked=slot.can_be_booked,
            message="Slot blocked successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error blocking slot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to block slot: {str(e)}"
        )

@router.post("/{slot_id}/unblock", response_model=SlotStatusResponse)
async def unblock_slot(
    slot_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Unblock a specific time slot.
    Only the specialist who owns the slot can unblock it.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        # Get the slot
        slot = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.id == slot_id,
            GeneratedTimeSlot.specialist_id == user.id
        ).first()

        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slot not found or you don't have permission to access it"
            )

        # Check if slot is booked
        if slot.status == SlotStatusEnum.BOOKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot unblock a booked slot"
            )

        # Update slot status
        slot.status = SlotStatusEnum.AVAILABLE
        slot.can_be_booked = True
        db.commit()

        return SlotStatusResponse(
            slot_id=str(slot.id),
            specialist_id=str(slot.specialist_id),
            status=slot.status.value,
            can_be_booked=slot.can_be_booked,
            message="Slot unblocked successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error unblocking slot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unblock slot: {str(e)}"
        )

@router.put("/{slot_id}/status", response_model=SlotStatusResponse)
async def update_slot_status(
    slot_id: str,
    request: SlotStatusUpdateRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Update slot status (general endpoint for any status change).
    Only the specialist who owns the slot can update it.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        # Get the slot
        slot = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.id == slot_id,
            GeneratedTimeSlot.specialist_id == user.id
        ).first()

        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slot not found or you don't have permission to access it"
            )

        # Validate status change
        if request.status == SlotStatusEnum.BOOKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot manually set slot status to BOOKED. Use booking endpoint instead."
            )

        # Update slot status
        slot.status = request.status
        slot.can_be_booked = (request.status == SlotStatusEnum.AVAILABLE)
        db.commit()

        return SlotStatusResponse(
            slot_id=str(slot.id),
            specialist_id=str(slot.specialist_id),
            status=slot.status.value,
            can_be_booked=slot.can_be_booked,
            message=f"Slot status updated to {request.status.value} successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating slot status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update slot status: {str(e)}"
        )

@router.post("/bulk-block", response_model=List[SlotStatusResponse])
async def bulk_block_slots(
    request: BulkSlotStatusUpdateRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Block multiple slots at once.
    Only the specialist who owns the slots can block them.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        if request.status != SlotStatusEnum.BLOCKED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This endpoint is for blocking slots only. Use bulk-status endpoint for other statuses."
            )

        # Get all slots belonging to the specialist
        slots = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.id.in_(request.slot_ids),
            GeneratedTimeSlot.specialist_id == user.id
        ).all()

        if not slots:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No slots found or you don't have permission to access them"
            )

        # Update all slots
        updated_slots = []
        for slot in slots:
            # Skip booked slots
            if slot.status == SlotStatusEnum.BOOKED:
                continue
            
            slot.status = SlotStatusEnum.BLOCKED
            slot.can_be_booked = False
            updated_slots.append(slot)

        db.commit()

        # Return updated slots
        return [
            SlotStatusResponse(
                slot_id=str(slot.id),
                specialist_id=str(slot.specialist_id),
                status=slot.status.value,
                can_be_booked=slot.can_be_booked,
                message="Slot blocked successfully"
            )
            for slot in updated_slots
        ]

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error bulk blocking slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk block slots: {str(e)}"
        )

@router.post("/bulk-unblock", response_model=List[SlotStatusResponse])
async def bulk_unblock_slots(
    request: BulkSlotStatusUpdateRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Unblock multiple slots at once.
    Only the specialist who owns the slots can unblock them.
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        if request.status != SlotStatusEnum.AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This endpoint is for unblocking slots only. Use bulk-status endpoint for other statuses."
            )

        # Get all slots belonging to the specialist
        slots = db.query(GeneratedTimeSlot).filter(
            GeneratedTimeSlot.id.in_(request.slot_ids),
            GeneratedTimeSlot.specialist_id == user.id
        ).all()

        if not slots:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No slots found or you don't have permission to access them"
            )

        # Update all slots
        updated_slots = []
        for slot in slots:
            # Skip booked slots
            if slot.status == SlotStatusEnum.BOOKED:
                continue
            
            slot.status = SlotStatusEnum.AVAILABLE
            slot.can_be_booked = True
            updated_slots.append(slot)

        db.commit()

        # Return updated slots
        return [
            SlotStatusResponse(
                slot_id=str(slot.id),
                specialist_id=str(slot.specialist_id),
                status=slot.status.value,
                can_be_booked=slot.can_be_booked,
                message="Slot unblocked successfully"
            )
            for slot in updated_slots
        ]

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error bulk unblocking slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk unblock slots: {str(e)}"
        )
