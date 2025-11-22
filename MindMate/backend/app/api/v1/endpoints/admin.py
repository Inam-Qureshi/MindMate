"""
MindMate Admin API - Administrative Operations Only
==================================================
Handles admin-specific operations including user management, system monitoring,
and administrative controls. All non-admin operations have been moved to
specialized routers.

Author: Mental Health Platform Team
Version: 2.0.0 - Clean admin operations only
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timezone
import os
import json
from pathlib import Path

from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_user_from_token
from app.models.patient import Patient, PatientAuthInfo
from app.models.specialist import (
    Specialists,
    SpecialistsAuthInfo,
    SpecialistsApprovalData,
    ApprovalStatusEnum,
)
from app.models.admin import Admin, AdminRoleEnum, AdminStatusEnum
from app.models.forum import ForumReport, ForumQuestion, ForumAnswer
from app.core.logging_config import get_logger

# Initialize router
router = APIRouter(prefix="/admin", tags=["Admin"])

# Initialize logger
logger = get_logger(__name__)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

from pydantic import BaseModel, ValidationError

class PatientResponse(BaseModel):
    """Patient response model for admin view"""
    id: str
    email: str
    full_name: str
    phone: str | None
    date_of_birth: datetime | None
    city: str | None
    district: str | None
    province: str | None
    country: str | None
    is_active: bool
    created_at: datetime
    last_login: datetime | None

class AdminUserResponse(BaseModel):
    """Admin user response model"""
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    status: str
    is_active: bool
    created_at: datetime
    last_login: datetime | None

class SpecialistResponse(BaseModel):
    """Specialist response model for admin view"""
    id: str
    email: str
    full_name: str
    phone: str | None
    specialist_type: str | None
    approval_status: str
    email_verification_status: str | None
    profile_completion_percentage: int
    mandatory_fields_completed: bool
    is_active: bool
    created_at: datetime
    profile_completed_at: datetime | None
    qualification: str | None
    institution: str | None
    years_experience: int | None
    consultation_fee: float | None

class SpecialistDetailResponse(BaseModel):
    """Detailed specialist response model for admin view"""
    # Basic Info
    id: str
    email: str
    first_name: str
    last_name: str
    phone: str | None
    cnic_number: str | None
    gender: str | None
    date_of_birth: datetime | None
    
    # Professional Info
    specialist_type: str | None
    qualification: str | None
    institution: str | None
    license_number: str | None
    license_authority: str | None
    license_expiry_date: Any | None
    years_experience: int | None
    certifications: List[str] | None
    languages_spoken: List[str] | None
    
    # Practice Details
    current_affiliation: str | None
    clinic_address: str | None
    consultation_modes: List[str] | None
    consultation_fee: float | None
    currency: str | None
    availability_schedule: Dict[str, List[str]] | None
    experience_summary: str | None
    specialties_in_mental_health: List[str] | None
    therapy_methods: List[str] | None
    accepting_new_patients: bool
    
    # Profile & Status
    profile_photo_url: str | None  # Maps to profile_image_url in database
    profile_completion_percentage: int
    mandatory_fields_completed: bool
    approval_status: str
    email_verification_status: str | None
    is_active: bool
    profile_verified: bool
    profile_completed_at: datetime | None
    
    # Documents
    license_document_url: str | None
    cnic_document_url: str | None
    degree_document_url: str | None
    certification_document_urls: List[str] | None
    supporting_document_urls: List[str] | None
    registration_documents: Dict[str, Any] | None

    # Review Metadata
    reviewed_by: str | None
    reviewed_at: datetime | None
    approval_notes: str | None
    rejection_reason: str | None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime | None
    last_login: datetime | None
    approved_by: str | None
    
    # Admin Notes
    verification_notes: str | None
    notes: str | None

class SpecialistReviewRequest(BaseModel):
    """Payload for specialist approval/rejection actions"""
    reason: str | None = None
    admin_notes: str | None = None
    notify_specialist: bool = False

    model_config = {"extra": "ignore"}

class SystemStats(BaseModel):
    """System statistics for admin dashboard"""
    total_users: int
    total_patients: int
    total_specialists: int
    total_admins: int
    pending_specialists: int
    approved_specialists: int
    rejected_specialists: int
    suspended_specialists: int
    total_forum_posts: int
    pending_reports: int
    system_health: str

class ForumReportAdminResponse(BaseModel):
    """Forum report response model for admin view"""
    id: str
    post_id: str
    post_type: str
    reason: str | None
    status: str
    reporter_name: str
    reporter_type: str
    created_at: datetime
    post_content: str
    post_author_name: str
    moderated_by: str | None
    moderated_at: datetime | None
    moderation_notes: str | None

class ReportActionRequest(BaseModel):
    """Request model for taking action on a report"""
    action: str  # "keep" or "remove"
    notes: str | None = None

# ============================================================================
# AUTHENTICATION FUNCTIONS
# ============================================================================

def get_authenticated_admin(current_user_data: dict = Depends(get_current_user_from_token)) -> Admin:
    """Get current authenticated admin with proper role checking"""
    user = current_user_data["user"]
    user_type = current_user_data["user_type"]

    if user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Check admin role
    if not hasattr(user, 'role') or user.role not in [AdminRoleEnum.ADMIN, AdminRoleEnum.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient admin privileges"
        )

    return user

def get_super_admin(current_user_data: dict = Depends(get_current_user_from_token)) -> Admin:
    """Get current authenticated super admin"""
    user = current_user_data["user"]
    user_type = current_user_data["user_type"]

    if user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    # Check super admin role
    if not hasattr(user, 'role') or user.role != AdminRoleEnum.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )

    return user

# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/patients", response_model=List[PatientResponse])
async def get_all_patients(
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Get all registered patients (admin only)"""
    try:
        # Get all patients with their auth info
        patients = db.query(Patient).filter(
            Patient.is_deleted == False
        ).all()

        result = []
        for patient in patients:
            try:
                # Get auth info for each patient
                auth_info = db.query(PatientAuthInfo).filter(
                    PatientAuthInfo.patient_id == patient.id
                ).first()

                result.append(PatientResponse(
                    id=str(patient.id),
                    email=patient.email,
                    full_name=f"{patient.first_name} {patient.last_name}",
                    phone=patient.phone,
                    date_of_birth=patient.date_of_birth,
                    city=patient.city,
                    district=patient.district,
                    province=patient.province,
                    country=patient.country,
                    is_active=auth_info.is_active if auth_info else False,
                    created_at=patient.created_at,
                    last_login=auth_info.last_login if auth_info else None
                ))
            except Exception as patient_error:
                logger.error(f"Error processing patient {patient.id}: {patient_error}")
                continue

        return result if result else []  # Always return array

    except Exception as e:
        logger.error(f"Error fetching patients: {str(e)}")
        # Return empty array instead of raising error to prevent frontend crash
        return []

@router.delete("/patients/{patient_id}")
async def delete_patient(
    patient_id: str,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Permanently delete a patient (admin only)"""
    try:
        # Find the patient
        patient = db.query(Patient).filter(
            Patient.id == patient_id,
            Patient.is_deleted == False
        ).first()

        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )

        # Get patient auth info
        auth_info = db.query(PatientAuthInfo).filter(
            PatientAuthInfo.patient_id == patient.id
        ).first()

        # First, handle related data that might have foreign key constraints
        # Delete mandatory questionnaires that reference this patient
        from app.models.patient import MandatoryQuestionnaireSubmission
        questionnaires = db.query(MandatoryQuestionnaireSubmission).filter(
            MandatoryQuestionnaireSubmission.patient_id == patient.id
        ).all()
        
        for questionnaire in questionnaires:
            db.delete(questionnaire)

        # Permanently delete the patient and all related data
        if auth_info:
            db.delete(auth_info)

        # Delete the patient (this will cascade to related data due to relationships)
        db.delete(patient)
        db.commit()

        return {"message": "Patient deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting patient: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete patient"
        )

@router.post("/patients/{patient_id}/activate")
async def activate_patient(
    patient_id: str,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Activate a patient account (admin only)"""
    try:
        patient = db.query(Patient).filter(
            Patient.id == patient_id,
            Patient.is_deleted == False
        ).first()

        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )

        # Update auth info instead of patient directly
        auth_info = db.query(PatientAuthInfo).filter(
            PatientAuthInfo.patient_id == patient.id
        ).first()
        
        if auth_info:
            auth_info.is_active = True
            auth_info.updated_at = datetime.now()
        else:
            # Create auth info if it doesn't exist
            auth_info = PatientAuthInfo(
                patient_id=patient.id,
                is_active=True,
                is_verified=False,
                is_locked=False
            )
            db.add(auth_info)
        
        patient.updated_at = datetime.now()
        
        db.commit()

        return {"message": "Patient activated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error activating patient: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate patient"
        )

@router.post("/patients/{patient_id}/deactivate")
async def deactivate_patient(
    patient_id: str,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Deactivate a patient account (admin only)"""
    try:
        patient = db.query(Patient).filter(
            Patient.id == patient_id,
            Patient.is_deleted == False
        ).first()

        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )

        # Update auth info instead of patient directly
        auth_info = db.query(PatientAuthInfo).filter(
            PatientAuthInfo.patient_id == patient.id
        ).first()
        
        if auth_info:
            auth_info.is_active = False
            auth_info.updated_at = datetime.now()
        else:
            # Create auth info if it doesn't exist
            auth_info = PatientAuthInfo(
                patient_id=patient.id,
                is_active=False,
                is_verified=False,
                is_locked=False
            )
            db.add(auth_info)
        
        patient.updated_at = datetime.now()
        
        db.commit()

        return {"message": "Patient deactivated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deactivating patient: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate patient"
        )

# ============================================================================
# SPECIALIST MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/specialists", response_model=List[SpecialistResponse])
async def get_all_specialists(
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Get all registered specialists (admin only)"""
    try:
        # Get all specialists with their auth info
        specialists = db.query(Specialists).filter(
            Specialists.is_deleted == False
        ).all()

        result = []
        for specialist in specialists:
            try:
                # Get auth info for each specialist
                auth_info = db.query(SpecialistsAuthInfo).filter(
                    SpecialistsAuthInfo.specialist_id == specialist.id
                ).first()

                result.append(SpecialistResponse(
                    id=str(specialist.id),
                    email=specialist.email,
                    full_name=f"{specialist.first_name} {specialist.last_name}",
                    phone=specialist.phone,
                    specialist_type=specialist.specialist_type.value if specialist.specialist_type else None,
                    approval_status=specialist.approval_status.value if specialist.approval_status else "pending",
                    email_verification_status=auth_info.email_verification_status.value if auth_info and auth_info.email_verification_status else None,
                    profile_completion_percentage=specialist.profile_completion_percentage or 0,
                    mandatory_fields_completed=specialist.mandatory_fields_completed or False,
                    is_active=auth_info.is_email_verified if auth_info else False,
                    created_at=specialist.created_at,
                    profile_completed_at=specialist.profile_completed_at,
                    qualification=specialist.qualification,
                    institution=specialist.institution,
                    years_experience=specialist.years_experience,
                    consultation_fee=float(specialist.consultation_fee) if specialist.consultation_fee else None
                ))
            except Exception as specialist_error:
                logger.error(f"Error processing specialist {specialist.id}: {specialist_error}")
                continue

        return result if result else []  # Always return array

    except Exception as e:
        logger.error(f"Error fetching specialists: {str(e)}")
        # Return empty array instead of raising error to prevent frontend crash
        return []

@router.post("/specialists/{specialist_id}/approve")
async def approve_specialist(
    specialist_id: str,
    request: SpecialistReviewRequest | None = None,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Approve a specialist (admin only)"""
    try:
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()

        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )

        payload = request or SpecialistReviewRequest()

        specialist.approval_status = ApprovalStatusEnum.APPROVED
        specialist.approved_by = current_admin.id
        specialist.updated_at = datetime.now(timezone.utc)

        approval_data = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).first()

        if not approval_data:
            approval_data = SpecialistsApprovalData(
                specialist_id=specialist.id,
                submission_date=datetime.now(timezone.utc)
            )
            db.add(approval_data)

        approval_data.reviewed_by = current_admin.id
        approval_data.reviewed_at = datetime.now(timezone.utc)
        approval_data.approval_notes = payload.admin_notes
        approval_data.rejection_reason = None
        approval_data.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(specialist)

        return {
            "message": "Specialist approved successfully",
            "specialist_id": str(specialist.id),
            "approval_status": specialist.approval_status.value,
            "review": {
                "reviewed_by": str(current_admin.id),
                "reviewed_at": approval_data.reviewed_at.isoformat() if approval_data.reviewed_at else None,
                "admin_notes": payload.admin_notes
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving specialist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve specialist"
        )

@router.post("/specialists/{specialist_id}/reject")
async def reject_specialist(
    specialist_id: str,
    request: SpecialistReviewRequest | None = None,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Reject a specialist (admin only)"""
    try:
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()

        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )

        payload = request or SpecialistReviewRequest()
        rejection_reason = payload.reason or "Application rejected by admin"

        specialist.approval_status = ApprovalStatusEnum.REJECTED
        specialist.approved_by = None
        # Rejection reason is tracked via SpecialistsApprovalData
        specialist.updated_at = datetime.now(timezone.utc)

        approval_data = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).first()

        if not approval_data:
            approval_data = SpecialistsApprovalData(
                specialist_id=specialist.id,
                submission_date=datetime.now(timezone.utc)
            )
            db.add(approval_data)

        approval_data.reviewed_by = current_admin.id
        approval_data.reviewed_at = datetime.now(timezone.utc)
        approval_data.approval_notes = payload.admin_notes
        approval_data.rejection_reason = rejection_reason
        approval_data.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(specialist)

        return {
            "message": "Specialist rejected successfully",
            "specialist_id": str(specialist.id),
            "approval_status": specialist.approval_status.value,
            "review": {
                "reviewed_by": str(current_admin.id),
                "reviewed_at": approval_data.reviewed_at.isoformat() if approval_data.reviewed_at else None,
                "admin_notes": payload.admin_notes,
                "reason": rejection_reason
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error rejecting specialist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject specialist"
        )

@router.post("/specialists/{specialist_id}/suspend")
async def suspend_specialist(
    specialist_id: str,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Suspend a specialist (admin only)"""
    try:
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()

        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )

        specialist.approval_status = ApprovalStatusEnum.SUSPENDED
        specialist.updated_at = datetime.now()
        
        db.commit()

        return {"message": "Specialist suspended successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error suspending specialist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to suspend specialist"
        )

@router.post("/specialists/{specialist_id}/unsuspend")
async def unsuspend_specialist(
    specialist_id: str,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Unsuspend a specialist (admin only)"""
    try:
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()

        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )

        # Set back to approved status
        specialist.approval_status = ApprovalStatusEnum.APPROVED
        specialist.updated_at = datetime.now()
        
        db.commit()

        return {"message": "Specialist unsuspended successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error unsuspending specialist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unsuspend specialist"
        )

@router.get("/specialists/{specialist_id}/details", response_model=SpecialistDetailResponse)
async def get_specialist_details(
    specialist_id: str,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific specialist (admin only)"""
    try:
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()

        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )

        # Get auth info
        auth_info = db.query(SpecialistsAuthInfo).filter(
            SpecialistsAuthInfo.specialist_id == specialist.id
        ).first()

        # Get approval data
        approval_data = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).first()
        def _parse_json_like(value):
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except ValueError:
                    return value
            return value

        def _ensure_list_of_strings(value):
            parsed = _parse_json_like(value)
            if parsed is None:
                return None
            if isinstance(parsed, list):
                normalized: List[str] = []
                for item in parsed:
                    if item is None:
                        continue
                    if isinstance(item, (list, tuple, set)):
                        normalized.extend(str(sub_item) for sub_item in item if sub_item is not None)
                    elif isinstance(item, dict):
                        normalized.extend(str(sub_item) for sub_item in item.values() if sub_item is not None)
                    else:
                        normalized.append(str(item))
                return normalized or None
            if isinstance(parsed, (tuple, set)):
                return [str(item) for item in parsed if item is not None] or None
            if isinstance(parsed, dict):
                normalized_dict: List[str] = []
                for key, dict_value in parsed.items():
                    if dict_value is None:
                        continue
                    if isinstance(dict_value, (list, tuple, set)):
                        for sub_item in dict_value:
                            if sub_item is not None:
                                normalized_dict.append(f"{key}: {sub_item}")
                    elif isinstance(dict_value, dict):
                        for sub_key, sub_value in dict_value.items():
                            if sub_value is not None:
                                normalized_dict.append(f"{key}.{sub_key}: {sub_value}")
                    else:
                        normalized_dict.append(f"{key}: {dict_value}")
                return normalized_dict or None
            return [str(parsed)]

        def _ensure_schedule_map(value):
            """
            Normalize availability_schedule to Dict[str, List[str]] format.
            
            Handles multiple input formats:
            1. {"Mon": ["08:00-14:00", "16:00-20:00"]}  # Already correct format
            2. {"Mon": {"online": "08:00-14:00", "in_person": "16:00-20:00"}}  # Nested dict format
            3. {"Mon": "08:00-14:00"}  # Single string format
            """
            parsed = _parse_json_like(value)
            if not parsed or not isinstance(parsed, dict):
                return None
            
            schedule: Dict[str, List[str]] = {}
            for key, slots in parsed.items():
                # Case 1: slots is already a list (correct format)
                if isinstance(slots, list):
                    schedule[str(key)] = [str(s) for s in slots if s is not None]
                # Case 2: slots is a dict (nested format with online/in_person)
                elif isinstance(slots, dict):
                    # Extract all time ranges from the nested dict
                    time_ranges = []
                    for mode, time_range in slots.items():
                        if time_range and isinstance(time_range, str):
                            time_ranges.append(time_range)
                    schedule[str(key)] = time_ranges if time_ranges else []
                # Case 3: slots is a single string
                elif isinstance(slots, str):
                    schedule[str(key)] = [slots]
                # Case 4: Use the generic list normalizer as fallback
                else:
                    normalized_slots = _ensure_list_of_strings(slots) or []
                    schedule[str(key)] = normalized_slots
            
            return schedule if schedule else None

        def _enum_value(enum_obj):
            if enum_obj is None:
                return None
            return enum_obj.value if hasattr(enum_obj, "value") else str(enum_obj)

        registration_documents: Dict[str, Any] | None = None
        degree_document_url: str | None = None
        certification_document_urls: List[str] | None = None
        supporting_document_urls: List[str] | None = None
        license_document_url: str | None = None
        cnic_document_url: str | None = None

        if approval_data and approval_data.registration_documents:
            parsed_registration_documents = _parse_json_like(approval_data.registration_documents)
            registration_documents = parsed_registration_documents if isinstance(parsed_registration_documents, dict) else None
            if isinstance(registration_documents, dict):
                license_document_url = registration_documents.get("license")
                cnic_document_url = registration_documents.get("cnic")
                degree_document_url = registration_documents.get("degree")

                certifications_value = registration_documents.get("certifications")
                certification_document_urls = _ensure_list_of_strings(certifications_value)

                supporting_value = (
                    registration_documents.get("supporting_documents")
                    or registration_documents.get("supporting")
                )
                supporting_document_urls = _ensure_list_of_strings(supporting_value)
        else:
            registration_documents = None

        certifications = _ensure_list_of_strings(approval_data.certifications) if approval_data else None
        languages_spoken = _ensure_list_of_strings(specialist.languages_spoken) if specialist else None
        consultation_modes = _ensure_list_of_strings(specialist.consultation_modes)
        availability_schedule = _ensure_schedule_map(specialist.availability_schedule)
        specialties = _ensure_list_of_strings(specialist.specialties_in_mental_health)
        therapy_methods = _ensure_list_of_strings(specialist.therapy_methods)

        try:
            # Prepare response data with proper logging for debugging
            response_data = {
                # Basic Info
                "id": str(specialist.id),
                "email": specialist.email,
                "first_name": specialist.first_name,
                "last_name": specialist.last_name,
                "phone": specialist.phone,
                "cnic_number": approval_data.cnic if approval_data else None,
                "gender": _enum_value(specialist.gender),
                "date_of_birth": specialist.date_of_birth,

                # Professional Info
                "specialist_type": _enum_value(specialist.specialist_type),
                "qualification": specialist.qualification,
                "institution": specialist.institution,
                "license_number": approval_data.license_number if approval_data else None,
                "license_authority": approval_data.license_issuing_authority if approval_data else None,
                "license_expiry_date": approval_data.license_expiry_date if approval_data else None,
                "years_experience": specialist.years_experience,
                "certifications": certifications,
                "languages_spoken": languages_spoken,

                # Practice Details
                "current_affiliation": specialist.current_affiliation,
                "clinic_address": specialist.clinic_address,
                "consultation_modes": consultation_modes,
                "consultation_fee": float(specialist.consultation_fee) if specialist.consultation_fee else None,
                "currency": specialist.currency,
                "availability_schedule": availability_schedule,
                "experience_summary": specialist.experience_summary,
                "specialties_in_mental_health": specialties,
                "therapy_methods": therapy_methods,
                "accepting_new_patients": specialist.accepting_new_patients,

                # Profile & Status
                "profile_photo_url": specialist.profile_image_url,  # Using profile_image_url as profile_photo_url doesn't exist in DB
                "profile_completion_percentage": specialist.profile_completion_percentage or 0,
                "mandatory_fields_completed": specialist.mandatory_fields_completed or False,
                "approval_status": _enum_value(specialist.approval_status) or "pending",
                "email_verification_status": _enum_value(auth_info.email_verification_status) if auth_info and auth_info.email_verification_status else None,
                "is_active": bool(auth_info.is_email_verified) if auth_info else False,
                "profile_verified": specialist.profile_verified or False,
                "profile_completed_at": specialist.profile_completed_at,

                # Documents
                "license_document_url": license_document_url,
                "cnic_document_url": cnic_document_url,
                "degree_document_url": degree_document_url,
                "certification_document_urls": certification_document_urls,
                "supporting_document_urls": supporting_document_urls,
                "registration_documents": registration_documents,
                "reviewed_by": str(approval_data.reviewed_by) if approval_data and approval_data.reviewed_by else None,
                "reviewed_at": approval_data.reviewed_at if approval_data else None,
                "approval_notes": approval_data.approval_notes if approval_data else None,
                "rejection_reason": approval_data.rejection_reason if approval_data else None,

                # Timestamps
                "created_at": specialist.created_at,
                "updated_at": specialist.updated_at,
                "last_login": auth_info.last_login_at if auth_info else None,
                "approved_by": str(specialist.approved_by) if specialist.approved_by else None,

                # Admin Notes
                "verification_notes": specialist.verification_notes,
                "notes": specialist.notes
            }
            
            # Validate and return response
            return SpecialistDetailResponse(**response_data)
            
        except ValidationError as validation_error:
            # Log detailed validation error with field information
            error_details = []
            for error in validation_error.errors():
                field = ".".join(str(loc) for loc in error["loc"])
                error_details.append(f"{field}: {error['msg']}")
            
            logger.error(
                "Pydantic validation error for specialist %s. Fields: %s. Raw errors: %s",
                specialist.id,
                ", ".join(error_details),
                validation_error.json()
            )
            
            # Return 422 Unprocessable Entity instead of 500 for validation errors
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Specialist data validation failed",
                    "errors": error_details,
                    "specialist_id": str(specialist.id)
                }
            )

    except HTTPException:
        # Re-raise HTTP exceptions without additional logging (already logged above)
        raise
    except Exception as e:
        # Log unexpected errors with full traceback
        logger.error(
            f"Unexpected error fetching specialist details for {specialist_id}: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve specialist details"
        )

@router.get("/admins", response_model=List[AdminUserResponse])
async def get_all_admins(
    current_admin: Admin = Depends(get_super_admin),
    db: Session = Depends(get_db)
):
    """Get all admin users (super admin only)"""
    try:
        admins = db.query(Admin).filter(
            Admin.is_deleted == False
        ).all()

        result = []
        for admin in admins:
            result.append(AdminUserResponse(
                id=str(admin.id),
                email=admin.email,
                first_name=admin.first_name,
                last_name=admin.last_name,
                role=admin.role.value if admin.role else "unknown",
                status=admin.status.value if admin.status else "unknown",
                is_active=admin.is_active,
                created_at=admin.created_at,
                last_login=admin.last_login
            ))

        return result

    except Exception as e:
        print(f"Error fetching admins: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve admins"
        )

# ============================================================================
# SYSTEM MONITORING ENDPOINTS
# ============================================================================

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Get system statistics for admin dashboard"""
    try:
        # User counts
        total_patients = db.query(Patient).filter(Patient.is_deleted == False).count()
        total_specialists = db.query(Specialists).filter(Specialists.is_deleted == False).count()
        total_admins = db.query(Admin).filter(Admin.is_deleted == False).count()
        total_users = total_patients + total_specialists + total_admins

        # Specialist status counts
        pending_specialists = db.query(Specialists).filter(
            Specialists.approval_status == ApprovalStatusEnum.PENDING,
            Specialists.is_deleted == False
        ).count()

        approved_specialists = db.query(Specialists).filter(
            Specialists.approval_status == ApprovalStatusEnum.APPROVED,
            Specialists.is_deleted == False
        ).count()

        rejected_specialists = db.query(Specialists).filter(
            Specialists.approval_status == ApprovalStatusEnum.REJECTED,
            Specialists.is_deleted == False
        ).count()

        suspended_specialists = db.query(Specialists).filter(
            Specialists.approval_status == ApprovalStatusEnum.SUSPENDED,
            Specialists.is_deleted == False
        ).count()

        # Forum stats
        total_forum_posts = db.query(ForumQuestion).filter(
            ForumQuestion.is_deleted == False
        ).count() + db.query(ForumAnswer).filter(
            ForumAnswer.is_deleted == False
        ).count()

        pending_reports = db.query(ForumReport).filter(
            ForumReport.status == "pending"
        ).count()

        return SystemStats(
            total_users=total_users,
            total_patients=total_patients,
            total_specialists=total_specialists,
            total_admins=total_admins,
            pending_specialists=pending_specialists,
            approved_specialists=approved_specialists,
            rejected_specialists=rejected_specialists,
            suspended_specialists=suspended_specialists,
            total_forum_posts=total_forum_posts,
            pending_reports=pending_reports,
            system_health="healthy"
        )

    except Exception as e:
        print(f"Error getting system stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system statistics"
        )

# ============================================================================
# FORUM MODERATION ENDPOINTS
# ============================================================================

@router.get("/reports", response_model=List[ForumReportAdminResponse])
async def get_all_reports(
    status: str | None = None,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Get all forum reports (admin only)"""
    try:
        # Build query
        query = db.query(ForumReport)

        # Filter by status if provided
        if status:
            query = query.filter(ForumReport.status == status)

        reports = query.order_by(ForumReport.created_at.desc()).all()

        response_data = []
        for report in reports:
            try:
                # Get post content and author
                post_content = ""
                post_author_name = "Unknown"

                if report.post_type == "question":
                    question = db.query(ForumQuestion).filter(ForumQuestion.id == report.post_id).first()
                    if question:
                        post_content = question.title + ": " + question.content[:200] + "..."
                        patient = db.query(Patient).filter(Patient.id == question.patient_id).first()
                        specialist = db.query(Specialists).filter(Specialists.id == question.specialist_id).first()
                        if patient:
                            post_author_name = f"{patient.first_name} {patient.last_name}"
                        elif specialist:
                            post_author_name = f"Dr. {specialist.first_name} {specialist.last_name}"
                else:  # answer
                    answer = db.query(ForumAnswer).filter(ForumAnswer.id == report.post_id).first()
                    if answer:
                        post_content = answer.content[:200] + "..."
                        specialist = db.query(Specialists).filter(Specialists.id == answer.specialist_id).first()
                        if specialist:
                            post_author_name = f"Dr. {specialist.first_name} {specialist.last_name}"

                response_data.append(ForumReportAdminResponse(
                    id=str(report.id),
                    post_id=str(report.post_id),
                    post_type=report.post_type,
                    reason=report.reason,
                    status=report.status,
                    reporter_name=report.reporter_name,
                    reporter_type=report.reporter_type,
                    created_at=report.created_at,
                    post_content=post_content,
                    post_author_name=post_author_name,
                    moderated_by=str(report.moderated_by) if report.moderated_by else None,
                    moderated_at=report.moderated_at,
                    moderation_notes=report.moderation_notes
                ))
            except Exception as report_error:
                logger.error(f"Error processing report {report.id}: {report_error}")
                continue

        return response_data if response_data else []  # Always return array

    except Exception as e:
        logger.error(f"Error fetching reports: {str(e)}")
        # Return empty array instead of raising error to prevent frontend crash
        return []

@router.post("/reports/{report_id}/action")
async def take_report_action(
    report_id: str,
    action_data: ReportActionRequest,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Take action on a report (admin only)"""
    try:
        # Find the report
        report = db.query(ForumReport).filter(ForumReport.id == report_id).first()

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )

        if report.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Report has already been processed"
            )

        if action_data.action == "keep":
            # Mark report as resolved
            report.mark_resolved(str(current_admin.id), action_data.notes)

        elif action_data.action == "remove":
            # Mark report as removed and delete the post
            report.mark_removed(str(current_admin.id), action_data.notes)

            if report.post_type == "question":
                question = db.query(ForumQuestion).filter(ForumQuestion.id == report.post_id).first()
                if question:
                    question.is_deleted = True
            else:  # answer
                answer = db.query(ForumAnswer).filter(ForumAnswer.id == report.post_id).first()
                if answer:
                    answer.is_deleted = True
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Must be 'keep' or 'remove'"
            )

        db.commit()

        return {"message": f"Report {action_data.action}d successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error taking report action: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to take action on report"
        )

# ============================================================================
# SYSTEM MAINTENANCE ENDPOINTS
# ============================================================================

@router.post("/system/backup")
async def trigger_system_backup(
    current_admin: Admin = Depends(get_super_admin),
    db: Session = Depends(get_db)
):
    """Trigger system backup (super admin only)"""
    try:
        # This would integrate with backup systems
        # For now, return a placeholder response
        return {
            "message": "System backup initiated",
            "backup_id": f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "status": "in_progress"
        }

    except Exception as e:
        print(f"Error triggering backup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger system backup"
        )

@router.get("/system/logs")
async def get_system_logs(
    lines: int = 100,
    level: str = "ERROR",
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Get system logs (admin only)"""
    try:
        # This would integrate with logging systems
        # For now, return a placeholder response
        return {
            "logs": [],
            "total_lines": 0,
            "level": level,
            "message": "Log retrieval not implemented yet"
        }

    except Exception as e:
        print(f"Error getting system logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve system logs"
        )

# ============================================================================
# DOCUMENT SERVING ENDPOINTS
# ============================================================================

@router.get("/specialists/documents/{file_path:path}")
async def serve_specialist_document(
    file_path: str,
    current_user: dict = Depends(get_current_user_from_token)
):
    """
    Serve specialist documents (admin only)
    
    This endpoint serves uploaded documents like license, CNIC, etc.
    Only accessible by admin users.
    """
    # Check if user is admin
    if current_user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access specialist documents"
        )
    
    try:
        # Construct the full file path
        # The uploads are stored in backend/uploads/specialists/documents/
        base_dir = Path(__file__).parent.parent.parent / "uploads" / "specialists" / "documents"
        full_path = base_dir / file_path
        
        # Security check: ensure the resolved path is within the allowed directory
        if not str(full_path.resolve()).startswith(str(base_dir.resolve())):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Check if file exists
        if not full_path.exists() or not full_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document not found: {file_path}"
            )
        
        # Determine media type based on file extension
        ext = full_path.suffix.lower()
        media_type_map = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
        media_type = media_type_map.get(ext, 'application/octet-stream')
        
        # Return the file
        return FileResponse(
            path=str(full_path),
            media_type=media_type,
            filename=full_path.name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error serving document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to serve document: {str(e)}"
        )

# ============================================================================
# SUPER ADMIN CREATION ENDPOINT
# ============================================================================

@router.post("/create-super-admin")
async def create_super_admin(db: Session = Depends(get_db)):
    """
    Create super admin from environment variables.
    No authentication required - this is a setup endpoint.
    Creates admin only if it doesn't already exist.
    """
    from app.core.config import settings
    from app.core.logging_config import get_logger
    
    logger = get_logger(__name__)
    
    try:
        # Check if super admin credentials are provided
        if not all([
            settings.SUPER_ADMIN_EMAIL,
            settings.SUPER_ADMIN_PASSWORD,
            settings.SUPER_ADMIN_FIRST_NAME,
            settings.SUPER_ADMIN_LAST_NAME,
            settings.ADMIN_REGISTRATION_KEY
        ]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Super admin credentials not configured in environment variables"
            )
        
        # Check if admin already exists
        existing_admin = db.query(Admin).filter(
            Admin.email == settings.SUPER_ADMIN_EMAIL.lower()
        ).first()
        
        if existing_admin:
            return {
                "message": "Super admin already exists",
                "email": settings.SUPER_ADMIN_EMAIL,
                "status": "skipped"
            }
        
        # Create new super admin
        new_admin = Admin(
            first_name=settings.SUPER_ADMIN_FIRST_NAME,
            last_name=settings.SUPER_ADMIN_LAST_NAME,
            email=settings.SUPER_ADMIN_EMAIL.lower(),
            role=AdminRoleEnum.SUPER_ADMIN,
            status=AdminStatusEnum.ACTIVE,
            security_key=settings.ADMIN_REGISTRATION_KEY,
            is_active=True
        )
        
        # Set password using the model's method
        new_admin.set_password(settings.SUPER_ADMIN_PASSWORD)
        
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        logger.info(f"✅ Super admin created: {settings.SUPER_ADMIN_EMAIL}")
        
        return {
            "message": "Super admin created successfully",
            "email": settings.SUPER_ADMIN_EMAIL,
            "name": f"{settings.SUPER_ADMIN_FIRST_NAME} {settings.SUPER_ADMIN_LAST_NAME}",
            "role": "super_admin",
            "status": "created"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating super admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create super admin: {str(e)}"
        )

# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@router.get("/health")
async def admin_health_check():
    """Health check for admin service"""

    return {
        "status": "healthy",
        "service": "admin",
        "timestamp": datetime.now(),
        "version": "2.0.0",
        "features": {
            "user_management": "active",
            "system_monitoring": "active",
            "forum_moderation": "active",
            "system_maintenance": "active"
        }
    }

# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "router",
    "get_all_patients",
    "delete_patient",
    "get_all_admins",
    "get_system_stats",
    "get_all_reports",
    "take_report_action",
    "trigger_system_backup",
    "get_system_logs"
]
