"""
Weekly Schedule Service
======================
Service for managing specialist weekly schedules and per-day availability
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date, time, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import logging
import uuid

from app.models.specialist import Specialists, SpecialistTimeSlots
from app.schemas.schedule import (
    WeeklySchedule, DaySchedule, WeeklyScheduleRequest, WeeklyScheduleResponse,
    SlotGenerationRequest, SlotGenerationResponse, AvailableSlot,
    SlotAvailabilityRequest, SlotAvailabilityResponse, ScheduleValidationResponse
)

logger = logging.getLogger(__name__)


class WeeklyScheduleService:
    """Service for managing specialist weekly schedules"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_weekly_schedule(self, specialist_id: str) -> Optional[WeeklySchedule]:
        """Get specialist's weekly schedule"""
        try:
            specialist = self.db.query(Specialists).filter(
                Specialists.id == specialist_id,
                Specialists.is_deleted == False
            ).first()
            
            if not specialist:
                logger.error(f"Specialist not found: {specialist_id}")
                return None
            
            weekly_schedule_data = specialist.weekly_schedule or {}
            
            # Convert to WeeklySchedule model
            weekly_schedule = WeeklySchedule(
                monday=DaySchedule(**weekly_schedule_data.get('monday', {})) if weekly_schedule_data.get('monday') else None,
                tuesday=DaySchedule(**weekly_schedule_data.get('tuesday', {})) if weekly_schedule_data.get('tuesday') else None,
                wednesday=DaySchedule(**weekly_schedule_data.get('wednesday', {})) if weekly_schedule_data.get('wednesday') else None,
                thursday=DaySchedule(**weekly_schedule_data.get('thursday', {})) if weekly_schedule_data.get('thursday') else None,
                friday=DaySchedule(**weekly_schedule_data.get('friday', {})) if weekly_schedule_data.get('friday') else None,
                saturday=DaySchedule(**weekly_schedule_data.get('saturday', {})) if weekly_schedule_data.get('saturday') else None,
                sunday=DaySchedule(**weekly_schedule_data.get('sunday', {})) if weekly_schedule_data.get('sunday') else None
            )
            
            return weekly_schedule
            
        except Exception as e:
            logger.error(f"Error getting weekly schedule for specialist {specialist_id}: {str(e)}")
            return None
    
    def update_weekly_schedule(self, specialist_id: str, schedule_request: WeeklyScheduleRequest) -> Optional[WeeklyScheduleResponse]:
        """Update specialist's weekly schedule"""
        try:
            specialist = self.db.query(Specialists).filter(
                Specialists.id == specialist_id,
                Specialists.is_deleted == False
            ).first()
            
            if not specialist:
                logger.error(f"Specialist not found: {specialist_id}")
                return None
            
            # Validate schedule
            validation_result = self.validate_schedule(schedule_request.weekly_schedule)
            if not validation_result.is_valid:
                logger.error(f"Invalid schedule for specialist {specialist_id}: {validation_result.errors}")
                return None
            
            # Convert WeeklySchedule to dict for storage
            weekly_schedule_dict = {}
            for day_name in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                day_schedule = getattr(schedule_request.weekly_schedule, day_name)
                if day_schedule:
                    weekly_schedule_dict[day_name] = day_schedule.model_dump()
            
            # Update specialist record
            specialist.weekly_schedule = weekly_schedule_dict
            specialist.default_slot_duration_minutes = schedule_request.default_slot_duration_minutes
            specialist.slot_generation_days_ahead = schedule_request.slot_generation_days_ahead
            specialist.schedule_updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(specialist)
            
            logger.info(f"Updated weekly schedule for specialist {specialist_id}")
            
            return WeeklyScheduleResponse(
                specialist_id=specialist_id,
                weekly_schedule=schedule_request.weekly_schedule,
                default_slot_duration_minutes=specialist.default_slot_duration_minutes,
                slot_generation_days_ahead=specialist.slot_generation_days_ahead,
                schedule_updated_at=specialist.schedule_updated_at or datetime.utcnow(),
                message="Weekly schedule updated successfully"
            )
            
        except Exception as e:
            logger.error(f"Error updating weekly schedule for specialist {specialist_id}: {str(e)}")
            self.db.rollback()
            return None
    
    def validate_schedule(self, weekly_schedule: WeeklySchedule) -> ScheduleValidationResponse:
        """Validate weekly schedule"""
        errors = []
        warnings = []
        available_days = []
        total_weekly_hours = 0.0
        
        try:
            for day_name in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                day_schedule = getattr(weekly_schedule, day_name)
                
                if day_schedule and day_schedule.is_available:
                    available_days.append(day_name)
                    
                    # Validate time format
                    try:
                        start_time = time.fromisoformat(day_schedule.start_time)
                        end_time = time.fromisoformat(day_schedule.end_time)
                        
                        if end_time <= start_time:
                            errors.append(f"{day_name.capitalize()}: End time must be after start time")
                            continue
                        
                        # Calculate daily hours
                        daily_hours = (datetime.combine(date.today(), end_time) - 
                                     datetime.combine(date.today(), start_time)).total_seconds() / 3600
                        
                        # Subtract break time if specified
                        if day_schedule.break_duration_minutes > 0:
                            daily_hours -= day_schedule.break_duration_minutes / 60
                        
                        total_weekly_hours += daily_hours
                        
                        # Validate slot duration
                        if day_schedule.slot_duration_minutes < 15:
                            errors.append(f"{day_name.capitalize()}: Slot duration must be at least 15 minutes")
                        elif day_schedule.slot_duration_minutes > 120:
                            errors.append(f"{day_name.capitalize()}: Slot duration must not exceed 120 minutes")
                        
                        # Validate break times if specified
                        if day_schedule.break_start_time and day_schedule.break_end_time:
                            try:
                                break_start = time.fromisoformat(day_schedule.break_start_time)
                                break_end = time.fromisoformat(day_schedule.break_end_time)
                                
                                if break_end <= break_start:
                                    errors.append(f"{day_name.capitalize()}: Break end time must be after break start time")
                                
                                if break_start < start_time or break_end > end_time:
                                    errors.append(f"{day_name.capitalize()}: Break time must be within working hours")
                                    
                            except ValueError:
                                errors.append(f"{day_name.capitalize()}: Invalid break time format")
                        
                    except ValueError:
                        errors.append(f"{day_name.capitalize()}: Invalid time format")
            
            # Check if at least one day is available
            if not available_days:
                errors.append("At least one day must be available")
            
            # Add warnings
            if total_weekly_hours < 10:
                warnings.append("Very low weekly availability (less than 10 hours)")
            elif total_weekly_hours > 60:
                warnings.append("Very high weekly availability (more than 60 hours)")
            
            return ScheduleValidationResponse(
                is_valid=len(errors) == 0,
                errors=errors,
                warnings=warnings,
                available_days=available_days,
                total_weekly_hours=total_weekly_hours
            )
            
        except Exception as e:
            logger.error(f"Error validating schedule: {str(e)}")
            return ScheduleValidationResponse(
                is_valid=False,
                errors=[f"Validation error: {str(e)}"],
                warnings=[],
                available_days=[],
                total_weekly_hours=0.0
            )
    
    def get_day_schedule(self, specialist_id: str, day: str) -> Optional[DaySchedule]:
        """Get schedule for a specific day"""
        try:
            weekly_schedule = self.get_weekly_schedule(specialist_id)
            if not weekly_schedule:
                return None
            
            day_schedule = getattr(weekly_schedule, day.lower(), None)
            return day_schedule
            
        except Exception as e:
            logger.error(f"Error getting day schedule for specialist {specialist_id}, day {day}: {str(e)}")
            return None
    
    def is_day_available(self, specialist_id: str, day: str) -> bool:
        """Check if specialist is available on a specific day"""
        try:
            day_schedule = self.get_day_schedule(specialist_id, day)
            return day_schedule is not None and day_schedule.is_available
            
        except Exception as e:
            logger.error(f"Error checking day availability for specialist {specialist_id}, day {day}: {str(e)}")
            return False
    
    def get_available_days(self, specialist_id: str) -> List[str]:
        """Get list of available days for specialist"""
        try:
            weekly_schedule = self.get_weekly_schedule(specialist_id)
            if not weekly_schedule:
                return []
            
            available_days = []
            for day_name in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                day_schedule = getattr(weekly_schedule, day_name)
                if day_schedule and day_schedule.is_available:
                    available_days.append(day_name)
            
            return available_days
            
        except Exception as e:
            logger.error(f"Error getting available days for specialist {specialist_id}: {str(e)}")
            return []
