"""
Specialists Models - Normalized Database Design
=============================================
Follows best practices with proper table normalization and naming conventions
Separates concerns into multiple related tables for better maintainability
"""

from typing import List, Optional
from sqlalchemy import (
    Column, String, Date, DateTime, Boolean, Enum, JSON, Text, Integer,
    Numeric, ForeignKey, UniqueConstraint, CheckConstraint, Index,
    func, text
)
from sqlalchemy.orm import validates, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Enum as SA_Enum
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import datetime, timedelta, timezone
import enum
import uuid
import re
import bcrypt

# Import base model
from .base import Base, BaseModel as SQLBaseModel, USERTYPE

# ============================================================================
# ENUMERATIONS
# ============================================================================

class GenderEnum(str, enum.Enum):
    """Gender identity options"""
    MALE = "male"
    FEMALE = "female"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"
    OTHER = "other"


class SpecialistTypeEnum(str, enum.Enum):
    """Mental health specialist types"""
    PSYCHIATRIST = "psychiatrist"
    PSYCHOLOGIST = "psychologist" 
    COUNSELOR = "counselor"
    THERAPIST = "therapist"
    SOCIAL_WORKER = "social_worker"

class SpecializationEnum(str, enum.Enum):
    """Specialization areas"""
    ANXIETY_DISORDERS = "anxiety_disorders"
    DEPRESSION = "depression"
    TRAUMA_PTSD = "trauma_ptsd"
    COUPLES_THERAPY = "couples_therapy"
    FAMILY_THERAPY = "family_therapy"
    ADDICTION = "addiction"
    EATING_DISORDERS = "eating_disorders"
    ADHD = "adhd"
    BIPOLAR_DISORDER = "bipolar_disorder"
    OCD = "ocd"
    PERSONALITY_DISORDERS = "personality_disorders"
    GRIEF_COUNSELING = "grief_counseling"
    PERSONAL_DEVELOPMENT = "personal_development"

class AvailabilityStatusEnum(str, enum.Enum):
    """Patient acceptance status"""
    ACCEPTING_NEW_PATIENTS = "accepting_new_patients"
    WAITLIST_ONLY = "waitlist_only"
    NOT_ACCEPTING = "not_accepting_new_patients"
    TEMPORARILY_UNAVAILABLE = "temporarily_unavailable"

class ApprovalStatusEnum(str, enum.Enum):
    """Admin approval status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
    UNDER_REVIEW = "under_review"

class EmailVerificationStatusEnum(str, enum.Enum):
    """Email verification status"""
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    EXPIRED = "expired"

class DocumentTypeEnum(str, enum.Enum):
    """Document types for approval"""
    DEGREE = "degree"
    LICENSE = "license"
    CERTIFICATION = "certification"
    IDENTITY_CARD = "identity_card"
    EXPERIENCE_LETTER = "experience_letter"
    OTHER = "other"

class DocumentStatusEnum(str, enum.Enum):
    """Document verification status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_RESUBMISSION = "needs_resubmission"

class TimeSlotEnum(str, enum.Enum):
    """Available time slots for specialist consultation"""
    SLOT_09_10 = "09:00-10:00"  # 9:00 AM to 10:00 AM
    SLOT_10_11 = "10:00-11:00"  # 10:00 AM to 11:00 AM
    SLOT_11_12 = "11:00-12:00"  # 11:00 AM to 12:00 PM
    SLOT_12_13 = "12:00-13:00"  # 12:00 PM to 1:00 PM
    SLOT_13_14 = "13:00-14:00"  # 1:00 PM to 2:00 PM
    SLOT_14_15 = "14:00-15:00"  # 2:00 PM to 3:00 PM
    SLOT_15_16 = "15:00-16:00"  # 3:00 PM to 4:00 PM
    SLOT_16_17 = "16:00-17:00"  # 4:00 PM to 5:00 PM

class ConsultationModeEnum(str, enum.Enum):
    """Consultation delivery modes"""
    ONLINE = "online"
    IN_PERSON = "in_person"
    HYBRID = "hybrid"

class MentalHealthSpecialtyEnum(str, enum.Enum):
    """Mental health specialties for specialist-patient matching"""
    DEPRESSION = "depression"
    ANXIETY = "anxiety"
    OCD = "ocd"
    PTSD = "ptsd"
    ADHD = "adhd"
    BIPOLAR_DISORDER = "bipolar_disorder"
    EATING_DISORDERS = "eating_disorders"
    SUBSTANCE_ABUSE = "substance_abuse"
    RELATIONSHIP_ISSUES = "relationship_issues"
    GRIEF_LOSS = "grief_loss"
    STRESS_MANAGEMENT = "stress_management"
    PANIC_DISORDER = "panic_disorder"
    SOCIAL_ANXIETY = "social_anxiety"
    INSOMNIA = "insomnia"
    ANGER_MANAGEMENT = "anger_management"

class TherapyMethodEnum(str, enum.Enum):
    """Therapy methods and approaches"""
    CBT = "cbt"  # Cognitive Behavioral Therapy
    DBT = "dbt"  # Dialectical Behavior Therapy
    ACT = "act"  # Acceptance and Commitment Therapy
    PSYCHOANALYSIS = "psychoanalysis"
    EMDR = "emdr"  # Eye Movement Desensitization and Reprocessing
    HUMANISTIC = "humanistic"
    FAMILY_THERAPY = "family_therapy"
    GROUP_THERAPY = "group_therapy"
    MINDFULNESS = "mindfulness"
    PSYCHODYNAMIC = "psychodynamic"
    SOLUTION_FOCUSED = "solution_focused"
    NARRATIVE_THERAPY = "narrative_therapy"

# ============================================================================
# CORE SPECIALIST TABLE
# ============================================================================

class Specialists(Base, SQLBaseModel):
    """
    Core specialist information table
    Contains basic professional and personal information
    """
    __tablename__ = "specialists"

    # Personal Information
    first_name = Column(String(100), nullable=False, index=True)
    last_name = Column(String(100), nullable=False, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    phone = Column(String(20), nullable=True)  # Made nullable for new flow
    date_of_birth = Column(DateTime(timezone=True), nullable=True)
    gender = Column(Enum(GenderEnum), nullable=True)  # Made nullable for new flow

    
    # Professional Information
    specialist_type = Column(SA_Enum(SpecialistTypeEnum), nullable=True, index=True)  # Made nullable for new flow
    years_experience = Column(Integer, default=0, nullable=True)  # Made nullable for new flow
    
    # Consent to policy
    accepts_terms_and_conditions = Column(Boolean, default=False)
    
    # Contact & Location
    city = Column(String(100), nullable=True, index=True)  # Made nullable for new flow
    address = Column(Text, nullable=True)
    clinic_name = Column(String(200), nullable=True)
    
    # Practice Information
    consultation_fee = Column(Numeric(10, 2), nullable=True)
    bio = Column(Text, nullable=True)
    languages_spoken = Column(JSON, nullable=True, comment="Array of language codes")
    
    # Status & Ratings
    availability_status = Column(
        SA_Enum(AvailabilityStatusEnum), 
        default=AvailabilityStatusEnum.ACCEPTING_NEW_PATIENTS,
        nullable=False,
        index=True
    )
    approval_status = Column(
        SA_Enum(ApprovalStatusEnum), 
        default=ApprovalStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    average_rating = Column(Numeric(3, 2), default=0.0, nullable=False)
    total_reviews = Column(Integer, default=0, nullable=False)
    total_appointments = Column(Integer, default=0, nullable=False)
    
    # Metadata
    profile_image_url = Column(String(500), nullable=True)
    website_url = Column(String(500), nullable=True)
    social_media_links = Column(JSON, nullable=True)
    
    # Relationships
    auth_info = relationship("SpecialistsAuthInfo", back_populates="specialist", uselist=False, cascade="all, delete-orphan")
    approval_data = relationship("SpecialistsApprovalData", back_populates="specialist", cascade="all, delete-orphan")
    specializations = relationship("SpecialistSpecializations", back_populates="specialist", cascade="all, delete-orphan")
    availability_slots = relationship("SpecialistAvailability", back_populates="specialist", cascade="all, delete-orphan")
    time_slots = relationship("SpecialistTimeSlots", back_populates="specialist", cascade="all, delete-orphan")
    
    # External relationships (to be defined in other models)
    appointments = relationship(
        "Appointment",
        back_populates="specialist",
        lazy="dynamic",
        cascade="all, delete-orphan",
        primaryjoin="Specialists.id == Appointment.specialist_id"
    )
    forum_answers = relationship("ForumAnswer", back_populates="specialist", lazy="dynamic", cascade="all, delete-orphan")
    # forum_questions relationship removed - specialist_id column doesn't exist in forum_questions table
    # forum_questions = relationship("ForumQuestion", back_populates="specialist", lazy="dynamic", cascade="all, delete-orphan")
    
    # Enhanced appointment system relationships
    availability_templates = relationship("SpecialistAvailabilityTemplate", back_populates="specialist", cascade="all, delete-orphan")
    generated_slots = relationship("GeneratedTimeSlot", back_populates="specialist", cascade="all, delete-orphan")
    favorited_by = relationship("SpecialistFavorite", back_populates="specialist", lazy="dynamic", cascade="all, delete-orphan")
    reviews = relationship("SpecialistReview", back_populates="specialist", lazy="dynamic", cascade="all, delete-orphan")

    # Table Constraints
    __table_args__ = (
        # Only apply experience constraint if years_experience is not None
        CheckConstraint('(years_experience IS NULL) OR (years_experience >= 0 AND years_experience <= 60)', name='chk_specialists_experience_range'),
        CheckConstraint('average_rating >= 0.0 AND average_rating <= 5.0', name='chk_specialists_rating_range'),
        CheckConstraint('(consultation_fee IS NULL) OR (consultation_fee >= 0)', name='chk_specialists_fee_positive'),
        CheckConstraint('total_reviews >= 0', name='chk_specialists_reviews_positive'),
        CheckConstraint('total_appointments >= 0', name='chk_specialists_appointments_positive'),
        Index('idx_specialists_name', 'first_name', 'last_name'),
        Index('idx_specialists_status', 'approval_status', 'availability_status'),
        Index('idx_specialists_rating', 'average_rating', 'total_reviews'),
        {'extend_existing': True}
    )
    
    # ============================================================================
    # PROPERTIES
    # ============================================================================
    
    @hybrid_property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @hybrid_property  
    def is_approved(self) -> bool:
        return self.approval_status == ApprovalStatusEnum.APPROVED

    @hybrid_property
    def is_accepting_patients(self) -> bool:
        return self.availability_status == AvailabilityStatusEnum.ACCEPTING_NEW_PATIENTS

    @hybrid_property
    def can_practice(self) -> bool:
        return (
            self.is_approved and 
            self.auth_info and 
            self.auth_info.is_email_verified and
            not self.is_deleted
        )
    
    # ============================================================================
    # VALIDATION METHODS - MODIFIED FOR NEW REGISTRATION FLOW
    # ============================================================================
    
    @validates('phone')
    def validate_phone(self, key, phone):
        # Phone is now optional during registration, only validate format if provided
        if phone and not re.match(r'^\+?92[0-9]{10}$', phone):
            raise ValueError("Phone must be in Pakistani format: +92XXXXXXXXXX")
        return phone

    @validates('years_experience')
    def validate_experience(self, key, experience):
        if experience is not None and (experience < 0 or experience > 60):
            raise ValueError("Years of experience must be between 0 and 60")
        return experience or 0

    @validates('consultation_fee')
    def validate_fee(self, key, fee):
        if fee is not None and fee < 0:
            raise ValueError("Consultation fee cannot be negative")
        return fee
    
    # ============================================================================
    # BUSINESS METHODS
    # ============================================================================
    
    def update_rating(self, new_rating: float) -> None:
        """Update average rating with new review"""
        if not (1.0 <= new_rating <= 5.0):
            raise ValueError("Rating must be between 1.0 and 5.0")
        
        if self.total_reviews == 0:
            self.average_rating = new_rating
            self.total_reviews = 1
        else:
            total_rating = float(self.average_rating) * self.total_reviews
            self.total_reviews += 1
            self.average_rating = (total_rating + new_rating) / self.total_reviews

    def increment_appointment_count(self) -> None:
        """Increment total appointment count"""
        self.total_appointments += 1

    def __repr__(self) -> str:
        specialist_type_str = self.specialist_type.value if self.specialist_type else "Not Specified"
        city_str = self.city if self.city else "Not Specified"
        return f"<Specialist({self.full_name}, {specialist_type_str}, {city_str})>"
    
    # ============================================================================
    # COMPATIBILITY PROPERTIES - These columns don't exist in DB but are accessed by code
    # ============================================================================
    # These properties return None to prevent AttributeError when code accesses them
    # They are not database columns, so SQLAlchemy won't try to query them
    
    @property
    def qualification(self) -> Optional[str]:
        return None
    
    @property
    def institution(self) -> Optional[str]:
        return None
    
    @property
    def current_affiliation(self) -> Optional[str]:
        return None
    
    @property
    def clinic_address(self) -> Optional[str]:
        return None
    
    @property
    def consultation_modes(self) -> Optional[List]:
        return None
    
    @property
    def availability_schedule(self) -> Optional[dict]:
        return None
    
    @property
    def currency(self) -> Optional[str]:
        return None
    
    @property
    def experience_summary(self) -> Optional[str]:
        return None
    
    @property
    def specialties_in_mental_health(self) -> Optional[List]:
        return None
    
    @property
    def therapy_methods(self) -> Optional[List]:
        return None
    
    @property
    def accepting_new_patients(self) -> bool:
        return True
    
    @property
    def profile_verified(self) -> bool:
        return False
    
    @property
    def verification_notes(self) -> Optional[str]:
        return None
    
    @property
    def rating(self) -> float:
        return float(self.average_rating) if self.average_rating else 0.0
    
    @property
    def reviews_count(self) -> int:
        return self.total_reviews
    
    @property
    def featured(self) -> bool:
        return False
    
    @property
    def profile_completion_percentage(self) -> int:
        return 0
    
    @property
    def profile_completed_at(self) -> Optional[datetime]:
        return None
    
    @property
    def mandatory_fields_completed(self) -> bool:
        return False
    
    @property
    def approved_by(self) -> Optional[uuid.UUID]:
        return None
    
    @property
    def last_login(self) -> Optional[datetime]:
        return None
    
    @property
    def notes(self) -> Optional[str]:
        return None
    
    @property
    def weekly_schedule(self) -> Optional[dict]:
        return None
    
    @property
    def default_slot_duration_minutes(self) -> int:
        return 30
    
    @property
    def slot_generation_days_ahead(self) -> int:
        return 30
    
    @property
    def schedule_updated_at(self) -> Optional[datetime]:
        return None
    
    @property
    def interests(self) -> Optional[List]:
        return None
    
    @property
    def professional_statement_intro(self) -> Optional[str]:
        return None
    
    @property
    def professional_statement_role(self) -> Optional[str]:
        return None
    
    @property
    def professional_statement_qualifications(self) -> Optional[str]:
        return None
    
    @property
    def professional_statement_experience(self) -> Optional[str]:
        return None
    
    @property
    def professional_statement_patient_satisfaction(self) -> Optional[str]:
        return None
    
    @property
    def professional_statement_appointment_details(self) -> Optional[str]:
        return None
    
    @property
    def professional_statement_clinic_address(self) -> Optional[str]:
        return None
    
    @property
    def professional_statement_fee_details(self) -> Optional[str]:
        return None
    
    @property
    def education_records(self) -> Optional[List]:
        return None
    
    @property
    def certification_records(self) -> Optional[List]:
        return None
    
    @property
    def experience_records(self) -> Optional[List]:
        return None
    
    # Setters to allow code to set these (they just won't persist to DB)
    @qualification.setter
    def qualification(self, value):
        pass
    
    @institution.setter
    def institution(self, value):
        pass
    
    @current_affiliation.setter
    def current_affiliation(self, value):
        pass
    
    @clinic_address.setter
    def clinic_address(self, value):
        pass
    
    @consultation_modes.setter
    def consultation_modes(self, value):
        pass
    
    @availability_schedule.setter
    def availability_schedule(self, value):
        pass
    
    @currency.setter
    def currency(self, value):
        pass
    
    @experience_summary.setter
    def experience_summary(self, value):
        pass
    
    @specialties_in_mental_health.setter
    def specialties_in_mental_health(self, value):
        pass
    
    @therapy_methods.setter
    def therapy_methods(self, value):
        pass
    
    @accepting_new_patients.setter
    def accepting_new_patients(self, value):
        pass
    
    @profile_verified.setter
    def profile_verified(self, value):
        pass
    
    @verification_notes.setter
    def verification_notes(self, value):
        pass
    
    @rating.setter
    def rating(self, value):
        pass
    
    @reviews_count.setter
    def reviews_count(self, value):
        pass
    
    @featured.setter
    def featured(self, value):
        pass
    
    @profile_completion_percentage.setter
    def profile_completion_percentage(self, value):
        pass
    
    @profile_completed_at.setter
    def profile_completed_at(self, value):
        pass
    
    @mandatory_fields_completed.setter
    def mandatory_fields_completed(self, value):
        pass
    
    @approved_by.setter
    def approved_by(self, value):
        pass
    
    @last_login.setter
    def last_login(self, value):
        pass
    
    @notes.setter
    def notes(self, value):
        pass
    
    @weekly_schedule.setter
    def weekly_schedule(self, value):
        pass
    
    @default_slot_duration_minutes.setter
    def default_slot_duration_minutes(self, value):
        pass
    
    @slot_generation_days_ahead.setter
    def slot_generation_days_ahead(self, value):
        pass
    
    @schedule_updated_at.setter
    def schedule_updated_at(self, value):
        pass
    
    @interests.setter
    def interests(self, value):
        pass
    
    @professional_statement_intro.setter
    def professional_statement_intro(self, value):
        pass
    
    @professional_statement_role.setter
    def professional_statement_role(self, value):
        pass
    
    @professional_statement_qualifications.setter
    def professional_statement_qualifications(self, value):
        pass
    
    @professional_statement_experience.setter
    def professional_statement_experience(self, value):
        pass
    
    @professional_statement_patient_satisfaction.setter
    def professional_statement_patient_satisfaction(self, value):
        pass
    
    @professional_statement_appointment_details.setter
    def professional_statement_appointment_details(self, value):
        pass
    
    @professional_statement_clinic_address.setter
    def professional_statement_clinic_address(self, value):
        pass
    
    @professional_statement_fee_details.setter
    def professional_statement_fee_details(self, value):
        pass
    
    @education_records.setter
    def education_records(self, value):
        pass
    
    @certification_records.setter
    def certification_records(self, value):
        pass
    
    @experience_records.setter
    def experience_records(self, value):
        pass

# ============================================================================
# AUTHENTICATION INFORMATION TABLE
# ============================================================================

class SpecialistsAuthInfo(Base, SQLBaseModel):
    """
    Authentication and security information for specialists
    Separated for security and performance reasons
    """
    __tablename__ = "specialists_auth_info"

    # Foreign Key
    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Authentication
    hashed_password = Column(String(128), nullable=True)  # Nullable for OAuth
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Login Tracking
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(String(45), nullable=True)  # IPv6 compatible
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    # Email Verification
    email_verification_status = Column(
        SA_Enum(EmailVerificationStatusEnum),
        default=EmailVerificationStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    email_verification_token = Column(String(255), nullable=True)
    email_verification_expires = Column(DateTime(timezone=True), nullable=True)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # OTP for 2FA/Verification
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    otp_attempts = Column(Integer, default=0, nullable=False)
    # otp_last_request_at removed as it does not exist in DB
    
    # Session Management
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    user_type = Column(SA_Enum(USERTYPE), default=USERTYPE.SPECIALIST, nullable=False)
    
    # Security Settings
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String(32), nullable=True)
    two_factor_expires = Column(DateTime(timezone=True), nullable=True) #after expiry time re-ask the secret for authentication
    
    
    # Relationship
    specialist = relationship("Specialists", back_populates="auth_info")

    # Table Constraints
    __table_args__ = (
        CheckConstraint('failed_login_attempts >= 0', name='chk_auth_failed_attempts_positive'),
        CheckConstraint('otp_attempts >= 0', name='chk_auth_otp_attempts_positive'),
        Index('idx_specialist_auth_last_login', 'last_login_at'), 
        Index('idx_auth_verification_status', 'email_verification_status'),
        {'extend_existing': True}
    )
    
    # ============================================================================
    # PROPERTIES 
    # ============================================================================
    
    @hybrid_property
    def is_email_verified(self) -> bool:
        return self.email_verification_status == EmailVerificationStatusEnum.VERIFIED
    
    @hybrid_property
    def is_locked(self) -> bool:
        if self.locked_until is None:
            return False
        return datetime.now(timezone.utc) < self.locked_until
    
    @hybrid_property
    def needs_password_reset(self) -> bool:
        if self.password_reset_expires is None:
            return False
        return datetime.now(timezone.utc) < self.password_reset_expires
    
    # ============================================================================
    # AUTHENTICATION METHODS
    # ============================================================================
    
    def set_password(self, password: str) -> None:
        """Hash and set password"""
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        salt = bcrypt.gensalt()
        self.hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        # Clear any password reset tokens
        self.password_reset_token = None
        self.password_reset_expires = None

    def check_password(self, password: str) -> bool:
        """Verify password"""
        if not self.hashed_password:
            return False
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            self.hashed_password.encode('utf-8')
        )

    def increment_failed_login(self) -> None:
        """Track failed login attempts"""
        self.failed_login_attempts += 1
        
        # Lock account after 5 failed attempts for 30 minutes
        if self.failed_login_attempts >= 5:
            self.locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)

    def reset_failed_login(self) -> None:
        """Reset failed login counter on successful login"""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login_at = datetime.now(timezone.utc)

    def generate_otp(self) -> str:
        """Generate OTP for verification"""
        import random
        otp = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        self.otp_code = otp
        self.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        self.otp_attempts = 0
        return otp

    def verify_otp(self, otp: str) -> bool:
        """Verify OTP code"""
        if not self.otp_code or not self.otp_expires_at:
            return False
        
        if datetime.now(timezone.utc) > self.otp_expires_at:
            return False
        
        if self.otp_attempts >= 3:
            return False
        
        if self.otp_code != otp:
            self.otp_attempts += 1
            return False
        
        # Clear OTP on successful verification
        self.otp_code = None
        self.otp_expires_at = None
        self.otp_attempts = 0
        return True

    def mark_email_verified(self) -> None:
        """Mark email as verified"""
        self.email_verification_status = EmailVerificationStatusEnum.VERIFIED
        self.email_verified_at = datetime.now(timezone.utc)
        self.email_verification_token = None
        self.email_verification_expires = None

# ============================================================================
# APPROVAL DATA TABLE
# ============================================================================

class SpecialistsApprovalData(Base, SQLBaseModel):
    """
    Approval process data including documents, certifications, etc.
    Contains all information needed for admin approval
    """
    __tablename__ = "specialists_approval_data"

    # Foreign Key
    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Professional Credentials
    license_number = Column(String(100), nullable=True, index=True)
    license_issuing_authority = Column(String(200), nullable=True)
    license_issue_date = Column(DateTime(timezone=True), nullable=True)
    license_expiry_date = Column(DateTime(timezone=True), nullable=True)
    
    # Educational Background
    highest_degree = Column(String(100), nullable=True)
    university_name = Column(String(200), nullable=True)
    graduation_year = Column(Integer, nullable=True)
    
    # Professional Memberships
    professional_memberships = Column(JSON, nullable=True, comment="Array of professional body memberships")
    certifications = Column(JSON, nullable=True, comment="Array of additional certifications: CBT, DBT, EMDR, etc.")
    # Note: languages_spoken is stored in the Specialists table, not here
    
    # Document URLs (NEW)
    # Note: registration_documents column removed from model as it doesn't exist in database
    # registration_documents = Column(JSON, nullable=True, comment="Document URLs: {license: url, cnic: url}")
    
    # Identity Information
    cnic = Column(String(15), nullable=True, unique=True)  # Pakistani CNIC
    passport_number = Column(String(20), nullable=True)
    
    # Approval Process
    submission_date = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)  # Admin user ID
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    approval_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Background Check
    background_check_status = Column(String(20), default='pending', nullable=False)
    background_check_date = Column(DateTime(timezone=True), nullable=True)
    background_check_notes = Column(Text, nullable=True)
    
    # Additional Status Fields
    document_verification_status = Column(String(20), default='pending', nullable=True, comment="Status of document verification")
    compliance_check_status = Column(String(20), default='pending', nullable=True, comment="Status of compliance check")
    
    # Timeline Tracking
    approval_timeline = Column(JSON, nullable=True, comment="Timeline of approval process: {profile_completion: timestamp, ...}")
    
    # Relationship
    specialist = relationship("Specialists", back_populates="approval_data")
    documents = relationship("SpecialistDocuments", back_populates="approval_data", cascade="all, delete-orphan")

    # Table Constraints
    __table_args__ = (
        CheckConstraint('graduation_year >= 1950 AND graduation_year <= EXTRACT(YEAR FROM NOW())', name='chk_approval_graduation_year_valid'),
        Index('idx_approval_license', 'license_number'),
        Index('idx_approval_cnic', 'cnic'),
        Index('idx_approval_submission', 'submission_date'),
        Index('idx_approval_review_status', 'reviewed_at'),
        {'extend_existing': True}
    )
    
    # ============================================================================
    # PROPERTIES
    # ============================================================================
    
    @hybrid_property
    def is_license_valid(self) -> bool:
        if not self.license_expiry_date:
            return True  # No expiry date means permanent
        return datetime.now(timezone.utc) < self.license_expiry_date
    
    @hybrid_property
    def is_reviewed(self) -> bool:
        return self.reviewed_at is not None
    
    @hybrid_property
    def days_since_submission(self) -> int:
        return (datetime.now(timezone.utc) - self.submission_date).days
    
    # ============================================================================
    # VALIDATION METHODS
    # ============================================================================
    
    @validates('cnic')
    def validate_cnic(self, key, cnic):
        if cnic and not re.match(r'^\d{5}-\d{7}-\d{1}$', cnic):
            raise ValueError("CNIC must be in format: XXXXX-XXXXXXX-X")
        return cnic
    
    @validates('license_number')
    def validate_license(self, key, license_number):
        if license_number and len(license_number.strip()) < 3:
            raise ValueError("License number must be at least 3 characters")
        return license_number.strip() if license_number else None

    def __repr__(self) -> str:
        return f"<ApprovalData(specialist_id={self.specialist_id}, license={self.license_number})>"

# ============================================================================
# SPECIALIST DOCUMENTS TABLE
# ============================================================================

class SpecialistDocuments(Base, SQLBaseModel):
    """
    Document storage for approval process
    Stores references to uploaded documents
    """
    __tablename__ = "specialist_documents"

    # Foreign Key
    approval_data_id = Column(UUID(as_uuid=True), ForeignKey('specialists_approval_data.id', ondelete='CASCADE'), nullable=False)
    
    # Document Information
    document_type = Column(SA_Enum(DocumentTypeEnum), nullable=False, index=True)
    document_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # Document Status
    verification_status = Column(
        SA_Enum(DocumentStatusEnum),
        default=DocumentStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    verified_by = Column(UUID(as_uuid=True), nullable=True)  # Admin user ID
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    # Metadata
    upload_date = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    expiry_date = Column(DateTime(timezone=True), nullable=True)  # For documents that expire
    
    # Relationship
    approval_data = relationship("SpecialistsApprovalData", back_populates="documents")

    # Table Constraints
    __table_args__ = (
        CheckConstraint('file_size > 0', name='chk_documents_file_size_positive'),
        Index('idx_documents_type_status', 'document_type', 'verification_status'),
        Index('idx_documents_upload_date', 'upload_date'),
        {'extend_existing': True}
    )
    
    # ============================================================================
    # PROPERTIES
    # ============================================================================
    
    @hybrid_property
    def is_verified(self) -> bool:
        return self.verification_status == DocumentStatusEnum.APPROVED
    
    @hybrid_property
    def is_expired(self) -> bool:
        if not self.expiry_date:
            return False
        return datetime.now(timezone.utc) > self.expiry_date
    
    @hybrid_property
    def file_size_mb(self) -> float:
        return round(self.file_size / (1024 * 1024), 2)

    def __repr__(self) -> str:
        return f"<Document({self.document_type.value}, {self.document_name})>"

# ============================================================================
# SPECIALIST SPECIALIZATIONS TABLE (Many-to-Many)
# ============================================================================

class SpecialistSpecializations(Base, SQLBaseModel):
    """
    Junction table for specialist specializations
    Allows multiple specializations per specialist
    """
    __tablename__ = "specialist_specializations"

    # Foreign Key
    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id', ondelete='CASCADE'), nullable=False)
    
    # Specialization
    specialization = Column(SA_Enum(SpecializationEnum), nullable=False)
    
    # Additional Information
    years_of_experience_in_specialization = Column(Integer, default=0, nullable=False)
    certification_date = Column(DateTime(timezone=True), nullable=True)
    is_primary_specialization = Column(Boolean, default=False, nullable=False)
    
    # Relationship
    specialist = relationship("Specialists", back_populates="specializations")

    # Table Constraints
    __table_args__ = (
        UniqueConstraint('specialist_id', 'specialization', name='uq_specialist_specializations'),
        CheckConstraint('years_of_experience_in_specialization >= 0', name='chk_specialization_experience_positive'),
        Index('idx_specializations_specialist', 'specialist_id'),
        Index('idx_specializations_type', 'specialization'),
        Index('idx_specializations_primary', 'is_primary_specialization'),
        {'extend_existing': True}
    )
    
    # ============================================================================
    # VALIDATION METHODS
    # ============================================================================
    
    @validates('years_of_experience_in_specialization')
    def validate_specialization_experience(self, key, experience):
        if experience is not None and experience < 0:
            raise ValueError("Years of experience in specialization cannot be negative")
        return experience or 0

    def __repr__(self) -> str:
        return f"<Specialization({self.specialist_id}, {self.specialization.value})>"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_specialist_by_email(db_session, email: str) -> Optional[Specialists]:
    """Get specialist by email address"""
    return db_session.query(Specialists).filter(
        Specialists.email == email.lower(),
        Specialists.is_deleted == False
    ).first()

def get_approved_specialists(db_session, limit: int = None) -> List[Specialists]:
    """Get all approved and verified specialists"""
    query = db_session.query(Specialists).join(
        SpecialistsAuthInfo
    ).filter(
        Specialists.approval_status == ApprovalStatusEnum.APPROVED,
        SpecialistsAuthInfo.email_verification_status == EmailVerificationStatusEnum.VERIFIED,
        Specialists.is_deleted == False
    )
    
    if limit:
        query = query.limit(limit)
    
    return query.all()

def search_specialists_by_criteria(
    db_session,
    city: Optional[str] = None,
    specialist_type: Optional[SpecialistTypeEnum] = None,
    specialization: Optional[SpecializationEnum] = None,
    min_rating: Optional[float] = None,
    accepting_patients: bool = True
) -> List[Specialists]:
    """Search specialists by multiple criteria"""
    query = db_session.query(Specialists).join(
        SpecialistsAuthInfo
    ).filter(
        Specialists.approval_status == ApprovalStatusEnum.APPROVED,
        SpecialistsAuthInfo.email_verification_status == EmailVerificationStatusEnum.VERIFIED,
        Specialists.is_deleted == False
    )
    
    if accepting_patients:
        query = query.filter(
            Specialists.availability_status == AvailabilityStatusEnum.ACCEPTING_NEW_PATIENTS
        )
    
    if city:
        query = query.filter(Specialists.city.ilike(f"%{city}%"))
    
    if specialist_type:
        query = query.filter(Specialists.specialist_type == specialist_type)
    
    if min_rating:
        query = query.filter(Specialists.average_rating >= min_rating)
    
    if specialization:
        query = query.join(SpecialistSpecializations).filter(
            SpecialistSpecializations.specialization == specialization
        )
    
    return query.all()

# ============================================================================
# SPECIALIST AVAILABILITY TABLE
# ============================================================================

class SpecialistAvailability(Base, SQLBaseModel):
    """
    Specialist availability time slots
    Stores the daily available time slots for each specialist
    """
    __tablename__ = "specialist_availability"

    # Foreign Key
    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id', ondelete='CASCADE'), nullable=False)

    # Time Slot Information
    time_slot = Column(SA_Enum(TimeSlotEnum), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Metadata
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship
    specialist = relationship("Specialists", back_populates="availability_slots")

    # Table Constraints
    __table_args__ = (
        # Ensure specialist can't have duplicate time slots
        UniqueConstraint('specialist_id', 'time_slot', name='uq_specialist_timeslot'),
        Index('idx_availability_specialist_active', 'specialist_id', 'is_active'),
        Index('idx_availability_timeslot', 'time_slot'),
        {'extend_existing': True}
    )


class SpecialistTimeSlots(Base, SQLBaseModel):
    """
    Specialist specific time slots for appointment booking
    Stores individual date/time slots with availability status
    """
    __tablename__ = "specialist_time_slots"

    # Primary key and metadata
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Foreign Key
    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id', ondelete='CASCADE'), nullable=False, index=True)

    # Slot Information
    slot_date = Column(Date, nullable=False, index=True)  # Date of the slot
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)  # Full datetime
    end_time = Column(DateTime(timezone=True), nullable=False, index=True)  # Full datetime

    # Availability Status
    is_available = Column(Boolean, default=True, nullable=False, index=True)
    is_blocked = Column(Boolean, default=False, nullable=False)  # For manual blocking

    # Appointment Link (nullable - slots can exist without appointments)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey('appointments.id', ondelete='SET NULL'), nullable=True, unique=True)

    # Recurring Pattern (for generating slots automatically)
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurring_pattern = Column(String(50), nullable=True)  # 'daily', 'weekly', 'monthly'
    
    # Slot Generation Tracking (NEW)
    generated_from_schedule = Column(Boolean, default=False, nullable=False, comment="Whether slot was generated from weekly schedule")
    template_day = Column(String(10), nullable=True, comment="Day of week this slot was generated from (monday, tuesday, etc.)")
    is_template_slot = Column(Boolean, default=False, nullable=False, comment="Whether this is a template slot")
    generation_batch_id = Column(UUID(as_uuid=True), nullable=True, comment="Batch ID for slot generation")

    # Relationships
    specialist = relationship("Specialists", back_populates="time_slots")
    appointment = relationship("Appointment", back_populates="time_slot")

    # Table Constraints
    __table_args__ = (
        # Ensure no overlapping slots for same specialist
        CheckConstraint('end_time > start_time', name='check_slot_end_after_start'),
        CheckConstraint('start_time >= CURRENT_DATE', name='check_future_slot'),
        # Unique constraint for specialist + date + time range
        UniqueConstraint('specialist_id', 'slot_date', 'start_time', 'end_time', name='uq_specialist_slot_datetime'),
        Index('idx_slots_specialist_date', 'specialist_id', 'slot_date'),
        Index('idx_slots_datetime', 'start_time', 'end_time'),
        Index('idx_slots_available', 'specialist_id', 'is_available', 'slot_date'),
        Index('idx_slots_appointment', 'appointment_id'),
        {'extend_existing': True}
    )

    # ============================================================================
    # PROPERTIES
    # ============================================================================

    @property
    def duration_minutes(self) -> int:
        """Calculate slot duration in minutes"""
        return int((self.end_time - self.start_time).total_seconds() / 60)

    @property
    def is_booked(self) -> bool:
        """Check if slot is booked"""
        return self.appointment_id is not None

    @property
    def status(self) -> str:
        """Get slot status"""
        if self.is_blocked:
            return "blocked"
        elif self.is_booked:
            return "booked"
        elif self.is_available:
            return "available"
        else:
            return "unavailable"

    @property
    def can_be_booked(self) -> bool:
        """Check if slot can be booked"""
        return self.is_available and not self.is_blocked and not self.is_booked and self.start_time > datetime.now(self.start_time.tzinfo)

    # ============================================================================
    # BUSINESS LOGIC METHODS
    # ============================================================================

    def book(self, appointment_id: uuid.UUID):
        """Book this slot"""
        if not self.can_be_booked:
            raise ValueError("Slot cannot be booked")
        self.appointment_id = appointment_id
        self.is_available = False

    def cancel_booking(self):
        """Cancel booking for this slot"""
        self.appointment_id = None
        self.is_available = True

    def block(self):
        """Block this slot"""
        self.is_blocked = True
        self.is_available = False

    def unblock(self):
        """Unblock this slot"""
        self.is_blocked = False
        if not self.is_booked:
            self.is_available = True
    
    # ============================================================================
    # PROPERTIES
    # ============================================================================
    
    @hybrid_property
    def slot_display(self) -> str:
        """Return human-readable time slot format"""
        time_mapping = {
            TimeSlotEnum.SLOT_09_10: "9:00 AM - 10:00 AM",
            TimeSlotEnum.SLOT_10_11: "10:00 AM - 11:00 AM", 
            TimeSlotEnum.SLOT_11_12: "11:00 AM - 12:00 PM",
            TimeSlotEnum.SLOT_12_13: "12:00 PM - 1:00 PM",
            TimeSlotEnum.SLOT_13_14: "1:00 PM - 2:00 PM",
            TimeSlotEnum.SLOT_14_15: "2:00 PM - 3:00 PM",
            TimeSlotEnum.SLOT_15_16: "3:00 PM - 4:00 PM",
            TimeSlotEnum.SLOT_16_17: "4:00 PM - 5:00 PM"
        }
        return time_mapping.get(self.time_slot, str(self.time_slot))

# ============================================================================
# NEW TABLES FOR PHASE 1 ENHANCEMENTS
# ============================================================================

class SpecialistRegistrationProgress(Base, SQLBaseModel):
    """
    Tracks specialist registration progress through different steps
    """
    __tablename__ = "specialist_registration_progress"

    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id', ondelete='CASCADE'), nullable=False)
    step_name = Column(String(100), nullable=False)
    step_data = Column(JSON, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    specialist = relationship("Specialists", backref="registration_progress")
    
    # Table Constraints
    __table_args__ = (
        CheckConstraint('step_name IN (\'registration\', \'email_verification\', \'profile_completion\', \'document_upload\', \'admin_approval\')', name='chk_registration_progress_step_name'),
        UniqueConstraint('specialist_id', 'step_name', name='uq_specialist_step'),
        Index('idx_registration_progress_specialist_id', 'specialist_id'),
        Index('idx_registration_progress_step_name', 'step_name'),
        Index('idx_registration_progress_completed_at', 'completed_at'),
        {'extend_existing': True}
    )

class DocumentVerificationLog(Base, SQLBaseModel):
    """
    Tracks document verification process for specialists
    """
    __tablename__ = "document_verification_log"

    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id', ondelete='CASCADE'), nullable=False)
    document_type = Column(String(50), nullable=False)
    verification_status = Column(String(50), nullable=False)
    verification_notes = Column(Text, nullable=True)
    verified_by = Column(UUID(as_uuid=True), ForeignKey('admins.id'), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    specialist = relationship("Specialists", backref="document_verification_logs")
    admin = relationship("Admin", backref="verified_documents")
    
    # Table Constraints
    __table_args__ = (
        CheckConstraint('document_type IN (\'license\', \'degree\', \'cnic\', \'profile_photo\', \'experience_letter\')', name='chk_document_type'),
        CheckConstraint('verification_status IN (\'pending\', \'verified\', \'rejected\', \'requires_review\')', name='chk_verification_status'),
        Index('idx_document_verification_specialist_id', 'specialist_id'),
        Index('idx_document_verification_document_type', 'document_type'),
        Index('idx_document_verification_status', 'verification_status'),
        Index('idx_document_verification_verified_at', 'verified_at'),
        {'extend_existing': True}
    )

class ApprovalWorkflowLog(Base, SQLBaseModel):
    """
    Tracks approval workflow steps for specialists
    """
    __tablename__ = "approval_workflow_log"

    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id', ondelete='CASCADE'), nullable=False)
    workflow_step = Column(String(100), nullable=False)
    step_status = Column(String(50), nullable=False)
    step_data = Column(JSON, nullable=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey('admins.id'), nullable=True)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    specialist = relationship("Specialists", backref="approval_workflow_logs")
    admin = relationship("Admin", backref="workflow_actions")
    
    # Table Constraints
    __table_args__ = (
        CheckConstraint('workflow_step IN (\'registration\', \'email_verification\', \'profile_completion\', \'document_upload\', \'document_verification\', \'compliance_check\', \'background_check\', \'admin_review\', \'approval_decision\')', name='chk_workflow_step'),
        CheckConstraint('step_status IN (\'pending\', \'in_progress\', \'completed\', \'failed\', \'approved\', \'rejected\')', name='chk_step_status'),
        Index('idx_approval_workflow_specialist_id', 'specialist_id'),
        Index('idx_approval_workflow_step', 'workflow_step'),
        Index('idx_approval_workflow_status', 'step_status'),
        Index('idx_approval_workflow_completed_at', 'completed_at'),
        {'extend_existing': True}
    )

class ApplicationTimeline(Base, SQLBaseModel):
    """
    Tracks application timeline events for specialists
    """
    __tablename__ = "application_timeline"

    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id', ondelete='CASCADE'), nullable=False)
    event_type = Column(String(100), nullable=False)
    event_description = Column(Text, nullable=False)
    event_data = Column(JSON, nullable=True)
    admin_id = Column(UUID(as_uuid=True), ForeignKey('admins.id'), nullable=True)
    
    # Relationships
    specialist = relationship("Specialists", backref="application_timeline")
    admin = relationship("Admin", backref="timeline_actions")
    
    # Table Constraints
    __table_args__ = (
        CheckConstraint('event_type IN (\'registration\', \'email_verification\', \'profile_completion\', \'document_upload\', \'document_verification\', \'application_submitted\', \'admin_review_started\', \'admin_review_completed\', \'application_approved\', \'application_rejected\', \'application_suspended\', \'application_reactivated\')', name='chk_timeline_event_type'),
        Index('idx_application_timeline_specialist_id', 'specialist_id'),
        Index('idx_application_timeline_event_type', 'event_type'),
        Index('idx_application_timeline_created_at', 'created_at'),
        {'extend_existing': True}
    )

class ApplicationComments(Base, SQLBaseModel):
    """
    Stores admin comments on specialist applications
    """
    __tablename__ = "application_comments"

    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id', ondelete='CASCADE'), nullable=False)
    comment_text = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=True, nullable=False)
    admin_id = Column(UUID(as_uuid=True), ForeignKey('admins.id'), nullable=False)
    
    # Relationships
    specialist = relationship("Specialists", backref="application_comments")
    admin = relationship("Admin", backref="application_comments")
    
    # Table Constraints
    __table_args__ = (
        Index('idx_application_comments_specialist_id', 'specialist_id'),
        Index('idx_application_comments_admin_id', 'admin_id'),
        Index('idx_application_comments_created_at', 'created_at'),
        {'extend_existing': True}
    )

# ============================================================================
# EXPORTS
# ============================================================================

# Import SpecialistFavorite after Specialists is defined to avoid circular imports
try:
    from .specialist_favorites import SpecialistFavorite
except ImportError:
    # If not available, relationships will use string references
    pass

# ============================================================================
# REVIEW MODELS (Consolidated from review_models.py)
# ============================================================================

class ReviewStatusEnum(str, enum.Enum):
    """Review status states"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    HIDDEN = "hidden"


class SpecialistReview(Base, SQLBaseModel):
    """Specialist review and rating model"""
    __tablename__ = "specialist_reviews"
    
    # Primary key and metadata
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Foreign Key Relationships
    appointment_id = Column(UUID(as_uuid=True), ForeignKey('appointments.id'), nullable=False)
    specialist_id = Column(UUID(as_uuid=True), ForeignKey('specialists.id'), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id'), nullable=False)
    
    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    review_text = Column(Text, nullable=True)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    status = Column(SA_Enum(ReviewStatusEnum), default=ReviewStatusEnum.PENDING, nullable=False)
    
    # Detailed ratings
    communication_rating = Column(Integer, nullable=True)  # 1-5
    professionalism_rating = Column(Integer, nullable=True)   # 1-5
    effectiveness_rating = Column(Integer, nullable=True)    # 1-5
    
    # Specialist response
    specialist_response = Column(Text, nullable=True)
    specialist_response_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    appointment = relationship("Appointment", back_populates="review")
    specialist = relationship("Specialists", back_populates="reviews")
    patient = relationship("Patient", back_populates="reviews")
    
    # Constraints and Indexes
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
        CheckConstraint('communication_rating IS NULL OR (communication_rating >= 1 AND communication_rating <= 5)', name='check_communication_rating'),
        CheckConstraint('professionalism_rating IS NULL OR (professionalism_rating >= 1 AND professionalism_rating <= 5)', name='check_professionalism_rating'),
        CheckConstraint('effectiveness_rating IS NULL OR (effectiveness_rating >= 1 AND effectiveness_rating <= 5)', name='check_effectiveness_rating'),
        Index('idx_specialist_reviews_specialist_id', 'specialist_id'),
        Index('idx_specialist_reviews_patient_id', 'patient_id'),
        Index('idx_specialist_reviews_appointment_id', 'appointment_id'),
        Index('idx_specialist_reviews_rating', 'rating'),
        Index('idx_specialist_reviews_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<SpecialistReview(id={self.id}, specialist_id={self.specialist_id}, rating={self.rating})>"


class ReviewHelpful(Base, SQLBaseModel):
    """Track helpful votes on reviews"""
    __tablename__ = "review_helpful"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id = Column(UUID(as_uuid=True), ForeignKey('specialist_reviews.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)  # Can be patient or specialist
    user_type = Column(String(20), nullable=False)  # 'patient' or 'specialist'
    is_helpful = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    review = relationship("SpecialistReview")
    
    # Constraints
    __table_args__ = (
        Index('idx_review_helpful_review_id', 'review_id'),
        Index('idx_review_helpful_user_id', 'user_id'),
    )

__all__ = [
    # Enums
    "SpecialistTypeEnum",
    "SpecializationEnum",
    "AvailabilityStatusEnum", 
    "ApprovalStatusEnum",
    "EmailVerificationStatusEnum",
    "DocumentTypeEnum",
    "DocumentStatusEnum",
    "TimeSlotEnum",
    
    # Models
    "Specialists",
    "SpecialistsAuthInfo",
    "SpecialistAvailability",
    "SpecialistTimeSlots",
    "SpecialistsApprovalData",
    "SpecialistDocuments",
    "SpecialistSpecializations",
    
    # Phase 1 Enhancement Models
    "SpecialistRegistrationProgress",
    "DocumentVerificationLog",
    "ApprovalWorkflowLog",
    "ApplicationTimeline",
    "ApplicationComments",
    
    # Review Models
    "SpecialistReview",
    "ReviewHelpful",
    "ReviewStatusEnum",
    
    # Utility Functions
    "get_specialist_by_email",
    "get_approved_specialists",
    "search_specialists_by_criteria",
]
