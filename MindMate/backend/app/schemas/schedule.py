"""
Weekly Schedule Pydantic Models
=============================
Pydantic models for the new per-day availability system
"""

from datetime import datetime, date, time
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, field_validator
from enum import Enum


class DayOfWeek(str, Enum):
    """Days of the week"""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class DaySchedule(BaseModel):
    """Schedule for a specific day of the week"""
    is_available: bool
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_duration_minutes: int = 30
    break_duration_minutes: int = 0
    break_start_time: Optional[str] = None
    break_end_time: Optional[str] = None
    
    @field_validator('end_time')
    @classmethod
    def validate_end_time_required(cls, v, info):
        """Validate end time is required when available and validate time order"""
        if info.data.get('is_available', False) and not v:
            raise ValueError('End time is required when day is available')
        
        # Validate time order if both times are provided
        if v and 'start_time' in info.data and info.data['start_time']:
            start_time = time.fromisoformat(info.data['start_time'])
            end_time = time.fromisoformat(v)
            if end_time <= start_time:
                raise ValueError('End time must be after start time')
        return v


class WeeklySchedule(BaseModel):
    """Complete weekly schedule for a specialist"""
    monday: Optional[DaySchedule] = None
    tuesday: Optional[DaySchedule] = None
    wednesday: Optional[DaySchedule] = None
    thursday: Optional[DaySchedule] = None
    friday: Optional[DaySchedule] = None
    saturday: Optional[DaySchedule] = None
    sunday: Optional[DaySchedule] = None
    
    @field_validator('*')
    @classmethod
    def validate_at_least_one_day(cls, v, info):
        """Ensure at least one day is available"""
        if info.field_name == 'sunday':  # Last field to validate
            has_available_day = any(
                getattr(info.data, day) and getattr(info.data, day).is_available
                for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            )
            if not has_available_day:
                raise ValueError('At least one day must be available')
        return v


class WeeklyScheduleRequest(BaseModel):
    """Request to update weekly schedule"""
    weekly_schedule: WeeklySchedule
    default_slot_duration_minutes: int = 30
    slot_generation_days_ahead: int = 30


class WeeklyScheduleResponse(BaseModel):
    """Response for weekly schedule operations"""
    specialist_id: str
    weekly_schedule: WeeklySchedule
    default_slot_duration_minutes: int
    slot_generation_days_ahead: int
    schedule_updated_at: datetime
    message: str


class AvailableSlot(BaseModel):
    """Available slot for patient booking"""
    id: str
    specialist_id: str
    date: date
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    is_available: bool
    can_be_booked: bool
    generated_from_schedule: bool
    template_day: Optional[str] = None


class SlotGenerationRequest(BaseModel):
    """Request to generate slots from schedule"""
    start_date: date
    end_date: date
    force_regenerate: bool = False
    specific_days: Optional[List[DayOfWeek]] = None


class SlotGenerationResponse(BaseModel):
    """Response for slot generation"""
    specialist_id: str
    generation_batch_id: str
    slots_generated: int
    start_date: date
    end_date: date
    generated_slots: List[AvailableSlot]
    message: str


class SlotAvailabilityRequest(BaseModel):
    """Request for slot availability"""
    specialist_id: str
    date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    include_booked: bool = False


class SlotAvailabilityResponse(BaseModel):
    """Response for slot availability"""
    specialist_id: str
    available_slots: List[AvailableSlot]
    total_slots: int
    available_count: int
    booked_count: int
    query_date: Optional[date] = None
    query_start_date: Optional[date] = None
    query_end_date: Optional[date] = None


class ScheduleValidationResponse(BaseModel):
    """Response for schedule validation"""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    available_days: List[str] = []
    total_weekly_hours: float
