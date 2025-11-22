"""
Assessment Router - New Assessment System Endpoints
==================================================

This router provides the main assessment functionality including:
- Assessment chat endpoint
- Session management
- Progress tracking
- Module management
- Results retrieval

Author: Mental Health Platform Team
Version: 1.0.0
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Dict, Any, List, Optional, Tuple
import time
import uuid
from datetime import datetime
import math

from app.core.logging_config import get_logger
from app.api.v1.endpoints.auth import get_current_user_from_token

logger = get_logger(__name__)

# Lazy imports for assessment modules (to prevent import errors from blocking router registration)
try:
    from app.agents.assessment.assessment_v2.moderator import AssessmentModerator
    from app.agents.assessment.assessment_v2.types import SessionState
    ASSESSMENT_MODULES_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Assessment modules not available: {e}")
    AssessmentModerator = None
    SessionState = None
    ASSESSMENT_MODULES_AVAILABLE = False

# Initialize router
router = APIRouter(prefix="/assessment-v2", tags=["Assessment"])
security = HTTPBearer()

# ============================================================================
# LAZY INITIALIZATION - Only initialize when actually needed
# ============================================================================

# Global moderator instance (initialized lazily)
_moderator_instance: Optional[Any] = None  # Type: AssessmentModerator when available
_assessment_available: Optional[bool] = None
_initialization_error: Optional[Exception] = None

def get_moderator() -> Any:  # Returns AssessmentModerator when available
    """
    Lazy initialization of AssessmentModerator.
    Only initializes when first called, not during module import.
    
    Returns:
        AssessmentModerator instance
        
    Raises:
        RuntimeError: If initialization fails or modules not available
    """
    global _moderator_instance, _assessment_available, _initialization_error
    
    # Check if assessment modules are available
    if not ASSESSMENT_MODULES_AVAILABLE or AssessmentModerator is None:
        raise RuntimeError("Assessment modules are not available. Please check installation and dependencies.")
    
    # Return cached instance if already initialized
    if _moderator_instance is not None:
        return _moderator_instance
    
    # If initialization failed before, raise the cached error
    if _assessment_available is False and _initialization_error:
        raise RuntimeError(f"Assessment system unavailable: {_initialization_error}")
    
    # Initialize on first call
    try:
        logger.info("Initializing AssessmentModerator (lazy initialization)...")
        _moderator_instance = AssessmentModerator()
        _assessment_available = True
        logger.info(f"✅ Assessment system initialized successfully | Modules loaded: {len(_moderator_instance.modules)}")
        return _moderator_instance
    except Exception as e:
        _assessment_available = False
        _initialization_error = e
        logger.error(f"❌ Assessment system initialization failed: {e}", exc_info=True)
        logger.error(f"   Error type: {type(e).__name__}")
        logger.error(f"   Error details: {str(e)}")
        logger.warning("Assessment system unavailable")
        raise RuntimeError(f"Assessment system initialization failed: {e}") from e

def is_assessment_available() -> bool:
    """
    Check if assessment system is available.
    Will initialize if not already initialized.
    
    Returns:
        True if available, False otherwise
    """
    global _assessment_available, _moderator_instance
    
    # If already initialized, return cached status
    if _moderator_instance is not None:
        return _assessment_available is True
    
    # If initialization failed before, return False
    if _assessment_available is False:
        return False
    
    # Try to initialize to check availability
    try:
        get_moderator()
        return _assessment_available is True
    except Exception:
        return False

def get_moderator_safe() -> Optional[AssessmentModerator]:
    """
    Safely get moderator instance, returning None if unavailable.
    
    Returns:
        AssessmentModerator instance or None if unavailable
    """
    try:
        return get_moderator()
    except Exception:
        return None

# Load and mount agent routers (DA, SRA, TPA) under assessment
# NOTE: Router imports are disabled as routers were removed during cleanup.
# The internal modules (da_module.py, sra_module.py, tpa_module.py) are the active implementations.
# If direct API access to DA/SRA/TPA is needed, routers should be added to internal modules.

AGENTS_AVAILABLE = False
da_router = None
sra_router = None
tpa_router = None

# Router mounting is disabled - routers were removed during cleanup
# Internal modules are used through the assessment moderator system instead
# If router functionality is needed, it should be implemented in the internal modules
# (da/da_module.py, sra/sra_module.py, tpa/tpa_module.py)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def extract_user_id(current_user_data) -> Optional[str]:
    """
    Extract canonical patient UUID from current_user_data.
    
    Args:
        current_user_data: Current user data dict from get_current_user_from_token
                           Format: {"user": user_obj, "auth_info": auth_info, "user_type": str}
        
    Returns:
        Patient UUID string or None if not found.
    """
    patient_uuid = get_patient_uuid(current_user_data)
    if patient_uuid:
        return patient_uuid
    
    # Explicitly inspect attributes for UUID values before giving up
    import uuid
    potential_ids = []
    
    if isinstance(current_user_data, dict):
        user = current_user_data.get("user")
        if user and hasattr(user, "id"):
            potential_ids.append(str(user.id))
        if current_user_data.get("user_id"):
            potential_ids.append(str(current_user_data.get("user_id")))
    else:
        if hasattr(current_user_data, "id"):
            potential_ids.append(str(current_user_data.id))
        if hasattr(current_user_data, "user_id"):
            potential_ids.append(str(current_user_data.user_id))
    
    for candidate in potential_ids:
        try:
            uuid.UUID(str(candidate))
            return str(candidate)
        except (ValueError, TypeError):
            continue
    
    return None

def extract_user_type(current_user_data) -> Optional[str]:
    """
    Extract user type from current_user_data.
    
    Args:
        current_user_data: Current user data dict from get_current_user_from_token
                           Format: {"user": user_obj, "auth_info": auth_info, "user_type": str}
        
    Returns:
        User type string or None if not found
    """
    if isinstance(current_user_data, dict):
        return current_user_data.get("user_type")
    elif hasattr(current_user_data, 'user_type'):
        return current_user_data.user_type
    return None

def validate_patient_access(current_user_data) -> str:
    """
    Validate that the current user is a patient and extract patient UUID.

    Args:
        current_user_data: Current user data dict from get_current_user_from_token
                           Format: {"user": user_obj, "auth_info": auth_info, "user_type": str}

    Returns:
        Patient UUID string

    Raises:
        HTTPException: If user is not a patient or user ID not found
    """
    user_type = extract_user_type(current_user_data)
    if user_type != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assessment endpoints are only available for patients"
        )

    patient_uuid = extract_user_id(current_user_data)
    if not patient_uuid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient UUID not found in authentication"
        )

    return patient_uuid

def validate_questionnaire_completion(patient_id: str) -> None:
    """
    Validate that the patient has completed the mandatory questionnaire.
    This is a soft check - allows assessment to proceed even if questionnaire is incomplete
    for better user experience, but logs a warning.

    Args:
        patient_id: Patient UUID string

    Note:
        Does not raise HTTPException - allows assessment to proceed regardless
        to avoid blocking users due to database schema issues or incomplete questionnaires
    """
    try:
        from app.db.session import SessionLocal
        from app.models.patient import MandatoryQuestionnaireSubmission

        db = SessionLocal()
        try:
            # Check if patient has completed the questionnaire
            # Use only columns that exist in database to avoid query errors
            questionnaire = db.query(
                MandatoryQuestionnaireSubmission.patient_id,
                MandatoryQuestionnaireSubmission.is_complete
            ).filter(
                MandatoryQuestionnaireSubmission.patient_id == patient_id,
                MandatoryQuestionnaireSubmission.is_complete == True
            ).first()

            if not questionnaire:
                # Log info but don't block - allow assessment to proceed
                logger.info(f"Patient {patient_id} has not completed questionnaire, but allowing assessment to proceed")
                # Don't raise exception - allow assessment for better UX
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error checking questionnaire completion for patient {patient_id}: {e}", exc_info=True)
        # Allow assessment if database check fails (fail-open for system stability)
        # Only log warning if it's a real database error, not just missing questionnaire
        if "does not exist" in str(e) or "UndefinedColumn" in str(e):
            logger.warning(f"Database schema mismatch detected, allowing assessment for patient {patient_id}")
        else:
            logger.warning(f"Failed to verify questionnaire completion, allowing assessment for patient {patient_id}")

def validate_session_access(
    moderator: Any,  # Type: AssessmentModerator when available
    session_id: str,
    patient_id: str,
    require_session: bool = True
) -> Optional[Any]:  # Returns SessionState when available
    """
    Validate session exists and belongs to patient.
    
    Args:
        moderator: AssessmentModerator instance
        session_id: Session ID to validate
        patient_id: Patient UUID to validate against
        require_session: If True, raise 404 if session doesn't exist
        
    Returns:
        SessionState if valid, None if not found and require_session=False
        
    Raises:
        HTTPException: If session not found (when require_session=True) or access denied
    """
    session_state = moderator.get_session_state(session_id)
    
    # If session not in cache, try to load from database
    if not session_state and hasattr(moderator, 'db') and moderator.db:
        try:
            session_state = moderator.db.get_session(session_id)
            if session_state:
                # Store in moderator cache for future use
                if hasattr(moderator, 'sessions'):
                    moderator.sessions[session_id] = session_state
        except Exception as e:
            logger.debug(f"Could not load session from database: {e}")
    
    if not session_state:
        if require_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        return None
    
    if not validate_session_ownership(session_state, patient_id, moderator):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this session"
        )
    
    return session_state

def validate_session_ownership(session_state, patient_id: str, moderator=None) -> bool:
    """
    Validate that a session belongs to the specified patient.
    
    Args:
        session_state: SessionState object
        patient_id: Patient UUID to validate against
        moderator: Optional AssessmentModerator instance for database lookup
        
    Returns:
        True if session belongs to patient, False otherwise
    """
    if not session_state:
        return False
    
    # Normalize patient_id to string for comparison
    patient_id_str = str(patient_id)
    session_id = getattr(session_state, 'session_id', 'unknown')
    
    # Check metadata for patient_id
    session_patient_id = None
    if hasattr(session_state, 'metadata') and session_state.metadata:
        # Check if metadata is a dictionary (not SQLAlchemy MetaData object)
        if isinstance(session_state.metadata, dict):
            session_patient_id = session_state.metadata.get("patient_id")
            if session_patient_id:
                session_patient_id = str(session_patient_id)
                logger.debug(f"Session {session_id}: Found patient_id in metadata: {session_patient_id}")
    
    # Check direct patient_id attribute
    if not session_patient_id and hasattr(session_state, 'patient_id'):
        session_patient_id = str(session_state.patient_id)
        logger.debug(f"Session {session_id}: Found patient_id in attribute: {session_patient_id}")
    
    # If still no patient_id, try to get from database
    if not session_patient_id and hasattr(session_state, 'session_id') and moderator:
        try:
            # Try to get patient_id from database
            if hasattr(moderator, 'db') and moderator.db:
                db_patient_id = moderator.db.get_patient_id_from_session(session_state.session_id)
                if db_patient_id:
                    session_patient_id = str(db_patient_id)
                    logger.debug(f"Session {session_id}: Found patient_id in database: {session_patient_id}")
                    # Update session state metadata for future use
                    if hasattr(session_state, 'metadata'):
                        if session_state.metadata is None or not isinstance(session_state.metadata, dict):
                            session_state.metadata = {}
                        session_state.metadata["patient_id"] = session_patient_id
        except Exception as e:
            logger.debug(f"Could not get patient_id from database for session {session_id}: {e}")
    
    # Compare patient IDs
    if session_patient_id:
        is_match = session_patient_id == patient_id_str
        if not is_match:
            logger.warning(f"Session {session_id}: Patient ID mismatch - session has {session_patient_id}, request has {patient_id_str}")
        return is_match
    
    # If no patient_id found, allow access (for backward compatibility)
    # But log a warning
    logger.warning(f"Session {session_id} has no patient_id - allowing access for backward compatibility")
    return True

def handle_assessment_unavailable() -> Dict[str, Any]:
    """
    Return standardized response when assessment system is unavailable.
    
    Returns:
        Dictionary with error information
    """
    return {
        "error": "Assessment system unavailable",
        "degraded_mode": True,
        "message": "The assessment system is temporarily unavailable. Please try again in a few moments."
    }

def get_progress_snapshot(moderator: Any, session_id: str) -> Dict[str, Any]:
    """Safely retrieve progress snapshot from moderator."""
    try:
        snapshot = moderator.get_session_progress(session_id)
        return snapshot if snapshot else {}
    except Exception as exc:
        logger.debug(f"Failed to get progress snapshot for session {session_id}: {exc}")
        return {}

def get_symptom_summary(moderator: Any, session_id: str) -> Dict[str, Any]:
    """Safely retrieve symptom summary from SRA service."""
    sra_service = getattr(moderator, "sra_service", None)
    if not sra_service:
        return {}
    try:
        return sra_service.get_symptoms_summary(session_id) or {}
    except Exception as exc:
        logger.debug(f"Failed to get symptom summary for session {session_id}: {exc}")
        return {}

def get_module_data_records(moderator: Any, session_id: str, module_name: Optional[str] = None, data_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch module data records from moderator database with safe fallbacks."""
    database = getattr(moderator, "db", None)
    if not database:
        return []
    try:
        return database.get_module_data(session_id, module_name=module_name, data_type=data_type) or []
    except Exception as exc:
        logger.debug(f"Failed to get module data for session {session_id}: {exc}")
        return []

def get_all_module_results(moderator: Any, session_id: str) -> Dict[str, Any]:
    """Fetch all module results stored for a session."""
    database = getattr(moderator, "db", None)
    if not database:
        return {}
    try:
        return database.get_all_module_results(session_id) or {}
    except Exception as exc:
        logger.debug(f"Failed to get module results for session {session_id}: {exc}")
        return {}

def get_conversation_history_records(moderator: Any, session_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Retrieve conversation history via moderator DB."""
    database = getattr(moderator, "db", None)
    if not database:
        return []
    try:
        return database.get_conversation_history(session_id, limit=limit) or []
    except Exception as exc:
        logger.debug(f"Failed to get conversation history for session {session_id}: {exc}")
        return []

def build_agent_status(progress_snapshot: Dict[str, Any], module_results: Dict[str, Any]) -> Dict[str, bool]:
    """Derive agent completion status based on module progress and stored results."""
    completed_modules = set(progress_snapshot.get("completed_modules", []))
    module_results_keys = set(module_results.keys())
    da_name = "da_diagnostic_analysis"
    tpa_name = "tpa_treatment_planning"
    da_completed = da_name in completed_modules or da_name in module_results_keys
    tpa_completed = tpa_name in completed_modules or tpa_name in module_results_keys
    return {
        "da_completed": da_completed,
        "tpa_completed": tpa_completed,
        "diagnostic_modules_completed": all(
            mod in completed_modules
            for mod in ("scid_screening", "scid_cv_diagnostic")
        )
    }

def assemble_assessment_results(
    moderator: Any,
    session_id: str,
    include_history: bool = False,
    include_module_data: bool = True
) -> Tuple[Dict[str, Any], Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Gather comprehensive assessment data for a session.
    
    Returns tuple of (progress_snapshot, module_results, module_data_records, conversation_history)
    """
    progress_snapshot = get_progress_snapshot(moderator, session_id)
    module_results = get_all_module_results(moderator, session_id)
    module_data_records = get_module_data_records(moderator, session_id) if include_module_data else []
    conversation_history = get_conversation_history_records(moderator, session_id) if include_history else []
    return progress_snapshot, module_results, module_data_records, conversation_history

def generate_session_id() -> str:
    """
    Generate a secure session ID using UUID.
    
    Returns:
        Secure session ID string
    """
    return str(uuid.uuid4())

def get_patient_uuid(current_user_data) -> Optional[str]:
    """
    Extract patient UUID from current user data.
    
    Args:
        current_user_data: Current user data dict from get_current_user_from_token
                           Format: {"user": user_obj, "auth_info": auth_info, "user_type": str}
        
    Returns:
        Patient UUID string or None if not found
    """
    try:
        import uuid
        
        # Handle dict format from get_current_user_from_token
        if isinstance(current_user_data, dict):
            # Get user object from dict
            user = current_user_data.get("user")
            if user and hasattr(user, 'id'):
                try:
                    # Validate if it's a valid UUID
                    uuid.UUID(str(user.id))
                    return str(user.id)
                except ValueError:
                    pass
            
            # Fallback: try user_id from dict
            user_id = current_user_data.get("user_id")
            if user_id:
                try:
                    uuid.UUID(str(user_id))
                    return str(user_id)
                except ValueError:
                    pass
        
        # Handle object format (CurrentUserResponse or user object)
        if hasattr(current_user_data, 'id'):
            try:
                uuid.UUID(str(current_user_data.id))
                return str(current_user_data.id)
            except ValueError:
                pass
        
        if hasattr(current_user_data, 'user_id'):
            try:
                uuid.UUID(str(current_user_data.user_id))
                return str(current_user_data.user_id)
            except ValueError:
                pass
        
        # Fallback: try to get patient by email
        email = None
        if isinstance(current_user_data, dict):
            user = current_user_data.get("user")
            if user and hasattr(user, 'email'):
                email = user.email
            else:
                email = current_user_data.get("email")
        elif hasattr(current_user_data, 'email'):
            email = current_user_data.email
        
        if email:
            from app.db.session import SessionLocal
            from app.models.patient import Patient
            
            db = SessionLocal()
            try:
                patient = db.query(Patient).filter(Patient.email == email).first()
                if patient:
                    return str(patient.id)
            except Exception as e:
                logger.error(f"Failed to lookup patient by email: {e}")
            finally:
                db.close()
        
        logger.warning(f"Could not extract valid patient UUID from user data: {current_user_data}")
        return None
        
    except Exception as e:
        logger.error(f"Error extracting patient UUID: {e}", exc_info=True)
        return None

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class AssessmentChatRequest(BaseModel):
    """Request model for assessment chat"""
    message: Optional[str] = Field(None, description="User message")
    user_response: Optional[str] = Field(None, description="User response (alternative field name)")
    session_id: Optional[str] = Field(None, description="Session ID (optional for new sessions)")
    
    model_config = {"extra": "allow"}  # Allow extra fields to be passed without error
    
    @model_validator(mode='before')
    @classmethod
    def handle_field_names(cls, data):
        """Handle both 'message' and 'user_response' field names for backward compatibility"""
        if isinstance(data, dict):
            # If user_response is provided but message is not, use user_response as message
            if 'message' not in data and 'user_response' in data:
                data['message'] = data.pop('user_response')
        return data
    
    @property
    def text(self) -> str:
        """Get the message text from either field"""
        return self.message or self.user_response or ""

class AssessmentChatResponse(BaseModel):
    """Response model for assessment chat"""
    response: str = Field(..., description="Assistant response")
    session_id: str = Field(..., description="Session ID")
    current_module: Optional[str] = Field(None, description="Current active module")
    is_complete: bool = Field(False, description="Whether assessment is complete")
    progress_percentage: Optional[float] = Field(None, description="Overall progress percentage")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    module_sequence: Optional[List[str]] = Field(None, description="Ordered list of modules in the workflow")
    module_status: Optional[List[Dict[str, Any]]] = Field(None, description="Detailed status for each module")
    next_module: Optional[str] = Field(None, description="Next module in the workflow")
    module_timeline: Optional[Dict[str, Any]] = Field(None, description="Module timeline with timestamps and statuses")
    flow_info: Optional[Dict[str, Any]] = Field(None, description="Flow configuration and validation information")
    background_services: Optional[Dict[str, Any]] = Field(None, description="Background services (e.g., SRA) and their availability")
    progress_snapshot: Optional[Dict[str, Any]] = Field(None, description="Complete progress snapshot returned by moderator")
    symptom_summary: Optional[Dict[str, Any]] = Field(None, description="Summary of symptoms captured by SRA service")

class AssessmentStartRequest(BaseModel):
    """Request model for starting assessment"""
    session_id: Optional[str] = Field(None, description="Custom session ID (optional)")

class AssessmentStartResponse(BaseModel):
    """Response model for starting assessment"""
    session_id: str = Field(..., description="Session ID")
    greeting: str = Field(..., description="Initial greeting message")
    available_modules: List[str] = Field(..., description="List of available modules")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    current_module: Optional[str] = Field(None, description="Current active module at start")
    module_sequence: Optional[List[str]] = Field(None, description="Ordered list of modules in the workflow")
    module_status: Optional[List[Dict[str, Any]]] = Field(None, description="Detailed status for each module")
    module_timeline: Optional[Dict[str, Any]] = Field(None, description="Module timeline with timestamps and statuses")
    flow_info: Optional[Dict[str, Any]] = Field(None, description="Flow configuration and validation information")
    background_services: Optional[Dict[str, Any]] = Field(None, description="Background services (e.g., SRA) and their availability")
    progress_snapshot: Optional[Dict[str, Any]] = Field(None, description="Complete progress snapshot returned by moderator")
    total_estimated_duration: Optional[int] = Field(None, description="Estimated total duration for assessment (seconds)")
    symptom_summary: Optional[Dict[str, Any]] = Field(None, description="Summary of symptoms captured by SRA service")

class AssessmentProgressResponse(BaseModel):
    """Response model for assessment progress"""
    session_id: str = Field(..., description="Session ID")
    progress_percentage: float = Field(..., description="Overall progress percentage")
    current_module: Optional[str] = Field(None, description="Current active module")
    completed_modules: List[str] = Field(default_factory=list, description="Completed modules")
    total_modules: int = Field(0, description="Total number of modules")
    is_complete: bool = Field(False, description="Whether assessment is complete")
    started_at: Optional[str] = Field(None, description="Session start time")
    estimated_completion: Optional[str] = Field(None, description="Estimated completion time")
    module_sequence: Optional[List[str]] = Field(None, description="Ordered list of modules in the workflow")
    module_status: Optional[List[Dict[str, Any]]] = Field(None, description="Detailed status for each module")
    next_module: Optional[str] = Field(None, description="Next module in the workflow")
    module_timeline: Optional[Dict[str, Any]] = Field(None, description="Module timeline with timestamps and statuses")
    flow_info: Optional[Dict[str, Any]] = Field(None, description="Flow configuration and validation information")
    background_services: Optional[Dict[str, Any]] = Field(None, description="Background services (e.g., SRA) and their availability")
    progress_snapshot: Optional[Dict[str, Any]] = Field(None, description="Complete progress snapshot returned by moderator")
    symptom_summary: Optional[Dict[str, Any]] = Field(None, description="Summary of symptoms captured by SRA service")

class AssessmentResultsResponse(BaseModel):
    """Response model for assessment results"""
    session_id: str = Field(..., description="Session ID")
    is_complete: bool = Field(False, description="Whether assessment is complete")
    results: Dict[str, Any] = Field(default_factory=dict, description="Assessment results")
    module_data: List[Dict[str, Any]] = Field(default_factory=list, description="Module-specific data")
    summary: Optional[str] = Field(None, description="Assessment summary")
    recommendations: Optional[str] = Field(None, description="Recommendations")

class AssessmentHistoryResponse(BaseModel):
    """Response model for conversation history"""
    session_id: str = Field(..., description="Session ID")
    messages: List[Dict[str, Any]] = Field(default_factory=list, description="Conversation messages")
    total_messages: int = Field(0, description="Total number of messages")
    session_duration: Optional[str] = Field(None, description="Session duration")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata about the session history")

class ModuleDeployRequest(BaseModel):
    """Request model for module deployment"""
    module_name: str = Field(..., description="Name of module to deploy")
    session_id: Optional[str] = Field(None, description="Session ID (optional, creates new if not provided)")
    force: bool = Field(False, description="Force deployment even if module is already active")

class ModuleDeployResponse(BaseModel):
    """Response model for module deployment"""
    success: bool = Field(..., description="Whether deployment was successful")
    module_name: str = Field(..., description="Name of deployed module")
    message: str = Field(..., description="Deployment message")
    session_id: Optional[str] = Field(None, description="Session ID used for deployment")

class SessionSaveRequest(BaseModel):
    """Request model for saving assessment session"""
    session_id: str = Field(..., description="Session ID to save")

class SwitchModuleRequest(BaseModel):
    """Request model for switching module"""
    module_name: str = Field(..., description="Name of module to switch to")

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")

class SessionListResponse(BaseModel):
    """Response model for session list"""
    sessions: List[Dict[str, Any]] = Field(default_factory=list, description="List of sessions")
    total_sessions: int = Field(0, description="Total number of sessions")
    page: int = Field(1, description="Current page")
    page_size: int = Field(20, description="Items per page")
    total_pages: int = Field(0, description="Total number of pages")

# ============================================================================
# SELECTOR ENDPOINT SCHEMAS
# ============================================================================

class SCIDItemSelectionResponse(BaseModel):
    """Response model for a single SCID item selection"""
    item_id: str = Field(..., description="SCID item identifier (e.g., 'MDD_01')")
    item_text: str = Field(..., description="The question text")
    category: str = Field(..., description="Item category (e.g., 'mood', 'anxiety')")
    severity: str = Field(..., description="Severity level (e.g., 'low', 'medium', 'high')")
    relevance_score: float = Field(..., ge=0.0, le=10.0, description="Relevance score (0-10)")
    reasoning: str = Field(..., description="Clinical reasoning for selection")

class SelectSCIDItemsRequest(BaseModel):
    """Request model for selecting SCID-SC items"""
    session_id: str = Field(..., description="Assessment session ID")
    max_items: int = Field(5, ge=1, le=10, description="Maximum number of items to select (1-10)")

class SelectSCIDItemsResponse(BaseModel):
    """Response model for SCID-SC item selection"""
    session_id: str = Field(..., description="Assessment session ID")
    selected_items: List[SCIDItemSelectionResponse] = Field(..., description="List of selected SCID items")
    total_items: int = Field(..., description="Total number of items selected")
    selection_method: str = Field(..., description="Method used: 'hybrid', 'llm', or 'rule-based'")
    patient_summary: Optional[str] = Field(None, description="Patient summary used for selection")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class ModuleSelectionResponse(BaseModel):
    """Response model for a single module selection"""
    module_id: str = Field(..., description="Module identifier (e.g., 'MDD', 'GAD')")
    module_name: str = Field(..., description="Module display name")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Relevance score (0-1)")
    priority: int = Field(..., ge=1, description="Priority rank (1 = highest)")
    estimated_duration_mins: int = Field(..., ge=0, description="Estimated duration in minutes")
    key_indicators: List[str] = Field(default_factory=list, description="Key indicators that led to selection")
    reasoning: str = Field(..., description="Clinical reasoning for selection")

class SelectModulesRequest(BaseModel):
    """Request model for selecting SCID-CV modules"""
    session_id: Optional[str] = Field(None, description="Assessment session ID (optional)")
    assessment_data: Optional[Dict[str, Any]] = Field(None, description="Assessment data (if no session_id)")
    max_modules: int = Field(3, ge=1, le=5, description="Maximum number of modules to select (1-5)")
    use_llm: bool = Field(True, description="Whether to use LLM for selection")

class SelectModulesResponse(BaseModel):
    """Response model for SCID-CV module selection"""
    session_id: Optional[str] = Field(None, description="Assessment session ID (if provided)")
    selected_modules: List[ModuleSelectionResponse] = Field(..., description="List of selected modules")
    total_modules: int = Field(..., description="Total number of modules selected")
    selection_method: str = Field(..., description="Method used: 'hybrid', 'llm', or 'rule-based'")
    total_estimated_duration_mins: int = Field(..., ge=0, description="Total estimated duration in minutes")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Overall confidence score (0-1)")
    reasoning_steps: List[Dict[str, Any]] = Field(default_factory=list, description="Reasoning steps (ReAct approach)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

# ============================================================================
# ASSESSMENT ENDPOINTS
# ============================================================================

@router.post("/chat", response_model=AssessmentChatResponse)
async def assessment_chat(
    request: AssessmentChatRequest,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Main assessment chat endpoint - handles conversation with assessment modules.
    
    This endpoint processes user messages and routes them to the appropriate assessment module.
    If no session_id is provided, a new session will be created automatically.
    
    Accepts either 'message' or 'user_response' field names for backward compatibility.
    """
    # Log the received request for debugging
    logger.info(f"Chat request received - message: {request.message}, session_id: {request.session_id}")
    
    # Validate that a message was provided
    if not request.message:
        logger.error(f"Empty message in chat request. Fields: message={request.message}, user_response={request.user_response}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either 'message' or 'user_response' field is required"
        )
    
    if not is_assessment_available():
        error_info = handle_assessment_unavailable()
        return AssessmentChatResponse(
            response=error_info["message"],
            session_id=request.session_id or "degraded_mode",
            current_module="none",
            is_complete=False,
            progress_percentage=None,
            metadata=error_info
        )
    
    try:
        moderator = get_moderator()
        user_id = validate_patient_access(current_user_data)
        patient_id = user_id

        # Validate that patient has completed the mandatory questionnaire
        validate_questionnaire_completion(patient_id)

        # Use provided session_id or create new one
        session_id = request.session_id or generate_session_id()
        
        # If session_id provided, validate ownership
        if request.session_id and patient_id:
            try:
                validate_session_access(moderator, session_id, patient_id, require_session=False)
            except HTTPException:
                # If validation fails, ensure session has patient_id if it exists
                session_state = moderator.get_session_state(session_id)
                if session_state and patient_id:
                    if not session_state.metadata or not isinstance(session_state.metadata, dict):
                        session_state.metadata = {}
                    session_state.metadata["patient_id"] = str(patient_id)
                    # Try to create in database if it doesn't exist
                    if hasattr(moderator, 'db') and moderator.db:
                        try:
                            db_session = moderator.db.get_session(session_id)
                            if not db_session:
                                moderator.db.create_session(session_state, patient_id)
                        except Exception as e:
                            logger.debug(f"Could not create session in database: {e}")
        
        # Process message through moderator
        start_time = time.time()
        response_text = moderator.process_message(
            user_id=user_id,
            session_id=session_id,
            message=request.message
        )
        processing_time = int((time.time() - start_time) * 1000)
        
        # Ensure session has patient_id after processing (in case it was just created)
        if patient_id:
            session_state = moderator.get_session_state(session_id)
            if session_state:
                if not session_state.metadata or not isinstance(session_state.metadata, dict):
                    session_state.metadata = {}
                if not session_state.metadata.get("patient_id"):
                    session_state.metadata["patient_id"] = str(patient_id)
                    # Try to create in database if it doesn't exist
                    if hasattr(moderator, 'db') and moderator.db:
                        try:
                            db_session = moderator.db.get_session(session_id)
                            if not db_session:
                                moderator.db.create_session(session_state, patient_id)
                        except Exception as e:
                            logger.debug(f"Could not create session in database: {e}")
        
        # Store conversation messages
        if patient_id and hasattr(moderator, 'db') and moderator.db:
            try:
                current_module = moderator.get_current_module(session_id) or "unknown"
                moderator.db.store_conversation_message(
                    session_id=session_id,
                    patient_id=patient_id,
                    role='user',
                    message=request.message,
                    module_name=current_module,
                    message_type='text',
                    metadata={'user_id': user_id}
                )
                
                moderator.db.store_conversation_message(
                    session_id=session_id,
                    patient_id=patient_id,
                    role='assistant',
                    message=response_text,
                    module_name=current_module,
                    message_type='answer',
                    metadata={'processing_time_ms': processing_time}
                )
            except Exception as e:
                logger.error(f"Failed to store conversation messages: {e}")
        
        # Get session state and progress
        session_state = moderator.get_session_state(session_id)
        progress = moderator.get_session_progress(session_id)
        
        # Build response
        progress_snapshot = progress or {}
        progress_percentage = progress_snapshot.get("overall_percentage", 0) if progress_snapshot else None
        if progress_percentage is None and progress:
            progress_percentage = progress_snapshot.get("overall", 0)
        symptom_summary = get_symptom_summary(moderator, session_id)
        
        return AssessmentChatResponse(
            response=response_text,
            session_id=session_id,
            current_module=session_state.current_module if session_state else None,
            is_complete=progress_snapshot.get("is_complete", False) if progress_snapshot else False,
            progress_percentage=progress_percentage,
            module_sequence=progress_snapshot.get("module_sequence"),
            module_status=progress_snapshot.get("module_status"),
            next_module=progress_snapshot.get("next_module"),
            module_timeline=progress_snapshot.get("module_timeline"),
            flow_info=progress_snapshot.get("flow_info"),
            background_services=progress_snapshot.get("background_services"),
            progress_snapshot=progress_snapshot,
            symptom_summary=symptom_summary,
            metadata={
                "processing_time_ms": processing_time,
                "module_history": session_state.module_history if session_state else [],
                "progress_snapshot": progress_snapshot,
                "symptom_summary": symptom_summary,
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assessment chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assessment chat failed: {str(e)}"
        )

@router.post("/start", response_model=AssessmentStartResponse)
async def start_assessment(
    request: AssessmentStartRequest,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Start a new assessment session.
    
    Creates a new assessment session and returns the initial greeting message.
    If a custom session_id is provided, it will be used; otherwise, a new UUID is generated.
    """
    if not is_assessment_available():
        error_info = handle_assessment_unavailable()
        return AssessmentStartResponse(
            session_id="degraded_mode",
            greeting=error_info["message"],
            available_modules=[],
            metadata=error_info
        )
    
    try:
        moderator = get_moderator()
        user_id = validate_patient_access(current_user_data)
        patient_id = user_id

        # Validate that patient has completed the mandatory questionnaire
        validate_questionnaire_completion(patient_id)

        # Use provided session_id or generate new one
        session_id = request.session_id or generate_session_id()
        
        # Start assessment
        greeting = moderator.start_assessment(
            user_id=user_id,
            session_id=session_id
        )
        
        # Ensure session has patient_id in metadata and is stored in database
        if patient_id:
            session_state = moderator.get_session_state(session_id)
            if session_state:
                # Update session metadata with actual patient_id (UUID)
                if not session_state.metadata or not isinstance(session_state.metadata, dict):
                    session_state.metadata = {}
                session_state.metadata["patient_id"] = str(patient_id)
                
                # Create session in database if it doesn't exist
                if hasattr(moderator, 'db') and moderator.db:
                    try:
                        # Check if session exists in database
                        db_session = moderator.db.get_session(session_id)
                        if not db_session:
                            # Create session in database
                            moderator.db.create_session(session_state, patient_id)
                    except Exception as e:
                        logger.warning(f"Could not create session in database: {e}")
        
        # Store initial greeting
        if patient_id and hasattr(moderator, 'db') and moderator.db:
            try:
                moderator.db.store_conversation_message(
                    session_id=session_id,
                    patient_id=patient_id,
                    role='assistant',
                    message=greeting,
                    module_name=moderator.get_current_module(session_id) or "unknown",
                    message_type='greeting',
                    metadata={'is_initial_greeting': True}
                )
            except Exception as e:
                logger.error(f"Failed to store initial greeting: {e}")
        
        # Get available modules
        available_modules = list(moderator.modules.keys()) if hasattr(moderator, 'modules') else []
        session_state = moderator.get_session_state(session_id)
        progress_snapshot = get_progress_snapshot(moderator, session_id)
        symptom_summary = get_symptom_summary(moderator, session_id)
        started_at_iso = session_state.started_at.isoformat() if session_state and session_state.started_at else datetime.now().isoformat()
        metadata_payload = {
            "user_id": user_id,
            "started_at": started_at_iso,
            "module_count": len(available_modules),
            "progress_snapshot": progress_snapshot,
            "module_history": progress_snapshot.get("module_history", []),
            "background_services": progress_snapshot.get("background_services"),
        }
        
        return AssessmentStartResponse(
            session_id=session_id,
            greeting=greeting,
            available_modules=available_modules,
            metadata=metadata_payload,
            current_module=session_state.current_module if session_state else None,
            module_sequence=progress_snapshot.get("module_sequence"),
            module_status=progress_snapshot.get("module_status"),
            module_timeline=progress_snapshot.get("module_timeline"),
            flow_info=progress_snapshot.get("flow_info"),
            background_services=progress_snapshot.get("background_services"),
            progress_snapshot=progress_snapshot,
            total_estimated_duration=progress_snapshot.get("total_estimated_duration"),
            symptom_summary=symptom_summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assessment start error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assessment start failed: {str(e)}"
        )

@router.post("/initial-info")
async def save_initial_info(
    request: Dict[str, Any],
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Save initial assessment information (demographics and health history).
    
    This endpoint accepts the initial demographic and health information collected
    from the patient before starting the formal assessment. The information is
    stored and can be used for assessment contextualization.
    
    Request body should contain fields like:
    - age, city, country (demographics)
    - marital_status, occupation, education, employment_status (personal info)
    - medical history, medications, substance use (health info)
    - family mental health history
    - cultural and lifestyle factors
    
    Returns:
    - 200: Success with optional missing_fields list
    - 400: Invalid request data
    - 401: Unauthorized
    - 500: Server error
    """
    try:
        # Validate patient access
        patient_id = validate_patient_access(current_user_data)
        
        logger.info(f"Processing initial info for patient: {patient_id}")
        logger.debug(f"Initial info fields: {list(request.keys())}")
        
        # Define required fields for each step
        step1_required = ['age', 'city', 'country']
        step2_required = ['marital_status', 'occupation', 'education', 'employment_status']
        step3_required = []  # Medical history is optional but collected
        
        all_required = step1_required + step2_required + step3_required
        
        # Validate required fields
        missing_fields = []
        errors = {}
        
        for field in all_required:
            value = request.get(field, "").strip() if isinstance(request.get(field), str) else request.get(field)
            if not value:
                missing_fields.append(field)
                errors[field] = f"{field.replace('_', ' ').title()} is required"
        
        # If there are missing fields, return them
        if missing_fields:
            logger.warning(f"Missing required fields for patient {patient_id}: {missing_fields}")
            return {
                "success": False,
                "message": "Missing required fields",
                "missing_fields": missing_fields,
                "errors": errors,
                "status_code": 400
            }
        
        # Try to store in database if available
        try:
            from app.db.session import SessionLocal
            from app.models.patient import PatientAssessmentData
            
            db = SessionLocal()
            try:
                # Check if patient has existing assessment data
                existing_data = db.query(PatientAssessmentData).filter(
                    PatientAssessmentData.patient_id == patient_id
                ).first()
                
                # Prepare data to store
                assessment_data = {
                    "demographics": {
                        "age": request.get('age'),
                        "city": request.get('city'),
                        "country": request.get('country'),
                    },
                    "personal_info": {
                        "marital_status": request.get('marital_status'),
                        "occupation": request.get('occupation'),
                        "education": request.get('education'),
                        "employment_status": request.get('employment_status'),
                    },
                    "medical_history": {
                        "past_psychiatric_diagnosis": request.get('past_psychiatric_diagnosis'),
                        "past_psychiatric_treatment": request.get('past_psychiatric_treatment'),
                        "hospitalizations": request.get('hospitalizations'),
                        "ect_history": request.get('ect_history'),
                        "current_medications": request.get('current_medications'),
                        "medication_allergies": request.get('medication_allergies'),
                        "otc_supplements": request.get('otc_supplements'),
                        "medication_adherence": request.get('medication_adherence'),
                        "medical_history_summary": request.get('medical_history_summary'),
                        "chronic_illnesses": request.get('chronic_illnesses'),
                        "neurological_problems": request.get('neurological_problems'),
                        "head_injury": request.get('head_injury'),
                        "seizure_history": request.get('seizure_history'),
                        "pregnancy_status": request.get('pregnancy_status'),
                    },
                    "substance_use": {
                        "alcohol_use": request.get('alcohol_use'),
                        "drug_use": request.get('drug_use'),
                        "prescription_drug_abuse": request.get('prescription_drug_abuse'),
                        "last_use_date": request.get('last_use_date'),
                        "substance_treatment": request.get('substance_treatment'),
                        "tobacco_use": request.get('tobacco_use'),
                    },
                    "family_history": {
                        "family_mental_health_history": request.get('family_mental_health_history'),
                        "family_mental_health_stigma": request.get('family_mental_health_stigma'),
                    },
                    "cultural_lifestyle": {
                        "cultural_background": request.get('cultural_background'),
                        "cultural_beliefs": request.get('cultural_beliefs'),
                        "spiritual_supports": request.get('spiritual_supports'),
                        "lifestyle_smoking": request.get('lifestyle_smoking'),
                        "lifestyle_alcohol": request.get('lifestyle_alcohol'),
                        "lifestyle_activity": request.get('lifestyle_activity'),
                    }
                }
                
                if existing_data:
                    # Update existing record
                    existing_data.assessment_data = assessment_data
                    existing_data.updated_at = datetime.now()
                    db.commit()
                    logger.info(f"Updated assessment data for patient {patient_id}")
                else:
                    # Create new record
                    new_data = PatientAssessmentData(
                        patient_id=patient_id,
                        assessment_data=assessment_data
                    )
                    db.add(new_data)
                    db.commit()
                    logger.info(f"Created assessment data record for patient {patient_id}")
                    
            finally:
                db.close()
                
        except Exception as db_error:
            logger.warning(f"Could not store assessment data in database: {db_error}")
            # Continue anyway - data can be stored in session
        
        # Return success response
        logger.info(f"Successfully saved initial info for patient {patient_id}")
        return {
            "success": True,
            "message": "Initial information saved successfully",
            "patient_id": str(patient_id),
            "missing_fields": [],
            "data_fields_received": len([v for v in request.values() if v]),
            "status_code": 200
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving initial info: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save initial information: {str(e)}"
        )


@router.get("/sessions/{session_id}/progress", response_model=AssessmentProgressResponse)
async def get_assessment_progress(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Get assessment progress for a session.

    Returns detailed progress information including current module, completed modules,
    and overall completion percentage.
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )

    try:
        moderator = get_moderator()
        patient_id = validate_patient_access(current_user_data)

        # Validate that patient has completed the mandatory questionnaire
        validate_questionnaire_completion(patient_id)

        # Validate session access
        session_state = validate_session_access(moderator, session_id, patient_id)
        
        # Get session progress
        progress = moderator.get_session_progress(session_id)
        if not progress:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session progress not found"
            )
        symptom_summary = get_symptom_summary(moderator, session_id)
        
        # Handle both field name variations
        progress_percentage = progress.get("overall_percentage") or progress.get("overall", 0)
        
        return AssessmentProgressResponse(
            session_id=session_id,
            progress_percentage=progress_percentage,
            current_module=progress.get("current_module"),
            completed_modules=progress.get("completed_modules", []),
            total_modules=progress.get("total_modules", 0),
            is_complete=progress.get("is_complete", False),
            started_at=progress.get("started_at"),
            estimated_completion=None,  # TODO: Implement estimation logic
            module_sequence=progress.get("module_sequence"),
            module_status=progress.get("module_status"),
            next_module=progress.get("next_module"),
            module_timeline=progress.get("module_timeline"),
            flow_info=progress.get("flow_info"),
            background_services=progress.get("background_services"),
            progress_snapshot=progress,
            symptom_summary=symptom_summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get progress error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get progress: {str(e)}"
        )

@router.get("/sessions/{session_id}/results", response_model=AssessmentResultsResponse)
async def get_assessment_results(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Get assessment results for a session.

    Returns all assessment results including module data, progress, and summary.
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )

    try:
        moderator = get_moderator()
        patient_id = validate_patient_access(current_user_data)

        # Validate that patient has completed the mandatory questionnaire
        validate_questionnaire_completion(patient_id)

        # Validate session access
        validate_session_access(moderator, session_id, patient_id)
        
        # Get session progress
        progress_snapshot, module_results, module_data_records, _ = assemble_assessment_results(
            moderator, session_id, include_history=False, include_module_data=True
        )
        if not progress_snapshot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session progress not found"
            )
        
        # Get conversation history count for summary
        history = get_conversation_history_records(moderator, session_id)
        symptom_summary = get_symptom_summary(moderator, session_id)
        agent_status = build_agent_status(progress_snapshot, module_results)
        
        # Build results
        results = {
            "progress": progress_snapshot,
            "module_count": len(module_data_records),
            "conversation_count": len(history)
        }
        results["module_results"] = module_results
        results["module_timeline"] = progress_snapshot.get("module_timeline")
        results["symptom_summary"] = symptom_summary
        results["agent_status"] = agent_status
        
        return AssessmentResultsResponse(
            session_id=session_id,
            is_complete=progress_snapshot.get("is_complete", False),
            results=results,
            module_data=module_data_records,
            summary=f"Assessment processed with {len(progress_snapshot.get('module_status', []))} modules; captured {len(history)} conversation messages.",
            recommendations="Please consult with a healthcare professional for detailed analysis"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get results error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get results: {str(e)}"
        )

@router.get("/sessions/{session_id}/history", response_model=AssessmentHistoryResponse)
async def get_assessment_history(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Get conversation history for a session.

    Returns the complete conversation history including all user messages and assistant responses.
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )

    try:
        moderator = get_moderator()
        patient_id = validate_patient_access(current_user_data)

        # Validate that patient has completed the mandatory questionnaire
        validate_questionnaire_completion(patient_id)

        # Validate session access
        validate_session_access(moderator, session_id, patient_id)
        
        # Get conversation history
        history = get_conversation_history_records(moderator, session_id)
        progress_snapshot = get_progress_snapshot(moderator, session_id)
        module_timeline = progress_snapshot.get("module_timeline") if progress_snapshot else {}
        symptom_summary = get_symptom_summary(moderator, session_id) if progress_snapshot else {}
        
        if not history:
            # Return empty history instead of 404
            return AssessmentHistoryResponse(
                session_id=session_id,
                messages=[],
                total_messages=0,
                session_duration=None
            )
        
        # Calculate session duration if timestamps are available
        session_duration = None
        if history and len(history) > 1:
            try:
                start_time = history[0].get("timestamp")
                end_time = history[-1].get("timestamp")
                if start_time and end_time:
                    # Parse timestamps and calculate duration
                    from dateutil import parser
                    start = parser.parse(start_time) if isinstance(start_time, str) else start_time
                    end = parser.parse(end_time) if isinstance(end_time, str) else end_time
                    duration = end - start
                    session_duration = str(duration)
            except Exception as e:
                logger.debug(f"Could not calculate session duration: {e}")
        
        return AssessmentHistoryResponse(
            session_id=session_id,
            messages=history,
            total_messages=len(history),
            session_duration=session_duration,
            metadata={
                "progress_snapshot": progress_snapshot,
                "module_timeline": module_timeline,
                "symptom_summary": symptom_summary
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get history error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get history: {str(e)}"
        )

@router.post("/sessions/save", response_model=Dict[str, Any])
async def save_assessment_session(
    request: SessionSaveRequest,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Save a completed assessment session for the user.
    
    Marks the session as saved and stores a summary for later retrieval.
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        moderator = get_moderator()
        patient_id = get_patient_uuid(current_user_data)
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not identify patient"
            )
        
        # Validate session access
        session_state = validate_session_access(moderator, request.session_id, patient_id)
        
        # Get conversation history and progress
        history = moderator.db.get_conversation_history(request.session_id) if hasattr(moderator, 'db') and moderator.db else []
        progress = moderator.get_session_progress(request.session_id)
        
        # Create session summary
        progress_percentage = progress.get("overall_percentage") or progress.get("overall", 0) if progress else 0
        
        session_summary = {
            "session_id": request.session_id,
            "patient_id": patient_id,
            "created_at": session_state.started_at.isoformat() if hasattr(session_state, 'started_at') and session_state.started_at else None,
            "completed_at": session_state.updated_at.isoformat() if hasattr(session_state, 'updated_at') and session_state.updated_at else None,
            "current_module": session_state.current_module if hasattr(session_state, 'current_module') else None,
            "is_complete": progress.get("is_complete", False) if progress else False,
            "progress_percentage": progress_percentage,
            "completed_modules": progress.get("completed_modules", []) if progress else [],
            "total_messages": len(history) if history else 0,
            "conversation_preview": history[-3:] if history and len(history) > 3 else history if history else []
        }
        
        # Store session summary in database
        if hasattr(moderator, 'db') and moderator.db and patient_id:
            try:
                moderator.db.store_module_data(
                    session_id=request.session_id,
                    patient_id=patient_id,
                    module_name="session_summary",
                    data_type="session_save",
                    data_content=session_summary,
                    data_summary=f"Session {request.session_id} saved",
                    is_validated=True
                )
            except Exception as e:
                logger.error(f"Failed to store session summary: {e}")
        
        return {
            "success": True,
            "message": "Session saved successfully",
            "session_summary": session_summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save session: {str(e)}"
        )

@router.post("/continue", response_model=AssessmentChatResponse)
async def continue_assessment(
    request: AssessmentChatRequest,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Continue an assessment session with a new message.
    
    Requires an existing session_id. Validates session ownership before processing.
    """
    if not is_assessment_available():
        error_info = handle_assessment_unavailable()
        return AssessmentChatResponse(
            response=error_info["message"],
            session_id=request.session_id or "degraded_mode",
            current_module="none",
            is_complete=False,
            progress_percentage=None,
            metadata=error_info
        )
    
    try:
        moderator = get_moderator()
        user_id = validate_patient_access(current_user_data)
        patient_id = user_id

        # Validate that patient has completed the mandatory questionnaire
        validate_questionnaire_completion(patient_id)

        if not request.session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session ID is required"
            )
        
        # Validate session ownership
        if patient_id:
            try:
                validate_session_access(moderator, request.session_id, patient_id)
            except HTTPException as e:
                # If session not found, it might be a newly created session
                # Try to get it from cache and update it
                session_state = moderator.get_session_state(request.session_id)
                if session_state:
                    # Update metadata with patient_id if missing
                    if not session_state.metadata or not isinstance(session_state.metadata, dict):
                        session_state.metadata = {}
                    if not session_state.metadata.get("patient_id"):
                        session_state.metadata["patient_id"] = str(patient_id)
                        # Try to create in database
                        if hasattr(moderator, 'db') and moderator.db:
                            try:
                                moderator.db.create_session(session_state, patient_id)
                            except Exception as db_err:
                                logger.debug(f"Could not create session in database: {db_err}")
                    # Retry validation
                    if not validate_session_ownership(session_state, patient_id, moderator):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied to this session"
                        )
                else:
                    # Re-raise the original exception
                    raise
        
        # Process message through moderator
        start_time = time.time()
        response_text = moderator.process_message(
            user_id=user_id,
            session_id=request.session_id,
            message=request.message
        )
        processing_time = int((time.time() - start_time) * 1000)
        
        # Store conversation messages
        if patient_id:
            try:
                current_module = moderator.get_current_module(request.session_id) or "unknown"
                moderator.db.store_conversation_message(
                    session_id=request.session_id,
                    patient_id=patient_id,
                    role='user',
                    message=request.message,
                    module_name=current_module,
                    message_type='text',
                    metadata={'processing_time_ms': processing_time}
                )
                
                moderator.db.store_conversation_message(
                    session_id=request.session_id,
                    patient_id=patient_id,
                    role='assistant',
                    message=response_text,
                    module_name=current_module,
                    message_type='answer',
                    metadata={'processing_time_ms': processing_time}
                )
            except Exception as e:
                logger.error(f"Failed to store conversation: {e}")
        
        # Get session progress
        progress = moderator.get_session_progress(request.session_id)
        current_module = moderator.get_current_module(request.session_id)
        progress_snapshot = progress or {}
        is_complete = progress_snapshot.get("is_complete", False) if progress_snapshot else False
        
        # Handle both field name variations
        progress_percentage = progress_snapshot.get("overall_percentage") if progress_snapshot else None
        if progress_percentage is None and progress_snapshot:
            progress_percentage = progress_snapshot.get("overall", 0)
        symptom_summary = get_symptom_summary(moderator, request.session_id)
        
        return AssessmentChatResponse(
            response=response_text,
            session_id=request.session_id,
            current_module=current_module,
            is_complete=is_complete,
            progress_percentage=progress_percentage,
            module_sequence=progress_snapshot.get("module_sequence"),
            module_status=progress_snapshot.get("module_status"),
            next_module=progress_snapshot.get("next_module"),
            module_timeline=progress_snapshot.get("module_timeline"),
            flow_info=progress_snapshot.get("flow_info"),
            background_services=progress_snapshot.get("background_services"),
            progress_snapshot=progress_snapshot,
            symptom_summary=symptom_summary,
            metadata={
                "processing_time_ms": processing_time,
                "module_history": progress_snapshot.get("module_history", []),
                "progress_snapshot": progress_snapshot,
                "symptom_summary": symptom_summary,
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assessment continue error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assessment continue failed: {str(e)}"
        )

@router.get("/sessions")
async def get_user_sessions(
    current_user_data: dict = Depends(get_current_user_from_token),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page")
):
    """
    Get all saved assessment sessions for the user
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )

    try:
        moderator = get_moderator()
        patient_id = validate_patient_access(current_user_data)

        # Validate that patient has completed the mandatory questionnaire
        validate_questionnaire_completion(patient_id)
        
        # Get saved sessions from database
        if hasattr(moderator, 'db') and moderator.db:
            sessions = moderator.db.get_user_sessions_summary(patient_id)
        else:
            sessions = []
        
        # Sort by creation date (latest first)
        sessions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        total_sessions = len(sessions)
        total_pages = math.ceil(total_sessions / page_size) if total_sessions else 0
        if page > total_pages and total_pages != 0:
            page = total_pages
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_sessions = sessions[start_index:end_index]
        
        # Enhance session summaries with progress information
        for session in paginated_sessions:
            session_id = session.get("id") or session.get("session_id")
            progress_snapshot = get_progress_snapshot(moderator, session_id) if session_id else {}
            session["progress_snapshot"] = progress_snapshot
            if progress_snapshot:
                session["current_module"] = progress_snapshot.get("current_module")
                session["module_timeline"] = progress_snapshot.get("module_timeline")
                session["progress_percentage"] = progress_snapshot.get("overall_percentage")
                session["is_complete"] = progress_snapshot.get("is_complete", session.get("is_complete", False))
                session["next_module"] = progress_snapshot.get("next_module")
                session["module_sequence"] = progress_snapshot.get("module_sequence")
            else:
                session["progress_percentage"] = session.get("progress_percentage") or 0
                session["current_module"] = session.get("current_module")
            session["status"] = "completed" if session.get("is_complete") else "in_progress"
        
        return {
            "sessions": paginated_sessions,
            "total_sessions": total_sessions,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1
        }
        
    except Exception as e:
        logger.error(f"Get sessions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sessions: {str(e)}"
        )

@router.get("/sessions/{session_id}/load")
async def load_assessment_session(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Load a specific assessment session with full conversation history
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )

    try:
        moderator = get_moderator()
        # Get patient UUID for validation
        patient_id = validate_patient_access(current_user_data)

        # Validate that patient has completed the mandatory questionnaire
        validate_questionnaire_completion(patient_id)

        # Get session data
        session_state = moderator.get_session_state(session_id)
        if not session_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Validate session ownership
        if not validate_session_ownership(session_state, patient_id, moderator):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Get conversation history
        if hasattr(moderator, 'db') and moderator.db:
            history = moderator.db.get_conversation_history(session_id)
        else:
            history = []
        
        # Get progress data
        progress_snapshot = get_progress_snapshot(moderator, session_id)
        symptom_summary = get_symptom_summary(moderator, session_id) if progress_snapshot else {}
        
        # Convert history to frontend format
        messages = []
        if history:
            for i, msg in enumerate(history):
                message_content = msg.get("message", "").strip()
                
                # Ensure we have valid content
                if not message_content:
                    logger.debug(f"Empty message content for message {i}, using fallback")
                    message_content = "No content available"
                
                messages.append({
                    "id": msg.get("id", f"msg_{i}"),
                    "content": message_content,
                    "role": msg.get("role", "assistant"),
                    "timestamp": msg.get("timestamp", ""),
                    "metadata": msg.get("metadata", {})
                })
        else:
            logger.debug("No conversation history found")
        
        return {
            "session_id": session_id,
            "messages": messages,
            "progress": progress_snapshot,
            "session_state": {
                "current_module": session_state.current_module,
                "is_complete": progress_snapshot.get("is_complete", False) if progress_snapshot else False,
                "started_at": session_state.started_at.isoformat() if session_state.started_at else None,
                "updated_at": session_state.updated_at.isoformat() if session_state.updated_at else None
            },
            "symptom_summary": symptom_summary,
            "module_timeline": progress_snapshot.get("module_timeline") if progress_snapshot else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Load session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load session: {str(e)}"
        )

# ============================================================================
# MODULE MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/modules")
async def list_available_modules(current_user_data: dict = Depends(get_current_user_from_token)):
    """
    List all available assessment modules
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        moderator = get_moderator()
        modules = []
        for module_name, module in moderator.modules.items():
            modules.append({
                "name": module_name,
                "version": getattr(module, 'version', '1.0.0'),
                "description": getattr(module, 'description', 'Assessment module'),
                "is_active": False  # TODO: Check if module is active in any session
            })
        
        return {
            "modules": modules,
            "total_count": len(modules),
            "available": True
        }
        
    except Exception as e:
        logger.error(f"List modules error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list modules: {str(e)}"
        )

@router.post("/modules/{module_name}/deploy", response_model=ModuleDeployResponse)
async def deploy_module(
    module_name: str,
    request: ModuleDeployRequest,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Deploy a specific module for assessment
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        moderator = get_moderator()
        if module_name not in moderator.modules:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module_name}' not found"
            )
        
        # Extract user_id and user_type from current_user_data
        user_id = extract_user_id(current_user_data)
        user_type = extract_user_type(current_user_data)
        
        if user_type and user_type != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Assessment endpoints are only available for patients"
            )
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User ID not found in authentication"
            )
        
        # Get session_id from request or create new one
        session_id = getattr(request, 'session_id', None)
        if not session_id:
            # Create a new session for module deployment
            session_id = f"assess_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            
            # Start assessment with the new module
            greeting = moderator.start_assessment(
                user_id=user_id,
                session_id=session_id
            )
        
        # Deploy the module
        success = moderator.deploy_module(
            module_name=module_name,
            session_id=session_id,
            user_id=user_id,
            force=request.force
        )
        
        if success:
            response = ModuleDeployResponse(
                success=True,
                module_name=module_name,
                message=f"Module '{module_name}' deployed successfully"
            )
        else:
            response = ModuleDeployResponse(
                success=False,
                module_name=module_name,
                message=f"Failed to deploy module '{module_name}'"
            )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deploy module error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deploy module: {str(e)}"
        )

# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@router.get("/sessions/{session_id}/analytics")
async def get_session_analytics(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Get detailed session analytics for monitoring and insights
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        moderator = get_moderator()
        # Get patient UUID for validation
        patient_id = get_patient_uuid(current_user_data)
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not identify patient"
            )
        
        # Get session state and validate ownership
        session_state = moderator.get_session_state(session_id)
        if not session_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        if not validate_session_ownership(session_state, patient_id, moderator):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        analytics = moderator.get_session_analytics(session_id)
        if not analytics:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or no analytics available"
            )
        progress_snapshot = get_progress_snapshot(moderator, session_id)
        symptom_summary = get_symptom_summary(moderator, session_id)
        analytics["progress_snapshot"] = progress_snapshot
        analytics["module_timeline"] = progress_snapshot.get("module_timeline") if progress_snapshot else None
        analytics["symptom_summary"] = symptom_summary
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get analytics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics: {str(e)}"
        )

@router.get("/sessions/{session_id}/enhanced-progress", response_model=AssessmentProgressResponse)
async def get_enhanced_progress(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Get enhanced assessment progress with detailed metrics
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        moderator = get_moderator()
        # Get patient UUID for validation
        patient_id = get_patient_uuid(current_user_data)
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not identify patient"
            )
        
        # Get session state and validate ownership
        session_state = moderator.get_session_state(session_id)
        if not session_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        if not validate_session_ownership(session_state, patient_id, moderator):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        enhanced_progress = moderator.get_enhanced_progress(session_id)
        if not enhanced_progress:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        symptom_summary = get_symptom_summary(moderator, session_id)
        
        response = AssessmentProgressResponse(
            session_id=session_id,
            progress_percentage=enhanced_progress.get("overall_percentage", 0),
            current_module=enhanced_progress.get("current_module"),
            completed_modules=enhanced_progress.get("completed_modules", []),
            total_modules=enhanced_progress.get("total_modules", 0),
            is_complete=enhanced_progress.get("is_complete", False),
            started_at=enhanced_progress.get("started_at"),
            estimated_completion=None,  # TODO: Implement estimation logic
            module_sequence=enhanced_progress.get("module_sequence"),
            module_status=enhanced_progress.get("module_status"),
            next_module=enhanced_progress.get("next_module"),
            module_timeline=enhanced_progress.get("module_timeline"),
            flow_info=enhanced_progress.get("flow_info"),
            background_services=enhanced_progress.get("background_services"),
            progress_snapshot=enhanced_progress,
            symptom_summary=symptom_summary
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get enhanced progress error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get enhanced progress: {str(e)}"
        )

@router.post("/sessions/{session_id}/switch-module")
async def switch_module(
    session_id: str,
    request: SwitchModuleRequest,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Switch to a different module in the current session.
    
    Allows changing the active module during an assessment session.
    Validates session ownership before switching.
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        moderator = get_moderator()
        user_id = validate_patient_access(current_user_data)
        patient_id = get_patient_uuid(current_user_data)
        
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not identify patient"
            )
        
        # Validate session access
        validate_session_access(moderator, session_id, patient_id)
        
        # Check if method exists before calling
        if not hasattr(moderator, 'switch_module'):
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Module switching is not available in this version"
            )
        
        success = moderator.switch_module(session_id, request.module_name, user_id)
        
        if success:
            return {
                "success": True,
                "message": f"Successfully switched to module '{request.module_name}'",
                "session_id": session_id,
                "current_module": request.module_name
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to switch to module '{request.module_name}'"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Switch module error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to switch module: {str(e)}"
        )

@router.delete("/sessions/{session_id}")
async def delete_assessment_session(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Delete an assessment session
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        moderator = get_moderator()
        # Get patient UUID
        patient_id = get_patient_uuid(current_user_data)
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient ID not found"
            )
        
        # Try to get session state from cache (optional - for ownership validation)
        session_state = moderator.get_session_state(session_id)
        
        # If session is in cache, verify ownership before deletion
        if session_state:
            if not validate_session_ownership(session_state, patient_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete session belonging to another user"
                )
        # If session is not in cache, we'll still try to delete from database
        # The database.delete_session will verify ownership via patient_id
        
        # Delete session from database (this will verify patient_id ownership)
        if hasattr(moderator, 'db') and moderator.db:
            success = moderator.db.delete_session(session_id, patient_id)
        else:
            # If no database, just clean up from memory
            success = True
        
        if not success:
            # Session doesn't exist in database - return 404
            # This is OK - the session might have already been deleted
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or already deleted"
            )
        
        # Clean up session from memory cache (if it exists)
        moderator.cleanup_session(session_id)
        
        return {
            "success": True,
            "message": "Session deleted successfully",
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )

@router.get("/sessions/{session_id}/comprehensive-report")
async def get_comprehensive_report(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Get comprehensive natural language report from all assessment data
    
    Returns a single narrative summary: "A patient [demographics] presents [concerns] and confirms [results]"
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        moderator = get_moderator()
        # Get patient UUID for validation
        patient_id = get_patient_uuid(current_user_data)
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not identify patient"
            )
        
        # Get session state and validate ownership
        session_state = moderator.get_session_state(session_id)
        if not session_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        if not validate_session_ownership(session_state, patient_id, moderator):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Generate comprehensive report
        report = moderator.generate_comprehensive_report(session_id)
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or no assessment data available"
            )
        
        return {
            "session_id": session_id,
            "report": report,
            "report_length": len(report),
            "generated_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get comprehensive report error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate comprehensive report: {str(e)}"
        )

@router.get("/assessment_result/{session_id}")
async def get_assessment_result(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Protected endpoint: Get comprehensive assessment result from demographics to TPA
    
    Returns complete assessment workflow result including:
    - Demographics data
    - Symptom Recognition (SRA) results
    - Diagnosis Agent (DA) results  
    - Treatment Planning Agent (TPA) results
    - Complete workflow summary
    
    This endpoint aggregates all assessment results across the entire workflow.
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        moderator = get_moderator()
        # Verify session belongs to user
        patient_id = get_patient_uuid(current_user_data)
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not identify patient"
            )
        
        # Get session state
        session_state = moderator.get_session_state(session_id)
        if not session_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Verify ownership using validation helper
        if not validate_session_ownership(session_state, patient_id, moderator):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Get comprehensive assessment data (includes all TPA, DA, SRA outputs)
        progress_snapshot, module_results, module_data_records, conversation_history = assemble_assessment_results(
            moderator, session_id, include_history=True, include_module_data=True
        )
        symptom_summary = get_symptom_summary(moderator, session_id)
        agent_status = build_agent_status(progress_snapshot, module_results)
        assessment_results = {
            "session_id": session_id,
            "patient_id": patient_id,
            "completed_at": session_state.updated_at.isoformat() if session_state and session_state.updated_at else datetime.now().isoformat(),
            "progress": progress_snapshot,
            "module_results": module_results or (session_state.module_results if hasattr(session_state, 'module_results') else {}),
            "module_data": module_data_records,
            "module_timeline": progress_snapshot.get("module_timeline"),
            "conversation_history": conversation_history,
            "symptom_summary": symptom_summary,
            "agent_status": agent_status,
            "background_services": progress_snapshot.get("background_services"),
        }
        
        # Generate comprehensive workflow report
        try:
            comprehensive_report = moderator.generate_comprehensive_report(session_id)
            assessment_results["complete_workflow_report"] = comprehensive_report
        except Exception as e:
            logger.warning(f"Could not generate comprehensive report: {e}")
            assessment_results["complete_workflow_report"] = "Report generation pending"
        
        return assessment_results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get assessment result error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve assessment result: {str(e)}"
        )

@router.get("/sessions/{session_id}/assessment-data")
async def get_comprehensive_assessment_data(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    format: str = Query("json", description="Output format: json or export")
):
    """
    Get complete comprehensive assessment data (TPA, DA, SRA outputs, etc.)
    
    Returns all assessment data including:
    - All module results (TPA treatment plans, DA diagnoses, SRA symptoms, etc.)
    - Module data
    - Conversation history
    - Progress information
    - Comprehensive report
    
    This is the complete, shareable Assessment Data that can be exported.
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        moderator = get_moderator()
        
        # Get patient UUID for validation
        patient_id = get_patient_uuid(current_user_data)
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not identify patient"
            )
        
        # Get session state and validate ownership
        session_state = moderator.get_session_state(session_id)
        if not session_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        if not validate_session_ownership(session_state, patient_id, moderator):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Collect comprehensive assessment data
        progress_snapshot, module_results, module_data_records, conversation_history = assemble_assessment_results(
            moderator, session_id, include_history=True, include_module_data=True
        )
        if not progress_snapshot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment data not found for this session"
            )
        symptom_summary = get_symptom_summary(moderator, session_id)
        agent_status = build_agent_status(progress_snapshot, module_results)
        
        try:
            report = moderator.generate_comprehensive_report(session_id)
        except Exception as e:
            logger.warning(f"Could not generate comprehensive report: {e}")
            report = "Report generation pending"
        
        comprehensive_data = {
            "session_id": session_id,
            "patient_id": patient_id,
            "progress": progress_snapshot,
            "module_results": module_results,
            "module_data": module_data_records,
            "conversation_history": conversation_history,
            "symptom_summary": symptom_summary,
            "agent_status": agent_status,
            "module_timeline": progress_snapshot.get("module_timeline"),
            "background_services": progress_snapshot.get("background_services"),
            "complete_workflow_report": report
        }
        
        # Add export metadata
        comprehensive_data["export_metadata"] = {
            "exported_at": datetime.now().isoformat(),
            "export_format": format,
            "data_version": comprehensive_data.get("data_version", "1.0.0"),
            "shareable": True
        }
        
        # Format response based on request
        if format == "export":
            # Return as downloadable JSON structure
            return {
                "assessment_data": comprehensive_data,
                "metadata": {
                    "session_id": session_id,
                    "patient_id": patient_id,
                    "exported_at": datetime.now().isoformat(),
                    "format": "comprehensive_assessment_data",
                    "version": "1.0.0"
                }
            }
        else:
            # Return as JSON
            return comprehensive_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get comprehensive assessment data error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve comprehensive assessment data: {str(e)}"
        )

# ============================================================================
# SELECTOR ENDPOINTS
# ============================================================================

@router.post("/select-scid-items", response_model=SelectSCIDItemsResponse)
async def select_scid_items(
    request: SelectSCIDItemsRequest,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Select SCID-5-SC screening items based on assessment data.
    
    Uses hybrid approach (LLM + rule-based) to intelligently select
    the most relevant screening questions for a patient.
    
    **Input:**
    - session_id: Assessment session ID
    - max_items: Maximum number of items to select (1-10, default: 5)
    
    **Output:**
    - selected_items: List of selected SCID items with relevance scores
    - selection_method: Method used (hybrid/llm/rule-based)
    - patient_summary: Summary of patient data used for selection
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        # Get patient UUID for validation
        patient_id = get_patient_uuid(current_user_data)
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not identify patient"
            )
        
        moderator = get_moderator()
        
        # Validate session access
        session_state = validate_session_access(
            moderator, 
            request.session_id, 
            patient_id, 
            require_session=True
        )
        
        # Import selector
        from app.agents.assessment.assessment_v2.selector.scid_sc_selector import SCID_SC_ItemsSelector
        
        # Create selector and select items
        selector = SCID_SC_ItemsSelector()
        selected_items = selector.select_scid_items(
            session_id=request.session_id,
            max_items=request.max_items
        )
        
        # Get patient summary for response
        data_summary = selector.create_assessment_data_summary(request.session_id)
        patient_summary = selector.create_patient_summary_prompt(data_summary)
        
        # Determine selection method
        selection_method = "hybrid"
        if not selector.llm_client:
            selection_method = "rule-based"
        elif not selected_items:
            selection_method = "rule-based"
        
        # Format response
        items_response = [
            SCIDItemSelectionResponse(
                item_id=item.item_id,
                item_text=item.item_text,
                category=item.category,
                severity=item.severity,
                relevance_score=item.relevance_score,
                reasoning=item.reasoning
            )
            for item in selected_items
        ]
        
        return SelectSCIDItemsResponse(
            session_id=request.session_id,
            selected_items=items_response,
            total_items=len(selected_items),
            selection_method=selection_method,
            patient_summary=patient_summary,
            metadata={
                "timestamp": datetime.now().isoformat(),
                "max_items_requested": request.max_items
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error selecting SCID items: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to select SCID items: {str(e)}"
        )


@router.post("/select-modules", response_model=SelectModulesResponse)
async def select_scid_cv_modules(
    request: SelectModulesRequest,
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Select SCID-CV diagnostic modules based on assessment data.
    
    Uses hybrid ReAct approach (LLM reasoning + rule-based) to intelligently
    select the most relevant diagnostic modules for comprehensive evaluation.
    
    **Input:**
    - session_id: Assessment session ID (optional if assessment_data provided)
    - assessment_data: Direct assessment data (optional if session_id provided)
    - max_modules: Maximum number of modules to select (1-5, default: 3)
    - use_llm: Whether to use LLM for selection (default: True)
    
    **Output:**
    - selected_modules: List of selected modules with relevance scores
    - selection_method: Method used (hybrid/llm/rule-based)
    - total_estimated_duration_mins: Total time estimate
    - confidence_score: Overall confidence (0-1)
    - reasoning_steps: ReAct reasoning steps
    """
    if not is_assessment_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Assessment system is not available"
        )
    
    try:
        # Get patient UUID for validation
        patient_id = get_patient_uuid(current_user_data)
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not identify patient"
            )
        
        moderator = get_moderator()
        
        # Import selector and data collection
        from app.agents.assessment.assessment_v2.selector.module_selector import (
            SCID_CV_ModuleSelector,
            AssessmentDataCollection
        )
        
        # Get assessment data
        if request.session_id:
            # Validate session access
            session_state = validate_session_access(
                moderator,
                request.session_id,
                patient_id,
                require_session=True
            )
            
            # Get data from session
            from app.agents.assessment.assessment_v2.selector.scid_sc_selector import SCID_SC_ItemsSelector
            selector_helper = SCID_SC_ItemsSelector()
            data_summary = selector_helper.create_assessment_data_summary(request.session_id)
            
            # Get SCID-SC responses from session
            scid_sc_responses = {}
            if session_state and hasattr(session_state, 'module_results'):
                scid_sc_data = session_state.module_results.get("scid_screening", {})
                if scid_sc_data:
                    scid_sc_responses = {
                        "positive_screens": scid_sc_data.get("positive_screens", []),
                        "responses": scid_sc_data.get("responses", {})
                    }
            
            assessment_data = AssessmentDataCollection(
                demographics=data_summary.demographics,
                presenting_concern=data_summary.presenting_concern,
                risk_assessment=data_summary.risk_assessment,
                scid_sc_responses=scid_sc_responses,
                session_metadata=data_summary.session_metadata
            )
            session_id = request.session_id
        elif request.assessment_data:
            # Use provided assessment data
            data = request.assessment_data
            assessment_data = AssessmentDataCollection(
                demographics=data.get("demographics", {}),
                presenting_concern=data.get("presenting_concern", {}),
                risk_assessment=data.get("risk_assessment", {}),
                scid_sc_responses=data.get("scid_sc_responses", {}),
                session_metadata=data.get("session_metadata", {})
            )
            session_id = None
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either session_id or assessment_data must be provided"
            )
        
        # Create selector and select modules
        selector = SCID_CV_ModuleSelector(use_llm=request.use_llm)
        selection_result = selector.select_modules(
            assessment_data=assessment_data,
            max_modules=request.max_modules
        )
        
        # Determine selection method
        selection_method = "hybrid"
        if not request.use_llm or not selector.llm:
            selection_method = "rule-based"
        elif not selection_result.selected_modules:
            selection_method = "rule-based"
        
        # Format response
        modules_response = [
            ModuleSelectionResponse(
                module_id=module.module_id,
                module_name=module.module_name,
                relevance_score=module.relevance_score,
                priority=module.priority,
                estimated_duration_mins=module.estimated_duration_mins,
                key_indicators=module.key_indicators,
                reasoning=module.reasoning
            )
            for module in selection_result.selected_modules
        ]
        
        # Format reasoning steps
        reasoning_steps = [
            {
                "step_number": step.step_number,
                "step_type": step.step_type,
                "content": step.content,
                "confidence": step.confidence,
                "timestamp": step.timestamp
            }
            for step in selection_result.reasoning_steps
        ]
        
        return SelectModulesResponse(
            session_id=session_id,
            selected_modules=modules_response,
            total_modules=len(selection_result.selected_modules),
            selection_method=selection_method,
            total_estimated_duration_mins=selection_result.total_estimated_duration_mins,
            confidence_score=selection_result.confidence_score,
            reasoning_steps=reasoning_steps,
            metadata={
                "timestamp": selection_result.timestamp,
                "max_modules_requested": request.max_modules,
                "use_llm": request.use_llm
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error selecting SCID-CV modules: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to select SCID-CV modules: {str(e)}"
        )


@router.get("/health")
async def assessment_health():
    """
    Health check for assessment system
    """
    available = is_assessment_available()
    moderator_safe = get_moderator_safe()
    return {
        "status": "healthy" if available else "unavailable",
        "assessment_available": available,
        "agents_available": AGENTS_AVAILABLE,
        "modules_count": len(moderator_safe.modules) if moderator_safe else 0,
        "enhanced_features": {
            "real_time_deployment": True,
            "conversation_storage": True,
            "progress_tracking": True,
            "analytics": True,
            "module_switching": True,
            "comprehensive_report": True,
            "comprehensive_data_storage": True,
            "assessment_data_export": True,
            "agent_integration": AGENTS_AVAILABLE,
            "selector_endpoints": True
        },
        "timestamp": time.time()
    }
