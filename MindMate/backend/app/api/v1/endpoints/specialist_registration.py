"""
Unified Specialist Registration API Endpoints
Phase 1: Enhanced registration and profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from app.db.session import get_db
from app.models.specialist import (
    Specialists, SpecialistsAuthInfo, SpecialistsApprovalData,
    SpecialistTypeEnum, EmailVerificationStatusEnum
)
from app.services.registration_service import RegistrationService
from app.services.profile_service import ProfileService
from app.services.validation_service import ValidationService
from app.utils.email_utils import send_verification_email

# Create router
router = APIRouter(prefix="/specialists/registration", tags=["Specialist Registration"])

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional, List
import re

class SpecialistRegistrationRequest(BaseModel):
    """Unified specialist registration request"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    specialist_type: SpecialistTypeEnum = Field(..., description="Type of mental health specialist")
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    accepts_terms_and_conditions: bool = Field(..., description="Must accept terms and conditions")
    
    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        # Only require minimum length - all other requirements are optional
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @field_validator('accepts_terms_and_conditions')
    @classmethod
    def validate_terms_acceptance(cls, v: bool) -> bool:
        if not v:
            raise ValueError('You must accept the terms and conditions to register')
        return v

class SpecialistRegistrationResponse(BaseModel):
    """Unified specialist registration response"""
    success: bool
    message: str
    specialist_id: Optional[str] = None
    email: str
    next_steps: List[str]
    verification_required: bool = True

class RegistrationProgressResponse(BaseModel):
    """Registration progress response"""
    specialist_id: str
    completed_steps: List[str]
    total_steps: List[str]
    progress_percentage: float
    current_step: Optional[str] = None
    is_complete: bool = False

# ============================================================================
# REGISTRATION ENDPOINTS
# ============================================================================

@router.post("/register", response_model=SpecialistRegistrationResponse)
async def register_specialist(
    request: SpecialistRegistrationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Unified specialist registration endpoint with comprehensive validation
    
    This endpoint:
    1. Validates registration data
    2. Checks for existing registrations
    3. Creates specialist, auth, and approval records
    4. Tracks registration progress
    5. Sends verification email
    """
    try:
        # Initialize services
        registration_service = RegistrationService(db)
        validation_service = ValidationService()
        
        # Convert request to dict for validation
        request_data = request.dict()
        
        # Validate registration data
        validation_result = await validation_service.validate_registration_data(request_data)
        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Validation failed",
                    "errors": validation_result["errors"]
                }
            )
        
        # Check for existing registrations
        existing_check = await registration_service.check_existing_registration(request.email)
        if existing_check["exists"]:
            # Handle verified vs pending accounts differently
            if existing_check.get("is_verified", False):
                # Account is verified - return conflict
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": existing_check["message"],
                        "specialist_id": existing_check.get("specialist_id"),
                        "approval_status": existing_check.get("approval_status"),
                        "is_verified": True
                    }
                )
            else:
                # Account is pending verification - redirect to OTP page
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": existing_check["message"],
                        "specialist_id": existing_check.get("specialist_id"),
                        "approval_status": existing_check.get("approval_status"),
                        "is_verified": False,
                        "redirect_to_otp": True
                    }
                )
        
        # Create specialist record
        specialist = await registration_service.create_specialist(request_data)
        
        # Create authentication info
        auth_info = await registration_service.create_auth_info(specialist.id, request.password)
        
        # Create approval data
        approval_data = await registration_service.create_approval_data(specialist.id)
        
        # Create registration progress tracking
        # NOTE: Temporarily disabled - table structure needs to be updated in database
        # await registration_service.create_registration_progress(specialist.id)
        
        # Commit all changes
        db.commit()
        
        # Send verification email in background
        background_tasks.add_task(
            send_verification_email,
            specialist.email,
            auth_info.otp_code,
            "specialist",
            f"{specialist.first_name} {specialist.last_name}"
        )
        
        return SpecialistRegistrationResponse(
            success=True,
            message="Registration successful. Please check your email for verification.",
            specialist_id=str(specialist.id),
            email=specialist.email,
            next_steps=[
                "Check your email for verification code",
                "Verify your email address",
                "Complete your professional profile",
                "Upload required documents",
                "Submit for approval"
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Registration failed",
                "error": str(e)
            }
        )

@router.delete("/cancel-pending/{email}", response_model=Dict[str, Any])
async def cancel_pending_registration(
    email: str,
    db: Session = Depends(get_db)
):
    """Cancel a pending specialist registration (before email verification)"""
    try:
        email_lower = email.lower().strip()
        
        # Find specialist with pending verification
        specialist = db.query(Specialists).filter(
            Specialists.email == email_lower,
            Specialists.is_deleted == False
        ).first()
        
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registration found with this email address"
            )
        
        # Check auth info
        auth_info = db.query(SpecialistsAuthInfo).filter(
            SpecialistsAuthInfo.specialist_id == specialist.id
        ).first()
        
        if not auth_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Authentication information not found"
            )
        
        # Only allow cancellation if email is not verified
        if auth_info.email_verification_status.value != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel verified registration. Please contact support."
            )
        
        # Soft delete the specialist and related records
        specialist.is_deleted = True
        specialist.updated_at = datetime.now(timezone.utc)
        
        # Also mark auth info as deleted (if there's a field) or just clear OTP
        auth_info.otp_code = None
        auth_info.otp_expires_at = None
        auth_info.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Pending registration cancelled successfully. You can now register again with a different email.",
            "email": email_lower
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel registration: {str(e)}"
        )

@router.get("/progress/{specialist_id}", response_model=RegistrationProgressResponse)
async def get_registration_progress(
    specialist_id: str,
    db: Session = Depends(get_db)
):
    """Get registration progress for a specialist"""
    try:
        registration_service = RegistrationService(db)
        progress = await registration_service.get_registration_progress(specialist_id)
        return RegistrationProgressResponse(**progress)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Failed to get registration progress",
                "error": str(e)
            }
        )

@router.get("/summary/{specialist_id}")
async def get_registration_summary(
    specialist_id: str,
    db: Session = Depends(get_db)
):
    """Get comprehensive registration summary for specialist"""
    try:
        registration_service = RegistrationService(db)
        summary = await registration_service.get_specialist_registration_summary(specialist_id)
        return summary
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Failed to get registration summary",
                "error": str(e)
            }
        )

# ============================================================================
# VALIDATION ENDPOINTS
# ============================================================================

@router.post("/validate")
async def validate_registration_data(
    request: SpecialistRegistrationRequest,
    db: Session = Depends(get_db)
):
    """Validate registration data without creating account"""
    try:
        validation_service = ValidationService()
        request_data = request.dict()
        validation_result = await validation_service.validate_registration_data(request_data)
        
        return {
            "is_valid": validation_result["is_valid"],
            "errors": validation_result["errors"],
            "message": "Validation completed"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Validation failed",
                "error": str(e)
            }
        )

@router.get("/check-email/{email}")
async def check_email_availability(
    email: str,
    db: Session = Depends(get_db)
):
    """Check if email is available for registration"""
    try:
        registration_service = RegistrationService(db)
        result = await registration_service.check_existing_registration(email)
        
        return {
            "email": email,
            "available": not result["exists"],
            "message": result["message"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Email check failed",
                "error": str(e)
            }
        )
