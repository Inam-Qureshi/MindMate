"""
Weekly Schedule API Endpoints
============================
API endpoints for managing specialist weekly schedules and slot generation
"""

from typing import List, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import logging

from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_user_from_token
from app.schemas.schedule import (
    WeeklyScheduleRequest, WeeklyScheduleResponse, ScheduleValidationResponse,
    SlotGenerationRequest, SlotGenerationResponse, SlotAvailabilityRequest,
    SlotAvailabilityResponse, AvailableSlot, DayOfWeek
)
from app.services.schedule import WeeklyScheduleService
from app.services.dynamic_slots import DynamicSlotGenerator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/specialists/schedule", tags=["Weekly Schedule Management"])


@router.get("/", response_model=WeeklyScheduleResponse)
async def get_weekly_schedule(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get specialist's weekly schedule"""
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        schedule_service = WeeklyScheduleService(db)
        weekly_schedule = schedule_service.get_weekly_schedule(str(user.id))
        
        if not weekly_schedule:
            # Return default empty schedule
            from app.schemas.weekly_schedule import WeeklySchedule
            weekly_schedule = WeeklySchedule()

        # Get specialist record for additional info
        from app.models.specialist import Specialists
        specialist = db.query(Specialists).filter(Specialists.id == user.id).first()
        
        return WeeklyScheduleResponse(
            specialist_id=str(user.id),
            weekly_schedule=weekly_schedule,
            default_slot_duration_minutes=specialist.default_slot_duration_minutes if specialist else 30,
            slot_generation_days_ahead=specialist.slot_generation_days_ahead if specialist else 30,
            schedule_updated_at=specialist.schedule_updated_at or datetime.utcnow() if specialist else datetime.utcnow(),
            message="Weekly schedule retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting weekly schedule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get weekly schedule: {str(e)}"
        )


@router.put("/", response_model=WeeklyScheduleResponse)
async def update_weekly_schedule(
    schedule_request: WeeklyScheduleRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Update specialist's weekly schedule"""
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        schedule_service = WeeklyScheduleService(db)
        response = schedule_service.update_weekly_schedule(str(user.id), schedule_request)
        
        if not response:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update weekly schedule"
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating weekly schedule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update weekly schedule: {str(e)}"
        )


@router.post("/validate", response_model=ScheduleValidationResponse)
async def validate_schedule(
    weekly_schedule: WeeklyScheduleRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Validate weekly schedule without saving"""
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        schedule_service = WeeklyScheduleService(db)
        validation_result = schedule_service.validate_schedule(weekly_schedule.weekly_schedule)
        
        return validation_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating schedule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate schedule: {str(e)}"
        )


@router.post("/generate-slots", response_model=SlotGenerationResponse)
async def generate_slots_from_schedule(
    generation_request: SlotGenerationRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Generate slots from weekly schedule"""
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        logger.info(f"Slot generation request received for specialist {user.id}")
        logger.info(f"Request details: start_date={generation_request.start_date}, end_date={generation_request.end_date}, force_regenerate={generation_request.force_regenerate}")

        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Specialist only endpoint."
            )

        slot_generator = DynamicSlotGenerator(db)
        logger.info(f"Calling generate_slots_for_date_range for specialist {user.id}")
        
        response = slot_generator.generate_slots_for_date_range(
            str(user.id),
            generation_request.start_date,
            generation_request.end_date,
            generation_request.force_regenerate
        )
        
        logger.info(f"Successfully generated {response.slots_generated} slots for specialist {user.id}")
        logger.info(f"Generation batch ID: {response.generation_batch_id}")
        
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating slots for specialist {user.id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate slots: {str(e)}"
        )


@router.get("/{specialist_id}/available-slots", response_model=SlotAvailabilityResponse)
async def get_available_slots(
    specialist_id: str,
    date: Optional[date] = Query(None, description="Specific date"),
    start_date: Optional[date] = Query(None, description="Start date for range"),
    end_date: Optional[date] = Query(None, description="End date for range"),
    include_booked: bool = Query(False, description="Include booked slots"),
    db: Session = Depends(get_db)
):
    """Get available slots for a specialist (public endpoint for patients)"""
    try:
        # Validate specialist exists
        from app.models.specialist import Specialists
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()
        
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )

        slot_generator = DynamicSlotGenerator(db)
        available_slots = []
        
        if date:
            # Get slots for specific date
            slots = slot_generator.get_available_slots_for_day(specialist_id, date)
            available_slots.extend(slots)
            
        elif start_date and end_date:
            # Get slots for date range
            current_date = start_date
            while current_date <= end_date:
                day_slots = slot_generator.get_available_slots_for_day(specialist_id, current_date)
                available_slots.extend(day_slots)
                current_date += timedelta(days=1)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'date' or both 'start_date' and 'end_date' must be provided"
            )

        # Filter out booked slots if not requested
        if not include_booked:
            available_slots = [slot for slot in available_slots if slot.can_be_booked]

        return SlotAvailabilityResponse(
            specialist_id=specialist_id,
            available_slots=available_slots,
            total_slots=len(available_slots),
            available_count=len([slot for slot in available_slots if slot.is_available]),
            booked_count=len([slot for slot in available_slots if not slot.is_available]),
            query_date=date,
            query_start_date=start_date,
            query_end_date=end_date
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting available slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available slots: {str(e)}"
        )


@router.get("/{specialist_id}/available-slots/day", response_model=List[AvailableSlot])
async def get_available_slots_for_day(
    specialist_id: str,
    target_date: date = Query(..., description="Target date"),
    db: Session = Depends(get_db)
):
    """Get available slots for a specific day (simplified endpoint)"""
    try:
        # Validate specialist exists
        from app.models.specialist import Specialists
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()
        
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )

        slot_generator = DynamicSlotGenerator(db)
        available_slots = slot_generator.get_available_slots_for_day(specialist_id, target_date)
        
        return available_slots

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting available slots for day: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get available slots for day: {str(e)}"
        )
