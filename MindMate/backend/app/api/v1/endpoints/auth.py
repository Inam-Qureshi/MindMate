"""
MindMate Consolidated Authentication API
========================================
Unified authentication system combining login, user management, and password reset.
Handles all user types: patients, specialists, and admins.

Author: Mental Health Platform Team
Version: 2.0.0 - Consolidated authentication system
"""

import os
import re
import uuid
import secrets
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field, field_validator
import bcrypt
from jose import jwt, JWTError

# Import database models
from app.models.patient import Patient, PatientAuthInfo
from app.models.specialist import (
    Specialists, SpecialistsAuthInfo, SpecialistsApprovalData,
    EmailVerificationStatusEnum, ApprovalStatusEnum
)
from app.models.admin import Admin, AdminStatusEnum
from app.models.base import USERTYPE

# Import authentication schemas
from app.schemas.auth import (
    PatientLoginResponse, SpecialistLoginResponse, AdminLoginResponse,
    ErrorResponse
)

# Import utilities
from app.utils.email_utils import (
    send_login_notification_email,
    send_notification_email,
    send_password_reset_email
)
from app.db.session import get_db

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router and security
router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY")
if not SECRET_KEY:
    logger.critical("⚠️ JWT_SECRET_KEY or SECRET_KEY environment variable not set! Using fallback for development only.")
    SECRET_KEY = "dev-only-" + secrets.token_urlsafe(32)  # Generate random key for dev
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # Increased to 8 hours for development
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# Platform admin key for admin login - SECURITY: Must be set in environment
PLATFORM_ADMIN_KEY = os.getenv("ADMIN_REGISTRATION_KEY")
if not PLATFORM_ADMIN_KEY:
    logger.critical("⚠️ ADMIN_REGISTRATION_KEY environment variable not set! Admin login will not work.")
    PLATFORM_ADMIN_KEY = "ADMIN-KEY-NOT-SET-" + secrets.token_urlsafe(16)  # Unusable random value

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class LoginRequest(BaseModel):
    """Universal login request"""
    email: EmailStr
    password: str
    user_type: str = Field(..., description="User type: patient, specialist, or admin")
    secret_key: Optional[str] = Field(None, description="Required for admin login")
    remember_me: bool = Field(False, description="Remember login for longer period")
    
    @field_validator('user_type')
    @classmethod
    def validate_user_type(cls, v):
        if v not in ['patient', 'specialist', 'admin']:
            raise ValueError('user_type must be one of: patient, specialist, admin')
        return v.lower().strip()

class CurrentUserResponse(BaseModel):
    """Current user information response"""
    user_id: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    user_type: str
    is_active: bool
    verification_status: Optional[str] = None
    approval_status: Optional[str] = None
    last_login: Optional[datetime] = None
    profile_complete: bool = False

class TokenRefreshRequest(BaseModel):
    """Token refresh request model"""
    refresh_token: str = Field(..., description="Refresh token")

class TokenRefreshResponse(BaseModel):
    """Token refresh response model"""
    success: bool
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class LogoutResponse(BaseModel):
    """Logout response model"""
    success: bool
    message: str
    logged_out_at: datetime

class ChangePasswordRequest(BaseModel):
    """Change password request model"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")

class ChangePasswordResponse(BaseModel):
    """Change password response model"""
    success: bool
    message: str
    changed_at: datetime

# Password Reset Models
class PasswordResetRequest(BaseModel):
    email: str = Field(..., description="User's email address")
    user_type: str = Field(..., description="User type: patient, specialist, or admin")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return v.lower()

    @field_validator('user_type')
    @classmethod
    def validate_user_type(cls, v):
        if v not in ['patient', 'specialist', 'admin']:
            raise ValueError('Invalid user type')
        return v

class PasswordResetResponse(BaseModel):
    success: bool
    message: str
    cooldown_until: Optional[datetime] = None

class ResendOTPRequest(BaseModel):
    email: str = Field(..., description="User's email address")
    user_type: str = Field(..., description="User type")

class VerifyOTPRequest(BaseModel):
    email: str = Field(..., description="User's email address")
    user_type: str = Field(..., description="User type")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")

class VerifyOTPResponse(BaseModel):
    success: bool
    message: str
    reset_token: str
    expires_at: datetime

class ResetPasswordRequest(BaseModel):
    reset_token: str = Field(..., description="Reset token from OTP verification")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., min_length=8, max_length=128, description="Confirm new password")

    @field_validator('confirm_password')
    @classmethod
    def validate_password_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v

    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

class ResetPasswordResponse(BaseModel):
    success: bool
    message: str
    changed_at: datetime

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[Dict]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except JWTError as e:
        logger.warning(f"Token verification failed: {e}")
        return None

def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    if hasattr(request, "client") and request.client:
        return request.client.host

    return "Unknown"

def safe_enum_to_string(enum_value) -> str:
    """Safely convert enum to string"""
    if enum_value is None:
        return "Unknown"

    if hasattr(enum_value, 'value'):
        return str(enum_value.value)

    return str(enum_value)

def send_login_notification(email: str, first_name: str, client_ip: str, user_type: str) -> bool:
    """Send login notification email to user"""
    try:
        login_time = datetime.now()

        if user_type in ["patient", "specialist"]:
            return send_login_notification_email(email, first_name, client_ip, login_time)
        else:
            return send_notification_email(
                to_email=email,
                subject="Admin Login Notification - MindMate Platform",
                content=f"""
                <h2>Admin Login Notification</h2>
                <p>Dear {first_name},</p>
                <p>A successful login to your admin account was detected:</p>
                <ul>
                    <li><strong>Time:</strong> {login_time.strftime('%Y-%m-%d %H:%M:%S UTC')}</li>
                    <li><strong>IP Address:</strong> {client_ip}</li>
                    <li><strong>Account Type:</strong> Administrator</li>
                </ul>
                <p>If this wasn't you, please contact support immediately.</p>
                <p>Best regards,<br>MindMate Security Team</p>
                """
            )
    except Exception as e:
        logger.error(f"Login notification failed for {email}: {str(e)}")
        return False

# Password Reset Utilities
def generate_otp() -> str:
    """Generate cryptographically secure 6-digit OTP"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

def hash_otp(otp: str) -> str:
    """Hash OTP for secure storage"""
    return hashlib.sha256(otp.encode()).hexdigest()

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    
    return True, ""

def get_user_by_email(db: Session, email: str, user_type: str):
    """Get user by email and type"""
    try:
        if user_type == 'patient':
            return db.query(Patient).filter(
                Patient.email == email.lower(),
                Patient.is_deleted == False
            ).first()
        elif user_type == 'specialist':
            return db.query(Specialists).filter(
                Specialists.email == email.lower(),
                Specialists.is_deleted == False
            ).first()
        elif user_type == 'admin':
            from app.models.admin import Admin
            return db.query(Admin).filter(
                Admin.email == email.lower(),
                Admin.is_deleted == False
            ).first()
        return None
    except Exception as e:
        logger.error(f"Error getting user by email: {e}")
        return None

def get_auth_info(db: Session, user, user_type: str):
    """Get authentication info for user"""
    try:
        if user_type == 'patient':
            return db.query(PatientAuthInfo).filter(
                PatientAuthInfo.patient_id == user.id
            ).first()
        elif user_type == 'specialist':
            return db.query(SpecialistsAuthInfo).filter(
                SpecialistsAuthInfo.specialist_id == user.id
            ).first()
        elif user_type == 'admin':
            return user
        return None
    except Exception as e:
        logger.error(f"Error getting auth info: {e}")
        return None

# Account Security Functions
def is_account_locked(auth_info) -> bool:
    """Check if account is locked"""
    if hasattr(auth_info, 'is_locked') and auth_info.is_locked:
        return True
    if hasattr(auth_info, 'locked_until') and auth_info.locked_until and auth_info.locked_until > datetime.now(timezone.utc):
        return True
    return False

def increment_failed_attempts(db: Session, auth_info):
    """Increment failed login attempts and lock if necessary"""
    if hasattr(auth_info, 'failed_login_attempts'):
        auth_info.failed_login_attempts += 1
        auth_info.updated_at = datetime.now(timezone.utc)

        # Lock account after 5 failed attempts for 30 minutes
        if auth_info.failed_login_attempts >= 5:
            auth_info.is_locked = True
            auth_info.locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)
            logger.warning(f"Account locked for user: {auth_info.patient.email if hasattr(auth_info, 'patient') else 'unknown'}")

        db.commit()

def reset_failed_attempts(db: Session, auth_info):
    """Reset failed login attempts after successful login"""
    if hasattr(auth_info, 'failed_login_attempts'):
        auth_info.failed_login_attempts = 0
        auth_info.is_locked = False
        auth_info.locked_until = None
        auth_info.last_login = datetime.now(timezone.utc)
        auth_info.updated_at = datetime.now(timezone.utc)
        db.commit()

# ============================================================================
# AUTHENTICATION FUNCTIONS
# ============================================================================

def authenticate_patient(db: Session, email: str, password: str) -> tuple:
    """Authenticate patient and return patient, auth_info tuple or raise specific error"""
    try:
        patient = db.query(Patient).filter(
            Patient.email == email.lower(),
            Patient.is_deleted == False
        ).first()

        if not patient:
            # Check if email exists as specialist to provide helpful error message
            specialist = db.query(Specialists).filter(
                Specialists.email == email.lower(),
                Specialists.is_deleted == False
            ).first()
            
            if specialist:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="This email is registered as a specialist. Please login as a specialist instead."
                )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No patient account found with this email address. Please check your email or sign up for a new account."
            )

        auth_info = db.query(PatientAuthInfo).filter(
            PatientAuthInfo.patient_id == patient.id
        ).first()

        if not auth_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Patient authentication data not found. Please contact support."
            )

        if not auth_info.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email address not verified. Please check your email and verify your account first."
            )

        if is_account_locked(auth_info):
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account is temporarily locked due to multiple failed attempts. Please try again later."
            )

        if not verify_password(password, auth_info.hashed_password):
            increment_failed_attempts(db, auth_info)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password. Please check your password and try again."
            )

        reset_failed_attempts(db, auth_info)
        return patient, auth_info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Patient authentication error for {email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication system error. Please try again later."
        )

def authenticate_specialist(db: Session, email: str, password: str) -> tuple:
    """Authenticate specialist and return specialist, auth_info tuple or raise specific error"""
    try:
        specialist = db.query(Specialists).filter(
            Specialists.email == email.lower(),
            Specialists.is_deleted == False
        ).first()

        if not specialist:
            # Check if email exists as patient to provide helpful error message
            patient = db.query(Patient).filter(
                Patient.email == email.lower(),
                Patient.is_deleted == False
            ).first()
            
            if patient:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="This email is registered as a patient. Please login as a patient instead."
                )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No specialist account found with this email address. Please check your email or sign up for a new account."
            )

        auth_info = db.query(SpecialistsAuthInfo).filter(
            SpecialistsAuthInfo.specialist_id == specialist.id
        ).first()

        if not auth_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Specialist authentication data not found. Please contact support."
            )

        if auth_info.email_verification_status != EmailVerificationStatusEnum.VERIFIED:
            verification_status = safe_enum_to_string(auth_info.email_verification_status)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Email verification required. Current status: {verification_status}. Please verify your email first."
            )

        if specialist.approval_status == ApprovalStatusEnum.REJECTED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your specialist application has been rejected. Please contact support for more information."
            )

        if hasattr(ApprovalStatusEnum, 'SUSPENDED') and specialist.approval_status == ApprovalStatusEnum.SUSPENDED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your specialist account has been suspended. Please contact support."
            )

        if not verify_password(password, auth_info.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password. Please check your password and try again."
            )

        return specialist, auth_info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Specialist authentication error for {email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication system error. Please try again later."
        )

def authenticate_admin(db: Session, email: str, password: str, secret_key: str) -> Admin:
    """Authenticate admin and return admin object or raise specific error"""
    try:
        if not secret_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin secret key is required for authentication"
            )

        if secret_key != PLATFORM_ADMIN_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin secret key"
            )

        admin = db.query(Admin).filter(
            Admin.email == email.lower(),
            Admin.is_deleted == False
        ).first()

        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No admin account found with this email address"
            )

        if not admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin account has been deactivated. Please contact super admin."
            )

        if admin.status != AdminStatusEnum.ACTIVE:
            status_str = safe_enum_to_string(admin.status)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Admin account status is {status_str}. Please contact super admin."
            )

        if not verify_password(password, admin.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password. Please check your password and try again."
            )

        return admin

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin authentication error for {email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication system error. Please try again later."
        )

# ============================================================================
# DEPENDENCY FUNCTIONS
# ============================================================================

async def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> dict:
    """Extract current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        if not credentials or not credentials.credentials:
            logger.warning("No authentication token provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = credentials.credentials

        try:
            # Clean and validate token format
            token = token.strip()
            if not token or len(token.split('.')) != 3:
                logger.error(f"JWT decode error: Invalid token format - not enough segments")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token format",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except jwt.ExpiredSignatureError:
            logger.error(f"JWT decode error: Token expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired. Please refresh your token or login again.",
                headers={
                    "WWW-Authenticate": "Bearer",
                    "X-Token-Expired": "true",
                    "X-Refresh-Required": "true"
                },
            )
        except JWTError as jwt_err:
            logger.error(f"JWT decode error: {str(jwt_err)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        user_type: str = payload.get("user_type")

        if user_id is None or email is None or user_type is None:
            logger.error(f"Invalid token payload: user_id={user_id}, email={email}, user_type={user_type}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload - missing required fields"
            )

        # Fetch user based on type
        user = None
        auth_info = None

        try:
            if user_type == "patient":
                user = db.query(Patient).filter(
                    Patient.id == user_id,
                    Patient.email == email,
                    Patient.is_deleted == False
                ).first()

                if user:
                    auth_info = db.query(PatientAuthInfo).filter(
                        PatientAuthInfo.patient_id == user.id
                    ).first()

                    if not auth_info or not auth_info.is_verified:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Patient account not verified"
                        )

            elif user_type == "specialist":
                user = db.query(Specialists).filter(
                    Specialists.id == user_id,
                    Specialists.email == email,
                    Specialists.is_deleted == False
                ).first()

                if user:
                    auth_info = db.query(SpecialistsAuthInfo).filter(
                        SpecialistsAuthInfo.specialist_id == user.id,
                        SpecialistsAuthInfo.email_verification_status == EmailVerificationStatusEnum.VERIFIED
                    ).first()

                    if not auth_info:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Specialist account not verified"
                        )

                    # Check if specialist is rejected or suspended
                    if user.approval_status == ApprovalStatusEnum.REJECTED:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Specialist account has been rejected"
                        )

                    if hasattr(ApprovalStatusEnum, 'SUSPENDED') and user.approval_status == ApprovalStatusEnum.SUSPENDED:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Specialist account has been suspended"
                        )

            elif user_type == "admin":
                user = db.query(Admin).filter(
                    Admin.id == user_id,
                    Admin.email == email,
                    Admin.is_active == True,
                    Admin.status == AdminStatusEnum.ACTIVE
                ).first()
                # Admin doesn't have separate auth_info table, so set to None
                auth_info = None

            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid user type in token: {user_type}"
                )

        except HTTPException:
            raise
        except Exception as db_error:
            logger.error(f"Database error during user lookup: {str(db_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error during authentication"
            )

        if not user:
            logger.error(f"User not found: id={user_id}, email={email}, type={user_type}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found, deleted, or inactive"
            )

        return {
            "user": user,
            "auth_info": auth_info,
            "user_type": user_type,
            "token_payload": payload
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in token validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed due to unexpected error"
        )

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_specialist_redirect(specialist: Specialists, auth_info: SpecialistsAuthInfo, db: Session) -> str:
    """
    Determine where to redirect specialist after login based on their profile and approval status.
    
    Returns the redirect path appropriate for the specialist's current state.
    """
    # 1. Email not verified
    if auth_info.email_verification_status != EmailVerificationStatusEnum.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first"
        )
    
    # 2. Account suspended
    if specialist.approval_status == ApprovalStatusEnum.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended. Contact support for assistance."
        )
    
    # 3. APPROVED specialists ALWAYS go directly to dashboard (highest priority)
    # This check must come first - approved specialists should never be redirected to completion page
    if specialist.approval_status == ApprovalStatusEnum.APPROVED:
        return "/specialist-dashboard"
    
    # 4. Check document submission status for more granular redirects (only for non-approved)
    approval_data = db.query(SpecialistsApprovalData).filter(
        SpecialistsApprovalData.specialist_id == specialist.id,
        SpecialistsApprovalData.is_deleted == False
    ).first()
    
    documents_uploaded = 0
    if approval_data:
        # Safely get documents count - documents might be a relationship or None
        try:
            if hasattr(approval_data, 'documents') and approval_data.documents:
                if isinstance(approval_data.documents, list):
                    documents_uploaded = len(approval_data.documents)
                elif hasattr(approval_data.documents, '__len__'):
                    documents_uploaded = len(list(approval_data.documents))
        except Exception as doc_error:
            logger.warning(f"Error counting documents for specialist {specialist.id}: {doc_error}")
            documents_uploaded = 0
    
    # 5. Under review (check status before profile/document checks)
    if specialist.approval_status == ApprovalStatusEnum.UNDER_REVIEW:
        return "/pending-approval"
    
    # 6. Rejected (check status before profile/document checks)
    if specialist.approval_status == ApprovalStatusEnum.REJECTED:
        return "/application-rejected"
    
    # 7. Profile incomplete - needs to complete mandatory fields (only for non-approved)
    if not specialist.mandatory_fields_completed:
        return "/complete-profile"
    
    # 8. Profile complete but documents not uploaded (only for non-approved)
    if specialist.mandatory_fields_completed and documents_uploaded < 4:
        return "/complete-profile?tab=documents"
    
    # 9. Documents uploaded but not submitted for approval
    if specialist.mandatory_fields_completed and documents_uploaded >= 4 and specialist.approval_status == ApprovalStatusEnum.PENDING:
        return "/complete-profile?tab=documents"  # Show submit button
    
    # Default fallback
    return "/complete-profile"

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.options("/login")
async def options_login():
    return {"detail": "OPTIONS request handled"}

@router.post(
    "/login",
    responses={
        200: {"description": "Login successful"},
        400: {"model": ErrorResponse, "description": "Invalid input or missing required fields"},
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        403: {"model": ErrorResponse, "description": "Account not verified, approved, or active"},
        423: {"model": ErrorResponse, "description": "Account locked"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def login_user(
    request: LoginRequest,
    http_request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Universal login endpoint for all user types"""
    try:
        user_type = request.user_type.lower().strip()
        email = request.email.lower().strip()

        # Validate user type
        if user_type not in ["patient", "specialist", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user type. Must be one of: patient, specialist, admin"
            )

        # Validate password
        if not request.password or len(request.password.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password cannot be empty"
            )

        # For admin login, secret_key is required
        if user_type == "admin" and not request.secret_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Secret key is required for admin login"
            )

        logger.info(f"Login attempt: {email} as {user_type}")

        # Authenticate based on user type
        authenticated_user = None
        auth_info = None

        try:
            if user_type == "patient":
                authenticated_user, auth_info = authenticate_patient(db, email, request.password)
            elif user_type == "specialist":
                authenticated_user, auth_info = authenticate_specialist(db, email, request.password)
            elif user_type == "admin":
                authenticated_user = authenticate_admin(db, email, request.password, request.secret_key)

        except HTTPException as auth_error:
            logger.error(f"Authentication failed for {email} as {user_type}: {auth_error.detail}")
            raise auth_error

        # Update last login time
        try:
            now = datetime.now(timezone.utc)
            if user_type == "patient" and auth_info:
                auth_info.last_login = now
            elif user_type == "specialist" and auth_info:
                auth_info.last_login = now
            elif user_type == "admin":
                authenticated_user.last_login = now

            db.commit()
            logger.info(f"Login successful for {email} as {user_type}")

        except Exception as db_error:
            logger.error(f"Failed to update last login for {email}: {str(db_error)}")
            db.rollback()

        # Create JWT tokens
        try:
            token_data = {
                "sub": str(authenticated_user.id),
                "email": authenticated_user.email,
                "user_type": user_type,
                "iat": datetime.now(timezone.utc)
            }

            # Adjust token expiration if remember_me is enabled
            if request.remember_me:
                access_token_expires = timedelta(hours=24)
                expires_in = 24 * 60 * 60
            else:
                access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                expires_in = ACCESS_TOKEN_EXPIRE_MINUTES * 60

            access_token = create_access_token(token_data, access_token_expires)
            refresh_token = create_refresh_token(token_data)

        except Exception as token_error:
            logger.error(f"Token creation failed for {email}: {str(token_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create authentication tokens"
            )

        # Get client IP and send login notification asynchronously
        try:
            client_ip = get_client_ip(http_request)
            # Send email notification in background to avoid blocking the login response
            background_tasks.add_task(
                send_login_notification,
                authenticated_user.email,
                authenticated_user.first_name,
                client_ip,
                user_type
            )
            logger.info(f"Login notification queued for {authenticated_user.email}")

        except Exception as notification_error:
            logger.error(f"Login notification error for {authenticated_user.email}: {str(notification_error)}")

        # Prepare response based on user type
        full_name = f"{authenticated_user.first_name} {authenticated_user.last_name}"

        try:
            if user_type == "patient":
                # Check profile completeness
                profile_complete = bool(
                    authenticated_user.phone and
                    authenticated_user.city and
                    authenticated_user.district
                )

                return PatientLoginResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    user_id=str(authenticated_user.id),
                    email=authenticated_user.email,
                    full_name=full_name,
                    profile_complete=profile_complete,
                    verification_status="verified",
                    has_active_appointments=False
                )

            elif user_type == "specialist":
                # Get redirect path based on specialist state
                try:
                    redirect_to = get_specialist_redirect(authenticated_user, auth_info, db)
                except HTTPException:
                    # Re-raise HTTPExceptions (like email not verified)
                    raise
                except Exception as redirect_error:
                    # If redirect determination fails, use default
                    import traceback
                    logger.warning(f"Error determining redirect for specialist {authenticated_user.id}: {redirect_error}\n{traceback.format_exc()}")
                    redirect_to = "/complete-profile"
                
                # Profile completion tracking
                profile_completion_percentage = getattr(authenticated_user, 'profile_completion_percentage', 0) or 0
                mandatory_fields_completed = getattr(authenticated_user, 'mandatory_fields_completed', False) or False
                
                # Legacy profile completeness check
                profile_complete = bool(
                    authenticated_user.phone and
                    authenticated_user.address and
                    authenticated_user.bio and
                    authenticated_user.consultation_fee and
                    authenticated_user.languages_spoken and
                    authenticated_user.specializations and
                    len(authenticated_user.specializations) > 0
                )

                # Determine if specialist can practice
                can_practice = (
                    authenticated_user.approval_status == ApprovalStatusEnum.APPROVED and
                    auth_info.email_verification_status == EmailVerificationStatusEnum.VERIFIED
                )

                # Status message based on current state
                status_message = None
                if not mandatory_fields_completed:
                    status_message = "Please complete your profile with all mandatory fields to proceed."
                elif authenticated_user.approval_status == ApprovalStatusEnum.PENDING:
                    status_message = "Your specialist application is pending admin approval. We'll notify you once approved."
                elif authenticated_user.approval_status == ApprovalStatusEnum.UNDER_REVIEW:
                    status_message = "Your application is currently under review by our team."
                elif authenticated_user.approval_status == ApprovalStatusEnum.REJECTED:
                    status_message = "Your application was not approved. Please review the rejection reason and reapply."
                elif authenticated_user.approval_status == ApprovalStatusEnum.APPROVED:
                    status_message = "Your account has been approved! You can now start accepting appointments."

                # Ensure all required fields have valid values
                specialist_type_str = safe_enum_to_string(authenticated_user.specialist_type) if authenticated_user.specialist_type else "unknown"
                approval_status_str = safe_enum_to_string(authenticated_user.approval_status) if authenticated_user.approval_status else "pending"
                verification_status_str = safe_enum_to_string(auth_info.email_verification_status) if auth_info.email_verification_status else "pending"
                
                return SpecialistLoginResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    user_id=str(authenticated_user.id),
                    email=authenticated_user.email,
                    full_name=full_name,
                    specialist_type=specialist_type_str,
                    approval_status=approval_status_str,
                    verification_status=verification_status_str,
                    can_practice=bool(can_practice),
                    profile_complete=bool(profile_complete),
                    profile_completion_percentage=int(profile_completion_percentage) if profile_completion_percentage else 0,
                    mandatory_fields_completed=bool(mandatory_fields_completed),
                    redirect_to=str(redirect_to) if redirect_to else "/complete-profile",
                    account_status=approval_status_str,
                    status_message=str(status_message) if status_message else None
                )

            elif user_type == "admin":
                # Admin permissions
                permissions = {
                    "manage_users": True,
                    "approve_specialists": True,
                    "view_analytics": True,
                    "system_config": authenticated_user.role.value == "super_admin"
                }

                return AdminLoginResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    user_id=str(authenticated_user.id),
                    email=authenticated_user.email,
                    full_name=full_name,
                    role=safe_enum_to_string(authenticated_user.role),
                    permissions=permissions,
                    last_login=authenticated_user.last_login
                )

        except Exception as response_error:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Response creation failed for {email}: {str(response_error)}\n{error_trace}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create login response: {str(response_error)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected login error for {request.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during login. Please try again."
        )

@router.get(
    "/me",
    response_model=CurrentUserResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid or expired token"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_current_user(
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """Get current authenticated user information"""
    try:
        user = current_user_data["user"]
        auth_info = current_user_data["auth_info"]
        user_type = current_user_data["user_type"]

        logger.info(f"Getting current user info for {user.email} as {user_type}")

        # Build response
        response_data = {
            "user_id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": f"{user.first_name} {user.last_name}",
            "user_type": user_type,
            "is_active": True
        }

        # Add type-specific information
        try:
            if user_type == "patient":
                response_data.update({
                    "verification_status": "verified" if auth_info and auth_info.is_verified else "pending",
                    "last_login": auth_info.last_login if auth_info else None,
                    "profile_complete": bool(
                        getattr(user, 'phone', None) and
                        getattr(user, 'address', None) and
                        getattr(user, 'emergency_contact', None)
                    )
                })

            elif user_type == "specialist":
                response_data.update({
                    "verification_status": safe_enum_to_string(auth_info.email_verification_status) if auth_info else "pending",
                    "approval_status": safe_enum_to_string(getattr(user, 'approval_status', 'unknown')),
                    "last_login": auth_info.last_login_at if auth_info else None,
                    "profile_complete": bool(
                        getattr(user, 'phone', None) and
                        getattr(user, 'address', None) and
                        getattr(user, 'bio', None) and
                        getattr(user, 'consultation_fee', None) and
                        getattr(user, 'languages_spoken', None) and
                        getattr(user, 'specializations', None) and
                        len(getattr(user, 'specializations', [])) > 0
                    )
                })

            elif user_type == "admin":
                # Admin doesn't have auth_info, so handle it gracefully
                response_data.update({
                    "verification_status": "verified",
                    "approval_status": safe_enum_to_string(getattr(user, 'status', 'active')),
                    "last_login": getattr(user, 'last_login', None),
                    "profile_complete": True,
                    "role": safe_enum_to_string(getattr(user, 'role', 'admin'))
                })

        except Exception as profile_error:
            logger.error(f"Error building profile info for {user.email}: {str(profile_error)}")
            response_data.update({
                "verification_status": "verified" if user_type == "admin" else "unknown",
                "last_login": None,
                "profile_complete": False
            })

        return CurrentUserResponse(**response_data)

    except Exception as e:
        logger.error(f"Failed to get current user info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )

@router.post("/refresh-token", response_model=TokenRefreshResponse)
async def refresh_access_token(
    refresh_data: TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""

    try:
        # Verify refresh token
        payload = verify_token(refresh_data.refresh_token, "refresh")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )

        patient_id = payload.get("sub")
        email = payload.get("email")
        user_type = payload.get("user_type", "patient")

        # Verify user still exists and is active
        user = None
        if user_type == "patient":
            user = db.query(Patient).filter(
                Patient.id == uuid.UUID(patient_id),
                Patient.email == email,
                Patient.is_deleted == False
            ).first()
        elif user_type == "specialist":
            user = db.query(Specialists).filter(
                Specialists.id == uuid.UUID(patient_id),
                Specialists.email == email,
                Specialists.is_deleted == False
            ).first()
        elif user_type == "admin":
            user = db.query(Admin).filter(
                Admin.id == uuid.UUID(patient_id),
                Admin.email == email,
                Admin.is_deleted == False,
                Admin.is_active == True
            ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )

        # Create new access token
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "user_type": user_type
        }

        access_token = create_access_token(token_data)
        expires_in = ACCESS_TOKEN_EXPIRE_MINUTES * 60

        return TokenRefreshResponse(
            success=True,
            access_token=access_token,
            expires_in=expires_in
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token. Please login again."
        )

@router.post("/logout", response_model=LogoutResponse)
async def logout_user(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Logout user"""

    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        logger.info(f"Logout request for {user.email} as {user_type}")

        # Update last activity
        auth_info = current_user_data.get("auth_info")
        logout_time = datetime.now(timezone.utc)

        if auth_info and hasattr(auth_info, 'last_activity'):
            auth_info.last_activity = logout_time
            auth_info.updated_at = logout_time
            db.commit()

        logger.info(f"User logged out successfully: {user.id}")

        return LogoutResponse(
            success=True,
            message="Logged out successfully",
            logged_out_at=logout_time
        )

    except Exception as e:
        logger.error(f"Error during logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed. Please try again."
        )

@router.get("/validate-token")
async def validate_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Validate JWT token without requiring database lookup"""
    try:
        if not credentials or not credentials.credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No token provided",
                headers={"WWW-Authenticate": "Bearer"}
            )

        token = credentials.credentials.strip()
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            exp_timestamp = payload.get("exp")
            
            if exp_timestamp:
                from datetime import datetime, timezone
                exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
                time_remaining = (exp_datetime - datetime.now(timezone.utc)).total_seconds()
                
                return {
                    "valid": True,
                    "expires_at": exp_datetime.isoformat(),
                    "time_remaining_seconds": int(time_remaining),
                    "user_type": payload.get("user_type"),
                    "user_id": payload.get("sub"),
                    "email": payload.get("email")
                }
            
        except jwt.ExpiredSignatureError:
            return {
                "valid": False,
                "error": "token_expired",
                "message": "Token has expired"
            }
        except jwt.JWTError as e:
            return {
                "valid": False,
                "error": "invalid_token",
                "message": f"Invalid token: {str(e)}"
            }
            
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        return {
            "valid": False,
            "error": "validation_error",
            "message": "Token validation failed"
        }

@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Change user password"""

    try:
        user = current_user_data["user"]
        auth_info = current_user_data["auth_info"]
        user_type = current_user_data["user_type"]

        logger.info(f"Password change request for {user.email} as {user_type}")

        # Verify current password
        if not auth_info or not auth_info.hashed_password or not verify_password(request.current_password, auth_info.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )

        # Hash new password
        new_hashed_password = hash_password(request.new_password)

        # Update password
        auth_info.hashed_password = new_hashed_password
        auth_info.password_changed_at = datetime.now(timezone.utc)
        auth_info.updated_at = datetime.now(timezone.utc)

        db.commit()

        logger.info(f"Password changed successfully for {user.email}")

        change_time = datetime.now(timezone.utc)
        return ChangePasswordResponse(
            success=True,
            message="Password changed successfully",
            changed_at=change_time
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password. Please try again later."
        )

# ============================================================================
# PASSWORD RESET ENDPOINTS
# ============================================================================

@router.post("/request-password-reset", response_model=PasswordResetResponse)
async def request_password_reset(
    request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Request password reset - sends OTP via email"""

    try:
        logger.info(f"Password reset request for {request.email} ({request.user_type})")

        # Get user and auth info
        user = get_user_by_email(db, request.email, request.user_type)
        if not user:
            return PasswordResetResponse(
                success=True,
                message="If an account with this email exists, you will receive password reset instructions."
            )

        auth_info = get_auth_info(db, user, request.user_type)
        if not auth_info:
            return PasswordResetResponse(
                success=True,
                message="If an account with this email exists, you will receive password reset instructions."
            )

        # Generate OTP and set expiry (15 minutes for security)
        otp = generate_otp()
        otp_hash = hash_otp(otp)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        # Update auth info
        auth_info.password_reset_token = otp_hash
        auth_info.password_reset_expires = expires_at

        db.commit()

        # Send email in background
        user_name = getattr(user, 'first_name', None) or getattr(user, 'full_name', None)
        background_tasks.add_task(
            send_password_reset_email,
            request.email,
            otp,
            user_name
        )

        logger.info(f"Password reset OTP sent to {request.email}")

        return PasswordResetResponse(
            success=True,
            message="If an account with this email exists, you will receive password reset instructions."
        )

    except Exception as e:
        logger.error(f"Error in password reset request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request. Please try again later."
        )

@router.post("/resend-reset-otp", response_model=PasswordResetResponse)
async def resend_reset_otp(
    request: ResendOTPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Resend password reset OTP"""

    try:
        logger.info(f"OTP resend request for {request.email} ({request.user_type})")

        # Get user and auth info
        user = get_user_by_email(db, request.email, request.user_type)
        if not user:
            return PasswordResetResponse(
                success=False,
                message="Account not found."
            )

        auth_info = get_auth_info(db, user, request.user_type)
        if not auth_info:
            return PasswordResetResponse(
                success=False,
                message="Authentication information not found."
            )

        # Check if OTP was requested
        if not auth_info.password_reset_token or not auth_info.password_reset_expires:
            return PasswordResetResponse(
                success=False,
                message="No password reset request found. Please request a password reset first."
            )

        # Check if OTP expired
        if datetime.now(timezone.utc) >= auth_info.password_reset_expires:
            return PasswordResetResponse(
                success=False,
                message="Password reset request has expired. Please request a new one."
            )

        # Generate new OTP with 15 minutes expiry
        otp = generate_otp()
        otp_hash = hash_otp(otp)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        # Update auth info
        auth_info.password_reset_token = otp_hash
        auth_info.password_reset_expires = expires_at

        db.commit()

        # Send email in background
        user_name = getattr(user, 'first_name', None) or getattr(user, 'full_name', None)
        background_tasks.add_task(
            send_password_reset_email,
            request.email,
            otp,
            user_name
        )

        logger.info(f"Password reset OTP resent to {request.email}")

        return PasswordResetResponse(
            success=True,
            message="A new OTP has been sent to your email."
        )

    except Exception as e:
        logger.error(f"Error in OTP resend: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend OTP. Please try again later."
        )

@router.post("/verify-reset-otp", response_model=VerifyOTPResponse)
async def verify_reset_otp(
    request: VerifyOTPRequest,
    db: Session = Depends(get_db)
):
    """Verify password reset OTP and generate reset token"""

    try:
        logger.info(f"OTP verification for {request.email} ({request.user_type})")

        # Get user and auth info
        user = get_user_by_email(db, request.email, request.user_type)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found."
            )

        auth_info = get_auth_info(db, user, request.user_type)
        if not auth_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Authentication information not found."
            )

        # Check if OTP was requested
        if not auth_info.password_reset_token or not auth_info.password_reset_expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No password reset request found. Please request a password reset first."
            )

        # Check if OTP expired
        if datetime.now(timezone.utc) >= auth_info.password_reset_expires:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Password reset request has expired. Please request a new one."
            )

        # Verify OTP
        otp_hash = hash_otp(request.otp)
        if auth_info.password_reset_token != otp_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP. Please check and try again."
            )

        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        token_expires = datetime.now(timezone.utc) + timedelta(minutes=15)

        # Store reset token
        auth_info.password_reset_token = reset_token
        auth_info.password_reset_expires = token_expires

        db.commit()

        logger.info(f"OTP verified successfully for {request.email}")

        return VerifyOTPResponse(
            success=True,
            message="OTP verified successfully. You can now reset your password.",
            reset_token=reset_token,
            expires_at=token_expires
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in OTP verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify OTP. Please try again later."
        )

@router.post("/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using reset token"""

    try:
        logger.info("Password reset request received")

        # Find user with this reset token
        user = None
        auth_info = None
        user_type = None

        # Search in patient auth info
        auth_info = db.query(PatientAuthInfo).filter(
            PatientAuthInfo.password_reset_token == request.reset_token
        ).first()
        if auth_info:
            user = db.query(Patient).filter(Patient.id == auth_info.patient_id).first()
            user_type = 'patient'

        if not user:
            # Search in specialist auth info
            auth_info = db.query(SpecialistsAuthInfo).filter(
                SpecialistsAuthInfo.password_reset_token == request.reset_token
            ).first()
            if auth_info:
                user = db.query(Specialists).filter(Specialists.id == auth_info.specialist_id).first()
                user_type = 'specialist'

        if not user:
            # Search in admin table
            user = db.query(Admin).filter(
                Admin.password_reset_token == request.reset_token
            ).first()
            if user:
                auth_info = user
                user_type = 'admin'

        if not user or not auth_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token."
            )

        # Check if token expired
        if not auth_info.password_reset_expires or datetime.now(timezone.utc) >= auth_info.password_reset_expires:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Reset token has expired. Please request a new password reset."
            )

        # Validate password strength
        is_valid, error_message = validate_password_strength(request.new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )

        # Verify passwords match
        if request.new_password != request.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match"
            )

        # Hash new password
        new_hashed_password = hash_password(request.new_password)

        # Update password
        if user_type == 'admin':
            auth_info.hashed_password = new_hashed_password
        else:
            auth_info.hashed_password = new_hashed_password

        # Clear all reset-related fields
        auth_info.password_reset_token = None
        auth_info.password_reset_expires = None

        # Set password change timestamp
        if hasattr(auth_info, 'password_changed_at'):
            auth_info.password_changed_at = datetime.now(timezone.utc)
        if hasattr(auth_info, 'updated_at'):
            auth_info.updated_at = datetime.now(timezone.utc)

        db.commit()

        logger.info(f"Password reset successfully for {user.email}")

        return ResetPasswordResponse(
            success=True,
            message="Password reset successfully. You can now log in with your new password.",
            changed_at=datetime.now(timezone.utc)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in password reset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password. Please try again later."
        )

# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@router.get("/health")
async def auth_health_check():
    """Health check for authentication service"""

    return {
        "status": "healthy",
        "service": "authentication",
        "timestamp": datetime.now(timezone.utc),
        "version": "2.0.0",
        "features": {
            "login": "active",
            "token_refresh": "active",
            "password_reset": "active",
            "user_management": "active"
        }
    }

# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "router",
    "login_user",
    "get_current_user",
    "get_current_user_from_token",
    "create_access_token",
    "create_refresh_token",
    "verify_password",
    "hash_password"
]
