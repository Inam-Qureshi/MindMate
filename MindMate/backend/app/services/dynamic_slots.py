"""
Dynamic Slot Generator Service
=============================
Service for generating time slots dynamically from specialist weekly schedules
"""

from typing import List, Dict, Optional, Any
from datetime import datetime, date, time, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import logging
import uuid

from app.models.specialist import Specialists, SpecialistTimeSlots
from app.models.appointment import Appointment, AppointmentStatusEnum
from app.schemas.schedule import (
    WeeklySchedule, DaySchedule, SlotGenerationRequest, SlotGenerationResponse,
    AvailableSlot, DayOfWeek
)
from app.services.schedule import WeeklyScheduleService

logger = logging.getLogger(__name__)


class DynamicSlotGenerator:
    """Service for generating slots dynamically from weekly schedules"""
    
    def __init__(self, db: Session):
        self.db = db
        self.schedule_service = WeeklyScheduleService(db)
    
    def generate_slots_from_schedule(
        self, 
        specialist_id: str, 
        target_date: date,
        force_regenerate: bool = False
    ) -> List[SpecialistTimeSlots]:
        """Generate slots for a specific date from weekly schedule"""
        try:
            # Get specialist
            specialist = self.db.query(Specialists).filter(
                Specialists.id == specialist_id,
                Specialists.is_deleted == False
            ).first()
            
            if not specialist:
                logger.error(f"Specialist not found: {specialist_id}")
                return []
            
            # Get day of week
            day_name = target_date.strftime("%A").lower()
            
            # Get day schedule
            day_schedule = self.schedule_service.get_day_schedule(specialist_id, day_name)
            if not day_schedule or not day_schedule.is_available:
                logger.info(f"Specialist {specialist_id} not available on {day_name}")
                return []
            
            # Check if slots already exist for this date
            if not force_regenerate:
                existing_slots = self.db.query(SpecialistTimeSlots).filter(
                    and_(
                        SpecialistTimeSlots.specialist_id == specialist_id,
                        SpecialistTimeSlots.slot_date == target_date,
                        SpecialistTimeSlots.generated_from_schedule == True
                    )
                ).all()
                
                if existing_slots:
                    logger.info(f"Slots already exist for specialist {specialist_id} on {target_date}")
                    return existing_slots
            
            # Generate slots
            slots = self._generate_slots_for_day(specialist_id, target_date, day_schedule)
            
            # Save to database
            generation_batch_id = uuid.uuid4()
            for slot in slots:
                slot.generated_from_schedule = True
                slot.template_day = day_name
                slot.generation_batch_id = generation_batch_id
                self.db.add(slot)
            
            self.db.commit()
            
            logger.info(f"Generated {len(slots)} slots for specialist {specialist_id} on {target_date}")
            return slots
            
        except Exception as e:
            logger.error(f"Error generating slots for specialist {specialist_id} on {target_date}: {str(e)}")
            self.db.rollback()
            return []
    
    def _generate_slots_for_day(
        self, 
        specialist_id: str, 
        target_date: date, 
        day_schedule: DaySchedule
    ) -> List[SpecialistTimeSlots]:
        """Generate slots for a specific day based on day schedule"""
        slots = []
        
        try:
            # Parse times
            start_time = time.fromisoformat(day_schedule.start_time)
            end_time = time.fromisoformat(day_schedule.end_time)
            
            # Create datetime objects for the target date
            current_time = datetime.combine(target_date, start_time)
            end_datetime = datetime.combine(target_date, end_time)
            
            # Handle break time if specified
            break_start_datetime = None
            break_end_datetime = None
            
            if day_schedule.break_start_time and day_schedule.break_end_time:
                break_start_time = time.fromisoformat(day_schedule.break_start_time)
                break_end_time = time.fromisoformat(day_schedule.break_end_time)
                break_start_datetime = datetime.combine(target_date, break_start_time)
                break_end_datetime = datetime.combine(target_date, break_end_time)
            
            # Generate slots
            slot_duration = timedelta(minutes=day_schedule.slot_duration_minutes)
            
            while current_time + slot_duration <= end_datetime:
                slot_end = current_time + slot_duration
                
                # Skip slots that fall during break time
                if break_start_datetime and break_end_datetime:
                    if (current_time < break_end_datetime and slot_end > break_start_datetime):
                        current_time = break_end_datetime
                        continue
                
                # Create slot
                slot = SpecialistTimeSlots(
                    specialist_id=specialist_id,
                    slot_date=target_date,
                    start_time=current_time,
                    end_time=slot_end,
                    is_available=True,
                    is_blocked=False
                )
                
                slots.append(slot)
                current_time = slot_end
            
            return slots
            
        except Exception as e:
            logger.error(f"Error generating slots for day: {str(e)}")
            return []
    
    def generate_slots_for_date_range(
        self, 
        specialist_id: str, 
        start_date: date, 
        end_date: date,
        force_regenerate: bool = False
    ) -> SlotGenerationResponse:
        """Generate slots for a date range"""
        try:
            generated_slots = []
            generation_batch_id = uuid.uuid4()
            
            current_date = start_date
            while current_date <= end_date:
                day_slots = self.generate_slots_from_schedule(
                    specialist_id, 
                    current_date, 
                    force_regenerate
                )
                
                # Update batch ID for consistency
                for slot in day_slots:
                    slot.generation_batch_id = generation_batch_id
                
                generated_slots.extend(day_slots)
                current_date += timedelta(days=1)
            
            # Convert to AvailableSlot format
            available_slots = []
            for slot in generated_slots:
                available_slot = AvailableSlot(
                    id=str(slot.id),
                    specialist_id=str(slot.specialist_id),
                    date=slot.slot_date,
                    start_time=slot.start_time,
                    end_time=slot.end_time,
                    duration_minutes=slot.duration_minutes,
                    is_available=slot.is_available,
                    can_be_booked=slot.can_be_booked,
                    generated_from_schedule=slot.generated_from_schedule,
                    template_day=slot.template_day
                )
                available_slots.append(available_slot)
            
            return SlotGenerationResponse(
                specialist_id=specialist_id,
                generation_batch_id=str(generation_batch_id),
                slots_generated=len(generated_slots),
                start_date=start_date,
                end_date=end_date,
                generated_slots=available_slots,
                message=f"Generated {len(generated_slots)} slots successfully"
            )
            
        except Exception as e:
            logger.error(f"Error generating slots for date range: {str(e)}")
            return SlotGenerationResponse(
                specialist_id=specialist_id,
                generation_batch_id=str(uuid.uuid4()),
                slots_generated=0,
                start_date=start_date,
                end_date=end_date,
                generated_slots=[],
                message=f"Error generating slots: {str(e)}"
            )
    
    def get_available_slots_for_day(
        self, 
        specialist_id: str, 
        target_date: date
    ) -> List[AvailableSlot]:
        """Get available slots for a specific day"""
        try:
            # First, ensure slots are generated for this date
            self.generate_slots_from_schedule(specialist_id, target_date)
            
            # Get available slots
            slots = self.db.query(SpecialistTimeSlots).filter(
                and_(
                    SpecialistTimeSlots.specialist_id == specialist_id,
                    SpecialistTimeSlots.slot_date == target_date,
                    SpecialistTimeSlots.is_available == True,
                    SpecialistTimeSlots.is_blocked == False,
                    SpecialistTimeSlots.appointment_id.is_(None)  # Not booked
                )
            ).order_by(SpecialistTimeSlots.start_time).all()
            
            # Convert to AvailableSlot format
            available_slots = []
            for slot in slots:
                available_slot = AvailableSlot(
                    id=str(slot.id),
                    specialist_id=str(slot.specialist_id),
                    date=slot.slot_date,
                    start_time=slot.start_time,
                    end_time=slot.end_time,
                    duration_minutes=slot.duration_minutes,
                    is_available=slot.is_available,
                    can_be_booked=slot.can_be_booked,
                    generated_from_schedule=slot.generated_from_schedule,
                    template_day=slot.template_day
                )
                available_slots.append(available_slot)
            
            return available_slots
            
        except Exception as e:
            logger.error(f"Error getting available slots for specialist {specialist_id} on {target_date}: {str(e)}")
            return []
    
    def mark_slot_as_occupied(self, slot_id: str, appointment_id: str) -> bool:
        """Mark a slot as occupied by an appointment"""
        try:
            slot = self.db.query(SpecialistTimeSlots).filter(
                SpecialistTimeSlots.id == slot_id
            ).first()
            
            if not slot:
                logger.error(f"Slot not found: {slot_id}")
                return False
            
            slot.appointment_id = appointment_id
            slot.is_available = False
            
            self.db.commit()
            
            logger.info(f"Marked slot {slot_id} as occupied by appointment {appointment_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error marking slot as occupied: {str(e)}")
            self.db.rollback()
            return False
    
    def free_slot(self, slot_id: str) -> bool:
        """Free a slot (remove appointment booking)"""
        try:
            slot = self.db.query(SpecialistTimeSlots).filter(
                SpecialistTimeSlots.id == slot_id
            ).first()
            
            if not slot:
                logger.error(f"Slot not found: {slot_id}")
                return False
            
            slot.appointment_id = None
            slot.is_available = True
            
            self.db.commit()
            
            logger.info(f"Freed slot {slot_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error freeing slot: {str(e)}")
            self.db.rollback()
            return False
    
    def check_slot_conflicts(
        self, 
        specialist_id: str, 
        start_time: datetime, 
        end_time: datetime,
        exclude_slot_id: Optional[str] = None
    ) -> bool:
        """Check if there are conflicts with existing appointments"""
        try:
            query = self.db.query(Appointment).filter(
                and_(
                    Appointment.specialist_id == specialist_id,
                    Appointment.status.in_([
                        AppointmentStatusEnum.SCHEDULED,
                        AppointmentStatusEnum.CONFIRMED
                    ]),
                    or_(
                        and_(
                            Appointment.scheduled_start < end_time,
                            Appointment.scheduled_end > start_time
                        )
                    )
                )
            )
            
            # Exclude specific slot if provided
            if exclude_slot_id:
                slot = self.db.query(SpecialistTimeSlots).filter(
                    SpecialistTimeSlots.id == exclude_slot_id
                ).first()
                if slot and slot.appointment_id:
                    query = query.filter(Appointment.id != slot.appointment_id)
            
            conflicting_appointment = query.first()
            
            return conflicting_appointment is not None
            
        except Exception as e:
            logger.error(f"Error checking slot conflicts: {str(e)}")
            return True  # Assume conflict if error
