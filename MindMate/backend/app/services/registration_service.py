"""
Registration Service for Specialist Management
Handles specialist registration, progress tracking, and validation
"""
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import hashlib
import re

from app.models.specialist import (
    Specialists, 
    SpecialistsAuthInfo, 
    SpecialistsApprovalData,
    SpecialistRegistrationProgress,
    ApprovalStatusEnum,
    EmailVerificationStatusEnum,
    SpecialistTypeEnum
)
from app.models.base import USERTYPE
from app.schemas.auth import SpecialistRegisterRequest
from app.utils.email_utils import generate_otp, get_otp_expiry
import bcrypt

class RegistrationService:
    """Service for handling specialist registration and progress tracking"""
    
    def __init__(self, db: Session):
        self.db = db
        self.email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        self.phone_regex = re.compile(r'^\+?1?\d{9,15}$')
    
    async def check_existing_registration(self, email: str) -> Dict[str, Any]:
        """Check if email already exists for specialist registration"""
        existing_specialist = self.db.query(Specialists).filter(
            Specialists.email == email.lower(),
            Specialists.is_deleted == False
        ).first()
        
        if existing_specialist:
            # Check if email is verified
            auth_info = self.db.query(SpecialistsAuthInfo).filter(
                SpecialistsAuthInfo.specialist_id == existing_specialist.id
            ).first()
            
            if auth_info and auth_info.email_verification_status == EmailVerificationStatusEnum.VERIFIED:
                # Email is verified - account is registered
                    return {
                    "exists": True,
                    "message": "Email already registered with a verified account. Please login instead.",
                    "specialist_id": str(existing_specialist.id),
                    "approval_status": existing_specialist.approval_status.value if existing_specialist.approval_status else None,
                    "is_verified": True
                }
            elif auth_info and auth_info.email_verification_status == EmailVerificationStatusEnum.PENDING:
                # Email is not verified - pending verification
                return {
                "exists": True,
                    "message": "A registration with this email is pending verification. Please check your email for the OTP or request a new one.",
                "specialist_id": str(existing_specialist.id),
                    "approval_status": existing_specialist.approval_status.value if existing_specialist.approval_status else None,
                    "is_verified": False
            }
        
        return {"exists": False, "message": "Email available"}
    
    async def validate_registration_data(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Validate registration data"""
        errors = []
        
        # Validate email
        if 'email' in request and not self.email_regex.match(request['email']):
            errors.append("Invalid email format")
        
        # Validate password
        if 'password' in request and len(request['password']) < 8:
            errors.append("Password must be at least 8 characters long")
        
        # Validate phone (if provided)
        if 'phone' in request and request['phone'] and not self.phone_regex.match(request['phone']):
            errors.append("Invalid phone number format")
        
        # Validate terms acceptance
        if 'accepts_terms_and_conditions' in request and not request['accepts_terms_and_conditions']:
            errors.append("Terms and conditions must be accepted")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def create_specialist(self, request: Dict[str, Any]) -> Specialists:
        """Create specialist record with comprehensive data"""
        # Convert specialist_type to enum if it's a string
        specialist_type = request.get('specialist_type', None)
        if isinstance(specialist_type, str):
            # Try direct matching first (handles lowercase values like "psychiatrist")
            try:
                specialist_type = SpecialistTypeEnum(specialist_type)
            except (ValueError, AttributeError):
                # Fallback: try uppercase enum names (handles "PSYCHIATRIST")
                try:
                    specialist_type = SpecialistTypeEnum[specialist_type.upper()]
                except (KeyError, AttributeError):
                    specialist_type = None
        
        specialist = Specialists(
            id=uuid.uuid4(),
            first_name=request['first_name'],
            last_name=request['last_name'],
            email=request['email'].lower(),
            specialist_type=specialist_type,
            years_experience=request.get('years_experience', None),
            phone=request.get('phone', None),
            approval_status=ApprovalStatusEnum.PENDING,
            accepts_terms_and_conditions=request['accepts_terms_and_conditions'],
            profile_completion_percentage=0,
            mandatory_fields_completed=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        self.db.add(specialist)
        self.db.flush()
        return specialist
    
    async def create_auth_info(self, specialist_id: Any, password: str) -> SpecialistsAuthInfo:
        """Create authentication info with OTP"""
        # Use raw SQL to insert only columns that exist in the database
        # This avoids SQLAlchemy trying to insert columns defined in model but not in DB
        from sqlalchemy import text
        
        otp = generate_otp()
        otp_expiry = get_otp_expiry()
        now = datetime.now(timezone.utc)
        auth_id = uuid.uuid4()
        
        # Hash password using bcrypt
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        # Raw SQL insert with only existing columns (excluding otp_last_request_at which doesn't exist in DB)
        sql = text("""
            INSERT INTO specialists_auth_info 
            (id, specialist_id, hashed_password, otp_code, otp_expires_at, otp_attempts, 
             email_verification_status, user_type, two_factor_enabled, failed_login_attempts,
             created_at, updated_at, is_deleted)
            VALUES (:id, :specialist_id, :hashed_password, :otp_code, :otp_expires_at, :otp_attempts,
                    :email_verification_status, :user_type, :two_factor_enabled, :failed_login_attempts,
                    :created_at, :updated_at, :is_deleted)
            RETURNING id
        """)
        
        result = self.db.execute(sql, {
            'id': str(auth_id),
            'specialist_id': str(specialist_id),
            'hashed_password': hashed_password,
            'otp_code': otp,
            'otp_expires_at': otp_expiry,
            'otp_attempts': 0,
            'email_verification_status': EmailVerificationStatusEnum.PENDING.value.upper(),
            'user_type': USERTYPE.SPECIALIST.value.upper(),
            'two_factor_enabled': False,
            'failed_login_attempts': 0,
            'created_at': now,
            'updated_at': now,
            'is_deleted': False
        })
        self.db.flush()
        
        # Fetch the created record using raw SQL to avoid selecting non-existent columns
        # We can't use ORM query because it tries to select otp_last_request_at which doesn't exist
        fetch_sql = text("""
            SELECT id, specialist_id, hashed_password, password_reset_token, password_reset_expires,
                   last_login_at, last_login_ip, failed_login_attempts, locked_until,
                   email_verification_status, email_verification_token, email_verification_expires,
                   email_verified_at, otp_code, otp_expires_at, otp_attempts, last_activity_at,
                   user_type, two_factor_enabled, two_factor_secret, two_factor_expires,
                   created_at, updated_at, created_by, updated_by, is_deleted
            FROM specialists_auth_info
            WHERE specialist_id = :specialist_id
            LIMIT 1
        """)
        
        row = self.db.execute(fetch_sql, {'specialist_id': str(specialist_id)}).first()
        
        if not row:
            raise Exception(f"Failed to fetch created auth_info for specialist {specialist_id}")
        
        # Create model instance from row data (manually mapping to avoid otp_last_request_at)
        auth_info = SpecialistsAuthInfo()
        auth_info.id = row.id
        auth_info.specialist_id = row.specialist_id
        auth_info.hashed_password = row.hashed_password
        auth_info.password_reset_token = row.password_reset_token
        auth_info.password_reset_expires = row.password_reset_expires
        auth_info.last_login_at = row.last_login_at
        auth_info.last_login_ip = row.last_login_ip
        auth_info.failed_login_attempts = row.failed_login_attempts
        auth_info.locked_until = row.locked_until
        auth_info.email_verification_status = EmailVerificationStatusEnum(row.email_verification_status.lower())
        auth_info.email_verification_token = row.email_verification_token
        auth_info.email_verification_expires = row.email_verification_expires
        auth_info.email_verified_at = row.email_verified_at
        auth_info.otp_code = row.otp_code
        auth_info.otp_expires_at = row.otp_expires_at
        auth_info.otp_attempts = row.otp_attempts
        auth_info.last_activity_at = row.last_activity_at
        auth_info.user_type = USERTYPE(row.user_type.lower())
        auth_info.two_factor_enabled = row.two_factor_enabled
        auth_info.two_factor_secret = row.two_factor_secret
        auth_info.two_factor_expires = row.two_factor_expires
        auth_info.created_at = row.created_at
        auth_info.updated_at = row.updated_at
        auth_info.created_by = row.created_by
        auth_info.updated_by = row.updated_by
        auth_info.is_deleted = row.is_deleted
        
        return auth_info
    
    async def create_approval_data(self, specialist_id: Any) -> SpecialistsApprovalData:
        """Create approval data record"""
        # Use raw SQL to insert only columns that exist in the database
        # This avoids SQLAlchemy trying to insert columns defined in model but not in DB
        from sqlalchemy import text
        
        now = datetime.now(timezone.utc)
        approval_id = uuid.uuid4()
        
        # Raw SQL insert with only existing columns
        # id, submission_date, and is_deleted are NOT NULL, so we must include them
        sql = text("""
            INSERT INTO specialists_approval_data 
            (id, specialist_id, background_check_status, submission_date, created_at, updated_at, is_deleted)
            VALUES (:id, :specialist_id, :background_check_status, :submission_date, :created_at, :updated_at, :is_deleted)
            RETURNING id
        """)
        
        result = self.db.execute(sql, {
            'id': str(approval_id),
            'specialist_id': str(specialist_id),
            'background_check_status': 'pending',
            'submission_date': now,
            'created_at': now,
            'updated_at': now,
            'is_deleted': False
        })
        self.db.flush()
        
        # Fetch the created record using raw SQL to avoid selecting non-existent columns
        # We can't use ORM query because it tries to select columns that don't exist in DB
        # Excluding: languages_spoken, registration_documents, document_verification_status,
        # compliance_check_status, approval_timeline (these don't exist in the actual database)
        fetch_sql = text("""
            SELECT id, specialist_id, license_number, license_issuing_authority, license_issue_date,
                   license_expiry_date, highest_degree, university_name, graduation_year,
                   professional_memberships, certifications, cnic, passport_number, submission_date,
                   reviewed_by, reviewed_at, approval_notes, rejection_reason, background_check_status,
                   background_check_date, background_check_notes, created_at, updated_at, created_by,
                   updated_by, is_deleted
            FROM specialists_approval_data
            WHERE specialist_id = :specialist_id
            LIMIT 1
        """)
        
        row = self.db.execute(fetch_sql, {'specialist_id': str(specialist_id)}).first()
        
        if not row:
            raise Exception(f"Failed to fetch created approval_data for specialist {specialist_id}")
        
        # Create model instance from row data (manually mapping to avoid non-existent columns)
        approval_data = SpecialistsApprovalData()
        approval_data.id = row.id
        approval_data.specialist_id = row.specialist_id
        approval_data.license_number = row.license_number
        approval_data.license_issuing_authority = row.license_issuing_authority
        approval_data.license_issue_date = row.license_issue_date
        approval_data.license_expiry_date = row.license_expiry_date
        approval_data.highest_degree = row.highest_degree
        approval_data.university_name = row.university_name
        approval_data.graduation_year = row.graduation_year
        approval_data.professional_memberships = row.professional_memberships
        approval_data.certifications = row.certifications
        approval_data.cnic = row.cnic
        approval_data.passport_number = row.passport_number
        approval_data.submission_date = row.submission_date
        approval_data.reviewed_by = row.reviewed_by
        approval_data.reviewed_at = row.reviewed_at
        approval_data.approval_notes = row.approval_notes
        approval_data.rejection_reason = row.rejection_reason
        approval_data.background_check_status = row.background_check_status
        approval_data.background_check_date = row.background_check_date
        approval_data.background_check_notes = row.background_check_notes
        approval_data.created_at = row.created_at
        approval_data.updated_at = row.updated_at
        approval_data.created_by = row.created_by
        approval_data.updated_by = row.updated_by
        approval_data.is_deleted = row.is_deleted
        # Note: The following columns don't exist in DB and are not set:
        # - languages_spoken
        # - registration_documents
        # - document_verification_status
        # - compliance_check_status
        # - approval_timeline
        
        return approval_data
    
    async def create_registration_progress(self, specialist_id: Any) -> SpecialistRegistrationProgress:
        """Create registration progress tracking"""
        progress = SpecialistRegistrationProgress(
            specialist_id=specialist_id,
            step_name="registration",
            step_data={"completed": True, "timestamp": datetime.now(timezone.utc).isoformat()},
            completed_at=datetime.now(timezone.utc)
        )
        
        self.db.add(progress)
        return progress
    
    async def update_registration_progress(self, specialist_id: Any, step_name: str, step_data: Optional[Dict] = None) -> SpecialistRegistrationProgress:
        """Update registration progress for a specific step"""
        # Check if progress record already exists
        existing_progress = self.db.query(SpecialistRegistrationProgress).filter(
            SpecialistRegistrationProgress.specialist_id == specialist_id,
            SpecialistRegistrationProgress.step_name == step_name
        ).first()
        
        if existing_progress:
            # Update existing record
            existing_progress.completed_at = datetime.now(timezone.utc)
            existing_progress.step_data = step_data or {"completed": True, "timestamp": datetime.now(timezone.utc).isoformat()}
            existing_progress.updated_at = datetime.now(timezone.utc)
            return existing_progress
        else:
            # Create new record
            progress = SpecialistRegistrationProgress(
                specialist_id=specialist_id,
                step_name=step_name,
                step_data=step_data or {"completed": True, "timestamp": datetime.now(timezone.utc).isoformat()},
                completed_at=datetime.now(timezone.utc)
            )
            self.db.add(progress)
            return progress
    
    async def get_registration_progress(self, specialist_id: str) -> Dict[str, Any]:
        """Get registration progress for specialist"""
        progress_records = self.db.query(SpecialistRegistrationProgress).filter(
            SpecialistRegistrationProgress.specialist_id == specialist_id
        ).all()
        
        completed_steps = [record.step_name for record in progress_records if record.completed_at]
        total_steps = ["registration", "email_verification", "profile_completion", "document_upload", "admin_approval"]
        
        progress_percentage = (len(completed_steps) / len(total_steps)) * 100
        
        # Get current step
        current_step = None
        if len(completed_steps) < len(total_steps):
            current_step = total_steps[len(completed_steps)]
        
        return {
            "specialist_id": specialist_id,
            "completed_steps": completed_steps,
            "total_steps": total_steps,
            "progress_percentage": progress_percentage,
            "current_step": current_step,
            "is_complete": len(completed_steps) == len(total_steps)
        }
    
    async def get_specialist_by_id(self, specialist_id: str) -> Optional[Specialists]:
        """Get specialist by ID"""
        return self.db.query(Specialists).filter(Specialists.id == specialist_id).first()
    
    async def get_specialist_by_email(self, email: str) -> Optional[Specialists]:
        """Get specialist by email"""
        return self.db.query(Specialists).filter(Specialists.email == email.lower()).first()
    
    async def update_specialist_status(self, specialist_id: str, status_updates: Dict[str, Any]) -> Specialists:
        """Update specialist status and related fields"""
        specialist = await self.get_specialist_by_id(specialist_id)
        if not specialist:
            raise ValueError(f"Specialist not found: {specialist_id}")
        
        # Update fields
        for field, value in status_updates.items():
            if hasattr(specialist, field):
                setattr(specialist, field, value)
        
        specialist.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(specialist)
        return specialist
    
    async def get_specialist_registration_summary(self, specialist_id: str) -> Dict[str, Any]:
        """Get comprehensive registration summary for specialist"""
        specialist = await self.get_specialist_by_id(specialist_id)
        if not specialist:
            raise ValueError(f"Specialist not found: {specialist_id}")
        
        progress = await self.get_registration_progress(specialist_id)
        
        # Get approval data
        approval_data = self.db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist_id
        ).first()
        
        return {
            "specialist": {
                "id": str(specialist.id),
                "email": specialist.email,
                "first_name": specialist.first_name,
                "last_name": specialist.last_name,
                "approval_status": specialist.approval_status.value if specialist.approval_status else None,
                "profile_completion_percentage": specialist.profile_completion_percentage,
                "mandatory_fields_completed": specialist.mandatory_fields_completed,
                "created_at": specialist.created_at.isoformat() if specialist.created_at else None
            },
            "progress": progress,
            "approval_data": {
                "approval_timeline": approval_data.approval_timeline if approval_data else None,
                "document_verification_status": approval_data.document_verification_status if approval_data else None,
                "background_check_status": approval_data.background_check_status if approval_data else None,
                "compliance_check_status": approval_data.compliance_check_status if approval_data else None
            } if approval_data else None
        }
