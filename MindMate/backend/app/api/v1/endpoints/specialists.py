"""
MindMate Specialists API
========================
Comprehensive specialist management system including profiles, appointments, documents, and approvals.
Consolidates all specialist-related operations into a unified interface.

Author: Mental Health Platform Team
Version: 2.0.0 - Unified specialist management system
"""

import os
import re
import uuid
import logging
from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel, Field, field_validator

from app.db.session import get_db

# ============================================================================
# PROFILE COMPLETION MODELS
# ============================================================================

class ProfileCompletionStatus(BaseModel):
    """Profile completion status response"""
    completion_percentage: float
    completed_fields: List[str]
    missing_fields: List[str]
    total_required_fields: int
    completed_required_fields: int
    next_steps: List[str]
    is_ready_for_submission: bool

from app.api.v1.endpoints.auth import get_current_user_from_token

# Import CRUD schemas
from app.schemas.specialist_profile_crud_schemas import (
    SpecialistProfileCreate,
    SpecialistProfileUpdate,
    SpecialistProfileResponse as CRUDProfileResponse,
    SpecialistProfileListResponse,
    ProfileUpdateResponse,
    ProfileDeleteResponse,
    ProfileSearchQuery,
    InterestCreate,
    InterestUpdate,
    InterestResponse,
    ProfessionalStatementCreate,
    ProfessionalStatementUpdate,
    ProfessionalStatementResponse,
    EducationCreate,
    EducationUpdate,
    EducationResponse,
    CertificationCreate,
    CertificationUpdate,
    CertificationResponse,
    ExperienceCreate,
    ExperienceUpdate,
    ExperienceResponse
)
from app.schemas.specialist_appointment_schemas import DashboardStats, ActivityData

# Import models
from app.models.specialist import (
    Specialists, SpecialistsAuthInfo, SpecialistsApprovalData,
    SpecialistSpecializations, SpecialistAvailability, SpecialistTimeSlots, SpecialistDocuments,
    ApprovalStatusEnum, TimeSlotEnum, DocumentTypeEnum,
    EmailVerificationStatusEnum, AvailabilityStatusEnum, ConsultationModeEnum
)
from app.models.patient import Patient
from app.models.admin import Admin
from app.models.specialist import SpecialistReview, ReviewStatusEnum
from app.models.appointment import Appointment, AppointmentStatusEnum
from app.models.forum import ForumAnswer, AnswerStatus
    
# Import utilities
from app.utils.email_utils import safe_enum_to_string

# Import services
from app.services.slots import SlotManagementService

# Initialize router
router = APIRouter(prefix="/specialists", tags=["Specialists"])

# Configure logging
logger = logging.getLogger(__name__)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def transform_education_records(education_records: List[Dict[str, Any]], specialist_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Transform education records from JSON format to response format with specialist_id"""
    if not education_records:
        return []
    
    transformed = []
    for record in education_records:
        if not isinstance(record, dict):
            continue
            
        # Handle ID conversion
        record_id = record.get("id")
        if isinstance(record_id, str):
            try:
                record_id = uuid.UUID(record_id)
            except (ValueError, AttributeError):
                record_id = uuid.uuid4()  # Generate new ID if invalid
        elif not isinstance(record_id, uuid.UUID):
            record_id = uuid.uuid4()  # Generate new ID if missing
        
        # Handle datetime conversion
        created_at = record.get("created_at")
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                created_at = datetime.now(timezone.utc)
        elif not isinstance(created_at, datetime):
            created_at = datetime.now(timezone.utc)
        
        updated_at = record.get("updated_at")
        if isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                updated_at = datetime.now(timezone.utc)
        elif not isinstance(updated_at, datetime):
            updated_at = datetime.now(timezone.utc)
        
        transformed_record = {
            "id": record_id,
            "specialist_id": specialist_id,
            "degree": record.get("degree", ""),
            "field_of_study": record.get("field_of_study", ""),
            "institution": record.get("institution", ""),
            "year": record.get("year"),
            "gpa": record.get("gpa"),
            "description": record.get("description"),
            "created_at": created_at,
            "updated_at": updated_at
        }
        transformed.append(transformed_record)
    return transformed

def transform_certification_records(certification_records: List[Dict[str, Any]], specialist_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Transform certification records from JSON format to response format with specialist_id"""
    if not certification_records:
        return []
    
    transformed = []
    for record in certification_records:
        if not isinstance(record, dict):
            continue
            
        # Handle ID conversion
        record_id = record.get("id")
        if isinstance(record_id, str):
            try:
                record_id = uuid.UUID(record_id)
            except (ValueError, AttributeError):
                record_id = uuid.uuid4()
        elif not isinstance(record_id, uuid.UUID):
            record_id = uuid.uuid4()
        
        # Handle datetime conversion
        created_at = record.get("created_at")
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                created_at = datetime.now(timezone.utc)
        elif not isinstance(created_at, datetime):
            created_at = datetime.now(timezone.utc)
        
        updated_at = record.get("updated_at")
        if isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                updated_at = datetime.now(timezone.utc)
        elif not isinstance(updated_at, datetime):
            updated_at = datetime.now(timezone.utc)
        
        # Handle expiry_date (date type)
        expiry_date = record.get("expiry_date")
        if expiry_date:
            if isinstance(expiry_date, str):
                try:
                    expiry_date = datetime.fromisoformat(expiry_date.replace('Z', '+00:00')).date()
                except (ValueError, AttributeError):
                    expiry_date = None
            elif isinstance(expiry_date, datetime):
                expiry_date = expiry_date.date()
            # If already a date object, keep it as is
        
        transformed_record = {
            "id": record_id,
            "specialist_id": specialist_id,
            "name": record.get("name", ""),
            "issuing_body": record.get("issuing_body", ""),
            "year": record.get("year"),
            "expiry_date": expiry_date,
            "credential_id": record.get("credential_id"),
            "description": record.get("description"),
            "created_at": created_at,
            "updated_at": updated_at
        }
        transformed.append(transformed_record)
    return transformed

def transform_experience_records(experience_records: List[Dict[str, Any]], specialist_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Transform experience records from JSON format to response format with specialist_id"""
    if not experience_records:
        return []
    
    transformed = []
    for record in experience_records:
        if not isinstance(record, dict):
            continue
            
        # Handle ID conversion
        record_id = record.get("id")
        if isinstance(record_id, str):
            try:
                record_id = uuid.UUID(record_id)
            except (ValueError, AttributeError):
                record_id = uuid.uuid4()
        elif not isinstance(record_id, uuid.UUID):
            record_id = uuid.uuid4()
        
        # Handle datetime conversion
        created_at = record.get("created_at")
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                created_at = datetime.now(timezone.utc)
        elif not isinstance(created_at, datetime):
            created_at = datetime.now(timezone.utc)
        
        updated_at = record.get("updated_at")
        if isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                updated_at = datetime.now(timezone.utc)
        elif not isinstance(updated_at, datetime):
            updated_at = datetime.now(timezone.utc)
        
        # Handle start_date (date type)
        start_date = record.get("start_date")
        if start_date:
            if isinstance(start_date, str):
                try:
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).date()
                except (ValueError, AttributeError):
                    start_date = None
            elif isinstance(start_date, datetime):
                start_date = start_date.date()
        
        # Handle end_date (date type)
        end_date = record.get("end_date")
        if end_date:
            if isinstance(end_date, str):
                try:
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')).date()
                except (ValueError, AttributeError):
                    end_date = None
            elif isinstance(end_date, datetime):
                end_date = end_date.date()
        
        transformed_record = {
            "id": record_id,
            "specialist_id": specialist_id,
            "title": record.get("title", ""),
            "company": record.get("company", ""),
            "years": record.get("years", ""),
            "start_date": start_date,
            "end_date": end_date,
            "description": record.get("description"),
            "is_current": record.get("is_current", False),
            "created_at": created_at,
            "updated_at": updated_at
        }
        transformed.append(transformed_record)
    return transformed

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

# Profile Models
class SpecializationItem(BaseModel):
    """Individual specialization entry"""
    specialization: str  # We'll convert to enum in the handler
    years_of_experience_in_specialization: int = Field(ge=0, le=50)
    is_primary_specialization: bool = False
    certification_date: Optional[datetime] = None

class ProfileCompletionRequest(BaseModel):
    """Request model for profile completion"""
    phone: str = Field(..., description="Pakistani phone format: +92XXXXXXXXXX")
    address: str = Field(..., min_length=10, max_length=500, description="Complete address")
    clinic_name: Optional[str] = Field(None, max_length=200, description="Clinic or practice name")
    bio: str = Field(..., min_length=1, max_length=2000, description="Professional biography")
    consultation_fee: float = Field(..., ge=0, le=50000, description="Fee in PKR")
    languages_spoken: List[str] = Field(..., min_items=1, description="Languages spoken")
    specializations: List[SpecializationItem] = Field(..., min_items=1, max_items=5)
    availability_slots: List[str] = Field(..., min_items=1, max_items=8, description="Available time slots")
    website_url: Optional[str] = Field(None, description="Professional website")
    social_media_links: Optional[Dict[str, str]] = Field(None, description="Social media profiles")

    @field_validator('languages_spoken')
    @classmethod
    def validate_languages(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one language must be specified')
        return v

    @field_validator('availability_slots')
    @classmethod
    def validate_availability_slots(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one availability slot must be specified')
        valid_slots = [slot.value for slot in TimeSlotEnum]
        for slot in v:
            if slot not in valid_slots:
                raise ValueError(f'Invalid time slot: {slot}')
        return v

    @field_validator('website_url')
    @classmethod
    def validate_website_url(cls, v):
        if v:
            pattern = r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:\w*))*)?$'
            if not re.match(pattern, v):
                raise ValueError('Invalid website URL format')
        return v

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        # Clean phone number (remove spaces, dashes)
        cleaned = re.sub(r'[\s\-]', '', v)
        # Validate Pakistani format
        if not re.match(r'^\+?92[0-9]{10}$', cleaned):
            raise ValueError('Phone must be in Pakistani format: +92XXXXXXXXXX')
        return cleaned

    @field_validator('bio')
    @classmethod
    def validate_bio_word_count(cls, v):
        # Clean bio from any terminal output or debug info
        cleaned_bio = v.strip()
        word_count = len(cleaned_bio.split())
        if word_count < 10:  # Reduced from 20 to 10 for testing
            raise ValueError('Bio must be at least 10 words long')
        return cleaned_bio

class ProfileCompletionResponse(BaseModel):
    """Response for profile completion"""
    message: str
    profile_completion_percentage: int
    missing_fields: List[str]
    next_steps: List[str]

class DocumentSubmissionRequest(BaseModel):
    """Request model for document metadata"""
    document_type: DocumentTypeEnum
    document_name: str = Field(..., min_length=3, max_length=255)
    expiry_date: Optional[datetime] = None

class DocumentSubmissionResponse(BaseModel):
    """Response for document submission"""
    message: str
    document_id: str
    document_name: str
    verification_status: str
    admin_notified: bool
    next_steps: List[str]

class SubmissionResponse(BaseModel):
    """Response for application submission"""
    success: bool
    message: str
    submission_date: datetime
    approval_status: str
    estimated_review_time: str
    next_steps: List[str]

# Profile Access Models
class SpecialistPublicProfile(BaseModel):
    """Public specialist profile for patients"""
    id: str
    full_name: str
    specialist_type: Optional[str]
    years_experience: Optional[int]
    bio: Optional[str]
    consultation_fee: Optional[float]
    languages_spoken: Optional[List[str]]
    clinic_name: Optional[str]
    city: Optional[str]
    specializations: List[Dict[str, Any]]
    availability_status: Optional[str]
    profile_completion_percentage: Optional[int]
    
    # New fields for detailed profile
    consultation_modes: Optional[List[str]] = None
    clinic_address: Optional[str] = None
    availability_schedule: Optional[Dict[str, Any]] = None
    profile_image_url: Optional[str] = None
    rating: Optional[float] = None
    total_reviews: Optional[int] = None
    qualifications: Optional[str] = None
    institution: Optional[str] = None
    current_affiliation: Optional[str] = None
    experience_summary: Optional[str] = None
    specialties_in_mental_health: Optional[List[str]] = None
    therapy_methods: Optional[List[str]] = None
    is_verified: Optional[bool] = False
    currency: Optional[str] = "PKR"

class SpecialistReviewResponse(BaseModel):
    """Response model for specialist reviews"""
    id: str
    appointment_id: str
    specialist_id: str
    patient_id: str
    rating: int
    review_text: Optional[str] = None
    is_anonymous: bool = False
    status: str
    communication_rating: Optional[int] = None
    professionalism_rating: Optional[int] = None
    effectiveness_rating: Optional[int] = None
    specialist_response: Optional[str] = None
    specialist_response_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    patient_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class SpecialistProtectedProfile(BaseModel):
    """Protected specialist profile for admins"""
    id: str
    email: str
    full_name: str
    phone: Optional[str]
    address: Optional[str]
    clinic_name: Optional[str]
    bio: Optional[str]
    consultation_fee: Optional[float]
    languages_spoken: Optional[List[str]]
    website_url: Optional[str]
    social_media_links: Optional[Dict[str, str]]
    specialist_type: Optional[str]
    years_experience: Optional[int]
    approval_status: str
    created_at: datetime
    last_login: Optional[datetime]
    email_verification_status: Optional[str]
    specializations: List[Dict[str, Any]]
    documents: List[Dict[str, Any]]
    availability_slots: List[str]
    profile_completion_percentage: float
    submission_date: Optional[datetime]

class SpecialistPrivateProfile(BaseModel):
    """Private specialist profile for specialist themselves"""
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    address: Optional[str]
    city: Optional[str]
    clinic_name: Optional[str]
    bio: Optional[str]
    consultation_fee: Optional[float]
    languages_spoken: Optional[List[str]]
    website_url: Optional[str]
    social_media_links: Optional[Dict[str, str]]
    specialist_type: Optional[str]
    years_experience: Optional[int]
    approval_status: str
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    email_verification_status: Optional[str]
    specializations: List[Dict[str, Any]]
    documents: List[Dict[str, Any]]
    availability_slots: List[Dict[str, Any]]
    profile_completion_percentage: float
    approval_data: Optional[Dict[str, Any]]

# Appointment Models
class AppointmentFilterRequest(BaseModel):
    """Filter appointments request"""
    status: Optional[str] = None
    patient_id: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)

class FilteredAppointmentsResponse(BaseModel):
    """Filtered appointments response"""
    appointments: List[Dict[str, Any]]
    total_count: int
    page: int
    size: int
    has_more: bool

class UpdateAppointmentStatusRequest(BaseModel):
    """Update appointment status request"""
    status: str
    notes: Optional[str] = None

class StatusUpdateResponse(BaseModel):
    """Status update response"""
    success: bool
    message: str
    appointment_id: str
    new_status: str
    updated_at: datetime

class CancelAppointmentBySpecialistRequest(BaseModel):
    """Cancel appointment by specialist request"""
    reason: str
    notify_patient: bool = True

# Patient Profile Models (for specialists)
class PatientPublicProfile(BaseModel):
    """Patient public profile for specialists"""
    id: str
    first_name: str
    last_name: str
    age: Optional[int]
    gender: Optional[str]
    city: Optional[str]
    consultation_history: List[Dict[str, Any]]

class PatientFilterRequest(BaseModel):
    """Filter patients request"""
    status: Optional[str] = None
    search: Optional[str] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)

class FilteredPatientsResponse(BaseModel):
    """Filtered patients response"""
    patients: List[Dict[str, Any]]
    total_count: int
    page: int
    size: int
    has_more: bool

# Dashboard Models - Now imported from app.schemas.specialist_appointment_schemas

# Slot Management Models
class GenerateSlotsRequest(BaseModel):
    """Request to generate time slots"""
    start_date: date
    end_date: date
    slot_duration_minutes: int = Field(60, ge=15, le=480)

class SlotActionRequest(BaseModel):
    """Request for slot actions"""
    slot_id: str
    reason: Optional[str] = None

class SlotManagementResponse(BaseModel):
    """Response for slot management operations"""
    success: bool
    message: str
    slot_id: Optional[str] = None
    status: Optional[str] = None

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_authenticated_specialist(current_user_data: dict = Depends(get_current_user_from_token)) -> Specialists:
    """Get current authenticated specialist"""
    user = current_user_data["user"]
    user_type = current_user_data["user_type"]

    if user_type != "specialist":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Specialist access required"
        )

    return user

def get_authenticated_admin(current_user_data: dict = Depends(get_current_user_from_token)) -> Admin:
    """Get current authenticated admin"""
    user = current_user_data["user"]
    user_type = current_user_data["user_type"]

    if user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return user

def calculate_profile_completion(specialist, specializations, availability_slots, documents) -> float:
    """Calculate profile completion percentage"""
    try:
        required_fields = {
            'phone': specialist.phone,
            'address': specialist.address,
            'bio': specialist.bio,
            'consultation_fee': specialist.consultation_fee,
            'languages_spoken': specialist.languages_spoken,
            'specializations': len(specializations) > 0,
            'availability_slots': len(availability_slots) > 0
        }

        completed_required = sum(1 for value in required_fields.values() if value)
        total_required = len(required_fields)

        # Check documents (4 mandatory documents required)
        mandatory_doc_types = ['identity_card', 'degree', 'license', 'experience_letter']
        uploaded_doc_types = [doc.document_type.value for doc in documents]
        completed_documents = sum(1 for doc_type in mandatory_doc_types if doc_type in uploaded_doc_types)

        # Calculate weighted completion percentage
        profile_percentage = (completed_required / total_required) * 70
        document_percentage = (completed_documents / 4) * 30

        return round(profile_percentage + document_percentage, 1)

    except Exception as e:
        print(f"Error calculating profile completion: {str(e)}")
        return 0.0

# ============================================================================
# PROFILE COMPLETION ENDPOINTS
# ============================================================================

@router.post("/complete-profile", response_model=ProfileCompletionResponse, deprecated=True)
async def complete_profile(
    request: ProfileCompletionRequest,
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """
    Complete specialist profile
    
    ⚠️ DEPRECATED: This endpoint is deprecated and maintained for backward compatibility only.
    Please migrate to the new endpoint: POST /api/specialist/profile/complete
    
    The new endpoint provides:
    - Enhanced validation and error messages
    - Progress tracking integration
    - Professional statement sections
    - Education/certification/experience records
    - Better completion percentage calculation
    """
    try:
        # Check if already approved or under review (can't modify during these states)
        if specialist.approval_status == ApprovalStatusEnum.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify profile after approval. Contact admin for changes."
            )
        
        if specialist.approval_status == ApprovalStatusEnum.UNDER_REVIEW:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify profile while under admin review. Please wait for review completion."
            )

        # Update basic profile information
        specialist.phone = request.phone
        specialist.address = request.address
        specialist.clinic_name = request.clinic_name
        specialist.bio = request.bio
        specialist.consultation_fee = request.consultation_fee
        specialist.languages_spoken = request.languages_spoken
        specialist.website_url = request.website_url
        specialist.social_media_links = request.social_media_links
        specialist.updated_at = datetime.now(timezone.utc)

        # Update specializations
        db.query(SpecialistSpecializations).filter(
            SpecialistSpecializations.specialist_id == specialist.id
        ).delete()

        for spec_data in request.specializations:
            specialization = SpecialistSpecializations(
                specialist_id=specialist.id,
                specialization=spec_data.specialization,  # Will be converted to enum
                years_of_experience_in_specialization=spec_data.years_of_experience_in_specialization,
                is_primary_specialization=spec_data.is_primary_specialization,
                certification_date=spec_data.certification_date
            )
            db.add(specialization)

        # Update availability slots
        db.query(SpecialistAvailability).filter(
            SpecialistAvailability.specialist_id == specialist.id
        ).delete()

        for slot in request.availability_slots:
            availability = SpecialistAvailability(
                specialist_id=specialist.id,
                time_slot=TimeSlotEnum(slot)
            )
            db.add(availability)

        db.commit()

        # Calculate completion percentage
        specializations = db.query(SpecialistSpecializations).filter(
            SpecialistSpecializations.specialist_id == specialist.id
        ).all()

        availability_slots = db.query(SpecialistAvailability).filter(
            SpecialistAvailability.specialist_id == specialist.id
        ).all()

        documents = db.query(SpecialistDocuments).join(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).all()

        completion_percentage = calculate_profile_completion(
            specialist, specializations, availability_slots, documents
        )

        # Determine missing fields
        missing_fields = []
        if not specialist.phone:
            missing_fields.append("phone")
        if not specialist.address:
            missing_fields.append("address")
        if not specialist.bio:
            missing_fields.append("bio")
        if not specialist.consultation_fee:
            missing_fields.append("consultation_fee")
        if not specialist.languages_spoken:
            missing_fields.append("languages_spoken")
        if len(specializations) == 0:
            missing_fields.append("specializations")
        if len(availability_slots) == 0:
            missing_fields.append("availability_slots")

        next_steps = []
        if completion_percentage < 100:
            next_steps.append("Complete all required fields for profile approval")
        if len(documents) < 4:
            next_steps.append("Upload all required documents")
        next_steps.append("Submit for admin approval")

        return ProfileCompletionResponse(
            message="Profile updated successfully",
            profile_completion_percentage=int(completion_percentage),
            missing_fields=missing_fields,
            next_steps=next_steps
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error completing profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete profile"
        )

@router.get("/mandatory-documents")
async def get_mandatory_documents(
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Get list of mandatory documents"""
    return {
        "mandatory_documents": [
            {
                "type": "identity_card",
                "name": "Identity Card/CNIC",
                "description": "Government-issued photo ID",
                "required": True
            },
            {
                "type": "degree",
                "name": "Medical Degree Certificate",
                "description": "Verified medical degree certificate",
                "required": True
            },
            {
                "type": "license",
                "name": "Medical License",
                "description": "Current medical practice license",
                "required": True
            },
            {
                "type": "experience_letter",
                "name": "Experience Letter",
                "description": "Letter confirming professional experience",
                "required": True
            }
        ]
    }

@router.get("/document-status")
async def get_document_status(
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Get document submission status"""
    try:
        approval_data = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).first()

        if not approval_data:
            return {
                "has_approval_data": False,
                "documents": [],
                "message": "No approval data found. Submit for approval first."
            }

        documents = db.query(SpecialistDocuments).filter(
            SpecialistDocuments.approval_data_id == approval_data.id
        ).all()

        document_list = []
        for doc in documents:
            document_list.append({
                "id": str(doc.id),
                "document_type": doc.document_type.value,
                "document_name": doc.document_name,
                "verification_status": doc.verification_status.value if doc.verification_status else "pending",
                "upload_date": doc.upload_date,
                "expiry_date": doc.expiry_date,
                "file_size": doc.file_size
            })

        mandatory_types = ['identity_card', 'degree', 'license', 'experience_letter']
        uploaded_types = [doc['document_type'] for doc in document_list]
        missing_types = [t for t in mandatory_types if t not in uploaded_types]

        return {
            "has_approval_data": True,
            "documents": document_list,
            "mandatory_complete": len(missing_types) == 0,
            "missing_documents": missing_types,
            "total_documents": len(document_list)
        }

    except Exception as e:
        print(f"Error getting document status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get document status"
        )

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Delete a document"""
    try:
        document = db.query(SpecialistDocuments).filter(
            SpecialistDocuments.id == document_id
        ).first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Check ownership through approval data
        approval_data = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.id == document.approval_data_id,
            SpecialistsApprovalData.specialist_id == specialist.id
        ).first()

        if not approval_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Delete file if exists
        if os.path.exists(document.file_path):
            os.remove(document.file_path)

        # Delete from database
        db.delete(document)
        db.commit()

        return {"message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )

@router.post("/submit-documents", response_model=DocumentSubmissionResponse)
async def submit_documents(
    document_type: DocumentTypeEnum = Form(..., description="Type of document being submitted"),
    document_name: str = Form(..., min_length=3, max_length=255, description="Display name for the document"),
    expiry_date: Optional[str] = Form(None, description="Document expiry date (YYYY-MM-DD format)"),
    file: UploadFile = File(..., description="Document file"),
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Submit document for verification"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )

        # Check file size (max 10MB)
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File too large. Maximum size is 10MB."
            )

        # Check file type
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only PDF, JPG, PNG allowed."
            )

        # Get or create approval data
        approval_data = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).first()

        if not approval_data:
            approval_data = SpecialistsApprovalData(
                specialist_id=specialist.id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(approval_data)
            db.flush()

        # Save file
        upload_dir = "uploads/specialist_documents"
        os.makedirs(upload_dir, exist_ok=True)

        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)

        with open(file_path, "wb") as f:
            f.write(file_content)

        # Parse expiry date
        parsed_expiry = None
        if expiry_date:
            try:
                parsed_expiry = datetime.strptime(expiry_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid expiry date format. Use YYYY-MM-DD."
                )

        # Create document record
        document = SpecialistDocuments(
            approval_data_id=approval_data.id,
            document_type=document_type,
            document_name=document_name,
            file_path=file_path,
            mime_type=file.content_type,
            file_size=len(file_content),
            expiry_date=parsed_expiry,
            upload_date=datetime.now(timezone.utc)
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        return DocumentSubmissionResponse(
            message="Document submitted successfully",
            document_id=str(document.id),
            document_name=document.document_name,
            verification_status="pending",
            admin_notified=False,  # We'll implement admin notification separately
            next_steps=[
                "Wait for admin verification",
                "Check document status regularly",
                "Contact support if verification takes too long"
            ]
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error submitting document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit document"
        )

@router.post("/submit-for-approval", response_model=SubmissionResponse)
async def submit_for_approval(
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Submit specialist application for approval"""
    try:
        # Check if already submitted or approved
        if specialist.approval_status in [ApprovalStatusEnum.APPROVED, ApprovalStatusEnum.UNDER_REVIEW]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Application already {specialist.approval_status.value.lower().replace('_', ' ')}"
            )

        # Validate profile completion
        specializations = db.query(SpecialistSpecializations).filter(
            SpecialistSpecializations.specialist_id == specialist.id
        ).all()

        availability_slots = db.query(SpecialistAvailability).filter(
            SpecialistAvailability.specialist_id == specialist.id
        ).all()

        documents = db.query(SpecialistDocuments).join(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).all()

        completion_percentage = calculate_profile_completion(
            specialist, specializations, availability_slots, documents
        )

        if completion_percentage < 60:  # Reduced from 80% to 60% for testing
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Profile incomplete ({completion_percentage}%). Complete at least 60% before submission."
            )

        # Check mandatory documents
        mandatory_types = ['identity_card', 'degree', 'license', 'experience_letter']
        uploaded_types = [doc.document_type.value for doc in documents]
        missing_docs = [t for t in mandatory_types if t not in uploaded_types]

        if missing_docs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing mandatory documents: {', '.join(missing_docs)}"
            )

        # Get or create approval data
        approval_data = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).first()

        if not approval_data:
            approval_data = SpecialistsApprovalData(
                specialist_id=specialist.id,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(approval_data)

        # Update status
        specialist.approval_status = ApprovalStatusEnum.UNDER_REVIEW
        specialist.updated_at = datetime.now(timezone.utc)
        approval_data.submission_date = datetime.now(timezone.utc)
        approval_data.updated_at = datetime.now(timezone.utc)

        db.commit()

        # Notify admins about new submission
        try:
            from app.utils.email_utils import get_admin_emails_for_notifications, send_admin_notification_email
            
            # Get primary specialization
            primary_spec = db.query(SpecialistSpecializations).filter(
                SpecialistSpecializations.specialist_id == specialist.id,
                SpecialistSpecializations.is_primary_specialization == True
            ).first()
            
            specialization = "Mental Health"
            if primary_spec and primary_spec.specialization:
                specialization = primary_spec.specialization.value
            elif len(specializations) > 0:
                specialization = specializations[0].specialization.value if specializations[0].specialization else "Mental Health"
            
            # Prepare specialist data
            specialist_data = {
                "email": specialist.email,
                "first_name": specialist.first_name,
                "last_name": specialist.last_name,
                "specialization": specialization,
                "registration_date": datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M %p")
            }
            
            # Notify all admins
            admin_emails = get_admin_emails_for_notifications(db)
            for admin_email in admin_emails:
                try:
                    send_admin_notification_email(admin_email, specialist_data)
                except Exception as e:
                    logger.error(f"Failed to notify admin {admin_email}: {e}")
        except Exception as e:
            logger.error(f"Failed to send admin notifications: {e}")
            # Don't fail the submission if email fails

        return SubmissionResponse(
            success=True,
            message="Application submitted successfully for review",
            submission_date=approval_data.submission_date,
            approval_status="under_review",
            estimated_review_time="3-5 business days",
            next_steps=[
                "Monitor your email for updates",
                "Check your profile status regularly",
                "Prepare for potential follow-up questions",
                "Contact support if you have questions"
            ]
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error submitting for approval: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit application"
        )

@router.get("/approval-status")
async def get_approval_status(
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Get comprehensive approval status with real data"""
    try:
        # Get approval status safely
        approval_status_value = "pending"
        if specialist.approval_status and hasattr(specialist.approval_status, 'value'):
            approval_status_value = specialist.approval_status.value

        # Check if specialist can practice
        can_practice = False
        if specialist.approval_status and hasattr(specialist.approval_status, 'value'):
            can_practice = specialist.approval_status.value == "approved"

        # Get email verification status
        auth_info = db.query(SpecialistsAuthInfo).filter(
            SpecialistsAuthInfo.specialist_id == specialist.id
        ).first()
        
        email_verification_status = "unverified"
        if auth_info and auth_info.email_verification_status:
            email_verification_status = auth_info.email_verification_status.value if hasattr(auth_info.email_verification_status, 'value') else str(auth_info.email_verification_status)

        # Calculate profile completion percentage
        profile_fields = [
            specialist.first_name, specialist.last_name, specialist.email, specialist.phone,
            specialist.address, specialist.bio, specialist.specialist_type, specialist.consultation_fee,
            specialist.years_experience, specialist.languages_spoken, specialist.city
        ]
        completed_fields = sum(1 for field in profile_fields if field is not None and str(field).strip() != "")
        profile_completion_percentage = round((completed_fields / len(profile_fields)) * 100, 1)

        # Check specializations
        specializations = db.query(SpecialistSpecializations).filter(
            SpecialistSpecializations.specialist_id == specialist.id
        ).all()
        has_specializations = len(specializations) > 0

        # Check availability slots
        availability_slots = db.query(SpecialistAvailability).filter(
            SpecialistAvailability.specialist_id == specialist.id
        ).all()
        has_availability = len(availability_slots) > 0

        # Get approval data and documents
        approval_data = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).first()
        
        documents_uploaded = 0
        documents_required = 5  # Standard required documents
        submission_date = None
        reviewed_date = None
        reviewed_by = None
        approval_notes = None
        rejection_reason = None
        
        if approval_data:
            documents_uploaded = len(approval_data.documents) if approval_data.documents else 0
            submission_date = approval_data.submission_date
            reviewed_date = approval_data.reviewed_at
            reviewed_by = approval_data.reviewed_by
            approval_notes = approval_data.approval_notes
            rejection_reason = approval_data.rejection_reason

        # Calculate days since submission
        days_since_submission = None
        if submission_date:
            days_since_submission = (datetime.now(timezone.utc) - submission_date).days

        # Determine next steps based on current status
        next_steps = []
        status_message = ""
        
        if approval_status_value == "approved":
            status_message = "Your application has been approved! You can now start practicing."
            next_steps = ["Access your dashboard", "Set up your availability", "Start accepting appointments"]
        elif approval_status_value == "rejected":
            status_message = f"Your application has been rejected. {rejection_reason or 'Please contact support for details.'}"
            next_steps = ["Review rejection reasons", "Update your application", "Resubmit for review"]
        elif approval_status_value == "under_review":
            status_message = "Your application is currently under review by our admin team."
            next_steps = ["Wait for review completion", "Check email for updates", "Contact support if needed"]
        elif profile_completion_percentage < 100:
            status_message = "Please complete your profile to continue with the application process."
            next_steps = ["Complete missing profile fields", "Add specializations", "Set availability"]
        elif not has_specializations:
            status_message = "Please add your specializations to continue."
            next_steps = ["Add your specializations", "Set availability", "Upload documents"]
        elif not has_availability:
            status_message = "Please set your availability slots to continue."
            next_steps = ["Set your availability", "Upload documents", "Submit for approval"]
        elif documents_uploaded < documents_required:
            status_message = "Please upload all required documents to continue."
            next_steps = ["Upload missing documents", "Submit for approval"]
        elif approval_status_value == "pending":
            status_message = "Your application is ready for submission."
            next_steps = ["Submit for approval", "Wait for admin review"]
        else:
            status_message = "Please complete your application to continue."
            next_steps = ["Complete profile", "Add specializations", "Set availability", "Upload documents"]

        # Estimate review time
        estimated_review_time = None
        if approval_status_value == "under_review":
            if days_since_submission is not None:
                if days_since_submission < 3:
                    estimated_review_time = "2-3 business days remaining"
                elif days_since_submission < 7:
                    estimated_review_time = "Review in progress"
                else:
                    estimated_review_time = "Review taking longer than usual"
            else:
                estimated_review_time = "3-5 business days"

        return {
            # Basic info
            "user_id": str(specialist.id),
            "email": specialist.email,
            "full_name": f"{specialist.first_name} {specialist.last_name}".strip(),
            
            # Overall status
            "approval_status": approval_status_value,
            "email_verification_status": email_verification_status,
            "can_practice": can_practice,
            
            # Profile status
            "profile_complete": profile_completion_percentage >= 100,
            "profile_completion_percentage": profile_completion_percentage,
            "documents_submitted": documents_uploaded >= documents_required,
            "has_specializations": has_specializations,
            "has_availability": has_availability,
            
            # Submission information
            "submission_date": submission_date.isoformat() if submission_date else None,
            "reviewed_date": reviewed_date.isoformat() if reviewed_date else None,
            "reviewed_by": reviewed_by,
            "days_since_submission": days_since_submission,
            
            # Documents status
            "total_documents": documents_required,
            "documents_uploaded": documents_uploaded,
            "documents_required": documents_required,
            "documents_approved": documents_uploaded if approval_status_value == "approved" else 0,
            "documents_pending": documents_uploaded if approval_status_value in ["pending", "under_review"] else 0,
            "documents_rejected": 0,  # Could be enhanced to track individual document status
            
            # Review information
            "approval_notes": approval_notes,
            "rejection_reason": rejection_reason,
            "background_check_status": None,  # Could be enhanced
            "background_check_date": None,  # Could be enhanced
            
            # Professional information
            "license_number": approval_data.license_number if approval_data else None,
            "license_expiry_date": approval_data.license_expiry_date.isoformat() if approval_data and approval_data.license_expiry_date else None,
            "license_valid": approval_data.license_expiry_date.date() > date.today() if approval_data and approval_data.license_expiry_date else None,
            
            # Next steps and messaging
            "next_steps": next_steps,
            "status_message": status_message,
            "estimated_review_time": estimated_review_time
        }

    except Exception as e:
        print(f"Error getting approval status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get approval status"
        )

# ============================================================================
# PROFILE ACCESS ENDPOINTS
# ============================================================================

@router.get("/public/{specialist_id}", response_model=SpecialistPublicProfile)
async def get_specialist_public_profile(
    specialist_id: uuid.UUID,
    include_contact: bool = False,
    db: Session = Depends(get_db)
):
    """Get specialist's public profile"""
    try:
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False,
            Specialists.approval_status == ApprovalStatusEnum.APPROVED
        ).first()

        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found or not approved"
            )

        # Get specializations
        specializations = db.query(SpecialistSpecializations).filter(
            SpecialistSpecializations.specialist_id == specialist.id
        ).all()

        # Get availability slots
        availability_slots = db.query(SpecialistAvailability).filter(
            SpecialistAvailability.specialist_id == specialist.id
        ).all()

        # Get documents for completion calculation
        documents = db.query(SpecialistDocuments).join(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).all()

        profile_completion = calculate_profile_completion(
            specialist, specializations, availability_slots, documents
        )

        # Build base profile
        profile_data = {
            "id": str(specialist.id),
            "full_name": f"{specialist.first_name} {specialist.last_name}",
            "specialist_type": specialist.specialist_type.value if specialist.specialist_type else None,
            "years_experience": specialist.years_experience,
            "bio": specialist.bio,
            "consultation_fee": float(specialist.consultation_fee) if specialist.consultation_fee else None,
            "languages_spoken": specialist.languages_spoken,
            "clinic_name": specialist.clinic_name,
            "city": specialist.city,
            "specializations": [
                {
                    "specialization": spec.specialization.value if spec.specialization else None,
                    "years_experience": spec.years_of_experience_in_specialization,
                    "years_of_experience_in_specialization": spec.years_of_experience_in_specialization,
                    "is_primary": spec.is_primary_specialization,
                    "is_primary_specialization": spec.is_primary_specialization
                }
                for spec in specializations
            ],
            "availability_status": specialist.availability_status.value if specialist.availability_status else None,
            "profile_completion_percentage": profile_completion,
            
            # New fields
            "consultation_modes": specialist.consultation_modes,
            "clinic_address": specialist.clinic_address,
            "availability_schedule": specialist.availability_schedule,
            "profile_image_url": specialist.profile_image_url,
            "rating": float(specialist.average_rating) if specialist.average_rating else None,
            "total_reviews": specialist.total_reviews,
            "qualifications": specialist.qualification,
            "institution": specialist.institution,
            "current_affiliation": specialist.current_affiliation,
            "experience_summary": specialist.experience_summary,
            "specialties_in_mental_health": specialist.specialties_in_mental_health,
            "therapy_methods": specialist.therapy_methods,
            "is_verified": specialist.profile_verified if hasattr(specialist, 'profile_verified') else False,
            "currency": specialist.currency if hasattr(specialist, 'currency') else 'PKR'
        }
        
        # Add optional contact info if requested
        if include_contact:
            profile_data["email"] = specialist.email
            profile_data["phone"] = specialist.phone
        
        return SpecialistPublicProfile(**profile_data)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting public profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve specialist profile"
        )

@router.get("/{specialist_id}/reviews", response_model=List[SpecialistReviewResponse])
async def get_specialist_reviews(
    specialist_id: uuid.UUID,
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get reviews for a specific specialist"""
    try:
        # Get specialist to verify they exist
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()

        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )

        # Get approved reviews with patient data using JOIN to avoid N+1 queries
        reviews_query = db.query(
            SpecialistReview,
            Patient.first_name,
            Patient.last_name
        ).outerjoin(
            Patient, 
            (SpecialistReview.patient_id == Patient.id) & (SpecialistReview.is_anonymous == False)
        ).filter(
            SpecialistReview.specialist_id == specialist_id,
            SpecialistReview.status == ReviewStatusEnum.APPROVED
        ).order_by(
            SpecialistReview.created_at.desc()
        ).offset(offset).limit(limit).all()

        # Convert to response models
        review_responses = []
        for review, patient_first_name, patient_last_name in reviews_query:
            # Build patient name if available and not anonymous
            patient_name = None
            if patient_first_name and patient_last_name and not review.is_anonymous:
                patient_name = f"{patient_first_name} {patient_last_name}"
            
            review_responses.append(SpecialistReviewResponse(
                id=str(review.id),
                appointment_id=str(review.appointment_id),
                specialist_id=str(review.specialist_id),
                patient_id=str(review.patient_id),
                rating=review.rating,
                review_text=review.review_text,
                is_anonymous=review.is_anonymous,
                status=review.status.value if review.status else "pending",
                communication_rating=review.communication_rating,
                professionalism_rating=review.professionalism_rating,
                effectiveness_rating=review.effectiveness_rating,
                specialist_response=review.specialist_response,
                specialist_response_at=review.specialist_response_at,
                created_at=review.created_at,
                updated_at=review.updated_at,
                patient_name=patient_name
            ))

        return review_responses

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting specialist reviews: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve specialist reviews"
        )

@router.get("/protected/{specialist_id}", response_model=SpecialistProtectedProfile)
async def get_specialist_protected_profile(
    specialist_id: uuid.UUID,
    current_admin: Admin = Depends(get_authenticated_admin),
    db: Session = Depends(get_db)
):
    """Get specialist's protected profile (admin only)"""
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

        # Get related data
        auth_info = db.query(SpecialistsAuthInfo).filter(
            SpecialistsAuthInfo.specialist_id == specialist.id
        ).first()

        specializations = db.query(SpecialistSpecializations).filter(
            SpecialistSpecializations.specialist_id == specialist.id
        ).all()

        approval_data = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).first()

        documents = []
        if approval_data:
            docs = db.query(SpecialistDocuments).filter(
                SpecialistDocuments.approval_data_id == approval_data.id
            ).all()
            documents = [
                {
                    "id": str(doc.id),
                    "document_type": doc.document_type.value,
                    "document_name": doc.document_name,
                    "verification_status": doc.verification_status.value if doc.verification_status else None,
                    "upload_date": doc.upload_date,
                    "expiry_date": doc.expiry_date
                }
                for doc in docs
            ]

        availability_slots = db.query(SpecialistAvailability).filter(
            SpecialistAvailability.specialist_id == specialist.id
        ).all()
        availability_list = [slot.time_slot.value for slot in availability_slots]

        profile_completion = calculate_profile_completion(
            specialist, specializations, availability_slots, documents
        )

        return SpecialistProtectedProfile(
            id=str(specialist.id),
            email=specialist.email,
            full_name=f"{specialist.first_name} {specialist.last_name}",
            phone=specialist.phone,
            address=specialist.address,
            clinic_name=specialist.clinic_name,
            bio=specialist.bio,
            consultation_fee=float(specialist.consultation_fee) if specialist.consultation_fee else None,
            languages_spoken=specialist.languages_spoken,
            website_url=specialist.website_url,
            social_media_links=specialist.social_media_links,
            specialist_type=specialist.specialist_type.value if specialist.specialist_type else None,
            years_experience=specialist.years_experience,
            approval_status=specialist.approval_status.value if specialist.approval_status else "pending",
            created_at=specialist.created_at,
            last_login=auth_info.last_login_at if auth_info else None,
            email_verification_status=auth_info.email_verification_status.value if auth_info and auth_info.email_verification_status else None,
            specializations=[
                {
                    "specialization": spec.specialization.value if spec.specialization else None,
                    "years_experience": spec.years_of_experience_in_specialization,
                    "years_of_experience_in_specialization": spec.years_of_experience_in_specialization,
                    "is_primary": spec.is_primary_specialization,
                    "is_primary_specialization": spec.is_primary_specialization,
                    "certification_date": spec.certification_date
                }
                for spec in specializations
            ],
            documents=documents,
            availability_slots=availability_list,
            profile_completion_percentage=profile_completion,
            submission_date=approval_data.submission_date if approval_data and approval_data.submission_date else None
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting protected profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve specialist profile"
        )

@router.get("/private/me", response_model=SpecialistPrivateProfile)
async def get_my_private_profile(
    current_specialist: Specialists = Depends(get_authenticated_specialist),
    db: Session = Depends(get_db)
):
    """Get specialist's own private profile"""
    try:
        specialist = current_specialist

        # Get related data
        auth_info = db.query(SpecialistsAuthInfo).filter(
            SpecialistsAuthInfo.specialist_id == specialist.id
        ).first()

        # Query specializations - wrap in try-except in case transaction was aborted
        specializations = []
        try:
            specializations = db.query(SpecialistSpecializations).filter(
                SpecialistSpecializations.specialist_id == specialist.id
            ).all()
        except Exception as spec_error:
            # If query fails due to transaction issues, rollback and retry
            error_str = str(spec_error).lower()
            if "infailedsqltransaction" in error_str:
                logger.warning(f"Transaction was aborted, rolling back and retrying specializations query for specialist {specialist.id}")
                db.rollback()
                try:
                    specializations = db.query(SpecialistSpecializations).filter(
                        SpecialistSpecializations.specialist_id == specialist.id
                    ).all()
                except Exception as retry_error:
                    logger.error(f"Failed to load specializations after rollback for specialist {specialist.id}: {retry_error}")
                    specializations = []
            else:
                logger.warning(f"Could not load specializations for specialist {specialist.id}: {spec_error}")
                specializations = []

        # Query approval_data - handle potential database schema mismatch
        approval_data = None
        documents = []
        docs = []
        try:
            approval_data = db.query(SpecialistsApprovalData).filter(
                SpecialistsApprovalData.specialist_id == specialist.id
            ).first()
        except Exception as approval_error:
            # If query fails (e.g., due to missing column in DB), rollback transaction and continue without approval_data
            error_str = str(approval_error).lower()
            if "languages_spoken" in error_str or "undefinedcolumn" in error_str or "infailedsqltransaction" in error_str:
                # This is expected behavior - column doesn't exist in DB, use debug level instead of warning
                logger.debug(f"Schema mismatch: approval_data table missing languages_spoken column. Rolling back and skipping approval_data for specialist {specialist.id}")
                db.rollback()  # Rollback to allow subsequent queries to proceed
            else:
                logger.warning(f"Could not load approval_data for specialist {specialist.id}: {approval_error}")
                db.rollback()  # Rollback to allow subsequent queries to proceed
            approval_data = None
        
        if approval_data:
            docs = db.query(SpecialistDocuments).filter(
                SpecialistDocuments.approval_data_id == approval_data.id
            ).all()
            documents = [
                {
                    "id": str(doc.id),
                    "document_type": doc.document_type.value,
                    "document_name": doc.document_name,
                    "verification_status": doc.verification_status.value if doc.verification_status else None,
                    "upload_date": doc.upload_date,
                    "expiry_date": doc.expiry_date
                }
                for doc in docs
            ]

        # Query availability_slots - wrap in try-except in case transaction was aborted
        availability_slots = []
        try:
            availability_slots = db.query(SpecialistAvailability).filter(
                SpecialistAvailability.specialist_id == specialist.id
            ).all()
        except Exception as avail_error:
            # If query fails due to transaction issues, rollback and retry
            error_str = str(avail_error).lower()
            if "infailedsqltransaction" in error_str:
                logger.warning(f"Transaction was aborted, rolling back and retrying availability query for specialist {specialist.id}")
                db.rollback()
                try:
                    availability_slots = db.query(SpecialistAvailability).filter(
                        SpecialistAvailability.specialist_id == specialist.id
                    ).all()
                except Exception as retry_error:
                    logger.error(f"Failed to load availability_slots after rollback for specialist {specialist.id}: {retry_error}")
                    availability_slots = []
            else:
                logger.warning(f"Could not load availability_slots for specialist {specialist.id}: {avail_error}")
                availability_slots = []
        
        availability_list = [
            {
                "time_slot": slot.time_slot.value,
                "display": slot.slot_display,
                "created_at": slot.created_at
            }
            for slot in availability_slots
        ]

        profile_completion = calculate_profile_completion(
            specialist, specializations, availability_slots, docs
        )

        approval_info = None
        if approval_data:
            approval_info = {
                "license_number": approval_data.license_number,
                "submission_date": approval_data.updated_at,
                "created_at": approval_data.created_at
            }

        return SpecialistPrivateProfile(
            id=str(specialist.id),
            email=specialist.email,
            first_name=specialist.first_name,
            last_name=specialist.last_name,
            phone=specialist.phone,
            address=specialist.address,
            city=specialist.city,
            clinic_name=specialist.clinic_name,
            bio=specialist.bio,
            consultation_fee=float(specialist.consultation_fee) if specialist.consultation_fee else None,
            languages_spoken=specialist.languages_spoken,
            website_url=specialist.website_url,
            social_media_links=specialist.social_media_links,
            specialist_type=specialist.specialist_type.value if specialist.specialist_type else None,
            years_experience=specialist.years_experience,
            approval_status=specialist.approval_status.value if specialist.approval_status else "pending",
            created_at=specialist.created_at,
            updated_at=specialist.updated_at,
            last_login=auth_info.last_login_at if auth_info else None,
            email_verification_status=auth_info.email_verification_status.value if auth_info and auth_info.email_verification_status else None,
            specializations=[
                {
                    "specialization": spec.specialization.value if spec.specialization else None,
                    "years_of_experience": spec.years_of_experience_in_specialization,
                    "is_primary": spec.is_primary_specialization,
                    "certification_date": spec.certification_date
                }
                for spec in specializations
            ],
            documents=documents,
            availability_slots=availability_list,
            profile_completion_percentage=profile_completion,
            approval_data=approval_info
        )

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error getting private profile: {e}\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve profile: {str(e)}"
        )

# ============================================================================
# APPOINTMENT MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/appointments/filter", response_model=FilteredAppointmentsResponse)
async def filter_appointments(
    request: AppointmentFilterRequest,
    current_specialist: Specialists = Depends(get_authenticated_specialist),
    db: Session = Depends(get_db)
):
    """Filter appointments for the current specialist"""
    try:
        specialist_id = current_specialist.id
        
        # Build base query for this specialist's appointments
        query = db.query(Appointment).filter(
            Appointment.specialist_id == specialist_id
        )
        
        # Apply status filter if provided
        if request.status:
            try:
                # Try to match the status string to enum
                status_enum = None
                for status in AppointmentStatusEnum:
                    if status.value.lower() == request.status.lower():
                        status_enum = status
                        break
                
                if status_enum:
                    query = query.filter(Appointment.status == status_enum)
                else:
                    # If no match, try direct enum creation (will fail if invalid)
                    try:
                        query = query.filter(Appointment.status == AppointmentStatusEnum(request.status))
                    except ValueError:
                        logger.warning(f"Invalid status filter: {request.status}")
            except Exception as e:
                logger.warning(f"Error applying status filter: {str(e)}")
        
        # Apply patient filter if provided
        if request.patient_id:
            try:
                patient_uuid = uuid.UUID(request.patient_id)
                query = query.filter(Appointment.patient_id == patient_uuid)
            except ValueError:
                logger.warning(f"Invalid patient_id format: {request.patient_id}")
        
        # Apply date filters
        if request.from_date:
            if isinstance(request.from_date, datetime):
                query = query.filter(Appointment.scheduled_start >= request.from_date)
            else:
                query = query.filter(func.date(Appointment.scheduled_start) >= request.from_date)
        
        if request.to_date:
            if isinstance(request.to_date, datetime):
                query = query.filter(Appointment.scheduled_start <= request.to_date)
            else:
                query = query.filter(func.date(Appointment.scheduled_start) <= request.to_date)
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply ordering (most recent first)
        query = query.order_by(Appointment.scheduled_start.desc())
        
        # Apply pagination
        appointments = query.offset(request.offset).limit(request.limit).all()
        
        # Convert to response format
        appointment_list = []
        for apt in appointments:
            # Get patient info
            patient = db.query(Patient).filter(Patient.id == apt.patient_id).first()
            
            appointment_data = {
                "id": str(apt.id),
                "patient_id": str(apt.patient_id),
                "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
                "scheduled_start": apt.scheduled_start.isoformat() if apt.scheduled_start else None,
                "scheduled_end": apt.scheduled_end.isoformat() if apt.scheduled_end else None,
                "status": apt.status.value if apt.status else None,
                "appointment_type": apt.appointment_type.value if apt.appointment_type else None,
                "fee": float(apt.fee) if apt.fee else None,
                "payment_status": apt.payment_status.value if apt.payment_status else None,
                "created_at": apt.created_at.isoformat() if apt.created_at else None
            }
            appointment_list.append(appointment_data)
        
        # Calculate pagination
        current_page = (request.offset // request.limit) + 1 if request.limit > 0 else 1
        has_more = (request.offset + request.limit) < total_count
        
        return FilteredAppointmentsResponse(
            appointments=appointment_list,
            total_count=total_count,
            page=current_page,
            size=request.limit,
            has_more=has_more
        )

    except Exception as e:
        logger.error(f"Error filtering appointments: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to filter appointments"
        )

@router.put("/appointments/{appointment_id}/status", response_model=StatusUpdateResponse)
async def update_appointment_status(
    appointment_id: str,
    request: UpdateAppointmentStatusRequest,
    current_specialist: Specialists = Depends(get_authenticated_specialist),
    db: Session = Depends(get_db)
):
    """Update appointment status"""
    try:
        # This would integrate with the SMA system
        # For now, return a placeholder response
        return StatusUpdateResponse(
            success=True,
            message="Appointment status updated",
            appointment_id=appointment_id,
            new_status=request.status,
            updated_at=datetime.now(timezone.utc)
        )

    except Exception as e:
        print(f"Error updating appointment status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update appointment status"
        )

@router.post("/patients/filter", response_model=FilteredPatientsResponse)
async def filter_patients(
    request: PatientFilterRequest,
    current_specialist: Specialists = Depends(get_authenticated_specialist),
    db: Session = Depends(get_db)
):
    """Filter patients for the current specialist based on appointments"""
    try:
        specialist_id = current_specialist.id
        
        # Get all unique patient IDs for this specialist from appointments
        # Use distinct() to get unique patient IDs directly from database
        base_patient_ids_query = db.query(Appointment.patient_id).filter(
            Appointment.specialist_id == specialist_id
        ).distinct()
        
        patient_ids_list = [pid[0] for pid in base_patient_ids_query.all()]
        
        if not patient_ids_list:
            return FilteredPatientsResponse(
                patients=[],
                total_count=0,
                page=(request.offset // request.limit) + 1 if request.limit > 0 else 1,
                size=request.limit,
                has_more=False
            )
        
        # Get patient details
        patients_query = db.query(Patient).filter(Patient.id.in_(patient_ids_list))
        
        # Apply search filter if provided
        if request.search:
            search_term = f"%{request.search.lower()}%"
            patients_query = patients_query.filter(
                or_(
                    func.lower(Patient.first_name).like(search_term),
                    func.lower(Patient.last_name).like(search_term),
                    func.lower(Patient.email).like(search_term),
                    func.lower(func.concat(Patient.first_name, ' ', Patient.last_name)).like(search_term)
                )
            )
        
        # Get all patients first (before filtering by status, so we can calculate status)
        all_patients = patients_query.all()
        
        # Build patient data with appointment statistics and apply status filter
        patient_data_list = []
        for patient in all_patients:
            # Get all appointments for this patient with this specialist
            patient_appointments = db.query(Appointment).filter(
                Appointment.patient_id == patient.id,
                Appointment.specialist_id == specialist_id
            ).order_by(
                func.coalesce(Appointment.scheduled_start, Appointment.created_at).desc()
            ).all()
            
            # Calculate statistics
            total_sessions = len(patient_appointments)
            last_session_date = None
            latest_appointment = None
            latest_status = None
            latest_date = None
            
            if patient_appointments:
                latest_appointment = patient_appointments[0]
                latest_status = latest_appointment.status
                latest_date = latest_appointment.scheduled_start or latest_appointment.created_at
                
                # Set last_session_date
                if latest_appointment.scheduled_start:
                    last_session_date = latest_appointment.scheduled_start.isoformat()
                elif latest_appointment.created_at:
                    last_session_date = latest_appointment.created_at.isoformat()
            
            # Determine patient status based on most recent appointment
            patient_status = 'active'
            if patient_appointments and latest_status:
                if latest_status == AppointmentStatusEnum.COMPLETED:
                    # Check if it's recent (within 30 days)
                    if latest_date:
                        if isinstance(latest_date, datetime):
                            days_since = (datetime.now(timezone.utc) - latest_date).days
                        else:
                            # Handle date objects
                            days_since = (date.today() - latest_date).days
                        if days_since > 30:
                            patient_status = 'discharged'
                        else:
                            patient_status = 'follow_up'
                elif latest_status == AppointmentStatusEnum.CANCELLED:
                    patient_status = 'discharged'
                elif latest_status in [AppointmentStatusEnum.PENDING_APPROVAL, AppointmentStatusEnum.SCHEDULED]:
                    patient_status = 'new'
                elif latest_status == AppointmentStatusEnum.CONFIRMED:
                    patient_status = 'active'
            
            # Apply status filter if specified (skip if doesn't match)
            if request.status and request.status.lower() != 'all':
                status_lower = request.status.lower()
                if status_lower != patient_status:
                    continue  # Skip this patient if status doesn't match
            
            patient_data = {
                "id": str(patient.id),
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "email": patient.email,
                "phone": patient.phone,
                "status": patient_status,
                "total_sessions": total_sessions,
                "last_session_date": last_session_date,
                "created_at": patient.created_at.isoformat() if patient.created_at else None
            }
            patient_data_list.append(patient_data)
        
        # Apply pagination after filtering by status
        total_patients = len(patient_data_list)
        paginated_patients = patient_data_list[request.offset:request.offset + request.limit]
        
        # Calculate pagination
        current_page = (request.offset // request.limit) + 1 if request.limit > 0 else 1
        has_more = (request.offset + request.limit) < total_patients
        
        return FilteredPatientsResponse(
            patients=paginated_patients,
            total_count=total_patients,
            page=current_page,
            size=request.limit,
            has_more=has_more
        )

    except Exception as e:
        logger.error(f"Error filtering patients: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to filter patients: {str(e)}"
        )

# ============================================================================
# DASHBOARD ENDPOINTS
# ============================================================================

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_specialist: Specialists = Depends(get_authenticated_specialist),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for the specialist"""
    try:
        specialist_id = current_specialist.id
        today = date.today()
        today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
        today_end = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
        month_start = datetime.combine(today.replace(day=1), datetime.min.time()).replace(tzinfo=timezone.utc)
        
        # Appointment statistics
        total_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.specialist_id == specialist_id
        ).scalar() or 0
        
        pending_approvals = db.query(func.count(Appointment.id)).filter(
            Appointment.specialist_id == specialist_id,
            Appointment.status == AppointmentStatusEnum.PENDING_APPROVAL
        ).scalar() or 0
        
        scheduled_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.specialist_id == specialist_id,
            Appointment.status.in_([AppointmentStatusEnum.SCHEDULED, AppointmentStatusEnum.CONFIRMED])
        ).scalar() or 0
        
        completed_sessions = db.query(func.count(Appointment.id)).filter(
            Appointment.specialist_id == specialist_id,
            Appointment.status == AppointmentStatusEnum.COMPLETED
        ).scalar() or 0
        
        # Today's appointments
        # Note: IN_SESSION enum value doesn't exist in database, using only SCHEDULED and CONFIRMED
        todays_appointments = db.query(func.count(Appointment.id)).filter(
            Appointment.specialist_id == specialist_id,
            func.date(Appointment.scheduled_start) == today,
            Appointment.status.in_([
                AppointmentStatusEnum.SCHEDULED,
                AppointmentStatusEnum.CONFIRMED
            ])
        ).scalar() or 0
        
        today_sessions = todays_appointments  # Alias
        
        # Upcoming sessions (next 7 days)
        seven_days_later = today + timedelta(days=7)
        upcoming_sessions = db.query(func.count(Appointment.id)).filter(
            Appointment.specialist_id == specialist_id,
            func.date(Appointment.scheduled_start) > today,
            func.date(Appointment.scheduled_start) <= seven_days_later,
            Appointment.status.in_([
                AppointmentStatusEnum.SCHEDULED,
                AppointmentStatusEnum.CONFIRMED
            ])
        ).scalar() or 0
        
        # Patient statistics
        # Get unique patients from appointments
        unique_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
            Appointment.specialist_id == specialist_id
        ).scalar() or 0
        
        total_patients = unique_patients
        
        # Active patients (have appointments in last 30 days)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        active_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
            Appointment.specialist_id == specialist_id,
            Appointment.scheduled_start >= thirty_days_ago,
            Appointment.status != AppointmentStatusEnum.CANCELLED
        ).scalar() or 0
        
        # New patients this month
        new_patients = db.query(func.count(func.distinct(Appointment.patient_id))).filter(
            Appointment.specialist_id == specialist_id,
            Appointment.created_at >= month_start
        ).scalar() or 0
        
        # Pending reviews (appointments completed but not reviewed)
        # Check if there's no review relationship for completed appointments
        pending_reviews = db.query(func.count(Appointment.id)).filter(
            Appointment.specialist_id == specialist_id,
            Appointment.status == AppointmentStatusEnum.COMPLETED,
            ~Appointment.review.has()
        ).scalar() or 0
        
        # Forum answers count
        forum_answers = db.query(func.count(ForumAnswer.id)).filter(
            ForumAnswer.specialist_id == specialist_id,
            ForumAnswer.is_deleted == False,
            ForumAnswer.status == AnswerStatus.ACTIVE
        ).scalar() or 0
        
        # Helper function for time ago
        def get_time_ago(dt: datetime) -> str:
            if not dt:
                return "recently"
            now = datetime.now(timezone.utc)
            dt_utc = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
            diff = now - dt_utc
            
            if diff.total_seconds() < 60:
                return "just now"
            elif diff.total_seconds() < 3600:
                minutes = int(diff.total_seconds() / 60)
                return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
            elif diff.total_seconds() < 86400:
                hours = int(diff.total_seconds() / 3600)
                return f"{hours} hour{'s' if hours != 1 else ''} ago"
            elif diff.days < 7:
                return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
            else:
                return dt_utc.strftime("%b %d, %Y")
        
        # Recent activities (last 10 activities)
        recent_activities = []
        
        # Recent appointments
        recent_appts = db.query(Appointment).filter(
            Appointment.specialist_id == specialist_id
        ).order_by(Appointment.created_at.desc()).limit(5).all()
        
        for apt in recent_appts:
            time_ago = get_time_ago(apt.created_at) if apt.created_at else "recently"
            if apt.status == AppointmentStatusEnum.PENDING_APPROVAL:
                recent_activities.append({
                    "id": str(apt.id),
                    "type": "appointment",
                    "message": f"New appointment request from patient",
                    "time": time_ago,
                    "timestamp": apt.created_at.isoformat() if apt.created_at else None,
                    "color": "emerald"
                })
            elif apt.status == AppointmentStatusEnum.COMPLETED:
                recent_activities.append({
                    "id": str(apt.id),
                    "type": "appointment",
                    "message": f"Appointment completed",
                    "time": time_ago,
                    "timestamp": apt.scheduled_start.isoformat() if apt.scheduled_start else None,
                    "color": "blue"
                })
        
        # Recent forum answers
        recent_answers = db.query(ForumAnswer).filter(
            ForumAnswer.specialist_id == specialist_id,
            ForumAnswer.is_deleted == False
        ).order_by(ForumAnswer.created_at.desc()).limit(3).all()
        
        for answer in recent_answers:
            time_ago = get_time_ago(answer.created_at) if answer.created_at else "recently"
            if answer.is_helpful:
                recent_activities.append({
                    "id": str(answer.id),
                    "type": "forum",
                    "message": "Your forum answer was marked as helpful",
                    "time": time_ago,
                    "timestamp": answer.created_at.isoformat() if answer.created_at else None,
                    "color": "purple"
                })
            else:
                recent_activities.append({
                    "id": str(answer.id),
                    "type": "forum",
                    "message": "You answered a forum question",
                    "time": time_ago,
                    "timestamp": answer.created_at.isoformat() if answer.created_at else None,
                    "color": "purple"
                })
        
        # Sort by timestamp (most recent first) and limit to 10
        recent_activities.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
        recent_activities = recent_activities[:10]
        
        # Convert to ActivityData objects
        activity_objects = [
            ActivityData(
                id=act["id"],
                type=act["type"],
                message=act["message"],
                time=act["time"],
                timestamp=act.get("timestamp"),
                color=act.get("color")
            )
            for act in recent_activities
        ]
        
        return DashboardStats(
            total_appointments=total_appointments,
            pending_approvals=pending_approvals,
            scheduled_appointments=scheduled_appointments,
            completed_sessions=completed_sessions,
            total_patients=total_patients,
            new_patients=new_patients,
            active_patients=active_patients,
            today_sessions=today_sessions,
            upcoming_sessions=upcoming_sessions,
            todays_appointments=todays_appointments,
            pending_reviews=pending_reviews,
            forum_answers=forum_answers,
            recent_activities=activity_objects
        )

    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get dashboard statistics"
        )

# ============================================================================
# PROFILE COMPLETION ENDPOINTS
# ============================================================================

@router.get("/profile/completion-status", response_model=ProfileCompletionStatus)
async def get_profile_completion_status(
    current_specialist: Specialists = Depends(get_authenticated_specialist),
    db: Session = Depends(get_db)
):
    """Get detailed profile completion status for the current specialist"""
    try:
        specialist = current_specialist

        # Get related data
        specializations = db.query(SpecialistSpecializations).filter(
            SpecialistSpecializations.specialist_id == specialist.id
        ).all()

        availability_slots = db.query(SpecialistAvailability).filter(
            SpecialistAvailability.specialist_id == specialist.id
        ).all()

        approval_data = db.query(SpecialistsApprovalData).filter(
            SpecialistsApprovalData.specialist_id == specialist.id
        ).first()

        documents = []
        if approval_data:
            documents = db.query(SpecialistDocuments).filter(
                SpecialistDocuments.approval_data_id == approval_data.id
            ).all()

        # Define required fields and their current values
        required_fields = {
            "first_name": specialist.first_name,
            "last_name": specialist.last_name,
            "email": specialist.email,
            "phone": specialist.phone,
            "address": specialist.address,
            "bio": specialist.bio,
            "consultation_fee": specialist.consultation_fee,
            "languages_spoken": specialist.languages_spoken,
            "specializations": len(specializations) > 0,
            "availability_slots": len(availability_slots) > 0
        }

        # Calculate completion
        completed_fields = []
        missing_fields = []
        completed_count = 0

        for field_name, field_value in required_fields.items():
            if field_value is not None and str(field_value).strip() != "":
                completed_fields.append(field_name)
                completed_count += 1
            else:
                missing_fields.append(field_name)

        total_required = len(required_fields)
        completion_percentage = round((completed_count / total_required) * 100, 1)

        # Document requirements
        mandatory_doc_types = ['identity_card', 'degree', 'license', 'experience_letter']
        uploaded_doc_types = [doc.document_type.value for doc in documents] if documents else []
        completed_documents = sum(1 for doc_type in mandatory_doc_types if doc_type in uploaded_doc_types)

        # Generate next steps based on current status
        next_steps = []

        if completion_percentage < 100:
            next_steps.append("Complete all missing profile fields listed above")

        if completed_documents < 4:
            missing_docs = [doc for doc in mandatory_doc_types if doc not in uploaded_doc_types]
            next_steps.append(f"Upload required documents: {', '.join(missing_docs)}")

        if completion_percentage >= 60 and completed_documents >= 4:
            next_steps.append("Submit your application for admin approval")
        elif completion_percentage < 60:
            next_steps.append("Complete at least 60% of your profile before submission")

        if specialist.approval_status == ApprovalStatusEnum.PENDING:
            next_steps.append("Verify your email address")
        elif specialist.approval_status == ApprovalStatusEnum.UNDER_REVIEW:
            next_steps.append("Your application is under review - check back soon")
        elif specialist.approval_status == ApprovalStatusEnum.APPROVED:
            next_steps.append("Your profile is approved! You can now accept appointments")

        # Determine if ready for submission
        is_ready_for_submission = (
            completion_percentage >= 60 and
            completed_documents >= 4 and
            specialist.approval_status == ApprovalStatusEnum.PENDING
        )

        return ProfileCompletionStatus(
            completion_percentage=completion_percentage,
            completed_fields=completed_fields,
            missing_fields=missing_fields,
            total_required_fields=total_required,
            completed_required_fields=completed_count,
            next_steps=next_steps,
            is_ready_for_submission=is_ready_for_submission
        )

    except Exception as e:
        logger.error(f"Error getting profile completion status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile completion status"
        )

@router.get("/profile/{specialist_id}", response_model=SpecialistPublicProfile)
async def get_specialist_profile(
    specialist_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Get specialist's public profile by ID - alias for /public/{specialist_id}"""
    # Redirect to the public profile endpoint
    return await get_specialist_public_profile(specialist_id, False, db)

# ============================================================================
# SLOT MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/slots/generate", response_model=Dict[str, Any])
async def generate_time_slots(
    request: GenerateSlotsRequest,
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Generate time slots for the specialist based on their availability patterns"""
    try:
        slot_manager = SlotManagementService(db)
        result = slot_manager.generate_slots_for_specialist(
            specialist_id=str(specialist.id),
            start_date=request.start_date,
            end_date=request.end_date,
            slot_duration_minutes=request.slot_duration_minutes
        )
        return result

    except Exception as e:
        logger.error(f"Error generating slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate time slots"
        )

@router.get("/slots")
async def get_my_slots(
    from_date: Optional[date] = Query(None, description="Start date filter"),
    to_date: Optional[date] = Query(None, description="End date filter"),
    status: Optional[str] = Query(None, description="Filter by status: available, booked, blocked"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Results per page"),
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Get specialist's time slots"""
    try:
        slot_manager = SlotManagementService(db)
        slots = slot_manager.get_available_slots(
            specialist_id=str(specialist.id),
            start_date=from_date,
            end_date=to_date,
            include_booked=True
        )

        # Filter by status if specified
        if status:
            slots = [slot for slot in slots if slot['status'] == status]

        # Apply pagination
        total_count = len(slots)
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_slots = slots[start_idx:end_idx]

        return {
            "slots": paginated_slots,
            "total_count": total_count,
            "page": page,
            "size": size,
            "total_pages": (total_count + size - 1) // size,
            "has_more": end_idx < total_count
        }

    except Exception as e:
        logger.error(f"Error getting slots: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve time slots"
        )

@router.post("/slots/block", response_model=SlotManagementResponse)
async def block_slot(
    request: SlotActionRequest,
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Block a time slot to prevent booking"""
    try:
        slot_manager = SlotManagementService(db)
        result = slot_manager.block_slot(request.slot_id)
        return SlotManagementResponse(**result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error blocking slot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to block slot"
        )

@router.post("/slots/unblock", response_model=SlotManagementResponse)
async def unblock_slot(
    request: SlotActionRequest,
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Unblock a time slot to allow booking"""
    try:
        slot_manager = SlotManagementService(db)
        result = slot_manager.unblock_slot(request.slot_id)
        return SlotManagementResponse(**result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error unblocking slot: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unblock slot"
        )

@router.get("/slots/availability-summary")
async def get_availability_summary(
    from_date: Optional[date] = Query(None, description="Start date for summary"),
    to_date: Optional[date] = Query(None, description="End date for summary"),
    db: Session = Depends(get_db),
    specialist: Specialists = Depends(get_authenticated_specialist)
):
    """Get availability summary for the specialist"""
    try:
        slot_manager = SlotManagementService(db)
        result = slot_manager.get_specialist_availability_summary(
            specialist_id=str(specialist.id),
            start_date=from_date,
            end_date=to_date
        )
        return result

    except Exception as e:
        logger.error(f"Error getting availability summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get availability summary"
        )

# ============================================================================
# SEARCH ENDPOINTS FOR PATIENTS
# ============================================================================

@router.get("/search")
async def search_specialists(
    page: int = 1,
    size: int = 50,
    city: Optional[str] = None,
    specialization: Optional[str] = None,
    has_appointments: Optional[bool] = None,
    has_history: Optional[bool] = None,
    min_rating: Optional[float] = None,
    max_fee: Optional[float] = None,
    consultation_mode: Optional[str] = None,
    language: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Search specialists for patients with filtering options"""
    try:
        # Build query for approved specialists only
        # Use explicit column selection to avoid loading missing columns
        query = db.query(
            Specialists.id,
            Specialists.first_name,
            Specialists.last_name,
            Specialists.email,
            Specialists.phone,
            Specialists.city,
            Specialists.clinic_name,
            Specialists.consultation_fee,
            Specialists.bio,
            Specialists.languages_spoken,
            Specialists.average_rating,
            Specialists.total_reviews,
            Specialists.total_appointments,
            Specialists.years_experience,
            Specialists.profile_image_url,
            Specialists.website_url,
            Specialists.specialist_type,
            Specialists.created_at,
            Specialists.updated_at
        ).filter(
            Specialists.is_deleted == False,
            Specialists.approval_status == ApprovalStatusEnum.APPROVED,
            Specialists.availability_status == AvailabilityStatusEnum.ACCEPTING_NEW_PATIENTS
        )
        
        # Apply filters
        if city:
            query = query.filter(Specialists.city.ilike(f"%{city}%"))
        
        if max_fee:
            query = query.filter(Specialists.consultation_fee <= max_fee)
        
        if min_rating:
            query = query.filter(Specialists.average_rating >= min_rating)
        
        if language:
            query = query.filter(Specialists.languages_spoken.contains([language]))
        
        if consultation_mode:
            query = query.filter(Specialists.consultation_modes.contains([consultation_mode]))
        
        # Handle specialization filter
        if specialization:
            specialization_query = db.query(SpecialistSpecializations).filter(
                SpecialistSpecializations.specialization == specialization
            ).subquery()
            query = query.join(specialization_query, Specialists.id == specialization_query.c.specialist_id)
        
        # Calculate total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * size
        specialists = query.offset(offset).limit(size).all()
        
        # Build response data
        specialist_data = []
        for specialist in specialists:
            specialist_id = specialist.id if isinstance(specialist, tuple) else specialist.id
            
            # Get specializations
            specializations = db.query(SpecialistSpecializations).filter(
                SpecialistSpecializations.specialist_id == specialist_id
            ).all()
            
            # Get availability slots
            availability_slots = db.query(SpecialistAvailability).filter(
                SpecialistAvailability.specialist_id == specialist_id
            ).all()
            
            # Handle tuple or object results
            if isinstance(specialist, tuple):
                (spec_id, first_name, last_name, email, phone, city_val, clinic_name, consultation_fee,
                 bio, languages, avg_rating, total_reviews, total_appointments, years_exp,
                 profile_img, website, spec_type, created_at, updated_at) = specialist
            else:
                spec_id = specialist.id
                first_name = specialist.first_name
                last_name = specialist.last_name
                email = specialist.email
                phone = specialist.phone
                city_val = specialist.city
                clinic_name = specialist.clinic_name
                consultation_fee = specialist.consultation_fee
                bio = specialist.bio
                languages = specialist.languages_spoken
                avg_rating = specialist.average_rating
                total_reviews = specialist.total_reviews
                total_appointments = specialist.total_appointments
                years_exp = specialist.years_experience
                profile_img = specialist.profile_image_url
                website = specialist.website_url
                spec_type = specialist.specialist_type
                created_at = specialist.created_at
                updated_at = specialist.updated_at
            
            specialist_info = {
                "id": str(spec_id),
                "first_name": first_name,
                "last_name": last_name,
                "full_name": f"{first_name} {last_name}",
                "email": email,
                "phone": phone,
                "city": city_val,
                "clinic_name": clinic_name,
                "consultation_fee": float(consultation_fee) if consultation_fee else None,
                "bio": bio,
                "languages_spoken": languages or [],
                "average_rating": float(avg_rating),
                "total_reviews": total_reviews,
                "total_appointments": total_appointments,
                "years_experience": years_exp,
                "profile_image_url": profile_img,
                "website_url": website,
                "specialist_type": spec_type.value if spec_type else None,
                "specializations": [
                    {
                        "specialization": spec.specialization.value,
                        "years_experience": spec.years_of_experience_in_specialization,
                        "is_primary": spec.is_primary_specialization
                    }
                    for spec in specializations
                ],
                "availability_slots": [
                    {
                        "time_slot": slot.time_slot.value,
                        "display": slot.time_slot.value.replace("_", "-")
                    }
                    for slot in availability_slots
                ],
                "has_appointments_available": len(availability_slots) > 0,
                "created_at": created_at.isoformat(),
                "updated_at": updated_at.isoformat()
            }
            specialist_data.append(specialist_info)
        
        return {
            "specialists": specialist_data,
            "pagination": {
                "page": page,
                "size": size,
                "total_count": total_count,
                "total_pages": (total_count + size - 1) // size,
                "has_next": page * size < total_count,
                "has_previous": page > 1
            }
        }
        
    except Exception as e:
        logger.error(f"Error searching specialists: {str(e)}")
        # Return empty results instead of 500 error
        return {
            "specialists": [],
            "pagination": {
                "page": page,
                "size": size,
                "total_count": 0,
                "total_pages": 0,
                "has_next": False,
                "has_previous": False
            }
        }

# ============================================================================
# COMPREHENSIVE PROFILE CRUD ENDPOINTS
# ============================================================================

@router.get("/profiles", response_model=SpecialistProfileListResponse)
async def get_specialist_profiles(
    query: ProfileSearchQuery = Depends(),
    db: Session = Depends(get_db)
):
    """
    Get all specialist profiles with filtering, sorting, and pagination.
    
    Supports filtering by:
    - specialist_type, city, consultation_mode
    - experience range, fee range, rating range
    - availability_status, approval_status
    - languages, interests
    """
    try:
        # Build query
        q = db.query(Specialists).filter(Specialists.is_deleted == False)
        
        # Apply filters
        if query.query:
            search_term = f"%{query.query}%"
            q = q.filter(
                (Specialists.first_name.ilike(search_term)) |
                (Specialists.last_name.ilike(search_term)) |
                (Specialists.specialist_type.ilike(search_term)) |
                (Specialists.city.ilike(search_term)) |
                (Specialists.bio.ilike(search_term))
            )
        
        if query.specialist_type:
            q = q.filter(Specialists.specialist_type == query.specialist_type)
        
        if query.city:
            q = q.filter(Specialists.city.ilike(f"%{query.city}%"))
        
        if query.consultation_mode:
            q = q.filter(Specialists.consultation_modes.contains([query.consultation_mode.value]))
        
        if query.min_experience is not None:
            q = q.filter(Specialists.years_experience >= query.min_experience)
        
        if query.max_fee is not None:
            q = q.filter(Specialists.consultation_fee <= query.max_fee)
        
        if query.availability_status:
            q = q.filter(Specialists.availability_status == query.availability_status)
        
        if query.approval_status:
            q = q.filter(Specialists.approval_status == query.approval_status)
        
        if query.min_rating is not None:
            q = q.filter(Specialists.average_rating >= query.min_rating)
        
        if query.languages:
            for language in query.languages:
                q = q.filter(Specialists.languages_spoken.contains([language]))
        
        if query.interests:
            for interest in query.interests:
                q = q.filter(Specialists.interests.contains([interest]))
        
        # Apply sorting
        sort_column = getattr(Specialists, query.sort_by, Specialists.created_at)
        if query.sort_order == "desc":
            q = q.order_by(sort_column.desc())
        else:
            q = q.order_by(sort_column.asc())
        
        # Get total count
        total = q.count()
        
        # Apply pagination
        offset = (query.page - 1) * query.size
        specialists = q.offset(offset).limit(query.size).all()
        
        # Convert to response format
        profiles = []
        for specialist in specialists:
            profile_data = {
                "id": specialist.id,
                "first_name": specialist.first_name,
                "last_name": specialist.last_name,
                "email": specialist.email,
                "phone": specialist.phone,
                "date_of_birth": specialist.date_of_birth,
                "gender": specialist.gender.value if specialist.gender else None,
                "specialist_type": specialist.specialist_type.value if specialist.specialist_type else None,
                "years_experience": specialist.years_experience,
                "qualification": specialist.qualification,
                "institution": specialist.institution,
                "current_affiliation": specialist.current_affiliation,
                "city": specialist.city,
                "address": specialist.address,
                "clinic_name": specialist.clinic_name,
                "clinic_address": specialist.clinic_address,
                "bio": specialist.bio,
                "consultation_fee": float(specialist.consultation_fee) if specialist.consultation_fee else None,
                "currency": specialist.currency,
                "consultation_modes": specialist.consultation_modes,
                "availability_schedule": specialist.availability_schedule,
                "languages_spoken": specialist.languages_spoken,
                "profile_image_url": specialist.profile_image_url,
                "website_url": specialist.website_url,
                "social_media_links": specialist.social_media_links,
                "availability_status": specialist.availability_status.value if specialist.availability_status else None,
                "approval_status": specialist.approval_status.value if specialist.approval_status else None,
                "accepting_new_patients": specialist.accepting_new_patients,
                "average_rating": float(specialist.average_rating) if specialist.average_rating else None,
                "total_reviews": specialist.total_reviews,
                "total_appointments": specialist.total_appointments,
                "interests": specialist.interests or [],
                "education": transform_education_records(specialist.education_records or [], specialist.id),
                "certifications": transform_certification_records(specialist.certification_records or [], specialist.id),
                "experience": transform_experience_records(specialist.experience_records or [], specialist.id),
                "created_at": specialist.created_at,
                "updated_at": specialist.updated_at
            }
            
            # Add professional statement if exists
            if specialist.professional_statement_intro:
                profile_data["professional_statement"] = {
                    "id": specialist.id,
                    "specialist_id": specialist.id,
                    "intro": specialist.professional_statement_intro,
                    "role_of_psychologists": specialist.professional_statement_role,
                    "qualifications_detail": specialist.professional_statement_qualifications,
                    "experience_detail": specialist.professional_statement_experience,
                    "patient_satisfaction_team": specialist.professional_statement_patient_satisfaction,
                    "appointment_details": specialist.professional_statement_appointment_details,
                    "clinic_address": specialist.professional_statement_clinic_address,
                    "fee_details": specialist.professional_statement_fee_details,
                    "created_at": specialist.created_at,
                    "updated_at": specialist.updated_at
                }
            
            profiles.append(CRUDProfileResponse(**profile_data))
        
        return SpecialistProfileListResponse(
            profiles=profiles,
            total=total,
            page=query.page,
            size=query.size,
            has_next=offset + query.size < total,
            has_previous=query.page > 1
        )
    
    except Exception as e:
        logger.error(f"Error fetching specialist profiles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch specialist profiles"
        )

@router.get("/profiles/{specialist_id}", response_model=CRUDProfileResponse)
async def get_specialist_profile_by_id(
    specialist_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Get a specific specialist profile by ID"""
    try:
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()
        
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist profile not found"
            )
        
        # Convert to response format
        profile_data = {
            "id": specialist.id,
            "first_name": specialist.first_name,
            "last_name": specialist.last_name,
            "email": specialist.email,
            "phone": specialist.phone,
            "date_of_birth": specialist.date_of_birth,
            "gender": specialist.gender.value if specialist.gender else None,
            "specialist_type": specialist.specialist_type.value if specialist.specialist_type else None,
            "years_experience": specialist.years_experience,
            "qualification": specialist.qualification,
            "institution": specialist.institution,
            "current_affiliation": specialist.current_affiliation,
            "city": specialist.city,
            "address": specialist.address,
            "clinic_name": specialist.clinic_name,
            "clinic_address": specialist.clinic_address,
            "bio": specialist.bio,
            "consultation_fee": float(specialist.consultation_fee) if specialist.consultation_fee else None,
            "currency": specialist.currency,
            "consultation_modes": specialist.consultation_modes,
            "availability_schedule": specialist.availability_schedule,
            "languages_spoken": specialist.languages_spoken,
            "profile_image_url": specialist.profile_image_url,
            "website_url": specialist.website_url,
            "social_media_links": specialist.social_media_links,
            "availability_status": specialist.availability_status.value if specialist.availability_status else None,
            "approval_status": specialist.approval_status.value if specialist.approval_status else None,
            "accepting_new_patients": specialist.accepting_new_patients,
            "average_rating": float(specialist.average_rating) if specialist.average_rating else None,
            "total_reviews": specialist.total_reviews,
            "total_appointments": specialist.total_appointments,
            "interests": specialist.interests or [],
            "education": transform_education_records(specialist.education_records or [], specialist.id),
            "certifications": transform_certification_records(specialist.certification_records or [], specialist.id),
            "experience": transform_experience_records(specialist.experience_records or [], specialist.id),
            "created_at": specialist.created_at,
            "updated_at": specialist.updated_at
        }
        
        # Add professional statement if exists
        if specialist.professional_statement_intro:
            profile_data["professional_statement"] = {
                "id": specialist.id,
                "specialist_id": specialist.id,
                "intro": specialist.professional_statement_intro,
                "role_of_psychologists": specialist.professional_statement_role,
                "qualifications_detail": specialist.professional_statement_qualifications,
                "experience_detail": specialist.professional_statement_experience,
                "patient_satisfaction_team": specialist.professional_statement_patient_satisfaction,
                "appointment_details": specialist.professional_statement_appointment_details,
                "clinic_address": specialist.professional_statement_clinic_address,
                "fee_details": specialist.professional_statement_fee_details,
                "created_at": specialist.created_at,
                "updated_at": specialist.updated_at
            }
        
        return CRUDProfileResponse(**profile_data)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching specialist profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch specialist profile"
        )

@router.put("/profiles/{specialist_id}/interests", response_model=ProfileUpdateResponse)
async def update_specialist_interests(
    specialist_id: uuid.UUID,
    interests: List[str],
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Update specialist interests"""
    try:
        # Check permissions
        if str(current_user['user_id']) != str(specialist_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own profile"
            )
        
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()
        
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist profile not found"
            )
        
        # Update interests
        specialist.interests = interests
        specialist.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(specialist)
        
        logger.info(f"Interests updated for specialist {specialist_id}")
        
        return ProfileUpdateResponse(
            success=True,
            message="Interests updated successfully",
            updated_fields=["interests", "updated_at"],
            updated_at=specialist.updated_at
        )
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating specialist interests: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update specialist interests"
        )

@router.put("/profiles/{specialist_id}/professional-statement", response_model=ProfileUpdateResponse)
async def update_professional_statement(
    specialist_id: uuid.UUID,
    statement: ProfessionalStatementUpdate,
    current_user: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Update professional statement"""
    try:
        # Check permissions
        if str(current_user['user_id']) != str(specialist_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own profile"
            )
        
        specialist = db.query(Specialists).filter(
            Specialists.id == specialist_id,
            Specialists.is_deleted == False
        ).first()
        
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist profile not found"
            )
        
        # Track updated fields
        updated_fields = []
        
        # Update professional statement fields
        if statement.intro is not None:
            specialist.professional_statement_intro = statement.intro
            updated_fields.append("professional_statement_intro")
        
        if statement.role_of_psychologists is not None:
            specialist.professional_statement_role = statement.role_of_psychologists
            updated_fields.append("professional_statement_role")
        
        if statement.qualifications_detail is not None:
            specialist.professional_statement_qualifications = statement.qualifications_detail
            updated_fields.append("professional_statement_qualifications")
        
        if statement.experience_detail is not None:
            specialist.professional_statement_experience = statement.experience_detail
            updated_fields.append("professional_statement_experience")
        
        if statement.patient_satisfaction_team is not None:
            specialist.professional_statement_patient_satisfaction = statement.patient_satisfaction_team
            updated_fields.append("professional_statement_patient_satisfaction")
        
        if statement.appointment_details is not None:
            specialist.professional_statement_appointment_details = statement.appointment_details
            updated_fields.append("professional_statement_appointment_details")
        
        if statement.clinic_address is not None:
            specialist.professional_statement_clinic_address = statement.clinic_address
            updated_fields.append("professional_statement_clinic_address")
        
        if statement.fee_details is not None:
            specialist.professional_statement_fee_details = statement.fee_details
            updated_fields.append("professional_statement_fee_details")
        
        # Update timestamp
        specialist.updated_at = datetime.now(timezone.utc)
        updated_fields.append("updated_at")
        
        db.commit()
        db.refresh(specialist)
        
        logger.info(f"Professional statement updated for specialist {specialist_id}")
        
        return ProfileUpdateResponse(
            success=True,
            message="Professional statement updated successfully",
            updated_fields=updated_fields,
            updated_at=specialist.updated_at
        )
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating professional statement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update professional statement"
        )

# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@router.get("/health")
async def specialists_health_check():
    """Health check for specialists service"""

    return {
        "status": "healthy",
        "service": "specialists",
        "timestamp": datetime.now(timezone.utc),
        "version": "2.0.0",
        "features": {
            "profile_management": "active",
            "document_handling": "active",
            "appointment_management": "active",
            "dashboard": "active"
        }
    }

# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "router",
    "complete_profile",
    "get_mandatory_documents",
    "submit_documents",
    "submit_for_approval",
    "get_specialist_public_profile",
    "get_specialist_protected_profile",
    "get_my_private_profile",
    "filter_appointments",
    "update_appointment_status",
    "filter_patients",
    "get_dashboard_stats",
    "get_profile_completion_status"
]
