"""
Specialist Profile CRUD Schemas
==============================
Comprehensive schemas for specialist profile management with full CRUD operations.
Includes all fields from the reference image and additional profile management features.
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
from enum import Enum
import uuid


# ============================================================================
# ENUMS
# ============================================================================

class ConsultationModeEnum(str, Enum):
    ONLINE = "online"
    IN_PERSON = "in_person"
    HYBRID = "hybrid"

class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"

class AvailabilityStatusEnum(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    ACCEPTING_NEW_PATIENTS = "accepting_new_patients"
    NOT_ACCEPTING_NEW_PATIENTS = "not_accepting_new_patients"

class ApprovalStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    UNDER_REVIEW = "under_review"
    SUSPENDED = "suspended"


# ============================================================================
# BASE MODELS
# ============================================================================

class BaseProfileModel(BaseModel):
    """Base model with common configuration"""
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class InterestCreate(BaseModel):
    """Schema for creating interests"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class InterestUpdate(BaseModel):
    """Schema for updating interests"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class ProfessionalStatementCreate(BaseModel):
    """Schema for creating professional statement"""
    intro: str = Field(..., min_length=50, max_length=2000)
    role_of_psychologists: str = Field(..., min_length=100, max_length=5000)
    qualifications_detail: str = Field(..., min_length=50, max_length=1000)
    experience_detail: str = Field(..., min_length=50, max_length=1000)
    patient_satisfaction_team: str = Field(..., min_length=50, max_length=1000)
    appointment_details: str = Field(..., min_length=50, max_length=1000)
    clinic_address: str = Field(..., min_length=50, max_length=1000)
    fee_details: str = Field(..., min_length=50, max_length=1000)

class ProfessionalStatementUpdate(BaseModel):
    """Schema for updating professional statement"""
    intro: Optional[str] = Field(None, min_length=50, max_length=2000)
    role_of_psychologists: Optional[str] = Field(None, min_length=100, max_length=5000)
    qualifications_detail: Optional[str] = Field(None, min_length=50, max_length=1000)
    experience_detail: Optional[str] = Field(None, min_length=50, max_length=1000)
    patient_satisfaction_team: Optional[str] = Field(None, min_length=50, max_length=1000)
    appointment_details: Optional[str] = Field(None, min_length=50, max_length=1000)
    clinic_address: Optional[str] = Field(None, min_length=50, max_length=1000)
    fee_details: Optional[str] = Field(None, min_length=50, max_length=1000)

class EducationCreate(BaseModel):
    """Schema for creating education records"""
    degree: str = Field(..., min_length=1, max_length=200)
    field_of_study: str = Field(..., min_length=1, max_length=200)
    institution: str = Field(..., min_length=1, max_length=300)
    year: int = Field(..., ge=1950, le=2030)
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    description: Optional[str] = Field(None, max_length=1000)

class EducationUpdate(BaseModel):
    """Schema for updating education records"""
    degree: Optional[str] = Field(None, min_length=1, max_length=200)
    field_of_study: Optional[str] = Field(None, min_length=1, max_length=200)
    institution: Optional[str] = Field(None, min_length=1, max_length=300)
    year: Optional[int] = Field(None, ge=1950, le=2030)
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)
    description: Optional[str] = Field(None, max_length=1000)

class CertificationCreate(BaseModel):
    """Schema for creating certifications"""
    name: str = Field(..., min_length=1, max_length=200)
    issuing_body: str = Field(..., min_length=1, max_length=300)
    year: int = Field(..., ge=1950, le=2030)
    expiry_date: Optional[date] = None
    credential_id: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)

class CertificationUpdate(BaseModel):
    """Schema for updating certifications"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    issuing_body: Optional[str] = Field(None, min_length=1, max_length=300)
    year: Optional[int] = Field(None, ge=1950, le=2030)
    expiry_date: Optional[date] = None
    credential_id: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)

class ExperienceCreate(BaseModel):
    """Schema for creating experience records"""
    title: str = Field(..., min_length=1, max_length=200)
    company: str = Field(..., min_length=1, max_length=300)
    years: str = Field(..., min_length=1, max_length=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = Field(None, max_length=2000)
    is_current: bool = False

class ExperienceUpdate(BaseModel):
    """Schema for updating experience records"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    company: Optional[str] = Field(None, min_length=1, max_length=300)
    years: Optional[str] = Field(None, min_length=1, max_length=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = Field(None, max_length=2000)
    is_current: Optional[bool] = None

class SpecialistProfileCreate(BaseModel):
    """Schema for creating a complete specialist profile"""
    # Basic Information
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    gender: Optional[GenderEnum] = None
    
    # Professional Information
    specialist_type: str = Field(..., min_length=1, max_length=100)
    years_experience: int = Field(..., ge=0, le=50)
    qualification: Optional[str] = Field(None, max_length=500)
    institution: Optional[str] = Field(None, max_length=300)
    current_affiliation: Optional[str] = Field(None, max_length=300)
    
    # Location & Contact
    city: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    clinic_name: Optional[str] = Field(None, max_length=200)
    clinic_address: Optional[str] = Field(None, max_length=500)
    
    # Practice Details
    bio: Optional[str] = Field(None, max_length=2000)
    consultation_fee: Optional[float] = Field(None, ge=0, le=100000)
    currency: str = Field(default="PKR", max_length=10)
    consultation_modes: List[ConsultationModeEnum] = Field(default_factory=list)
    availability_schedule: Optional[Dict[str, Any]] = None
    languages_spoken: List[str] = Field(default_factory=list)
    
    # Profile Media
    profile_image_url: Optional[str] = Field(None, max_length=500)
    website_url: Optional[str] = Field(None, max_length=500)
    social_media_links: Optional[Dict[str, str]] = None
    
    # Status
    availability_status: AvailabilityStatusEnum = Field(default=AvailabilityStatusEnum.ACCEPTING_NEW_PATIENTS)
    accepting_new_patients: bool = True
    
    # Extended Profile Fields
    interests: List[str] = Field(default_factory=list)
    professional_statement: Optional[ProfessionalStatementCreate] = None
    education: List[EducationCreate] = Field(default_factory=list)
    certifications: List[CertificationCreate] = Field(default_factory=list)
    experience: List[ExperienceCreate] = Field(default_factory=list)

class SpecialistProfileUpdate(BaseModel):
    """Schema for updating specialist profile"""
    # Basic Information
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[date] = None
    gender: Optional[GenderEnum] = None
    
    # Professional Information
    specialist_type: Optional[str] = Field(None, min_length=1, max_length=100)
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    qualification: Optional[str] = Field(None, max_length=500)
    institution: Optional[str] = Field(None, max_length=300)
    current_affiliation: Optional[str] = Field(None, max_length=300)
    
    # Location & Contact
    city: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    clinic_name: Optional[str] = Field(None, max_length=200)
    clinic_address: Optional[str] = Field(None, max_length=500)
    
    # Practice Details
    bio: Optional[str] = Field(None, max_length=2000)
    consultation_fee: Optional[float] = Field(None, ge=0, le=100000)
    currency: Optional[str] = Field(None, max_length=10)
    consultation_modes: Optional[List[ConsultationModeEnum]] = None
    availability_schedule: Optional[Dict[str, Any]] = None
    languages_spoken: Optional[List[str]] = None
    
    # Specializations (JSON fields)
    specialties_in_mental_health: Optional[List[str]] = None
    therapy_methods: Optional[List[str]] = None
    
    # Profile Media
    profile_image_url: Optional[str] = Field(None, max_length=500)
    website_url: Optional[str] = Field(None, max_length=500)
    social_media_links: Optional[Dict[str, str]] = None
    
    # Status
    availability_status: Optional[AvailabilityStatusEnum] = None
    accepting_new_patients: Optional[bool] = None


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class InterestResponse(BaseProfileModel):
    """Response schema for interests"""
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ProfessionalStatementResponse(BaseProfileModel):
    """Response schema for professional statement"""
    id: uuid.UUID
    specialist_id: uuid.UUID
    intro: str
    role_of_psychologists: str
    qualifications_detail: str
    experience_detail: str
    patient_satisfaction_team: str
    appointment_details: str
    clinic_address: str
    fee_details: str
    created_at: datetime
    updated_at: datetime

class EducationResponse(BaseProfileModel):
    """Response schema for education"""
    id: uuid.UUID
    specialist_id: uuid.UUID
    degree: str
    field_of_study: str
    institution: str
    year: int
    gpa: Optional[float] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CertificationResponse(BaseProfileModel):
    """Response schema for certifications"""
    id: uuid.UUID
    specialist_id: uuid.UUID
    name: str
    issuing_body: str
    year: int
    expiry_date: Optional[date] = None
    credential_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ExperienceResponse(BaseProfileModel):
    """Response schema for experience"""
    id: uuid.UUID
    specialist_id: uuid.UUID
    title: str
    company: str
    years: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    is_current: bool
    created_at: datetime
    updated_at: datetime

class SpecialistProfileResponse(BaseProfileModel):
    """Complete specialist profile response"""
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    
    # Professional Information
    specialist_type: Optional[str] = None
    years_experience: Optional[int] = None
    qualification: Optional[str] = None
    institution: Optional[str] = None
    current_affiliation: Optional[str] = None
    
    # Location & Contact
    city: Optional[str] = None
    address: Optional[str] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    
    # Practice Details
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None
    currency: Optional[str] = None
    consultation_modes: Optional[List[str]] = None
    availability_schedule: Optional[Dict[str, Any]] = None
    languages_spoken: Optional[List[str]] = None
    
    # Profile Media
    profile_image_url: Optional[str] = None
    website_url: Optional[str] = None
    social_media_links: Optional[Dict[str, str]] = None
    
    # Status & Ratings
    availability_status: Optional[str] = None
    approval_status: Optional[str] = None
    accepting_new_patients: Optional[bool] = None
    average_rating: Optional[float] = None
    total_reviews: Optional[int] = None
    total_appointments: Optional[int] = None
    
    # Extended Profile Fields
    interests: List[str] = Field(default_factory=list)
    professional_statement: Optional[ProfessionalStatementResponse] = None
    education: List[EducationResponse] = Field(default_factory=list)
    certifications: List[CertificationResponse] = Field(default_factory=list)
    experience: List[ExperienceResponse] = Field(default_factory=list)
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    
    @property
    def full_name(self) -> str:
        """Full name for display"""
        return f"{self.first_name} {self.last_name}"

class SpecialistProfileListResponse(BaseModel):
    """Response schema for listing specialist profiles"""
    profiles: List[SpecialistProfileResponse]
    total: int
    page: int
    size: int
    has_next: bool
    has_previous: bool

class ProfileUpdateResponse(BaseModel):
    """Response schema for profile updates"""
    success: bool
    message: str
    updated_fields: List[str]
    updated_at: datetime

class ProfileDeleteResponse(BaseModel):
    """Response schema for profile deletion"""
    success: bool
    message: str
    deleted_at: datetime


# ============================================================================
# QUERY SCHEMAS
# ============================================================================

class ProfileSearchQuery(BaseModel):
    """Schema for profile search queries"""
    query: Optional[str] = Field(None, max_length=200)
    specialist_type: Optional[str] = None
    city: Optional[str] = None
    consultation_mode: Optional[ConsultationModeEnum] = None
    min_experience: Optional[int] = Field(None, ge=0, le=50)
    max_fee: Optional[float] = Field(None, ge=0, le=100000)
    availability_status: Optional[AvailabilityStatusEnum] = None
    approval_status: Optional[ApprovalStatusEnum] = None
    min_rating: Optional[float] = Field(None, ge=0.0, le=5.0)
    languages: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)
    sort_by: str = Field(default="created_at", pattern="^(created_at|updated_at|average_rating|years_experience|consultation_fee)$")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")


# ============================================================================
# VALIDATION
# ============================================================================

@field_validator('consultation_modes')
def validate_consultation_modes(cls, v):
    """Validate consultation modes"""
    if v and len(v) == 0:
        raise ValueError('At least one consultation mode must be specified')
    return v

@field_validator('languages_spoken')
def validate_languages(cls, v):
    """Validate languages spoken"""
    if v and len(v) == 0:
        raise ValueError('At least one language must be specified')
    return v

@model_validator(mode='after')
def validate_profile_data(cls, values):
    """Validate profile data consistency"""
    # Add any cross-field validation logic here
    return values
