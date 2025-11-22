"""
Specialist Profile Management API
=================================
Handles specialist profile completion, document upload, and application status.
"""

import os
import uuid
import logging
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path

# Import database models
from app.models.specialist import (
    Specialists, SpecialistsAuthInfo, SpecialistsApprovalData,
    EmailVerificationStatusEnum, ApprovalStatusEnum,
    ConsultationModeEnum, MentalHealthSpecialtyEnum, TherapyMethodEnum,
    SpecialistTypeEnum, GenderEnum
)

# Import schemas (mapped to new filenames)
from pydantic import BaseModel

class DropdownOption(BaseModel):
    value: str
    label: str
    description: Optional[str] = None

class DropdownOptionsResponse(BaseModel):
    consultation_modes: List[DropdownOption]
    mental_health_specialties: List[DropdownOption]
    therapy_methods: List[DropdownOption]
    specialist_types: List[DropdownOption]
    currencies: List[DropdownOption]
    days_of_week: List[str]
    genders: List[DropdownOption]

class DocumentUploadResponse(BaseModel):
    success: bool
    message: str
    document_type: str
    file_url: str
    filename: str
    uploaded_at: datetime

class ApplicationStatusResponse(BaseModel):
    approval_status: str
    specialist_type: Optional[str] = None
    profile_completed: bool
    profile_completion_percentage: int
    mandatory_fields_completed: bool  # Alias for profile_completed (frontend compatibility)
    status_message: str  # Alias for message (frontend compatibility)
    pending_documents: List[str] = []
    admin_notes: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    can_practice: bool
    redirect_to: Optional[str] = None
    message: Optional[str] = None
    estimated_review_time: Optional[str] = None

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

# Import utilities
from app.db.session import get_db

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/specialists", tags=["Specialist Profile"])
security = HTTPBearer()

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

def get_specialty_description(specialty: str) -> str:
    """Get description for mental health specialty"""
    descriptions = {
        "depression": "Major Depressive Disorder and related mood disorders",
        "anxiety": "Generalized Anxiety Disorder, panic attacks, phobias",
        "ocd": "Obsessive-Compulsive Disorder treatment",
        "ptsd": "Post-Traumatic Stress Disorder and trauma therapy",
        "adhd": "Attention-Deficit/Hyperactivity Disorder",
        "bipolar_disorder": "Bipolar I & II disorder management",
        "eating_disorders": "Anorexia, Bulimia, Binge Eating Disorder",
        "substance_abuse": "Addiction and substance use disorders",
        "relationship_issues": "Couples therapy and relationship counseling",
        "grief_loss": "Bereavement and grief counseling",
        "stress_management": "Stress reduction and coping strategies",
        "panic_disorder": "Panic disorder and panic attack management",
        "social_anxiety": "Social phobia and social anxiety treatment",
        "insomnia": "Sleep disorders and insomnia treatment",
        "anger_management": "Anger control and emotional regulation"
    }
    return descriptions.get(specialty, "Mental health specialty")

def get_therapy_method_description(method: str) -> str:
    """Get description for therapy method"""
    descriptions = {
        "cbt": "Cognitive Behavioral Therapy - Focus on thought patterns",
        "dbt": "Dialectical Behavior Therapy - Emotional regulation",
        "act": "Acceptance and Commitment Therapy",
        "psychoanalysis": "Psychoanalytic and psychodynamic approaches",
        "emdr": "Eye Movement Desensitization and Reprocessing",
        "humanistic": "Person-centered and humanistic therapy",
        "family_therapy": "Family systems and family counseling",
        "group_therapy": "Group-based therapeutic interventions",
        "mindfulness": "Mindfulness-based stress reduction",
        "psychodynamic": "Psychodynamic psychotherapy",
        "solution_focused": "Solution-Focused Brief Therapy",
        "narrative_therapy": "Narrative therapy approaches"
    }
    return descriptions.get(method, "Therapy approach")

def get_consultation_mode_description(mode: str) -> str:
    """Get description for consultation mode"""
    descriptions = {
        "online": "Video/phone consultations from anywhere",
        "in_person": "Face-to-face sessions at clinic",
        "hybrid": "Both online and in-person options available"
    }
    return descriptions.get(mode, "Consultation mode")

# ============================================================================
# AUTHENTICATION DEPENDENCY
# ============================================================================

async def get_current_specialist(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """Get current authenticated specialist from JWT token"""
    try:
        from jose import jwt, JWTError
        
        # Get secret key from environment
        SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY")
        if not SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server configuration error"
            )
        
        token = credentials.credentials
        
        # Decode JWT token
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("sub")
            user_type = payload.get("user_type")
            email = payload.get("email")
            
            if not user_id or user_type != "specialist":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid token or user type"
                )
            
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        # Verify specialist exists
        specialist = db.query(Specialists).filter(Specialists.id == user_id).first()
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )
        
        return {
            "user_id": user_id,
            "email": email,
            "user_type": "specialist",
            "specialist": specialist
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/dropdown-options", response_model=DropdownOptionsResponse)
async def get_dropdown_options():
    """
    Get all dropdown options for specialist profile completion form.
    
    Returns structured data for all enum-based fields to populate frontend dropdowns.
    """
    try:
        return DropdownOptionsResponse(
            consultation_modes=[
                DropdownOption(
                    value=mode.value,
                    label=mode.value.replace('_', ' ').title(),
                    description=get_consultation_mode_description(mode.value)
                )
                for mode in ConsultationModeEnum
            ],
            mental_health_specialties=[
                DropdownOption(
                    value=spec.value,
                    label=spec.value.replace('_', ' ').title(),
                    description=get_specialty_description(spec.value)
                )
                for spec in MentalHealthSpecialtyEnum
            ],
            therapy_methods=[
                DropdownOption(
                    value=method.value,
                    label=method.value.upper() if len(method.value) <= 4 else method.value.replace('_', ' ').title(),
                    description=get_therapy_method_description(method.value)
                )
                for method in TherapyMethodEnum
            ],
            specialist_types=[
                DropdownOption(
                    value=stype.value,
                    label=stype.value.replace('_', ' ').title(),
                    description=f"Mental health {stype.value}"
                )
                for stype in SpecialistTypeEnum
            ],
            currencies=[
                DropdownOption(value="PKR", label="Pakistani Rupee (PKR)", description="Default currency"),
                DropdownOption(value="USD", label="US Dollar (USD)", description="International currency"),
            ],
            days_of_week=["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            genders=[
                DropdownOption(value=gender.value, label=gender.value.replace('_', ' ').title())
                for gender in GenderEnum
            ]
        )
    
    except Exception as e:
        logger.error(f"Error fetching dropdown options: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dropdown options"
        )

@router.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_specialist_document(
    file: UploadFile = File(...),
    document_type: str = Form(..., pattern="^(license|degree|cnic|profile_photo|certification|supporting_document)$"),
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """
    Upload specialist documents (license, degree, CNIC, certifications, or profile photo).
    
    Enhanced validation includes:
    - File type validation (JPEG, PNG, PDF only)
    - File size validation (5MB maximum)
    - Document type validation
    - Security checks
    - Proper error messages with specific feedback
    
    - **file**: Document file (JPEG, PNG, PDF)
    - **document_type**: Type of document (license, degree, cnic, profile_photo, certification, supporting_document)
    
    Returns the file URL for use in profile completion.
    """
    try:
        specialist: Specialists = current_user['specialist']
        
        # Validate file is provided
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided. Please select a file to upload."
            )
        
        # Validate file type
        allowed_types = {
            'image/jpeg', 'image/jpg', 'image/png', 'application/pdf'
        }
        
        # Check content type
        if not file.content_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to determine file type. Please upload a JPEG, PNG, or PDF file."
            )
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type: {file.content_type}. Allowed types: JPEG, PNG, PDF"
            )
        
        # Read and validate file size (5MB max)
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty. Please upload a valid file."
            )
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large ({file_size / 1024 / 1024:.2f}MB). Maximum size is 5MB. Please compress the file or use a smaller version."
            )
        
        # Validate filename for security (prevent path traversal)
        if '..' in file.filename or '/' in file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename. Please use a simple filename without special characters."
            )
        
        # Generate unique filename with better structure
        safe_filename = os.path.basename(file.filename).replace(' ', '_')
        file_extension = os.path.splitext(safe_filename)[1] if safe_filename else '.jpg'
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{current_user['user_id']}_{document_type}_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
        
        # Create upload directory if it doesn't exist
        upload_dir = "uploads/specialists/documents"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, unique_filename)
        try:
            with open(file_path, 'wb') as f:
                f.write(file_content)
        except IOError as e:
            logger.error(f"Failed to save file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save file on server. Please try again."
            )
        
        # Generate URL (adjust based on your static file serving setup)
        # The backend mounts /media to the uploads directory, so we need to remove "uploads/" from the path
        # Normalize path separators for URLs (use forward slashes)
        normalized_path = file_path.replace(os.sep, '/')
        # Remove "uploads/" prefix if present since /media is mounted to uploads directory
        if normalized_path.startswith('uploads/'):
            normalized_path = normalized_path[len('uploads/'):]
        file_url = f"/media/{normalized_path}"
        
        # Optionally, store document URL in database for tracking
        # Note: This is optional - if the column doesn't exist, we'll skip database storage
        try:
            approval_data = db.query(SpecialistsApprovalData).filter_by(
                specialist_id=specialist.id
            ).first()
            
            if approval_data:
                try:
                    # Try to access registration_documents - this will fail if column doesn't exist
                    # Store document URL based on type
                    current_docs = approval_data.registration_documents
                    if current_docs is None:
                        current_docs = {}
                    
                    # Handle document types that support multiple files (arrays)
                    if document_type in ['certification', 'supporting_document']:
                        if document_type not in current_docs:
                            current_docs[document_type] = []
                        elif not isinstance(current_docs[document_type], list):
                            current_docs[document_type] = [current_docs[document_type]]
                        current_docs[document_type].append(file_url)
                    else:
                        # Single file types
                        current_docs[document_type] = file_url
                    
                    approval_data.registration_documents = current_docs
                    approval_data.updated_at = datetime.now(timezone.utc)
                    db.commit()
                except (AttributeError, Exception) as attr_error:
                    # Column doesn't exist in database - rollback and skip
                    error_str = str(attr_error).lower()
                    if "registration_documents" in error_str or "undefinedcolumn" in error_str or "infailedsqltransaction" in error_str:
                        logger.debug(f"registration_documents column not available in database for specialist {specialist.id}, skipping database storage")
                        db.rollback()
                    else:
                        logger.warning(f"Error updating registration_documents: {str(attr_error)}")
                        db.rollback()
        except Exception as e:
            error_str = str(e).lower()
            if "registration_documents" in error_str or "undefinedcolumn" in error_str or "infailedsqltransaction" in error_str:
                logger.debug(f"Could not store document URL in database (column may not exist): {str(e)}")
                db.rollback()  # Rollback to allow subsequent operations
            else:
                logger.warning(f"Failed to update database with document URL: {str(e)}")
                db.rollback()  # Rollback to allow subsequent operations
            # Don't fail the upload if database update fails
        
        logger.info(f"Document uploaded: {document_type} ({file_size} bytes) for specialist {current_user['user_id']}")
        
        return DocumentUploadResponse(
            success=True,
            message=f"{document_type.replace('_', ' ').title()} uploaded successfully ({file_size / 1024:.2f} KB)",
            document_type=document_type,
            file_url=file_url,
            filename=unique_filename,
            uploaded_at=datetime.now(timezone.utc)
        )
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Document upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document. Please try again or contact support if the problem persists."
        )


@router.get("/application-status", response_model=ApplicationStatusResponse)
async def get_application_status(
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """
    Get specialist application/approval status.
    
    Returns current status, review information, and appropriate redirect path.
    """
    try:
        specialist: Specialists = current_user['specialist']
        
        approval_data = db.query(SpecialistsApprovalData).filter_by(
            specialist_id=specialist.id
        ).first()
        
        # Determine redirect
        from app.api.v1.endpoints.auth import get_specialist_redirect
        auth_info = db.query(SpecialistsAuthInfo).filter_by(
            specialist_id=specialist.id
        ).first()
        
        redirect_to = get_specialist_redirect(specialist, auth_info, db)
        
        # Status-specific messages
        if specialist.approval_status == ApprovalStatusEnum.PENDING:
            message = "Your application is under review. We'll notify you via email once reviewed."
            estimated_review_time = "2-3 business days"
        elif specialist.approval_status == ApprovalStatusEnum.UNDER_REVIEW:
            message = "Your application is currently being reviewed by our team."
            estimated_review_time = "1-2 business days"
        elif specialist.approval_status == ApprovalStatusEnum.APPROVED:
            message = "Congratulations! Your application has been approved. You can now access your dashboard."
            estimated_review_time = None
        elif specialist.approval_status == ApprovalStatusEnum.REJECTED:
            message = "Your application was not approved. Please review the rejection reason below."
            estimated_review_time = None
        else:
            message = "Application status unavailable."
            estimated_review_time = None
        
        # Calculate pending documents
        pending_docs = []
        if approval_data:
            try:
                # Try to access registration_documents - this will fail if column doesn't exist
                reg_docs = approval_data.registration_documents
                if reg_docs:
                    if not reg_docs.get('cnic'):
                        pending_docs.append('CNIC Document')
                    if not reg_docs.get('degree'):
                        pending_docs.append('Degree Certificate')
                    if not reg_docs.get('license'):
                        pending_docs.append('Professional License')
                else:
                    # No documents stored - all are pending
                    pending_docs = ['CNIC Document', 'Degree Certificate', 'Professional License']
            except (AttributeError, Exception) as e:
                # Column doesn't exist or error accessing it
                error_str = str(e).lower()
                if "registration_documents" in error_str or "undefinedcolumn" in error_str or "infailedsqltransaction" in error_str:
                    # Column doesn't exist - assume all documents are pending
                    pending_docs = ['CNIC Document', 'Degree Certificate', 'Professional License']
                else:
                    logger.warning(f"Error checking pending documents: {str(e)}")
                    pending_docs = ['CNIC Document', 'Degree Certificate', 'Professional License']
        
        # Get admin notes (rejection reason or approval notes)
        admin_notes_text = None
        if approval_data:
            if specialist.approval_status == ApprovalStatusEnum.REJECTED and approval_data.rejection_reason:
                admin_notes_text = approval_data.rejection_reason
            elif approval_data.approval_notes:
                admin_notes_text = approval_data.approval_notes
        
        return ApplicationStatusResponse(
            approval_status=specialist.approval_status.value,
            specialist_type=specialist.specialist_type.value if specialist.specialist_type else None,
            profile_completed=specialist.mandatory_fields_completed or False,
            profile_completion_percentage=specialist.profile_completion_percentage or 0,
            mandatory_fields_completed=specialist.mandatory_fields_completed or False,
            status_message=message,
            pending_documents=pending_docs,
            admin_notes=admin_notes_text,
            submitted_at=specialist.profile_completed_at,
            reviewed_at=approval_data.reviewed_at if approval_data else None,
            reviewed_by=str(approval_data.reviewed_by) if approval_data and approval_data.reviewed_by else None,
            rejection_reason=approval_data.rejection_reason if approval_data else None,
            can_practice=specialist.approval_status == ApprovalStatusEnum.APPROVED,
            redirect_to=redirect_to,
            message=message,
            estimated_review_time=estimated_review_time
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching application status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch application status"
        )

# ============================================================================
# COMPREHENSIVE CRUD ENDPOINTS
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
async def get_specialist_profile(
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
        
        # Convert to response format (safely handle all fields)
        try:
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
                "specialties_in_mental_health": specialist.specialties_in_mental_health or [],
                "therapy_methods": specialist.therapy_methods or [],
                "education": transform_education_records(specialist.education_records or [], specialist.id),
                "certifications": transform_certification_records(specialist.certification_records or [], specialist.id),
                "experience": transform_experience_records(specialist.experience_records or [], specialist.id),
                "created_at": specialist.created_at,
                "updated_at": specialist.updated_at
            }
            
            # Add specializations relationship data if exists (safely handle lazy loading)
            try:
                # Eagerly load specializations if not already loaded
                if hasattr(specialist, 'specializations'):
                    specializations_list = list(specialist.specializations) if specialist.specializations else []
                    profile_data["specializations"] = [
                        {
                            "id": str(spec.id),
                            "specialist_id": str(spec.specialist_id),
                            "specialization": spec.specialization,
                            "years_of_experience_in_specialization": spec.years_of_experience_in_specialization,
                            "certification_date": spec.certification_date.isoformat() if spec.certification_date else None,
                            "is_primary_specialization": spec.is_primary_specialization,
                            "created_at": spec.created_at.isoformat() if spec.created_at else None,
                            "updated_at": spec.updated_at.isoformat() if spec.updated_at else None
                        }
                        for spec in specializations_list
                    ]
                else:
                    profile_data["specializations"] = []
            except Exception as e:
                logger.warning(f"Error loading specializations relationship: {str(e)}")
                profile_data["specializations"] = []
            
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
        except Exception as e:
            logger.error(f"Error converting profile data to response: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to format profile response: {str(e)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching specialist profile: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch specialist profile: {str(e)}"
        )

@router.put("/profiles/{specialist_id}", response_model=ProfileUpdateResponse)
async def update_specialist_profile(
    specialist_id: uuid.UUID,
    profile_update: SpecialistProfileUpdate,
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """Update specialist profile (only own profile or admin)"""
    try:
        # Check permissions
        if str(current_user['user_id']) != str(specialist_id):
            # TODO: Add admin check here
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
        
        # Update basic information
        if profile_update.first_name is not None:
            specialist.first_name = profile_update.first_name
            updated_fields.append("first_name")
        
        if profile_update.last_name is not None:
            specialist.last_name = profile_update.last_name
            updated_fields.append("last_name")
        
        if profile_update.email is not None:
            specialist.email = profile_update.email
            updated_fields.append("email")
        
        if profile_update.phone is not None:
            specialist.phone = profile_update.phone
            updated_fields.append("phone")
        
        if profile_update.date_of_birth is not None:
            specialist.date_of_birth = profile_update.date_of_birth
            updated_fields.append("date_of_birth")
        
        if profile_update.gender is not None:
            specialist.gender = profile_update.gender
            updated_fields.append("gender")
        
        # Update professional information
        if profile_update.specialist_type is not None:
            specialist.specialist_type = profile_update.specialist_type
            updated_fields.append("specialist_type")
        
        if profile_update.years_experience is not None:
            specialist.years_experience = profile_update.years_experience
            updated_fields.append("years_experience")
        
        if profile_update.qualification is not None:
            specialist.qualification = profile_update.qualification
            updated_fields.append("qualification")
        
        if profile_update.institution is not None:
            specialist.institution = profile_update.institution
            updated_fields.append("institution")
        
        if profile_update.current_affiliation is not None:
            specialist.current_affiliation = profile_update.current_affiliation
            updated_fields.append("current_affiliation")
        
        # Update location & contact
        if profile_update.city is not None:
            specialist.city = profile_update.city
            updated_fields.append("city")
        
        if profile_update.address is not None:
            specialist.address = profile_update.address
            updated_fields.append("address")
        
        if profile_update.clinic_name is not None:
            specialist.clinic_name = profile_update.clinic_name
            updated_fields.append("clinic_name")
        
        if profile_update.clinic_address is not None:
            specialist.clinic_address = profile_update.clinic_address
            updated_fields.append("clinic_address")
        
        # Update practice details
        if profile_update.bio is not None:
            specialist.bio = profile_update.bio
            updated_fields.append("bio")
        
        if profile_update.consultation_fee is not None:
            specialist.consultation_fee = profile_update.consultation_fee
            updated_fields.append("consultation_fee")
        
        if profile_update.currency is not None:
            specialist.currency = profile_update.currency
            updated_fields.append("currency")
        
        if profile_update.consultation_modes is not None:
            specialist.consultation_modes = [mode.value for mode in profile_update.consultation_modes]
            updated_fields.append("consultation_modes")
        
        if profile_update.availability_schedule is not None:
            # Validate and normalize availability schedule
            schedule = profile_update.availability_schedule
            if isinstance(schedule, dict):
                # Check if it's new format (nested with online/in_person) or old format (flat)
                has_online = "online" in schedule
                has_in_person = "in_person" in schedule
                
                if has_online or has_in_person:
                    # New format: nested structure with online and in_person
                    normalized_schedule = {}
                    
                    for appointment_type in ["online", "in_person"]:
                        type_schedule = schedule.get(appointment_type)
                        if isinstance(type_schedule, dict):
                            normalized_type_schedule = {}
                            valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                            
                            for day in valid_days:
                                if day in type_schedule:
                                    day_data = type_schedule[day]
                                    if isinstance(day_data, dict):
                                        is_available = day_data.get("is_available", False) if day_data.get("is_available") is not None else False
                                        normalized_type_schedule[day] = {
                                            "is_available": is_available,
                                            "start_time": day_data.get("start_time") or ("09:00" if is_available else None),
                                            "end_time": day_data.get("end_time") or ("17:00" if is_available else None),
                                            "slot_duration_minutes": day_data.get("slot_duration_minutes") or day_data.get("slotDurationMinutes") or 30
                                        }
                                    else:
                                        normalized_type_schedule[day] = {
                                            "is_available": False,
                                            "start_time": None,
                                            "end_time": None,
                                            "slot_duration_minutes": 30
                                        }
                                else:
                                    normalized_type_schedule[day] = {
                                        "is_available": False,
                                        "start_time": None,
                                        "end_time": None,
                                        "slot_duration_minutes": 30
                                    }
                            
                            normalized_schedule[appointment_type] = normalized_type_schedule
                        elif appointment_type in schedule:
                            # Keep existing if present but not a dict
                            normalized_schedule[appointment_type] = type_schedule
                    
                    specialist.availability_schedule = normalized_schedule
                else:
                    # Old format: flat structure - convert to new format (use same for both)
                    normalized_schedule_flat = {}
                    valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                    
                    for day in valid_days:
                        if day in schedule:
                            day_data = schedule[day]
                            if isinstance(day_data, dict):
                                is_available = day_data.get("is_available", False) if day_data.get("is_available") is not None else False
                                normalized_schedule_flat[day] = {
                                    "is_available": is_available,
                                    "start_time": day_data.get("start_time") or ("09:00" if is_available else None),
                                    "end_time": day_data.get("end_time") or ("17:00" if is_available else None),
                                    "slot_duration_minutes": day_data.get("slot_duration_minutes") or day_data.get("slotDurationMinutes") or 30
                                }
                            else:
                                normalized_schedule_flat[day] = {
                                    "is_available": False,
                                    "start_time": None,
                                    "end_time": None,
                                    "slot_duration_minutes": 30
                                }
                        else:
                            normalized_schedule_flat[day] = {
                                "is_available": False,
                                "start_time": None,
                                "end_time": None,
                                "slot_duration_minutes": 30
                            }
                    
                    # Convert old format to new format (same schedule for both)
                    specialist.availability_schedule = {
                        "online": normalized_schedule_flat,
                        "in_person": normalized_schedule_flat,
                    }
                
                updated_fields.append("availability_schedule")
                
                # Sync availability_schedule to SpecialistAvailabilityTemplate for appointment booking
                # This ensures templates are updated when schedule changes
                try:
                    from app.models.appointment import SpecialistAvailabilityTemplate, DayOfWeekEnum, AppointmentTypeEnum
                    
                    # Map day names to DayOfWeekEnum
                    day_enum_map = {
                        "monday": DayOfWeekEnum.MONDAY,
                        "tuesday": DayOfWeekEnum.TUESDAY,
                        "wednesday": DayOfWeekEnum.WEDNESDAY,
                        "thursday": DayOfWeekEnum.THURSDAY,
                        "friday": DayOfWeekEnum.FRIDAY,
                        "saturday": DayOfWeekEnum.SATURDAY,
                        "sunday": DayOfWeekEnum.SUNDAY
                    }
                    
                    # Map appointment type strings to enums
                    appointment_type_map = {
                        "online": AppointmentTypeEnum.VIRTUAL,  # Database enum only supports VIRTUAL and IN_PERSON
                        "in_person": AppointmentTypeEnum.IN_PERSON,
                    }
                    
                    # Update templates for both ONLINE and IN_PERSON appointment types
                    for schedule_type, schedule_data in normalized_schedule.items():
                        if schedule_type in appointment_type_map:
                            appointment_type_enum = appointment_type_map[schedule_type]
                            
                            for day_name, day_enum in day_enum_map.items():
                                day_schedule = schedule_data.get(day_name, {}) if isinstance(schedule_data, dict) else {}
                                is_available = day_schedule.get("is_available", False)
                                
                                # Find or create template
                                template = db.query(SpecialistAvailabilityTemplate).filter(
                                    SpecialistAvailabilityTemplate.specialist_id == specialist.id,
                                    SpecialistAvailabilityTemplate.appointment_type == appointment_type_enum,
                                    SpecialistAvailabilityTemplate.day_of_week == day_enum
                                ).first()
                                
                                if template:
                                    # Update existing template
                                    if is_available and day_schedule.get("start_time") and day_schedule.get("end_time"):
                                        template.start_time = day_schedule.get("start_time", "09:00")
                                        template.end_time = day_schedule.get("end_time", "17:00")
                                        template.slot_length_minutes = day_schedule.get("slot_duration_minutes", 30)
                                        template.is_active = True
                                    else:
                                        # Day is unavailable or missing times - deactivate template
                                        template.is_active = False
                                    template.updated_at = datetime.now(timezone.utc)
                                else:
                                    # Create new template only if day is available and has times
                                    if is_available and day_schedule.get("start_time") and day_schedule.get("end_time"):
                                        template = SpecialistAvailabilityTemplate(
                                            specialist_id=specialist.id,
                                            appointment_type=appointment_type_enum,
                                            day_of_week=day_enum,
                                            start_time=day_schedule.get("start_time", "09:00"),
                                            end_time=day_schedule.get("end_time", "17:00"),
                                            slot_length_minutes=day_schedule.get("slot_duration_minutes", 30),
                                            break_between_slots_minutes=0,
                                            is_active=True
                                        )
                                        db.add(template)
                    
                    logger.info(f"Synced availability_schedule to templates for specialist {specialist_id}")
                except Exception as e:
                    # Don't fail the update if template sync fails, just log it
                    logger.warning(f"Failed to sync availability_schedule to templates for specialist {specialist_id}: {str(e)}")
            else:
                logger.warning(f"Invalid availability_schedule format for specialist {specialist_id}: expected dict, got {type(schedule)}")
        
        if profile_update.languages_spoken is not None:
            specialist.languages_spoken = profile_update.languages_spoken
            updated_fields.append("languages_spoken")
        
        # Update specializations (JSON fields)
        if profile_update.specialties_in_mental_health is not None:
            specialist.specialties_in_mental_health = profile_update.specialties_in_mental_health
            updated_fields.append("specialties_in_mental_health")
        
        if profile_update.therapy_methods is not None:
            specialist.therapy_methods = profile_update.therapy_methods
            updated_fields.append("therapy_methods")
        
        # Update profile media
        if profile_update.profile_image_url is not None:
            specialist.profile_image_url = profile_update.profile_image_url
            updated_fields.append("profile_image_url")
        
        if profile_update.website_url is not None:
            specialist.website_url = profile_update.website_url
            updated_fields.append("website_url")
        
        if profile_update.social_media_links is not None:
            specialist.social_media_links = profile_update.social_media_links
            updated_fields.append("social_media_links")
        
        # Update status
        if profile_update.availability_status is not None:
            specialist.availability_status = profile_update.availability_status
            updated_fields.append("availability_status")
        
        if profile_update.accepting_new_patients is not None:
            specialist.accepting_new_patients = profile_update.accepting_new_patients
            updated_fields.append("accepting_new_patients")
        
        # Update timestamp
        specialist.updated_at = datetime.now(timezone.utc)
        updated_fields.append("updated_at")
        
        # Commit changes
        db.commit()
        db.refresh(specialist)
        
        logger.info(f"Profile updated for specialist {specialist_id}: {updated_fields}")
        
        return ProfileUpdateResponse(
            success=True,
            message="Profile updated successfully",
            updated_fields=updated_fields,
            updated_at=specialist.updated_at
        )
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating specialist profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update specialist profile"
        )

@router.put("/profiles/{specialist_id}/interests", response_model=ProfileUpdateResponse)
async def update_specialist_interests(
    specialist_id: uuid.UUID,
    interests: List[str],
    current_user: dict = Depends(get_current_specialist),
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
        
        # Update interests (ensure it's a list, not None)
        specialist.interests = interests if interests is not None else []
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
    current_user: dict = Depends(get_current_specialist),
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

@router.put("/profiles/{specialist_id}/education", response_model=ProfileUpdateResponse)
async def update_education_records(
    specialist_id: uuid.UUID,
    education_records: List[EducationCreate],
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """Update education records"""
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
        
        # Convert to dict format for JSON storage
        education_data = []
        for edu in education_records:
            education_data.append({
                "id": str(uuid.uuid4()),
                "degree": edu.degree,
                "field_of_study": edu.field_of_study,
                "institution": edu.institution,
                "year": edu.year,
                "gpa": edu.gpa,
                "description": edu.description,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        specialist.education_records = education_data
        specialist.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(specialist)
        
        logger.info(f"Education records updated for specialist {specialist_id}")
        
        return ProfileUpdateResponse(
            success=True,
            message="Education records updated successfully",
            updated_fields=["education_records", "updated_at"],
            updated_at=specialist.updated_at
        )
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating education records: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update education records"
        )

@router.put("/profiles/{specialist_id}/certifications", response_model=ProfileUpdateResponse)
async def update_certification_records(
    specialist_id: uuid.UUID,
    certification_records: List[CertificationCreate],
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """Update certification records"""
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
        
        # Convert to dict format for JSON storage
        certification_data = []
        for cert in certification_records:
            certification_data.append({
                "id": str(uuid.uuid4()),
                "name": cert.name,
                "issuing_body": cert.issuing_body,
                "year": cert.year,
                "expiry_date": cert.expiry_date.isoformat() if cert.expiry_date else None,
                "credential_id": cert.credential_id,
                "description": cert.description,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        specialist.certification_records = certification_data
        specialist.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(specialist)
        
        logger.info(f"Certification records updated for specialist {specialist_id}")
        
        return ProfileUpdateResponse(
            success=True,
            message="Certification records updated successfully",
            updated_fields=["certification_records", "updated_at"],
            updated_at=specialist.updated_at
        )
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating certification records: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update certification records"
        )

@router.put("/profiles/{specialist_id}/experience", response_model=ProfileUpdateResponse)
async def update_experience_records(
    specialist_id: uuid.UUID,
    experience_records: List[ExperienceCreate],
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """Update experience records"""
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
        
        # Convert to dict format for JSON storage
        experience_data = []
        for exp in experience_records:
            experience_data.append({
                "id": str(uuid.uuid4()),
                "title": exp.title,
                "company": exp.company,
                "years": exp.years,
                "start_date": exp.start_date.isoformat() if exp.start_date else None,
                "end_date": exp.end_date.isoformat() if exp.end_date else None,
                "description": exp.description,
                "is_current": exp.is_current,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        specialist.experience_records = experience_data
        specialist.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(specialist)
        
        logger.info(f"Experience records updated for specialist {specialist_id}")
        
        return ProfileUpdateResponse(
            success=True,
            message="Experience records updated successfully",
            updated_fields=["experience_records", "updated_at"],
            updated_at=specialist.updated_at
        )
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating experience records: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update experience records"
        )

@router.delete("/profiles/{specialist_id}", response_model=ProfileDeleteResponse)
async def delete_specialist_profile(
    specialist_id: uuid.UUID,
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """Soft delete specialist profile (only own profile or admin)"""
    try:
        # Check permissions
        if str(current_user['user_id']) != str(specialist_id):
            # TODO: Add admin check here
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own profile"
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
        
        # Soft delete
        specialist.is_deleted = True
        specialist.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Profile soft deleted for specialist {specialist_id}")
        
        return ProfileDeleteResponse(
            success=True,
            message="Profile deleted successfully",
            deleted_at=specialist.updated_at
        )
    
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting specialist profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete specialist profile"
        )

# ============================================================================
# PROFILE IMAGE SERVING ENDPOINT
# ============================================================================

@router.get("/profile-image")
async def get_profile_image(
    current_user: dict = Depends(get_current_specialist),
    db: Session = Depends(get_db)
):
    """
    Serve the specialist's profile image.
    
    This endpoint serves the profile image with proper authentication and headers.
    More reliable than static file serving as it handles authentication and errors gracefully.
    """
    try:
        specialist: Specialists = current_user['specialist']
        
        # Get profile image URL from specialist
        image_url = specialist.profile_image_url
        
        if not image_url:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile image not found"
            )
        
        # Normalize the URL path - extract just the filename
        # Handle various URL formats: /media/uploads/..., /media/..., uploads/..., etc.
        normalized_url = image_url.replace('\\', '/').strip()
        
        # Extract filename from URL (everything after the last slash)
        filename = normalized_url.split('/')[-1]
        
        # Try multiple possible upload directory locations
        possible_base_paths = [
            Path(__file__).parent.parent.parent.parent / "uploads",
            Path(__file__).parent.parent.parent / "uploads",
            Path(__file__).parent / "uploads",
            Path.cwd() / "uploads",
        ]
        
        # Also try the actual upload directory used by the upload endpoint
        upload_dir = Path("uploads/specialists/documents")
        possible_paths_to_try = [
            upload_dir / filename,  # Direct path
        ]
        
        # Add paths relative to each base path
        for base_path in possible_base_paths:
            possible_paths_to_try.extend([
                base_path / "specialists" / "documents" / filename,
                base_path / "uploads" / "specialists" / "documents" / filename,
                base_path / filename,
                base_path / normalized_url.replace('/media/', '').replace('uploads/', ''),
            ])
        
        full_path = None
        for potential_path in possible_paths_to_try:
            try:
                resolved = potential_path.resolve()
                if resolved.exists() and resolved.is_file():
                    # Security check: ensure path is within uploads directory
                    is_safe = False
                    for base_path in possible_base_paths:
                        try:
                            resolved.relative_to(base_path.resolve())
                            is_safe = True
                            break
                        except ValueError:
                            continue
                    
                    # Also check the upload_dir
                    try:
                        upload_dir_resolved = upload_dir.resolve()
                        resolved.relative_to(upload_dir_resolved)
                        is_safe = True
                    except (ValueError, AttributeError):
                        pass
                    
                    if is_safe:
                        full_path = resolved
                        logger.info(f"Found profile image at: {full_path}")
                        break
            except Exception as e:
                logger.debug(f"Error checking path {potential_path}: {e}")
                continue
        
        if not full_path or not full_path.exists():
            logger.warning(f"Profile image not found for specialist {specialist.id}. URL: {image_url}, Filename: {filename}")
            # Log all attempted paths for debugging
            logger.debug(f"Attempted paths: {[str(p) for p in possible_paths_to_try[:5]]}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Profile image file not found on server. Filename: {filename}"
            )
        
        # Determine media type based on file extension
        ext = full_path.suffix.lower()
        media_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
        }
        media_type = media_type_map.get(ext, 'image/jpeg')
        
        # Return file with proper headers
        return FileResponse(
            path=str(full_path),
            media_type=media_type,
            headers={
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
                "Content-Disposition": f'inline; filename="{full_path.name}"'
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving profile image: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to serve profile image: {str(e)}"
        )

# ============================================================================
# EXPORTS
# ============================================================================

__all__ = ["router"]

