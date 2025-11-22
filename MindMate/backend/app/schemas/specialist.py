"""
Specialist Profile Completion Schemas
=====================================
Pydantic models for specialist profile completion and management.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from enum import Enum

# Import enums from specialist models
from app.models.specialist import (
    SpecialistTypeEnum,
    GenderEnum,
    ConsultationModeEnum,
    MentalHealthSpecialtyEnum,
    TherapyMethodEnum,
    ApprovalStatusEnum
)

# ============================================================================
# BASE MODEL
# ============================================================================

class BaseProfileModel(BaseModel):
    """Base profile model configuration"""
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        validate_assignment=True,
        extra='forbid'
    )

# ============================================================================
# PROFILE COMPLETION REQUEST
# ============================================================================

class SpecialistProfileCompletionRequest(BaseProfileModel):
    """
    Complete specialist profile with all mandatory fields.
    These fields must be filled before profile can be submitted for admin approval.
    """
    
    # ========================================
    # Core Identification (Mandatory)
    # ========================================
    phone_number: str = Field(
        ...,
        min_length=10,
        max_length=20,
        description="Contact phone number with country code",
        examples=["+923001234567", "03001234567"]
    )
    cnic_number: str = Field(
        ...,
        min_length=15,
        max_length=15,
        pattern=r'^\d{5}-\d{7}-\d{1}$',
        description="Pakistani CNIC number in format: 00000-0000000-0",
        examples=["12345-6789012-3"]
    )
    gender: GenderEnum = Field(..., description="Gender identity")
    date_of_birth: date = Field(..., description="Date of birth for age validation")
    profile_photo_url: Optional[str] = Field(
        None,
        max_length=500,
        description="URL to uploaded profile photo"
    )
    
    # ========================================
    # Professional Credentials (Mandatory)
    # ========================================
    qualification: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Professional qualification",
        examples=["MS Clinical Psychology", "MD Psychiatry", "PhD Psychology"]
    )
    institution: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Educational institution",
        examples=["NUST Islamabad", "Aga Khan University", "Quaid-i-Azam University"]
    )
    license_number: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Professional license number"
    )
    license_authority: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="License issuing authority",
        examples=["Pakistan Medical Commission", "Psychology Council"]
    )
    license_expiry_date: Optional[date] = Field(
        None,
        description="License expiry date (if applicable)"
    )
    years_of_experience: int = Field(
        ...,
        ge=0,
        le=70,
        description="Years of professional experience"
    )
    specialization: List[SpecialistTypeEnum] = Field(
        ...,
        min_items=1,
        description="Primary specialization types"
    )
    certifications: List[str] = Field(
        default_factory=list,
        description="Additional certifications (e.g., CBT, DBT, EMDR)"
    )
    languages_spoken: List[str] = Field(
        ...,
        min_items=1,
        description="Languages spoken for patient communication",
        examples=[["English", "Urdu"], ["English", "Urdu", "Punjabi"]]
    )
    
    # ========================================
    # Document URLs (Mandatory)
    # ========================================
    license_document_url: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="URL to uploaded license document"
    )
    cnic_document_url: Optional[str] = Field(
        None,
        max_length=500,
        description="URL to uploaded CNIC/ID document"
    )
    
    # ========================================
    # Practice Details (Mandatory)
    # ========================================
    current_affiliation: Optional[str] = Field(
        None,
        max_length=200,
        description="Current workplace/clinic name"
    )
    clinic_address: Optional[str] = Field(
        None,
        max_length=500,
        description="Physical clinic address (if applicable)"
    )
    consultation_modes: List[ConsultationModeEnum] = Field(
        ...,
        min_items=1,
        description="Consultation delivery modes"
    )
    availability_schedule: Optional[Dict[str, List[str]]] = Field(
        None,
        description="Weekly availability schedule (optional)",
        examples=[{
            "Mon": ["10:00-14:00", "16:00-20:00"],
            "Wed": ["10:00-14:00"],
            "Fri": ["14:00-18:00"]
        }]
    )
    consultation_fee: int = Field(
        ...,
        ge=0,
        description="Consultation fee per session"
    )
    currency: str = Field(
        default="PKR",
        max_length=10,
        description="Currency code"
    )
    experience_summary: str = Field(
        ...,
        min_length=50,
        max_length=2000,
        description="Professional bio/experience summary"
    )
    specialties_in_mental_health: List[MentalHealthSpecialtyEnum] = Field(
        ...,
        min_items=1,
        description="Mental health specialties for patient matching"
    )
    therapy_methods: List[TherapyMethodEnum] = Field(
        ...,
        min_items=1,
        description="Therapy methods and approaches used"
    )
    accepting_new_patients: bool = Field(
        default=True,
        description="Whether currently accepting new patients"
    )
    
    # ========================================
    # Extended Profile Fields (Optional)
    # ========================================
    interests: Optional[List[str]] = Field(
        None,
        description="Personal and professional interests"
    )
    professional_statement_intro: Optional[str] = Field(
        None,
        max_length=1000,
        description="Professional introduction statement"
    )
    professional_statement_role: Optional[str] = Field(
        None,
        max_length=1000,
        description="Professional role statement"
    )
    professional_statement_qualifications: Optional[str] = Field(
        None,
        max_length=1000,
        description="Professional qualifications statement"
    )
    professional_statement_experience: Optional[str] = Field(
        None,
        max_length=1000,
        description="Professional experience statement"
    )
    professional_statement_patient_satisfaction: Optional[str] = Field(
        None,
        max_length=1000,
        description="Patient satisfaction commitment statement"
    )
    professional_statement_appointment_details: Optional[str] = Field(
        None,
        max_length=1000,
        description="Appointment details and process statement"
    )
    professional_statement_clinic_address: Optional[str] = Field(
        None,
        max_length=1000,
        description="Clinic address and location details"
    )
    professional_statement_fee_details: Optional[str] = Field(
        None,
        max_length=1000,
        description="Fee structure and payment details statement"
    )
    education_records: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Detailed education history records"
    )
    certification_records: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Professional certification records"
    )
    experience_records: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Professional experience history records"
    )
    
    # ========================================
    # Validators
    # ========================================
    
    @field_validator('date_of_birth')
    @classmethod
    def validate_age(cls, v: date) -> date:
        """Validate specialist is at least 21 years old"""
        age = (date.today() - v).days / 365.25
        if age < 21:
            raise ValueError('Specialist must be at least 21 years old')
        if age > 80:
            raise ValueError('Invalid date of birth')
        return v
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate phone number format"""
        # Remove spaces and dashes
        clean_phone = v.replace(' ', '').replace('-', '')
        if not clean_phone.replace('+', '').isdigit():
            raise ValueError('Phone number must contain only digits, spaces, dashes, or + prefix')
        return v
    
    @field_validator('availability_schedule')
    @classmethod
    def validate_schedule(cls, v: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """Validate availability schedule format"""
        valid_days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        
        if not v:
            raise ValueError('At least one day of availability required')
        
        for day, slots in v.items():
            if day not in valid_days:
                raise ValueError(f'Invalid day: {day}. Must be one of: {", ".join(valid_days)}')
            if not slots or len(slots) == 0:
                raise ValueError(f'At least one time slot required for {day}')
            
            # Validate time slot format (HH:MM-HH:MM)
            for slot in slots:
                if not isinstance(slot, str) or '-' not in slot:
                    raise ValueError(f'Invalid time slot format: {slot}. Expected format: "HH:MM-HH:MM"')
        
        return v
    
    @field_validator('license_expiry_date')
    @classmethod
    def validate_license_expiry(cls, v: Optional[date]) -> Optional[date]:
        """Validate license expiry date is in future"""
        if v and v < date.today():
            raise ValueError('License has expired. Please renew before submitting.')
        return v

# ============================================================================
# PROFILE COMPLETION RESPONSE
# ============================================================================

class SpecialistProfileResponse(BaseProfileModel):
    """Response after profile completion"""
    success: bool
    message: str
    specialist_id: str
    profile_completion_percentage: int
    mandatory_fields_completed: bool
    approval_status: str
    redirect_to: str
    next_steps: List[str] = Field(
        default_factory=lambda: [
            "Your profile has been submitted for admin review",
            "You will receive an email notification once reviewed",
            "Review typically takes 2-3 business days",
            "Check your application status anytime by logging in"
        ]
    )

# ============================================================================
# APPLICATION STATUS RESPONSE
# ============================================================================

class ApplicationStatusResponse(BaseProfileModel):
    """Specialist application/approval status"""
    approval_status: str
    profile_completed: bool
    profile_completion_percentage: int
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    can_practice: bool
    redirect_to: str
    message: str
    estimated_review_time: Optional[str] = None

# ============================================================================
# DOCUMENT UPLOAD RESPONSE
# ============================================================================

class DocumentUploadResponse(BaseProfileModel):
    """Response after document upload"""
    success: bool
    message: str
    document_type: str
    file_url: str
    filename: str
    uploaded_at: datetime

# ============================================================================
# DROPDOWN OPTIONS RESPONSE
# ============================================================================

class DropdownOption(BaseProfileModel):
    """Single dropdown option"""
    value: str
    label: str
    description: Optional[str] = None

class DropdownOptionsResponse(BaseProfileModel):
    """All dropdown options for profile form"""
    consultation_modes: List[DropdownOption]
    mental_health_specialties: List[DropdownOption]
    therapy_methods: List[DropdownOption]
    specialist_types: List[DropdownOption]
    currencies: List[DropdownOption]
    days_of_week: List[str]
    genders: List[DropdownOption]

# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "SpecialistProfileCompletionRequest",
    "SpecialistProfileResponse",
    "ApplicationStatusResponse",
    "DocumentUploadResponse",
    "DropdownOption",
    "DropdownOptionsResponse",
]

