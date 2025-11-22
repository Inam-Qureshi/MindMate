"""
Slot Management Service
=======================
Handles creation, management, and availability checking of specialist time slots
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, time, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import logging

from app.models.specialist import (
    Specialists, SpecialistAvailability, SpecialistTimeSlots, TimeSlotEnum
)
from app.models.appointment import Appointment, AppointmentStatusEnum

logger = logging.getLogger(__name__)


class SlotManagementService:
    """
    Service for managing specialist time slots and availability
    """

    def __init__(self, db: Session):
        self.db = db

    def generate_slots_for_specialist(
        self,
        specialist_id: str,
        start_date: date,
        end_date: date,
        slot_duration_minutes: int = 60
    ) -> Dict[str, Any]:
        """
        Generate time slots for a specialist based on their availability patterns

        Args:
            specialist_id: Specialist UUID
            start_date: Start date for slot generation
            end_date: End date for slot generation
            slot_duration_minutes: Duration of each slot in minutes

        Returns:
            Generation summary
        """
        try:
            specialist = self.db.query(Specialists).filter(
                Specialists.id == specialist_id
            ).first()

            if not specialist:
                raise ValueError("Specialist not found")

            # Get specialist's availability patterns
            availability_slots = self.db.query(SpecialistAvailability).filter(
                SpecialistAvailability.specialist_id == specialist_id,
                SpecialistAvailability.is_active == True
            ).all()

            if not availability_slots:
                return {
                    "success": False,
                    "message": "No availability patterns found for specialist",
                    "slots_created": 0
                }

            slots_created = 0
            current_date = start_date

            while current_date <= end_date:
                # Skip weekends if needed (customize based on requirements)
                if current_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
                    current_date += timedelta(days=1)
                    continue

                # Generate slots for this date based on availability patterns
                for availability in availability_slots:
                    slot_times = self._get_time_range_from_slot_enum(availability.time_slot)

                    # Create time slot
                    start_datetime = datetime.combine(current_date, slot_times[0])
                    end_datetime = datetime.combine(current_date, slot_times[1])

                    # Convert to timezone-aware
                    start_datetime = start_datetime.replace(tzinfo=timezone.utc)
                    end_datetime = end_datetime.replace(tzinfo=timezone.utc)

                    # Check if slot already exists
                    existing_slot = self.db.query(SpecialistTimeSlots).filter(
                        and_(
                            SpecialistTimeSlots.specialist_id == specialist_id,
                            SpecialistTimeSlots.start_time == start_datetime,
                            SpecialistTimeSlots.end_time == end_datetime
                        )
                    ).first()

                    if not existing_slot:
                        slot = SpecialistTimeSlots(
                            specialist_id=specialist_id,
                            slot_date=current_date,
                            start_time=start_datetime,
                            end_time=end_datetime,
                            is_available=True,
                            is_blocked=False
                        )
                        self.db.add(slot)
                        slots_created += 1

                current_date += timedelta(days=1)

            self.db.commit()

            return {
                "success": True,
                "message": f"Generated {slots_created} time slots",
                "slots_created": slots_created,
                "period": f"{start_date} to {end_date}"
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error generating slots: {str(e)}")
            raise

    def get_available_slots(
        self,
        specialist_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        include_booked: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get available slots for a specialist

        Args:
            specialist_id: Specialist UUID
            start_date: Start date filter
            end_date: End date filter
            include_booked: Include booked slots in results

        Returns:
            List of available slots
        """
        try:
            query = self.db.query(SpecialistTimeSlots).filter(
                SpecialistTimeSlots.specialist_id == specialist_id
            )

            if start_date:
                query = query.filter(SpecialistTimeSlots.slot_date >= start_date)
            if end_date:
                query = query.filter(SpecialistTimeSlots.slot_date <= end_date)

            if not include_booked:
                query = query.filter(SpecialistTimeSlots.is_available == True)

            query = query.order_by(SpecialistTimeSlots.start_time)

            slots = query.all()

            return [
                {
                    "id": str(slot.id),
                    "specialist_id": str(slot.specialist_id),
                    "date": slot.slot_date.isoformat(),
                    "start_time": slot.start_time.isoformat(),
                    "end_time": slot.end_time.isoformat(),
                    "duration_minutes": slot.duration_minutes,
                    "status": slot.status,
                    "is_available": slot.is_available,
                    "is_booked": slot.is_booked,
                    "is_blocked": slot.is_blocked,
                    "can_be_booked": slot.can_be_booked
                }
                for slot in slots
            ]

        except Exception as e:
            logger.error(f"Error getting available slots: {str(e)}")
            raise

    def check_slot_availability(
        self,
        specialist_id: str,
        start_time: datetime,
        end_time: datetime
    ) -> Dict[str, Any]:
        """
        Check if a specific time slot is available

        Args:
            specialist_id: Specialist UUID
            start_time: Start time of slot
            end_time: End time of slot

        Returns:
            Availability information
        """
        try:
            # Check for existing slot
            slot = self.db.query(SpecialistTimeSlots).filter(
                and_(
                    SpecialistTimeSlots.specialist_id == specialist_id,
                    SpecialistTimeSlots.start_time == start_time,
                    SpecialistTimeSlots.end_time == end_time
                )
            ).first()

            if not slot:
                return {
                    "available": False,
                    "reason": "Slot does not exist",
                    "slot_exists": False
                }

            # Check appointment conflicts
            conflicting_appointment = self.db.query(Appointment).filter(
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
            ).first()

            if conflicting_appointment:
                return {
                    "available": False,
                    "reason": "Time slot conflicts with existing appointment",
                    "slot_exists": True,
                    "slot_status": slot.status,
                    "can_be_booked": False
                }

            # Determine the specific reason why slot cannot be booked
            reason = "Available"
            if not slot.can_be_booked:
                logger.info(f"Slot debugging - is_booked: {slot.is_booked}, is_blocked: {slot.is_blocked}, is_available: {slot.is_available}, start_time: {slot.start_time}, current_time: {datetime.now(slot.start_time.tzinfo)}")
                if slot.is_booked:
                    reason = "Slot is already booked"
                elif slot.is_blocked:
                    reason = "Slot is blocked"
                elif not slot.is_available:
                    reason = "Slot is not available"
                elif slot.start_time <= datetime.now(slot.start_time.tzinfo):
                    reason = "Slot time has passed"
                else:
                    reason = f"Slot is {slot.status}"
            
            return {
                "available": slot.can_be_booked,
                "slot_exists": True,
                "slot_id": str(slot.id),
                "slot_status": slot.status,
                "can_be_booked": slot.can_be_booked,
                "reason": reason
            }

        except Exception as e:
            logger.error(f"Error checking slot availability: {str(e)}")
            return {
                "available": False,
                "reason": f"Error checking availability: {str(e)}",
                "slot_exists": False
            }

    def book_slot(self, slot_id: str, appointment_id: str) -> Dict[str, Any]:
        """
        Book a specific time slot

        Args:
            slot_id: Slot UUID
            appointment_id: Appointment UUID

        Returns:
            Booking confirmation
        """
        try:
            slot = self.db.query(SpecialistTimeSlots).filter(
                SpecialistTimeSlots.id == slot_id
            ).first()

            if not slot:
                raise ValueError("Slot not found")

            if not slot.can_be_booked:
                raise ValueError(f"Slot cannot be booked: {slot.status}")

            # Book the slot
            slot.book(appointment_id)
            self.db.commit()

            return {
                "success": True,
                "slot_id": str(slot.id),
                "appointment_id": appointment_id,
                "status": slot.status,
                "message": "Slot booked successfully"
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error booking slot: {str(e)}")
            raise

    def release_slot(self, slot_id: str) -> Dict[str, Any]:
        """
        Release a booked slot (for cancellations)

        Args:
            slot_id: Slot UUID

        Returns:
            Release confirmation
        """
        try:
            slot = self.db.query(SpecialistTimeSlots).filter(
                SpecialistTimeSlots.id == slot_id
            ).first()

            if not slot:
                raise ValueError("Slot not found")

            slot.cancel_booking()
            self.db.commit()

            return {
                "success": True,
                "slot_id": str(slot.id),
                "status": slot.status,
                "message": "Slot released successfully"
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error releasing slot: {str(e)}")
            raise

    def block_slot(self, slot_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """
        Block a slot (prevent booking)

        Args:
            slot_id: Slot UUID
            reason: Reason for blocking

        Returns:
            Block confirmation
        """
        try:
            slot = self.db.query(SpecialistTimeSlots).filter(
                SpecialistTimeSlots.id == slot_id
            ).first()

            if not slot:
                raise ValueError("Slot not found")

            slot.block()
            self.db.commit()

            return {
                "success": True,
                "slot_id": str(slot.id),
                "status": slot.status,
                "message": "Slot blocked successfully"
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error blocking slot: {str(e)}")
            raise

    def unblock_slot(self, slot_id: str) -> Dict[str, Any]:
        """
        Unblock a slot (allow booking)

        Args:
            slot_id: Slot UUID

        Returns:
            Unblock confirmation
        """
        try:
            slot = self.db.query(SpecialistTimeSlots).filter(
                SpecialistTimeSlots.id == slot_id
            ).first()

            if not slot:
                raise ValueError("Slot not found")

            slot.unblock()
            self.db.commit()

            return {
                "success": True,
                "slot_id": str(slot.id),
                "status": slot.status,
                "message": "Slot unblocked successfully"
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error unblocking slot: {str(e)}")
            raise

    def get_specialist_availability_summary(
        self,
        specialist_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Get availability summary for a specialist

        Args:
            specialist_id: Specialist UUID
            start_date: Start date for summary
            end_date: End date for summary

        Returns:
            Availability summary
        """
        try:
            if not start_date:
                start_date = date.today()
            if not end_date:
                end_date = start_date + timedelta(days=30)

            # Count slots by status
            total_slots = self.db.query(SpecialistTimeSlots).filter(
                and_(
                    SpecialistTimeSlots.specialist_id == specialist_id,
                    SpecialistTimeSlots.slot_date >= start_date,
                    SpecialistTimeSlots.slot_date <= end_date
                )
            ).count()

            available_slots = self.db.query(SpecialistTimeSlots).filter(
                and_(
                    SpecialistTimeSlots.specialist_id == specialist_id,
                    SpecialistTimeSlots.slot_date >= start_date,
                    SpecialistTimeSlots.slot_date <= end_date,
                    SpecialistTimeSlots.is_available == True
                )
            ).count()

            booked_slots = self.db.query(SpecialistTimeSlots).filter(
                and_(
                    SpecialistTimeSlots.specialist_id == specialist_id,
                    SpecialistTimeSlots.slot_date >= start_date,
                    SpecialistTimeSlots.slot_date <= end_date,
                    SpecialistTimeSlots.appointment_id.isnot(None)
                )
            ).count()

            blocked_slots = self.db.query(SpecialistTimeSlots).filter(
                and_(
                    SpecialistTimeSlots.specialist_id == specialist_id,
                    SpecialistTimeSlots.slot_date >= start_date,
                    SpecialistTimeSlots.slot_date <= end_date,
                    SpecialistTimeSlots.is_blocked == True
                )
            ).count()

            return {
                "specialist_id": specialist_id,
                "period": f"{start_date} to {end_date}",
                "total_slots": total_slots,
                "available_slots": available_slots,
                "booked_slots": booked_slots,
                "blocked_slots": blocked_slots,
                "utilization_rate": (booked_slots / total_slots * 100) if total_slots > 0 else 0
            }

        except Exception as e:
            logger.error(f"Error getting availability summary: {str(e)}")
            raise

    def _get_time_range_from_slot_enum(self, slot_enum: TimeSlotEnum) -> Tuple[time, time]:
        """
        Convert TimeSlotEnum to actual time range

        Args:
            slot_enum: Time slot enum value

        Returns:
            Tuple of (start_time, end_time)
        """
        time_mapping = {
            TimeSlotEnum.SLOT_09_10: (time(9, 0), time(10, 0)),
            TimeSlotEnum.SLOT_10_11: (time(10, 0), time(11, 0)),
            TimeSlotEnum.SLOT_11_12: (time(11, 0), time(12, 0)),
            TimeSlotEnum.SLOT_12_13: (time(12, 0), time(13, 0)),
            TimeSlotEnum.SLOT_13_14: (time(13, 0), time(14, 0)),
            TimeSlotEnum.SLOT_14_15: (time(14, 0), time(15, 0)),
            TimeSlotEnum.SLOT_15_16: (time(15, 0), time(16, 0)),
            TimeSlotEnum.SLOT_16_17: (time(16, 0), time(17, 0))
        }

        return time_mapping.get(slot_enum, (time(9, 0), time(10, 0)))
