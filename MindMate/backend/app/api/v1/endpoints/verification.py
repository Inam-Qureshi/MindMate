"""
MindMate Unified Verification and Registration API
==================================================
Handles user registration and email verification for all user types.
Combines registration, email verification, and OTP management.

Author: Mental Health Platform Team
Version: 2.0.0 - Unified verification and registration system
"""

import os
import re
import uuid
import logging
from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from pydantic import BaseModel, EmailStr, Field, field_validator

import bcrypt

# Import database models
from app.models.patient import (
    Patient, PatientAuthInfo, PatientPreferences,
    GenderEnum, RecordStatusEnum, LanguageEnum,
    ConsultationModeEnum, UrgencyLevelEnum, USERTYPE
)
from app.models.specialist import (
    Specialists, SpecialistsAuthInfo, SpecialistsApprovalData,
    EmailVerificationStatusEnum, ApprovalStatusEnum,
    SpecialistSpecializations, SpecialistAvailability, TimeSlotEnum,
    SpecialistTypeEnum
)
from app.models.admin import Admin, AdminStatusEnum
from app.models.base import USERTYPE as BaseUSERTYPE

# Import pydantic models
from app.schemas.patient import (
    BasePatientModel, PatientCreateRequest, PatientResponse
)

# Import utilities
from app.utils.email_utils import (
    send_verification_email,
    send_patient_registration_completion_email,
    send_specialist_registration_completion_email,
    send_specialist_approval_email,
    safe_enum_to_string,
    generate_otp,
    get_otp_expiry,
    is_otp_valid
)
from app.db.session import get_db

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/verification", tags=["Registration & Verification"])

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def create_error_response(status_code: int, message: str) -> HTTPException:
    """Create standardized error response"""
    return HTTPException(status_code=status_code, detail=message)

def validate_email_format(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def get_password_hash(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def get_patient_by_email(db: Session, email: str) -> Optional[Patient]:
    """Get patient by email"""
    return db.query(Patient).filter(
        Patient.email == email.lower(),
        Patient.is_deleted == False
    ).first()

def get_specialist_by_email(db: Session, email: str) -> Optional[Specialists]:
    """Get specialist by email"""
    return db.query(Specialists).filter(
        Specialists.email == email.lower(),
        Specialists.is_deleted == False
    ).first()

def get_admin_by_email(db: Session, email: str) -> Optional[Admin]:
    """Get admin by email"""
    return db.query(Admin).filter(
        Admin.email == email.lower(),
        Admin.is_deleted == False
    ).first()

def check_verified_email_exists_for_user_type(db: Session, email: str, user_type: USERTYPE) -> bool:
    """Check if verified email exists for user type"""
    try:
        email_lower = email.lower()

        if user_type == USERTYPE.PATIENT:
            existing = db.query(Patient).join(PatientAuthInfo).filter(
                Patient.email == email_lower,
                Patient.is_deleted == False,
                PatientAuthInfo.is_verified == True
            ).first()
            return existing is not None

        elif user_type == USERTYPE.SPECIALIST:
            existing = db.query(Specialists).join(SpecialistsAuthInfo).filter(
                Specialists.email == email_lower,
                Specialists.is_deleted == False,
                SpecialistsAuthInfo.email_verification_status == EmailVerificationStatusEnum.VERIFIED
            ).first()
            return existing is not None

        elif user_type == USERTYPE.ADMIN:
            existing = db.query(Admin).filter(
                Admin.email == email_lower,
                Admin.is_deleted == False
            ).first()
            return existing is not None

        return False
    except Exception as e:
        logger.error(f"Error checking verified email existence: {e}")
        return False

def check_pending_email_exists_for_user_type(db: Session, email: str, user_type: USERTYPE) -> bool:
    """Check if pending email exists for user type"""
    try:
        email_lower = email.lower()

        if user_type == USERTYPE.PATIENT:
            existing = db.query(Patient).join(PatientAuthInfo).filter(
                Patient.email == email_lower,
                Patient.is_deleted == False,
                PatientAuthInfo.is_verified == False
            ).first()
            return existing is not None

        elif user_type == USERTYPE.SPECIALIST:
            existing = db.query(Specialists).join(SpecialistsAuthInfo).filter(
                Specialists.email == email_lower,
                Specialists.is_deleted == False,
                SpecialistsAuthInfo.email_verification_status == EmailVerificationStatusEnum.PENDING
            ).first()
            return existing is not None

        return False
    except Exception as e:
        logger.error(f"Error checking pending email existence: {e}")
        return False

def create_default_patient_preferences(patient_id: str) -> PatientPreferences:
    """Create default patient preferences"""
    try:
        return PatientPreferences(
            patient_id=patient_id,
            consultation_mode=ConsultationModeEnum.VIRTUAL,
            urgency_level=UrgencyLevelEnum.STANDARD,
            max_budget=None,
            notes=None,
            is_active=True
        )
    except Exception as e:
        logger.error(f"Error creating default patient preferences: {e}")
        raise

def convert_string_to_enum(value, enum_class):
    """Convert string to enum safely"""
    try:
        if isinstance(value, str):
            return enum_class[value.upper()]
        return value
    except (KeyError, AttributeError):
        return None

def safe_send_verification_email(email: str, otp: str, user_type_enum, user_name: str) -> bool:
    """Send verification email safely"""
    try:
        return send_verification_email(email, otp, user_type_enum, user_name)
    except Exception as e:
        logger.error(f"Failed to send verification email to {email}: {e}")
        return False

def safe_send_completion_email(email: str, first_name: str, last_name: str,
                              specialization_enum=None, user_type: str = "patient") -> bool:
    """Send completion email safely"""
    try:
        if user_type == "patient":
            return send_patient_registration_completion_email(email, first_name, last_name)
        elif user_type == "specialist":
            specialization_name = safe_enum_to_string(specialization_enum) if specialization_enum else "Mental Health"
            return send_specialist_registration_completion_email(email, first_name, last_name, specialization_name)
        else:
            logger.warning(f"Unknown user type for completion email: {user_type}")
            return False
    except Exception as e:
        logger.error(f"Failed to send completion email to {email}: {e}")
        return False

def safe_notify_admins(db: Session, specialist_data: dict) -> bool:
    """Notify admins about new specialist registration"""
    try:
        from app.utils.email_utils import get_admin_emails_for_notifications, send_admin_notification_email

        admin_emails = get_admin_emails_for_notifications(db)
        if not admin_emails:
            logger.warning("No admin emails found for notifications")
            return False

        # Send notification to all admins
        success_count = 0
        for admin_email in admin_emails:
            try:
                send_admin_notification_email(
                    admin_email=admin_email,
                    specialist_data=specialist_data
                )
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to notify admin {admin_email}: {e}")

        return success_count > 0
    except Exception as e:
        logger.error(f"Error notifying admins: {e}")
        return False

def complete_patient_registration_after_verification(db: Session, patient: Patient) -> bool:
    """Complete patient registration after email verification"""
    try:
        # Update patient status
        patient.record_status = RecordStatusEnum.ACTIVE
        patient.updated_at = datetime.now(timezone.utc)

        # Create default preferences if they don't exist
        existing_prefs = db.query(PatientPreferences).filter(
            PatientPreferences.patient_id == patient.id
        ).first()

        if not existing_prefs:
            default_prefs = create_default_patient_preferences(str(patient.id))
            db.add(default_prefs)

        db.commit()
        logger.info(f"Patient registration completed for {patient.email}")
        return True

    except Exception as e:
        logger.error(f"Error completing patient registration: {e}")
        db.rollback()
        return False

def complete_specialist_registration_after_verification(db: Session, specialist: Specialists) -> bool:
    """Complete specialist registration after email verification"""
    import traceback
    
    # Update specialist status - this is the critical part
    # We do this first before any operations that might fail
    try:
        specialist.updated_at = datetime.now(timezone.utc)
        logger.info(f"Updated specialist {specialist.id} timestamp")
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Failed to update specialist timestamp: {e}\n{error_trace}")
        return False

    # NOTE: Approval data should already exist from registration
    # We skip creating it here to avoid transaction issues
    # If it doesn't exist, it will be created when the specialist completes their profile
    try:
        existing_approval = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id,
            SpecialistsApprovalData.is_deleted == False
        ).first()

        if existing_approval:
            logger.info(f"Approval data already exists for specialist {specialist.id}")
        else:
            logger.warning(f"Approval data not found for specialist {specialist.id}, but skipping creation to avoid transaction issues. It will be created during profile completion.")
    except Exception as approval_check_error:
        # Even if checking fails, don't abort the transaction
        logger.warning(f"Error checking approval data (non-critical): {approval_check_error}")
        # Continue anyway - approval data is not critical for email verification

    # Don't commit here - let the caller handle the commit
    # This prevents double commit issues
    logger.info(f"Specialist registration completion prepared for {specialist.email}")
    return True

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

# Patient Registration Models
class MinimalPatientRegistrationRequest(BasePatientModel):
    """Minimal patient registration request model"""

    # Basic Personal Information (Required)
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")

    # Demographics (Required)
    gender: GenderEnum = Field(..., description="Gender identity")

    # Contact Information (Required)
    email: str = Field(..., description="Email address")

    # Authentication (Required)
    password: str = Field(..., min_length=8, description="Password")

    # Legal Agreement (Required)
    accepts_terms_and_conditions: bool = Field(..., description="Accept terms and conditions")

    @field_validator('accepts_terms_and_conditions')
    @classmethod
    def validate_terms_acceptance(cls, v: bool) -> bool:
        if not v:
            raise ValueError('You must accept the terms and conditions to register')
        return v

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        # Special character is optional - password with uppercase, lowercase, and digit is acceptable
        # Special characters are recommended but not required for better user experience
        return v

    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        if not validate_email_format(v):
            raise ValueError('Invalid email format')
        return v.lower().strip()

    class Config:
        json_schema_extra = {
            "example": {
                "first_name": "John",
                "last_name": "Doe",
                "date_of_birth": "1990-01-01",
                "gender": "male",
                "email": "john.doe@gmail.com",
                "password": "SecurePass123#",
                "accepts_terms_and_conditions": True
            }
        }

class MinimalSpecialistRegistrationRequest(BaseModel):
    """Minimal specialist registration request model"""

    # Basic Personal Information (Required)
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")

    # Contact Information (Required)
    email: str = Field(..., description="Email address")

    # Authentication (Required)
    password: str = Field(..., min_length=8, description="Password")
    
    # Professional Information (Required)
    specialist_type: SpecialistTypeEnum = Field(..., description="Type of mental health specialist (e.g., psychologist, psychiatrist, therapist)")

    # Legal Agreement (Required)
    accepts_terms_and_conditions: bool = Field(..., description="Accept terms and conditions")

    @field_validator('accepts_terms_and_conditions')
    @classmethod
    def validate_terms_acceptance(cls, v: bool) -> bool:
        if not v:
            raise ValueError('You must accept the terms and conditions to register')
        return v

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)')
        return v

    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        if not validate_email_format(v):
            raise ValueError('Invalid email format')
        return v.lower().strip()

    class Config:
        json_schema_extra = {
            "example": {
                "first_name": "Dr. John",
                "last_name": "Smith",
                "email": "john.smith@clinic.com",
                "password": "SecurePass123#",
                "accepts_terms_and_conditions": True
            }
        }

class RegistrationResponse(BasePatientModel):
    """Registration response model"""
    success: bool
    message: str
    email: str
    verification_required: bool
    next_steps: List[str]

# Email Verification Models
class EmailVerificationRequest(BaseModel):
    """Email verification request model"""
    email: str = Field(..., description="Email address")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not validate_email_format(v):
            raise ValueError('Invalid email format')
        return v.lower().strip()

    @field_validator('otp')
    @classmethod
    def validate_otp_format(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 6:
            raise ValueError('OTP must be exactly 6 digits')
        return v

class EmailVerificationResponse(BaseModel):
    """Email verification response model"""
    success: bool
    message: str
    email: str
    account_status: str
    next_steps: List[str]

class ResendOTPRequest(BaseModel):
    """Resend OTP request model"""
    email: str = Field(..., description="Email address")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not validate_email_format(v):
            raise ValueError('Invalid email format')
        return v.lower().strip()

class ResendOTPResponse(BaseModel):
    """Resend OTP response model"""
    success: bool
    message: str
    email: str
    retry_after_minutes: int = 1

class RegistrationStatusResponse(BaseModel):
    """Registration status response model"""
    email: str
    is_verified: bool
    is_active: bool
    registration_date: datetime
    verification_status: str
    account_status: str
    next_steps: List[str]

# Unified Verification Models
class VerifyUserRequest(BaseModel):
    email: EmailStr
    otp: str
    usertype: str  # "patient", "specialist", or "admin"

    class Config:
        str_strip_whitespace = True

    def __init__(self, **data):
        # Normalize usertype to lowercase
        if 'usertype' in data:
            data['usertype'] = data['usertype'].lower().strip()
        super().__init__(**data)

class VerifyUserResponse(BaseModel):
    success: bool
    message: str
    user_id: str
    email: str
    usertype: str
    verification_completed_at: datetime
    redirect_to: str = "/login"  # Frontend redirect path after verification
    next_steps: list[str]

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

# ============================================================================
# REGISTRATION ENDPOINTS
# ============================================================================

@router.options("/register/patient")
async def options_register_patient():
    return {"detail": "OPTIONS request handled"}

@router.post("/register/patient", response_model=RegistrationResponse)
async def register_patient(
    registration_data: MinimalPatientRegistrationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Register a new patient with minimal required information"""
    try:
        email = registration_data.email.lower().strip()
        logger.info(f"Patient registration attempt for email: {email}")

        # Check if email already exists for PATIENT user type (verified or pending)
        if check_verified_email_exists_for_user_type(db, email, USERTYPE.PATIENT):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A patient account with this email already exists. Please login instead. Note: You can register the same email as a specialist if needed."
            )

        if check_pending_email_exists_for_user_type(db, email, USERTYPE.PATIENT):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A patient registration with this email is already pending verification. Please check your email or request a new OTP."
            )

        # Generate OTP for email verification
        otp = generate_otp()
        otp_expiry = get_otp_expiry()

        # Hash password
        hashed_password = get_password_hash(registration_data.password)

        # Create patient record
        patient_id = uuid.uuid4()  # UUID object, not string
        # Set a default date_of_birth if not provided (required by model)
        # Use a reasonable default (e.g., 25 years ago)
        default_date_of_birth = date.today() - timedelta(days=365*25)
        patient = Patient(
            id=patient_id,
            first_name=registration_data.first_name,
            last_name=registration_data.last_name,
            date_of_birth=default_date_of_birth,  # Required field
            email=email,
            gender=registration_data.gender,
            record_status=RecordStatusEnum.ACTIVE,
            accepts_terms_and_conditions=registration_data.accepts_terms_and_conditions,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        # Create authentication info
        auth_info = PatientAuthInfo(
            patient_id=patient_id,  # UUID object
            hashed_password=hashed_password,
            otp=otp,  # Keep legacy field for backward compatibility
            otp_expiry=otp_expiry,  # Keep legacy field for backward compatibility
            otp_code=otp,  # Use standardized field name
            otp_expires_at=otp_expiry,  # Use standardized field name
            is_verified=False,
            is_active=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        # Add to database
        db.add(patient)
        db.add(auth_info)

        try:
            db.commit()
            logger.info(f"Patient registered successfully: {patient_id}")
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email address already registered"
            )
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error during patient registration: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Registration failed due to database error"
            )

        # Send verification email in background
        user_name = f"{registration_data.first_name} {registration_data.last_name}"
        background_tasks.add_task(
            safe_send_verification_email,
            email,
            otp,
            USERTYPE.PATIENT,
            user_name
        )

        return RegistrationResponse(
            success=True,
            message="Patient registered successfully. Please check your email for verification code.",
            email=email,
            verification_required=True,
            next_steps=[
                "Check your email for the verification code",
                "Enter the 6-digit code to verify your account",
                "Login with your credentials after verification"
            ]
        )

    except HTTPException:
        raise
    except ValueError as e:
        # Handle Pydantic validation errors more gracefully
        logger.warning(f"Validation error during patient registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Validation error", "errors": {"detail": str(e)}}
        )
    except Exception as e:
        db.rollback()  # Ensure database consistency on unexpected errors
        logger.error(f"Unexpected error during patient registration: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )

@router.options("/register/specialist")
async def options_register_specialist():
    return {"detail": "OPTIONS request handled"}

# REMOVED: /register/specialist endpoint
# This endpoint has been replaced by the unified /api/specialist/registration/register endpoint
# Please use /api/specialist/registration/register instead

# ============================================================================
# VERIFICATION ENDPOINTS
# ============================================================================

@router.post("/verify-email", response_model=VerifyUserResponse)
async def verify_user_email(
    request: VerifyUserRequest,
    db: Session = Depends(get_db)
):
    """
    Verify user email with OTP for patients, specialists, and admins
    Completes the registration process after successful verification
    """
    try:
        email = request.email.lower()
        otp = request.otp.strip()
        usertype = request.usertype

        # Validate usertype
        if usertype not in ["patient", "specialist", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid usertype. Must be 'patient', 'specialist', or 'admin'"
            )

        # Route to appropriate verification function
        if usertype == "patient":
            return await verify_patient_email(db, email, otp)
        elif usertype == "specialist":
            return await verify_specialist_email(db, email, otp)
        elif usertype == "admin":
            return await verify_admin_email(db, email, otp)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Verification failed: {str(e)}\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )

async def verify_patient_email(db: Session, email: str, otp: str) -> VerifyUserResponse:
    """Verify patient email with OTP"""
    try:
        # Find patient by email
        patient = db.query(Patient).filter(
            Patient.email == email,
            Patient.is_deleted == False
        ).first()

        if not patient:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient not found with this email address"
            )

        # Get authentication info
        auth_info = db.query(PatientAuthInfo).filter(
            PatientAuthInfo.patient_id == patient.id
        ).first()

        if not auth_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authentication information not found"
            )

        # Check if already verified
        if auth_info.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified"
            )

        # Validate OTP (use standardized field names)
        if not auth_info.otp_code or auth_info.otp_code != otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP"
            )

        if not auth_info.otp_expires_at or datetime.now(timezone.utc) > auth_info.otp_expires_at:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="OTP has expired"
            )

        # Mark as verified and activate account
        auth_info.is_verified = True
        auth_info.is_active = True
        auth_info.otp_code = None
        auth_info.otp_expires_at = None
        auth_info.email_verified_at = datetime.now(timezone.utc)
        auth_info.updated_at = datetime.now(timezone.utc)

        # Complete registration
        if complete_patient_registration_after_verification(db, patient):
            db.commit()

            # Send completion email
            safe_send_completion_email(
                patient.email,
                patient.first_name,
                patient.last_name,
                user_type="patient"
            )

            return VerifyUserResponse(
                success=True,
                message="Email verified successfully! Your account is now active. Please login to continue.",
                user_id=str(patient.id),
                email=patient.email,
                usertype="patient",
                verification_completed_at=datetime.now(timezone.utc),
                next_steps=[
                    "Login with your credentials",
                    "Complete your profile information",
                    "Start exploring specialists"
            ]
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error verifying patient email: {e}\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email verification failed: {str(e)}"
        )

async def verify_specialist_email(db: Session, email: str, otp: str) -> VerifyUserResponse:
    """Verify specialist email with OTP"""
    try:
        # Find specialist by email
        specialist = db.query(Specialists).filter(
            Specialists.email == email,
            Specialists.is_deleted == False
        ).first()

        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Specialist not found with this email address"
            )

        # Get authentication info
        auth_info = db.query(SpecialistsAuthInfo).filter(
            SpecialistsAuthInfo.specialist_id == specialist.id
        ).first()

        if not auth_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authentication information not found"
            )

        # Check if already verified
        if auth_info.email_verification_status == EmailVerificationStatusEnum.VERIFIED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified"
            )

        # Validate OTP
        logger.info(f"Verifying OTP for specialist {email}: received='{otp}', stored='{auth_info.otp_code}'")
        if not auth_info.otp_code or auth_info.otp_code != otp:
            logger.warning(f"OTP mismatch for {email}: received='{otp}', stored='{auth_info.otp_code}'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP"
            )

        if not auth_info.otp_expires_at or datetime.now(timezone.utc) > auth_info.otp_expires_at:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="OTP has expired"
            )

        # Mark as verified
        auth_info.email_verification_status = EmailVerificationStatusEnum.VERIFIED
        auth_info.otp_code = None
        auth_info.otp_expires_at = None
        auth_info.email_verified_at = datetime.now(timezone.utc)
        auth_info.updated_at = datetime.now(timezone.utc)

        # Set specialist approval status to pending
        specialist.approval_status = ApprovalStatusEnum.PENDING
        specialist.updated_at = datetime.now(timezone.utc)

        # Commit all changes directly - removed function call that was causing transaction issues
        try:
            db.commit()
            logger.info(f"Successfully committed specialist verification for {email}")
        except Exception as commit_error:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Error committing specialist verification: {commit_error}\n{error_trace}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save verification: {str(commit_error)}"
            )

        # Send completion email
        safe_send_completion_email(
            specialist.email,
            specialist.first_name,
            specialist.last_name,
            user_type="specialist"
        )

        # Notify admins about new specialist registration
        specialist_data = {
            "email": specialist.email,
            "first_name": specialist.first_name,
            "last_name": specialist.last_name,
            "specialization": "Mental Health",  # Default specialization at registration
            "registration_date": datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M %p")
        }
        safe_notify_admins(db, specialist_data)

        # Determine redirect path based on specialist status
        # Import get_specialist_redirect from auth module
        from app.api.v1.endpoints.auth import get_specialist_redirect
        redirect_to = get_specialist_redirect(specialist, auth_info, db)

        return VerifyUserResponse(
            success=True,
            message="Email verified successfully! Your specialist account is now pending approval.",
            user_id=str(specialist.id),
            email=specialist.email,
            usertype="specialist",
            verification_completed_at=datetime.now(timezone.utc),
            redirect_to=redirect_to,
            next_steps=[
                "Complete your professional profile",
                "Upload required documents",
                "Submit for admin approval",
                "Wait for approval notification"
            ]
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error verifying specialist email: {e}\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Email verification failed: {str(e)}"
        )

async def verify_admin_email(db: Session, email: str, otp: str) -> VerifyUserResponse:
    """Verify admin email with OTP"""
    try:
        # Find admin by email
        admin = db.query(Admin).filter(
            Admin.email == email,
            Admin.is_deleted == False
        ).first()

        if not admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin not found with this email address"
            )

        # Check if already verified (admins don't have separate verification status)
        if admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin account is already active"
            )

        # For admins, we might not have OTP in the same way
        # This is a simplified version - in production you'd want proper admin verification
        admin.is_active = True
        admin.updated_at = datetime.now(timezone.utc)

        db.commit()

        return VerifyUserResponse(
            success=True,
            message="Admin account activated successfully!",
            user_id=str(admin.id),
            email=admin.email,
            usertype="admin",
            verification_completed_at=datetime.now(timezone.utc),
            next_steps=[
                "Login to your admin dashboard",
                "Review system settings",
                "Monitor platform activity"
            ]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying admin email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )

# ============================================================================
# OTP MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/resend-otp", response_model=ResendOTPResponse)
async def resend_verification_otp(
    request: ResendOTPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Resend verification OTP to email"""
    try:
        email = request.email.lower().strip()
        logger.info(f"OTP resend request for email: {email}")

        # Try to find user in different tables
        user = None
        user_type = None
        user_name = None

        # Check patient
        patient = get_patient_by_email(db, email)
        if patient:
            user = patient
            user_type = "patient"
            user_name = f"{patient.first_name} {patient.last_name}"
        else:
            # Check specialist
            specialist = get_specialist_by_email(db, email)
            if specialist:
                user = specialist
                user_type = "specialist"
                user_name = f"{specialist.first_name} {specialist.last_name}"
            else:
                # Check admin
                admin = get_admin_by_email(db, email)
                if admin:
                    user = admin
                    user_type = "admin"
                    user_name = admin.first_name

        if not user:
            return ResendOTPResponse(
                success=False,
                message="No account found with this email address.",
                email=email
            )

        # Get auth info and check if already verified
        auth_info = None
        if user_type == "patient":
            auth_info = db.query(PatientAuthInfo).filter(
                PatientAuthInfo.patient_id == user.id
            ).first()
            if auth_info and auth_info.is_verified:
                return ResendOTPResponse(
                    success=False,
                    message="Email is already verified.",
                    email=email
                )
        elif user_type == "specialist":
            auth_info = db.query(SpecialistsAuthInfo).filter(
                SpecialistsAuthInfo.specialist_id == user.id
            ).first()
            if auth_info and auth_info.email_verification_status == EmailVerificationStatusEnum.VERIFIED:
                return ResendOTPResponse(
                    success=False,
                    message="Email is already verified.",
                    email=email
                )

        if not auth_info:
            return ResendOTPResponse(
                success=False,
                message="Authentication information not found.",
                email=email
            )

        # Rate limiting: Check if last OTP request was within 1 minute
        now = datetime.now(timezone.utc)
        if hasattr(auth_info, 'otp_last_request_at') and auth_info.otp_last_request_at:
            time_since_last_request = (now - auth_info.otp_last_request_at).total_seconds()
            if time_since_last_request < 60:  # 1 minute minimum between requests
                remaining_seconds = int(60 - time_since_last_request)
                return ResendOTPResponse(
                    success=False,
                    message=f"Please wait {remaining_seconds} seconds before requesting another OTP.",
                    email=email,
                    retry_after_minutes=1
                )

        # Rate limiting: Check number of OTP requests in last hour (max 3 per hour)
        # This applies to specialists (who have otp_attempts field) and patients (if they get the field)
        if hasattr(auth_info, 'otp_last_request_at') and auth_info.otp_last_request_at:
            time_since_last_request = (now - auth_info.otp_last_request_at).total_seconds()
            if time_since_last_request < 3600:  # Within 1 hour
                # For specialists, check the attempt counter
                if user_type == "specialist" and hasattr(auth_info, 'otp_attempts') and auth_info.otp_attempts >= 3:
                    return ResendOTPResponse(
                        success=False,
                        message="Too many OTP requests. Please try again in 1 hour.",
                        email=email,
                        retry_after_minutes=60
                    )
            else:
                # Reset counter if more than 1 hour has passed
                if hasattr(auth_info, 'otp_attempts'):
                    auth_info.otp_attempts = 0

        # Generate new OTP
        otp = generate_otp()
        otp_expiry = get_otp_expiry()
        logger.info(f"Generated new OTP for {email}: {otp}")

        # Update OTP based on user type (using standardized field names)
        if user_type == "patient":
            auth_info.otp_code = otp
            auth_info.otp_expires_at = otp_expiry
            if hasattr(auth_info, 'otp_last_request_at'):
                auth_info.otp_last_request_at = now  # Track last request time for rate limiting
        elif user_type == "specialist":
            old_otp = auth_info.otp_code  # Track old OTP for logging
            auth_info.otp_code = otp
            auth_info.otp_expires_at = otp_expiry
            # Initialize otp_attempts if None, then increment
            if auth_info.otp_attempts is None:
                auth_info.otp_attempts = 0
            auth_info.otp_attempts += 1  # Increment attempt counter for specialists
            # auth_info.otp_last_request_at = now  # Removed as field does not exist in DB
            logger.info(f"Updated OTP for specialist {email}: old='{old_otp}', new='{otp}'")

        # Admin users don't use OTP for verification in this simplified flow

        auth_info.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(auth_info)  # Refresh to ensure latest data is available

        # Send verification email in background
        background_tasks.add_task(
            safe_send_verification_email,
            email,
            otp,
            USERTYPE.PATIENT if user_type == "patient" else USERTYPE.SPECIALIST if user_type == "specialist" else None,
            user_name
        )

        logger.info(f"OTP resent successfully to {email}. New OTP: {otp}")

        return ResendOTPResponse(
            success=True,
            message="A new verification code has been sent to your email.",
            email=email
        )

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error resending OTP: {e}\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend verification code: {str(e)}"
        )

# ============================================================================
# STATUS ENDPOINTS
# ============================================================================

@router.get("/registration-status", response_model=RegistrationStatusResponse)
async def get_registration_status(
    email: str,
    db: Session = Depends(get_db)
):
    """Get registration status for an email address"""
    try:
        email = email.lower().strip()

        # Check all user types
        user = None
        user_type = None
        is_verified = False
        is_active = False
        registration_date = None

        # Check patient
        patient = get_patient_by_email(db, email)
        if patient:
            user = patient
            user_type = "patient"
            auth_info = db.query(PatientAuthInfo).filter(
                PatientAuthInfo.patient_id == patient.id
            ).first()
            if auth_info:
                is_verified = auth_info.is_verified
                is_active = auth_info.is_active
                registration_date = patient.created_at

        # Check specialist
        if not user:
            specialist = get_specialist_by_email(db, email)
            if specialist:
                user = specialist
                user_type = "specialist"
                auth_info = db.query(SpecialistsAuthInfo).filter(
                    SpecialistsAuthInfo.specialist_id == specialist.id
                ).first()
                if auth_info:
                    is_verified = auth_info.email_verification_status == EmailVerificationStatusEnum.VERIFIED
                    is_active = True  # Specialists are active once verified
                    registration_date = specialist.created_at

        # Check admin
        if not user:
            admin = get_admin_by_email(db, email)
            if admin:
                user = admin
                user_type = "admin"
                is_verified = True  # Admins are verified by default
                is_active = admin.is_active
                registration_date = admin.created_at

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address"
            )

        # Determine account status
        if user_type == "patient":
            account_status = "active" if is_verified and is_active else "pending_verification"
        elif user_type == "specialist":
            account_status = "pending_approval" if is_verified else "pending_verification"
        else:  # admin
            account_status = "active" if is_active else "inactive"

        # Determine next steps
        next_steps = []
        if not is_verified:
            next_steps.extend([
                "Check your email for verification code",
                "Enter the 6-digit code to verify your account"
            ])
        elif user_type == "patient":
            next_steps.extend([
                "Complete your profile information",
                "Set your consultation preferences"
            ])
        elif user_type == "specialist":
            next_steps.extend([
                "Complete your professional profile",
                "Upload required documents",
                "Submit for admin approval"
            ])

        return RegistrationStatusResponse(
            email=email,
            is_verified=is_verified,
            is_active=is_active,
            registration_date=registration_date,
            verification_status="verified" if is_verified else "pending",
            account_status=account_status,
            next_steps=next_steps
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting registration status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve registration status"
        )

# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@router.get("/specialist-types")
async def get_specialist_types():
    """
    Get all available specialist types for dropdown selection.
    
    Returns a list of specialist types with their values and display names.
    Used by frontend to populate the specialist type dropdown during registration.
    """
    specialist_types = [
        {
            "value": type_enum.value,
            "label": type_enum.value.replace('_', ' ').title(),
            "description": _get_specialist_type_description(type_enum.value)
        }
        for type_enum in SpecialistTypeEnum
    ]
    
    return {
        "success": True,
        "specialist_types": specialist_types,
        "count": len(specialist_types)
    }

def _get_specialist_type_description(specialist_type: str) -> str:
    """Helper function to get description for each specialist type"""
    descriptions = {
        "psychiatrist": "Medical doctor specializing in mental health and can prescribe medication",
        "psychologist": "Mental health professional with doctoral degree, provides therapy and assessment",
        "counselor": "Licensed professional providing guidance and support for mental health concerns",
        "therapist": "Mental health professional providing various forms of therapy",
        "social_worker": "Professional helping with social and emotional well-being in various contexts"
    }
    return descriptions.get(specialist_type, "Mental health professional")

@router.get("/health")
async def verification_health_check():
    """Health check for verification service"""

    return {
        "status": "healthy",
        "service": "verification",
        "timestamp": datetime.now(timezone.utc),
        "version": "2.0.0",
        "features": {
            "patient_registration": "active",
            "email_verification": "active",
            "otp_management": "active",
            "status_checking": "active"
        }
    }

# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "router",
    "register_patient",
    "register_specialist",
    "verify_user_email",
    "resend_verification_otp",
    "get_registration_status"
]
