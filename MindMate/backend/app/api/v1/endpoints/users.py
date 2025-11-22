"""
Users Management Endpoints
==========================
Endpoints for user profile management, specifically for patients.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import uuid
import logging

from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_user_from_token
from app.services.patient_profiles import PatientProfileService
from app.models.patient import Patient

logger = logging.getLogger(__name__)

router = APIRouter()


def get_authenticated_patient(
    current_user_data: dict = Depends(get_current_user_from_token)
) -> Patient:
    """
    Get authenticated patient from current user data.
    
    Args:
        current_user_data: Current user data dict from get_current_user_from_token
        
    Returns:
        Patient object
        
    Raises:
        HTTPException: If user is not a patient
    """
    user = current_user_data.get("user")
    user_type = current_user_data.get("user_type")
    
    if not user or user_type != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access required"
        )
    
    if not isinstance(user, Patient):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user type"
        )
    
    return user


def transform_profile_for_frontend(profile_data: Any) -> Dict[str, Any]:
    """
    Transform PatientPrivateProfile to match frontend expected format.
    
    Args:
        profile_data: PatientPrivateProfile object from service
        
    Returns:
        Dict with frontend-expected structure
    """
    if not profile_data:
        return {
            "personal_info": {},
            "location": {},
            "medical_history": {},
            "questionnaire_data": {},
            "progress_tracking": {},
            "goals_section": {},
            "journal_entries": [],
            "appointments": {},
            "account": {}
        }
    
    # Use model_dump() if available (Pydantic v2), otherwise fallback
    try:
        if hasattr(profile_data, 'model_dump'):
            profile_dict = profile_data.model_dump()
        elif hasattr(profile_data, 'dict'):
            profile_dict = profile_data.dict()
        else:
            profile_dict = {}
    except Exception:
        profile_dict = {}
    
    # Extract personal_info
    personal_info = {}
    if profile_data.personal_info:
        if hasattr(profile_data.personal_info, 'model_dump'):
            personal_info = profile_data.personal_info.model_dump()
        elif hasattr(profile_data.personal_info, 'dict'):
            personal_info = profile_data.personal_info.dict()
        else:
            personal_info = {
                "first_name": getattr(profile_data.personal_info, 'first_name', ''),
                "last_name": getattr(profile_data.personal_info, 'last_name', ''),
                "date_of_birth": getattr(profile_data.personal_info, 'date_of_birth', None),
                "gender": getattr(profile_data.personal_info, 'gender', None),
                "primary_language": getattr(profile_data.personal_info, 'primary_language', None),
                "full_address": getattr(profile_data.personal_info, 'full_address', '')
            }
    
    # Extract location
    location = {}
    if profile_data.location_info:
        if hasattr(profile_data.location_info, 'model_dump'):
            location = profile_data.location_info.model_dump()
        elif hasattr(profile_data.location_info, 'dict'):
            location = profile_data.location_info.dict()
        else:
            location = {
                "city": getattr(profile_data.location_info, 'city', ''),
                "district": getattr(profile_data.location_info, 'district', None),
                "province": getattr(profile_data.location_info, 'province', None),
                "country": getattr(profile_data.location_info, 'country', '')
            }
    
    # Extract medical_history
    medical_history = {}
    if profile_data.medical_history:
        if hasattr(profile_data.medical_history, 'model_dump'):
            medical_history = profile_data.medical_history.model_dump()
        elif hasattr(profile_data.medical_history, 'dict'):
            medical_history = profile_data.medical_history.dict()
    
    # Transform appointments
    appointments = {"list": [], "next": None}
    if profile_data.appointments:
        appointments_list = []
        for appt in profile_data.appointments:
            if hasattr(appt, 'model_dump'):
                appt_dict = appt.model_dump()
            elif hasattr(appt, 'dict'):
                appt_dict = appt.dict()
            else:
                appt_dict = {
                    "id": str(getattr(appt, 'id', '')),
                    "scheduled_start": getattr(appt, 'scheduled_start', None),
                    "scheduled_end": getattr(appt, 'scheduled_end', None),
                    "appointment_type": getattr(appt, 'appointment_type', None),
                    "status": getattr(appt, 'status', None),
                    "fee": float(getattr(appt, 'fee', 0)) if getattr(appt, 'fee', None) else None,
                    "payment_status": getattr(appt, 'payment_status', None),
                    "specialist_name": getattr(appt, 'specialist_name', None)
                }
            appointments_list.append(appt_dict)
        appointments["list"] = appointments_list
        
        # Add next appointment if available
        if profile_data.next_appointment:
            next_appt = profile_data.next_appointment
            if hasattr(next_appt, 'model_dump'):
                appointments["next"] = next_appt.model_dump()
            elif hasattr(next_appt, 'dict'):
                appointments["next"] = next_appt.dict()
            else:
                appointments["next"] = {
                    "id": str(getattr(next_appt, 'id', '')),
                    "scheduled_start": getattr(next_appt, 'scheduled_start', None),
                    "scheduled_end": getattr(next_appt, 'scheduled_end', None),
                    "appointment_type": getattr(next_appt, 'appointment_type', None),
                    "status": getattr(next_appt, 'status', None),
                    "fee": float(getattr(next_appt, 'fee', 0)) if getattr(next_appt, 'fee', None) else None,
                    "payment_status": getattr(next_appt, 'payment_status', None),
                    "specialist_name": getattr(next_appt, 'specialist_name', None)
                }
    
    # Transform account info
    account = {}
    if profile_data.auth_info:
        if hasattr(profile_data.auth_info, 'model_dump'):
            account = profile_data.auth_info.model_dump()
        elif hasattr(profile_data.auth_info, 'dict'):
            account = profile_data.auth_info.dict()
        else:
            account = {
                "is_active": getattr(profile_data.auth_info, 'is_active', True),
                "is_verified": getattr(profile_data.auth_info, 'is_verified', False),
                "is_locked": getattr(profile_data.auth_info, 'is_locked', False),
                "last_login": getattr(profile_data.auth_info, 'last_login', None),
                "theme_preference": getattr(profile_data.auth_info, 'theme_preference', None),
                "avatar_url": getattr(profile_data.auth_info, 'avatar_url', None)
            }
    
    # Add contact info to account
    if profile_data.contact_info:
        account["email"] = getattr(profile_data.contact_info, 'email', '')
        account["phone"] = getattr(profile_data.contact_info, 'phone', None)
    
    return {
        "personal_info": personal_info,
        "location": location,
        "medical_history": medical_history,
        "questionnaire_data": {},  # Placeholder - can be populated from questionnaire endpoints
        "progress_tracking": {},  # Placeholder - can be populated from progress endpoints
        "goals_section": {},  # Placeholder - can be populated from goals endpoints
        "journal_entries": [],  # Placeholder - can be populated from journal endpoints
        "appointments": appointments,
        "account": account
    }


@router.get("/patient/profile")
async def get_patient_profile(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get patient profile data.
    
    Returns patient profile in the format expected by the frontend.
    """
    try:
        # Get authenticated patient
        user = current_user_data.get("user")
        user_type = current_user_data.get("user_type")
        
        if not user or user_type != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient access required"
            )
        
        patient_id = user.id if hasattr(user, 'id') else None
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Get patient profile using service
        profile_service = PatientProfileService(db)
        profile = profile_service.create_patient_private_profile(patient_id)
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        # Transform to frontend format
        transformed_data = transform_profile_for_frontend(profile)
        
        return transformed_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching patient profile: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch patient profile: {str(e)}"
        )


@router.put("/patient/profile")
async def update_patient_profile(
    profile_data: Dict[str, Any],
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Update patient profile data.
    
    This is a placeholder endpoint for profile updates.
    Full implementation would validate and update patient data.
    """
    try:
        # Get authenticated patient
        user = current_user_data.get("user")
        user_type = current_user_data.get("user_type")
        
        if not user or user_type != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient access required"
            )
        
        # TODO: Implement profile update logic
        # For now, return success message
        return {
            "success": True,
            "message": "Profile update endpoint - implementation pending",
            "data": profile_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating patient profile: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update patient profile: {str(e)}"
        )

