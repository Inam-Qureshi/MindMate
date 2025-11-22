"""
SMA - Specialist Matching Agent
==============================
Main orchestrator for specialist matching and appointment booking functionality.
Integrates specialist search, matching, and appointment management.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging
import uuid

from .specialits_matcher import SpecialistMatcher
from .appointments_manager import AppointmentsManager
from app.services.slots import SlotManagementService
from .sma_schemas import (
    SpecialistSearchRequest, TopSpecialistsRequest, BookAppointmentRequest, RequestAppointmentRequest, CancelAppointmentRequest,
    RescheduleAppointmentRequest, UpdateAppointmentStatusRequest,
    CancelAppointmentBySpecialistRequest, SpecialistDetailedInfo,
    AppointmentStatus, ConsultationMode, SpecialistBasicInfo, AppointmentInfo,
    PatientPublicProfile, PatientReportInfo
)
from app.models.specialist import Specialists, SpecialistsAuthInfo
from app.models.patient import Patient
from app.models.appointment import Appointment, AppointmentStatusEnum, AppointmentTypeEnum
from app.services.specialist_profile import SpecialistProfileService
from app.utils.email_utils import send_notification_email

logger = logging.getLogger(__name__)

class SMA:
    """
    Specialist Matching Agent - Main orchestrator
    
    Provides unified interface for:
    - Specialist search and matching
    - Appointment booking and management
    - Integration with other MindMate agents
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.matcher = SpecialistMatcher(db)
        self.appointments_manager = AppointmentsManager(db)
        self.slot_manager = SlotManagementService(db)
        self.profile_service = SpecialistProfileService(db)
    
    # ============================================================================
    # PATIENT ENDPOINTS
    # ============================================================================
    
    def search_specialists(self, request: SpecialistSearchRequest) -> Dict[str, Any]:
        """
        Search and rank specialists based on patient preferences
        
        Args:
            request: Search criteria and preferences
            
        Returns:
            Paginated list of specialists with metadata
        """
        try:
            logger.info(f"Searching specialists with criteria: {request.dict()}")
            
            result = self.matcher.search_specialists(request)
            
            logger.info(f"Found {result['total_count']} specialists matching criteria")
            return result
            
        except Exception as e:
            logger.error(f"Error in specialist search: {str(e)}")
            raise
    
    def get_top_specialists(self, request: TopSpecialistsRequest) -> Dict[str, Any]:
        """
        Get top N specialists with scoring rationale
        
        Args:
            request: Top specialists request with criteria
            
        Returns:
            Dict with top specialists and scoring breakdown
        """
        try:
            logger.info(f"Getting top specialists with criteria: {request.dict()}")
            
            # Convert TopSpecialistsRequest to SpecialistSearchRequest
            search_request = SpecialistSearchRequest(
                query=None,
                specialist_type=None,
                consultation_mode=request.consultation_mode,
                city=request.city,
                languages=None,
                specializations=request.specializations,
                budget_max=request.budget_max,
                sort_by="best_match",
                page=1,
                size=request.limit,
                available_from=None,
                available_to=None
            )
            
            result = self.matcher.get_top_specialists(search_request)
            
            logger.info(f"Found {len(result.get('specialists', []))} top specialists")
            return result
            
        except Exception as e:
            logger.error(f"Error getting top specialists: {str(e)}")
            raise
    
    def get_specialist_public_profile(self, specialist_id: uuid.UUID) -> Dict[str, Any]:
        """
        Get specialist public profile with all information
        
        Args:
            specialist_id: Specialist UUID
            
        Returns:
            Detailed specialist information
        """
        try:
            logger.info(f"Getting public profile for specialist {specialist_id}")
            
            # Get specialist profile
            profile = self.profile_service.create_specialist_public_profile(specialist_id)
            
            if not profile:
                raise ValueError("Specialist not found or not approved")
            
            # Get availability slots
            slots = self.appointments_manager.get_specialist_slots(
                specialist_id=specialist_id,
                status="free"
            )
            
            result = {
                "specialist": profile,
                "availability_slots": slots[:20]  # Limit to next 20 slots
            }
            
            logger.info(f"Retrieved public profile for specialist {specialist_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting specialist public profile: {str(e)}")
            raise

    def get_specialist_details(self, specialist_id: uuid.UUID, include_slots: bool = True) -> Dict[str, Any]:
        """
        Get detailed specialist information for patients (only available slots)

        Args:
            specialist_id: Specialist UUID
            include_slots: Whether to include slot information

        Returns:
            Detailed specialist information with filtered slots
        """
        try:
            logger.info(f"Getting specialist details for patient view: {specialist_id}")

            # Get specialist profile
            profile = self.profile_service.create_specialist_public_profile(specialist_id)

            if not profile:
                raise ValueError("Specialist not found or not approved")

            result = {
                "specialist": profile
            }

            # Include only available slots for patients
            if include_slots:
                available_slots = self.appointments_manager.get_specialist_slots(
                    specialist_id=specialist_id,
                    status="available"  # Only available slots for patients
                )
                result["available_slots"] = available_slots[:20]  # Limit to next 20 available slots

            logger.info(f"Retrieved specialist details for patient view: {specialist_id}")
            return result

        except Exception as e:
            logger.error(f"Error getting specialist details: {str(e)}")
            raise

    def get_specialist_slots(self, specialist_id: uuid.UUID, from_date: Optional[datetime] = None,
                           to_date: Optional[datetime] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get specialist slots (filtered for patient view)

        Args:
            specialist_id: Specialist UUID
            from_date: Start date filter
            to_date: End date filter
            status: Slot status filter (defaults to 'available' for patients)

        Returns:
            List of slots (filtered to available only for patients)
        """
        try:
            # For patient-facing API, default to available slots only
            if status is None:
                status = "available"

            slots = self.appointments_manager.get_specialist_slots(
                specialist_id=specialist_id,
                from_date=from_date,
                to_date=to_date,
                status=status
            )

            return slots

        except Exception as e:
            logger.error(f"Error getting specialist slots: {str(e)}")
            raise
    
    def request_appointment(self, patient_id: uuid.UUID, request: RequestAppointmentRequest) -> Dict[str, Any]:
        """
        Request appointment with specific specialist (requires approval)
        
        Args:
            patient_id: Patient UUID
            request: Appointment request
            
        Returns:
            Request details with pending approval status
        """
        try:
            logger.info(f"Patient {patient_id} requesting appointment with specialist {request.specialist_id}")
            
            # Check if specialist exists and is approved
            specialist = self.db.query(Specialists).filter(
                Specialists.id == request.specialist_id,
                Specialists.is_deleted == False,
                Specialists.approval_status == "approved"
            ).first()
            
            if not specialist:
                raise ValueError("Specialist not found or not approved")
            
            # Create appointment request (no specific time, just consultation mode)
            appointment = Appointment(
                specialist_id=request.specialist_id,
                patient_id=patient_id,
                scheduled_start=None,  # Will be set when specialist confirms
                scheduled_end=None,    # Will be set when specialist confirms
                appointment_type=AppointmentTypeEnum.VIRTUAL if request.consultation_mode == ConsultationMode.ONLINE else AppointmentTypeEnum.IN_PERSON,
                status=AppointmentStatusEnum.PENDING_APPROVAL,
                fee=specialist.consultation_fee or 0,
                notes=request.reason
            )
            
            self.db.add(appointment)
            self.db.commit()
            self.db.refresh(appointment)
            
            # Send notification to specialist
            self._send_appointment_notification_to_specialist(appointment, "new_request")
            
            result = {
                "appointment_id": appointment.id,
                "specialist_id": appointment.specialist_id,
                "patient_id": appointment.patient_id,
                "consultation_mode": request.consultation_mode,
                "status": AppointmentStatus.PENDING_APPROVAL,
                "notes": request.reason,
                "message": "Appointment request sent successfully. Awaiting specialist approval."
            }
            
            logger.info(f"Appointment request created successfully: {appointment.id}")
            return result
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error requesting appointment: {str(e)}")
            raise

    def book_appointment(self, patient_id: uuid.UUID, request: BookAppointmentRequest) -> Dict[str, Any]:
        """
        Book appointment with specific specialist
        
        Args:
            patient_id: Patient UUID
            request: Booking request
            
        Returns:
            Booked appointment details
        """
        try:
            logger.info(f"Patient {patient_id} booking appointment with specialist {request.specialist_id}")
            
            # Check if specialist exists and is approved
            specialist = self.db.query(Specialists).filter(
                Specialists.id == request.specialist_id,
                Specialists.approval_status == "approved"
            ).first()
            
            if not specialist:
                raise ValueError("Specialist not found or not approved")
            
            # Check slot availability - slots must exist and be available
            slot_availability = self.slot_manager.check_slot_availability(
                specialist_id=str(request.specialist_id),
                start_time=request.start_time,
                end_time=request.end_time
            )

            logger.info(f"Slot availability check result: {slot_availability}")

            if not slot_availability["available"]:
                raise ValueError(f"Selected time slot is not available: {slot_availability.get('reason', 'Unknown reason')}")

            slot_id = slot_availability.get("slot_id")
            if not slot_id:
                raise ValueError("Requested time slot does not exist. Please select from available slots.")

            # Create appointment
            appointment = Appointment(
                specialist_id=request.specialist_id,
                patient_id=patient_id,
                scheduled_start=request.start_time,
                scheduled_end=request.end_time,
                appointment_type=AppointmentTypeEnum.VIRTUAL if request.consultation_mode == ConsultationMode.ONLINE else AppointmentTypeEnum.IN_PERSON,
                status=AppointmentStatusEnum.SCHEDULED,
                fee=specialist.consultation_fee or 0,
                notes=request.notes
            )

            self.db.add(appointment)
            self.db.flush()  # Get appointment ID

            # Book the slot
            self.slot_manager.book_slot(slot_id, str(appointment.id))

            self.db.commit()
            self.db.refresh(appointment)
            
            # Send notification to specialist
            self._send_appointment_notification_to_specialist(appointment, "new_booking")
            
            result = {
                "appointment": {
                    "id": appointment.id,
                    "patient_id": appointment.patient_id,
                    "specialist_id": appointment.specialist_id,
                    "scheduled_start": appointment.scheduled_start,
                    "scheduled_end": appointment.scheduled_end,
                    "consultation_mode": request.consultation_mode,
                    "fee": float(appointment.fee),
                    "status": appointment.status.value,
                    "notes": appointment.notes,
                    "created_at": appointment.created_at,
                    "updated_at": appointment.updated_at
                },
                "message": "Appointment booked successfully"
            }
            
            logger.info(f"Appointment booked successfully: {appointment.id}")
            return result
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error booking appointment: {str(e)}")
            raise
    
    def cancel_appointment(self, patient_id: uuid.UUID, request: CancelAppointmentRequest) -> Dict[str, Any]:
        """
        Cancel appointment by patient
        
        Args:
            patient_id: Patient UUID
            request: Cancellation request
            
        Returns:
            Cancellation confirmation
        """
        try:
            logger.info(f"Patient {patient_id} cancelling appointment {request.appointment_id}")
            
            appointment = self.db.query(Appointment).filter(
                Appointment.id == request.appointment_id,
                Appointment.patient_id == patient_id,
                Appointment.status.in_([
                    AppointmentStatusEnum.PENDING_APPROVAL, 
                    AppointmentStatusEnum.SCHEDULED, 
                    AppointmentStatusEnum.CONFIRMED
                ])
            ).first()
            
            if not appointment:
                logger.error(f"Appointment {request.appointment_id} not found for patient {patient_id} or already cancelled")
                raise ValueError("Appointment not found or cannot be cancelled")
            
            # Update appointment status
            appointment.status = AppointmentStatusEnum.CANCELLED
            appointment.cancellation_reason = request.reason
            appointment.updated_at = datetime.now(timezone.utc)

            # Release the slot if it was booked
            if appointment.time_slot:
                self.slot_manager.release_slot(str(appointment.time_slot.id))

            self.db.commit()

            # Send notification to specialist
            self._send_appointment_notification_to_specialist(appointment, "cancelled_by_patient")
            
            result = {
                "appointment": {
                    "id": appointment.id,
                    "status": appointment.status.value,
                    "cancelled_at": appointment.updated_at
                },
                "message": "Appointment cancelled successfully"
            }
            
            logger.info(f"Appointment {appointment.id} cancelled by patient")
            return result
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cancelling appointment: {str(e)}")
            raise
    
    def reschedule_appointment(self, patient_id: uuid.UUID, request: RescheduleAppointmentRequest) -> Dict[str, Any]:
        """
        Reschedule appointment by patient
        
        Args:
            patient_id: Patient UUID
            request: Reschedule request
            
        Returns:
            Rescheduled appointment details
        """
        try:
            logger.info(f"Patient {patient_id} rescheduling appointment {request.appointment_id}")
            
            appointment = self.db.query(Appointment).filter(
                Appointment.id == request.appointment_id,
                Appointment.patient_id == patient_id,
                Appointment.status.in_([
                    AppointmentStatusEnum.PENDING_APPROVAL,
                    AppointmentStatusEnum.SCHEDULED, 
                    AppointmentStatusEnum.CONFIRMED
                ])
            ).first()
            
            if not appointment:
                logger.error(f"Appointment {request.appointment_id} not found for patient {patient_id} or cannot be rescheduled")
                raise ValueError("Appointment not found or cannot be rescheduled")
            
            logger.info(f"Rescheduling appointment from {appointment.scheduled_start} to {request.new_start_time}")
            
            # For patient-initiated reschedules, we trust the frontend's slot selection
            # since it's already fetching and displaying available slots
            
            # Try to find the slot in the database for linking
            from app.models.specialist import SpecialistTimeSlots
            from sqlalchemy import and_
            
            new_slot = self.db.query(SpecialistTimeSlots).filter(
                and_(
                    SpecialistTimeSlots.specialist_id == appointment.specialist_id,
                    SpecialistTimeSlots.start_time == request.new_start_time,
                    SpecialistTimeSlots.end_time == request.new_end_time,
                    SpecialistTimeSlots.is_available == True
                )
            ).first()
            
            if new_slot:
                logger.info(f"Found matching slot: {new_slot.id}")
                # Release current slot if it exists
                if appointment.time_slot and appointment.time_slot.id != new_slot.id:
                    try:
                        self.slot_manager.release_slot(str(appointment.time_slot.id))
                    except Exception as e:
                        logger.warning(f"Could not release old slot: {e}")
                
                # Book the new slot
                try:
                    self.slot_manager.book_slot(str(new_slot.id), str(appointment.id))
                    appointment.time_slot_id = new_slot.id
                except Exception as e:
                    logger.warning(f"Could not book new slot: {e}")
            else:
                logger.warning(f"Could not find exact slot match for {request.new_start_time}, updating times only")
                # If we can't find the exact slot, just update the times
                # This can happen with timezone conversions or manual scheduling
            
            # Update appointment times
            appointment.scheduled_start = request.new_start_time
            appointment.scheduled_end = request.new_end_time
            appointment.notes = f"{appointment.notes or ''}\n\nRescheduled: {request.reason}"
            appointment.updated_at = datetime.now(timezone.utc)
            
            # Reset status to pending approval since times changed
            if appointment.status == AppointmentStatusEnum.CONFIRMED:
                appointment.status = AppointmentStatusEnum.PENDING_APPROVAL

            self.db.commit()
            
            # Send notification to specialist
            self._send_appointment_notification_to_specialist(appointment, "rescheduled_by_patient")
            
            result = {
                "appointment": {
                    "id": appointment.id,
                    "scheduled_start": appointment.scheduled_start,
                    "scheduled_end": appointment.scheduled_end,
                    "status": appointment.status.value,
                    "updated_at": appointment.updated_at
                },
                "message": "Appointment rescheduled successfully"
            }
            
            logger.info(f"Appointment {appointment.id} rescheduled by patient")
            return result
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error rescheduling appointment: {str(e)}")
            raise
    
    def get_appointment_status(self, patient_id: uuid.UUID, appointment_id: uuid.UUID) -> Dict[str, Any]:
        """
        Get appointment status for patient
        
        Args:
            patient_id: Patient UUID
            appointment_id: Appointment UUID
            
        Returns:
            Appointment status information
        """
        try:
            logger.info(f"Getting appointment status for patient {patient_id}, appointment {appointment_id}")
            
            appointment = self.db.query(Appointment).filter(
                Appointment.id == appointment_id,
                Appointment.patient_id == patient_id
            ).first()
            
            if not appointment:
                raise ValueError("Appointment not found")
            
            result = {
                "appointment": {
                    "id": appointment.id,
                    "status": appointment.status.value,
                    "scheduled_start": appointment.scheduled_start,
                    "scheduled_end": appointment.scheduled_end,
                    "fee": float(appointment.fee),
                    "notes": appointment.notes,
                    "created_at": appointment.created_at,
                    "updated_at": appointment.updated_at
                },
                "message": "Appointment status retrieved successfully"
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting appointment status: {str(e)}")
            raise
    
    # ============================================================================
    # SPECIALIST ENDPOINTS
    # ============================================================================
    
    def get_patient_appointments(self, patient_id: uuid.UUID, page: int = 1, size: int = 20, status_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        Get appointments for patient
        
        Args:
            patient_id: Patient UUID
            page: Page number
            size: Results per page
            status_filter: Optional status filter
            
        Returns:
            Paginated list of appointments
        """
        try:
            logger.info(f"Getting appointments for patient {patient_id}")
            
            # Query appointments
            query = self.db.query(Appointment).filter(
                Appointment.patient_id == patient_id
            )
            
            # Apply status filter if provided
            if status_filter:
                query = query.filter(Appointment.status == AppointmentStatusEnum(status_filter))
            
            # Order by creation date (newest first)
            query = query.order_by(Appointment.created_at.desc())
            
            # Pagination
            total_count = query.count()
            appointments = query.offset((page - 1) * size).limit(size).all()
            
            # Format appointments
            appointment_list = []
            for apt in appointments:
                # Get specialist info
                specialist = self.db.query(Specialists).filter(Specialists.id == apt.specialist_id).first()
                
                appointment_list.append({
                    "id": apt.id,
                    "specialist_id": apt.specialist_id,
                    "specialist_name": f"{specialist.first_name} {specialist.last_name}" if specialist else "Unknown",
                    "scheduled_start": apt.scheduled_start,
                    "scheduled_end": apt.scheduled_end,
                    "consultation_mode": "online" if apt.appointment_type == AppointmentTypeEnum.VIRTUAL else "in_person",
                    "fee": float(apt.fee),
                    "status": apt.status.value,
                    "notes": apt.notes,
                    "created_at": apt.created_at,
                    "updated_at": apt.updated_at
                })
            
            result = {
                "appointments": appointment_list,
                "total_count": total_count,
                "page": page,
                "size": size,
                "total_pages": (total_count + size - 1) // size
            }
            
            logger.info(f"Found {total_count} appointments for patient {patient_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting patient appointments: {str(e)}")
            raise

    def get_booked_appointments(self, specialist_id: uuid.UUID, page: int = 1, size: int = 20) -> Dict[str, Any]:
        """
        Get booked appointments for specialist
        
        Args:
            specialist_id: Specialist UUID
            page: Page number
            size: Results per page
            
        Returns:
            Paginated list of appointments
        """
        try:
            logger.info(f"Getting booked appointments for specialist {specialist_id}")
            
            # Query appointments
            query = self.db.query(Appointment).filter(
                Appointment.specialist_id == specialist_id,
                Appointment.status.in_([
                    AppointmentStatusEnum.PENDING_APPROVAL,
                    AppointmentStatusEnum.SCHEDULED,
                    AppointmentStatusEnum.CONFIRMED,
                    AppointmentStatusEnum.COMPLETED
                ])
            ).order_by(Appointment.scheduled_start)
            
            # Pagination
            total_count = query.count()
            appointments = query.offset((page - 1) * size).limit(size).all()
            
            # Format appointments
            appointment_list = []
            for apt in appointments:
                # Get patient info
                patient = self.db.query(Patient).filter(Patient.id == apt.patient_id).first()
                
                appointment_list.append({
                    "id": apt.id,
                    "patient_id": apt.patient_id,
                    "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
                    "scheduled_start": apt.scheduled_start,
                    "scheduled_end": apt.scheduled_end,
                    "consultation_mode": "online" if apt.appointment_type == AppointmentTypeEnum.VIRTUAL else "in_person",
                    "fee": float(apt.fee),
                    "status": apt.status.value,
                    "notes": apt.notes,
                    "created_at": apt.created_at,
                    "updated_at": apt.updated_at,
                    "is_pending_approval": apt.status == AppointmentStatusEnum.PENDING_APPROVAL
                })
            
            result = {
                "appointments": appointment_list,
                "total_count": total_count,
                "page": page,
                "size": size,
                "total_pages": (total_count + size - 1) // size if total_count > 0 else 0
            }
            
            logger.info(f"Found {total_count} appointments for specialist {specialist_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting booked appointments for specialist {specialist_id}: {str(e)}")
            # Return empty result instead of crashing
            return {
                "appointments": [],
                "total_count": 0,
                "page": page,
                "size": size,
                "total_pages": 0,
                "error": f"Failed to retrieve appointments: {str(e)}"
            }
    
    def update_appointment_status(self, specialist_id: uuid.UUID, request: UpdateAppointmentStatusRequest) -> Dict[str, Any]:
        """
        Update appointment status by specialist
        
        Args:
            specialist_id: Specialist UUID
            request: Status update request
            
        Returns:
            Update confirmation
        """
        try:
            logger.info(f"Specialist {specialist_id} updating appointment {request.appointment_id} status to {request.status}")
            
            appointment = self.db.query(Appointment).filter(
                Appointment.id == request.appointment_id,
                Appointment.specialist_id == specialist_id
            ).first()
            
            if not appointment:
                raise ValueError("Appointment not found")
            
            # Update status
            appointment.status = AppointmentStatusEnum(request.status)
            appointment.notes = f"{appointment.notes or ''}\n\nSpecialist notes: {request.notes}"
            appointment.updated_at = datetime.now(timezone.utc)
            
            # If confirming a pending appointment, set scheduled time (optional)
            if request.status == "confirmed" and appointment.status == AppointmentStatusEnum.PENDING_APPROVAL:
                # For now, we'll set a default time 24 hours from now
                # In a real implementation, the specialist would specify the time
                from datetime import timedelta
                default_start = datetime.now(timezone.utc) + timedelta(hours=24)
                default_end = default_start + timedelta(hours=1)
                appointment.scheduled_start = default_start
                appointment.scheduled_end = default_end
                appointment.notes = f"{appointment.notes}\n\nAppointment scheduled for {default_start.strftime('%Y-%m-%d %H:%M')}"
            
            self.db.commit()
            
            # Send notification to patient
            self._send_appointment_notification_to_patient(appointment, f"status_updated_to_{request.status}")
            
            result = {
                "appointment": {
                    "id": appointment.id,
                    "status": appointment.status.value,
                    "updated_at": appointment.updated_at
                },
                "message": f"Appointment status updated to {request.status}"
            }
            
            logger.info(f"Appointment {appointment.id} status updated to {request.status}")
            return result
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating appointment status for specialist {specialist_id}: {str(e)}")
            raise ValueError(f"Failed to update appointment status: {str(e)}")
    
    def cancel_appointment_by_specialist(self, specialist_id: uuid.UUID, request: CancelAppointmentBySpecialistRequest) -> Dict[str, Any]:
        """
        Cancel appointment by specialist
        
        Args:
            specialist_id: Specialist UUID
            request: Cancellation request
            
        Returns:
            Cancellation confirmation
        """
        try:
            logger.info(f"Specialist {specialist_id} cancelling appointment {request.appointment_id}")
            
            appointment = self.db.query(Appointment).filter(
                Appointment.id == request.appointment_id,
                Appointment.specialist_id == specialist_id,
                Appointment.status.in_([AppointmentStatusEnum.PENDING_APPROVAL, AppointmentStatusEnum.SCHEDULED, AppointmentStatusEnum.CONFIRMED])
            ).first()
            
            if not appointment:
                raise ValueError("Appointment not found or cannot be cancelled")
            
            # Update appointment status
            appointment.status = AppointmentStatusEnum.CANCELLED
            appointment.cancellation_reason = request.reason
            appointment.updated_at = datetime.now(timezone.utc)

            # Release the slot if it was booked
            if appointment.time_slot:
                self.slot_manager.release_slot(str(appointment.time_slot.id))

            self.db.commit()

            # Send notification to patient
            self._send_appointment_notification_to_patient(appointment, "cancelled_by_specialist")
            
            result = {
                "appointment": {
                    "id": appointment.id,
                    "status": appointment.status.value,
                    "cancelled_at": appointment.updated_at
                },
                "message": "Appointment cancelled successfully"
            }
            
            logger.info(f"Appointment {appointment.id} cancelled by specialist")
            return result
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cancelling appointment by specialist: {str(e)}")
            raise
    
    def get_patient_public_profile(self, specialist_id: uuid.UUID, patient_id: uuid.UUID) -> Dict[str, Any]:
        """
        Get patient public profile for specialist
        
        Args:
            specialist_id: Specialist UUID
            patient_id: Patient UUID
            
        Returns:
            Patient public profile
        """
        try:
            logger.info(f"Getting patient public profile for specialist {specialist_id}, patient {patient_id}")
            
            # Verify specialist has appointment with this patient
            appointment = self.db.query(Appointment).filter(
                Appointment.specialist_id == specialist_id,
                Appointment.patient_id == patient_id
            ).first()
            
            if not appointment:
                raise ValueError("No appointment found with this patient")
            
            # Get patient info
            patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
            
            if not patient:
                raise ValueError("Patient not found")
            
            # Get consultation history
            consultation_history = self.db.query(Appointment).filter(
                Appointment.patient_id == patient_id,
                Appointment.status == AppointmentStatusEnum.COMPLETED
            ).order_by(Appointment.scheduled_start.desc()).limit(10).all()
            
            history_list = []
            for apt in consultation_history:
                history_list.append({
                    "appointment_id": apt.id,
                    "specialist_name": "Dr. Specialist",  # You can join with specialist table
                    "date": apt.scheduled_start,
                    "status": apt.status.value
                })
            
            result = {
                "patient": {
                    "id": patient.id,
                    "first_name": patient.first_name,
                    "last_name": patient.last_name,
                    "age": patient.age if hasattr(patient, 'age') else None,
                    "gender": patient.gender if hasattr(patient, 'gender') else None,
                    "city": patient.city,
                    "consultation_history": history_list
                },
                "message": "Patient profile retrieved successfully"
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting patient public profile: {str(e)}")
            raise
    
    def get_patient_referral_report(self, specialist_id: uuid.UUID, patient_id: uuid.UUID) -> Dict[str, Any]:
        """
        Get patient referral report from PIMA
        
        Args:
            specialist_id: Specialist UUID
            patient_id: Patient UUID
            
        Returns:
            Patient report information
        """
        try:
            logger.info(f"Getting patient referral report for specialist {specialist_id}, patient {patient_id}")
            
            # Verify specialist has appointment with this patient
            appointment = self.db.query(Appointment).filter(
                Appointment.specialist_id == specialist_id,
                Appointment.patient_id == patient_id
            ).first()
            
            if not appointment:
                raise ValueError("No appointment found with this patient")
            
            # TODO: Integrate with PIMA to get actual report
            # For now, return mock data
            result = {
                "report": {
                    "patient_id": str(patient_id),
                    "report_available": True,
                    "report_generated_at": datetime.now(timezone.utc).isoformat(),
                    "report_type": "initial_assessment",
                    "report_summary": "Patient assessment completed by PIMA agent",
                    "risk_level": "moderate",
                    "recommendations": [
                        "Consider CBT therapy for anxiety management",
                        "Regular follow-up appointments recommended",
                        "Monitor for depressive symptoms"
                    ],
                    "generated_by": "PIMA_Agent"
                },
                "message": "Patient referral report retrieved successfully"
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting patient referral report: {str(e)}")
            raise
    
    # ============================================================================
    # PRIVATE HELPER METHODS
    # ============================================================================
    
    def _send_appointment_notification_to_specialist(self, appointment: Appointment, notification_type: str):
        """Send notification to specialist about appointment changes"""
        try:
            # Get specialist email
            specialist = self.db.query(Specialists).filter(Specialists.id == appointment.specialist_id).first()
            if not specialist:
                return
            
            # Get patient info
            patient = self.db.query(Patient).filter(Patient.id == appointment.patient_id).first()
            patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Patient"
            
            subject = f"Appointment Update - {notification_type.replace('_', ' ').title()}"
            
            # Handle different appointment types
            if appointment.scheduled_start:
                date_info = f"<p><strong>Date:</strong> {appointment.scheduled_start.strftime('%B %d, %Y at %I:%M %p')}</p>"
            else:
                date_info = "<p><strong>Date:</strong> Pending approval (no scheduled time yet)</p>"
            
            message = f"""
            <h3>Appointment Update</h3>
            <p><strong>Patient:</strong> {patient_name}</p>
            {date_info}
            <p><strong>Status:</strong> {appointment.status.value}</p>
            """
            
            send_notification_email(specialist.email, subject, message)
            
        except Exception as e:
            logger.error(f"Error sending notification to specialist: {str(e)}")
    
    def _send_appointment_notification_to_patient(self, appointment: Appointment, notification_type: str):
        """Send notification to patient about appointment changes"""
        try:
            # Get patient email
            patient = self.db.query(Patient).filter(Patient.id == appointment.patient_id).first()
            if not patient:
                return
            
            # Get specialist info
            specialist = self.db.query(Specialists).filter(Specialists.id == appointment.specialist_id).first()
            specialist_name = f"Dr. {specialist.first_name} {specialist.last_name}" if specialist else "Specialist"
            
            subject = f"Appointment Update - {notification_type.replace('_', ' ').title()}"
            
            # Handle different appointment types
            if appointment.scheduled_start:
                date_info = f"<p><strong>Date:</strong> {appointment.scheduled_start.strftime('%B %d, %Y at %I:%M %p')}</p>"
            else:
                date_info = "<p><strong>Date:</strong> Pending approval (no scheduled time yet)</p>"
            
            message = f"""
            <h3>Appointment Update</h3>
            <p><strong>Specialist:</strong> {specialist_name}</p>
            {date_info}
            <p><strong>Status:</strong> {appointment.status.value}</p>
            """
            
            send_notification_email(patient.email, subject, message)
            
        except Exception as e:
            logger.error(f"Error sending notification to patient: {str(e)}")
    
    def get_matching_recommendations(self, patient_id: uuid.UUID, specializations: Optional[List[str]] = None, 
                                   consultation_mode: Optional[str] = None, budget_max: Optional[float] = None, 
                                   limit: int = 3) -> Dict[str, Any]:
        """
        Get personalized specialist recommendations for a patient
        
        Args:
            patient_id: Patient UUID
            specializations: List of required specializations
            consultation_mode: Preferred consultation mode
            budget_max: Maximum budget
            limit: Number of recommendations
            
        Returns:
            Dict with recommended specialists
        """
        try:
            logger.info(f"Getting recommendations for patient {patient_id}")
            
            # Use existing get_top_specialists method with patient-specific criteria
            request = TopSpecialistsRequest(
                specializations=specializations,
                consultation_mode=consultation_mode,
                budget_max=budget_max,
                limit=limit
            )
            
            result = self.get_top_specialists(request)
            
            # Add patient-specific context to the result
            result["patient_id"] = str(patient_id)
            result["recommendation_type"] = "personalized"
            
            logger.info(f"Found {len(result.get('specialists', []))} recommendations for patient {patient_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error getting recommendations for patient {patient_id}: {str(e)}")
            raise

    def cleanup_expired_holds(self) -> int:
        """
        Clean up expired slot holds
        
        Returns:
            Number of expired holds cleaned up
        """
        try:
            logger.info("Cleaning up expired slot holds")
            
            # This would typically clean up expired holds from a cache or database
            # For now, return 0 as a placeholder
            cleaned_count = 0
            
            logger.info(f"Cleaned up {cleaned_count} expired holds")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired holds: {str(e)}")
            return 0
