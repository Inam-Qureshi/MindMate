"""
Unified Specialist Profile Completion API Endpoints
Phase 1: Enhanced profile management and completion
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from app.db.session import get_db
from app.models.specialist import Specialists
from app.services.profile_service import ProfileService
from app.services.validation_service import ValidationService
from app.api.v1.endpoints.specialist_profile import get_current_specialist

# Create router
router = APIRouter(prefix="/specialists/profile", tags=["Specialist Profile Completion"])

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any

class ProfileCompletionRequest(BaseModel):
    """Comprehensive profile completion request"""
    # Basic Information
    phone_number: str = Field(..., min_length=10, max_length=20)
    cnic_number: str = Field(..., pattern=r'^\d{5}-\d{7}-\d{1}$')
    gender: str = Field(..., pattern=r'^(male|female|other)$')
    date_of_birth: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    profile_photo_url: Optional[str] = None
    
    # Professional Information
    qualification: str = Field(..., min_length=2, max_length=200)
    institution: str = Field(..., min_length=2, max_length=200)
    years_of_experience: int = Field(..., ge=0, le=50)
    current_affiliation: str = Field(..., min_length=2, max_length=200)
    clinic_address: str = Field(..., min_length=10, max_length=500)
    
    # Practice Details
    consultation_modes: List[str] = Field(..., min_items=1)
    availability_schedule: Optional[Dict[str, Any]] = Field(None, description="Weekly availability schedule (optional)")
    weekly_schedule: Optional[Dict[str, Any]] = None  # Per-day schedule with start/end times
    consultation_fee: float = Field(..., ge=0)
    currency: str = Field(default="PKR", max_length=10)
    experience_summary: str = Field(..., min_length=50, max_length=2000)
    specialties_in_mental_health: List[str] = Field(..., min_items=1)
    therapy_methods: List[str] = Field(..., min_items=1)
    accepting_new_patients: bool = Field(default=True)
    
    # Extended Profile Fields
    interests: Optional[List[str]] = None
    professional_statement_intro: Optional[str] = None
    professional_statement_role: Optional[str] = None
    professional_statement_qualifications: Optional[str] = None
    professional_statement_experience: Optional[str] = None
    professional_statement_patient_satisfaction: Optional[str] = None
    professional_statement_appointment_details: Optional[str] = None
    professional_statement_clinic_address: Optional[str] = None
    professional_statement_fee_details: Optional[str] = None
    education_records: Optional[List[Dict[str, Any]]] = None
    certification_records: Optional[List[Dict[str, Any]]] = None
    experience_records: Optional[List[Dict[str, Any]]] = None
    
    # License Information
    license_number: Optional[str] = None
    license_authority: Optional[str] = None
    license_expiry_date: Optional[str] = None
    certifications: Optional[List[str]] = None
    languages_spoken: Optional[List[str]] = None
    
    # Document URLs (mandatory)
    cnic_document_url: Optional[str] = None  # Mandatory CNIC document
    degree_document_url: Optional[str] = None  # Mandatory degree document
    license_document_url: Optional[str] = None  # Mandatory license document
    certification_document_urls: Optional[List[str]] = None  # Optional certifications
    supporting_document_urls: Optional[List[str]] = None  # Optional supporting docs

class ProfileCompletionResponse(BaseModel):
    """Profile completion response"""
    success: bool
    message: str
    completion_percentage: int
    next_steps: List[str]
    specialist_id: str

class ProfileProgressResponse(BaseModel):
    """Profile progress response"""
    specialist_id: str
    completion_percentage: int
    missing_fields: List[str]
    mandatory_fields_completed: bool
    profile_completed_at: Optional[str] = None
    next_steps: List[str]

class ProfileValidationResponse(BaseModel):
    """Profile validation response"""
    is_valid: bool
    errors: List[str]
    message: str

# ============================================================================
# PROFILE COMPLETION ENDPOINTS
# ============================================================================

@router.post("/complete", response_model=ProfileCompletionResponse)
async def complete_profile(
    request: ProfileCompletionRequest,
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """
    Unified profile completion endpoint with comprehensive validation
    
    This endpoint:
    1. Validates profile data
    2. Updates specialist profile
    3. Updates approval data
    4. Tracks registration progress
    5. Calculates completion percentage
    """
    try:
        specialist: Specialists = current_user['specialist']
        profile_service = ProfileService(db)
        validation_service = ValidationService()
        
        # Convert request to dict for validation
        request_data = request.dict()
        
        # Validate profile data
        validation_result = await validation_service.validate_profile_data(request_data)
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Profile validation failed",
                    "errors": validation_result["errors"]
                }
            )
        
        # Update specialist profile
        updated_specialist = await profile_service.update_specialist_profile(
            specialist.id, request_data
        )
        
        # Update approval data
        await profile_service.update_approval_data(specialist.id, request_data)
        
        # Update registration progress
        await profile_service.update_registration_progress(specialist.id, "profile_completion")
        
        # Mark profile as complete
        await profile_service.mark_profile_complete(specialist.id)
        
        # Calculate completion percentage
        completion_percentage = await profile_service.calculate_completion_percentage(specialist.id)
        
        return ProfileCompletionResponse(
            success=True,
            message="Profile completed successfully",
            completion_percentage=completion_percentage,
            specialist_id=str(specialist.id),
            next_steps=[
                "Upload required documents",
                "Submit for approval",
                "Wait for admin review"
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Profile completion failed",
                "error": str(e)
            }
        )

@router.get("/progress", response_model=ProfileProgressResponse)
async def get_profile_progress(
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """Get profile completion progress"""
    try:
        specialist: Specialists = current_user['specialist']
        profile_service = ProfileService(db)
        progress = await profile_service.get_profile_progress(specialist.id)
        return ProfileProgressResponse(**progress)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Failed to get profile progress",
                "error": str(e)
            }
        )

@router.post("/validate", response_model=ProfileValidationResponse)
async def validate_profile(
    request: ProfileCompletionRequest,
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """Validate profile data without saving"""
    try:
        validation_service = ValidationService()
        request_data = request.dict()
        validation_result = await validation_service.validate_profile_data(request_data)
        
        return ProfileValidationResponse(
            is_valid=validation_result["is_valid"],
            errors=validation_result["errors"],
            message="Validation completed"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Validation failed",
                "error": str(e)
            }
        )

@router.get("/summary")
async def get_profile_summary(
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """Get comprehensive profile summary"""
    try:
        specialist: Specialists = current_user['specialist']
        profile_service = ProfileService(db)
        summary = await profile_service.get_specialist_profile_summary(specialist.id)
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Failed to get profile summary",
                "error": str(e)
            }
        )

# ============================================================================
# PROFILE UPDATE ENDPOINTS
# ============================================================================

@router.put("/update")
async def update_profile(
    request: ProfileCompletionRequest,
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """Update specialist profile (partial updates allowed)"""
    try:
        specialist: Specialists = current_user['specialist']
        profile_service = ProfileService(db)
        validation_service = ValidationService()
        
        # Convert request to dict
        request_data = request.dict()
        
        # Validate profile data
        validation_result = await validation_service.validate_profile_data(request_data)
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Profile validation failed",
                    "errors": validation_result["errors"]
                }
            )
        
        # Update specialist profile
        updated_specialist = await profile_service.update_specialist_profile(
            specialist.id, request_data
        )
        
        # Update approval data
        await profile_service.update_approval_data(specialist.id, request_data)
        
        # Calculate completion percentage
        completion_percentage = await profile_service.calculate_completion_percentage(specialist.id)
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "completion_percentage": completion_percentage,
            "specialist_id": str(specialist.id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Profile update failed",
                "error": str(e)
            }
        )

@router.get("/completion-status")
async def get_completion_status(
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """Get profile completion status and requirements"""
    try:
        specialist: Specialists = current_user['specialist']
        profile_service = ProfileService(db)
        progress = await profile_service.get_profile_progress(specialist.id)
        
        return {
            "specialist_id": str(specialist.id),
            "completion_percentage": progress["completion_percentage"],
            "mandatory_fields_completed": progress["mandatory_fields_completed"],
            "missing_fields": progress["missing_fields"],
            "next_steps": progress["next_steps"],
            "is_ready_for_approval": progress["completion_percentage"] == 100
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Failed to get completion status",
                "error": str(e)
            }
        )
