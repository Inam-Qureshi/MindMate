"""
Unified Assessment & Clinical Models
====================================
Comprehensive SQLAlchemy models for assessment and clinical data management.
Integrates modular assessment system with clinical records (diagnoses, treatments, symptoms).

All data is linked to the Patient model via foreign keys for centralized data management.

Author: Mental Health Platform Team
Version: 2.0.0 - Consolidated Assessment & Clinical Models
"""

from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, Integer, Float, Date,
    ForeignKey, Index, CheckConstraint, ARRAY, Enum, Numeric
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql import func
from datetime import datetime, date
from typing import Optional
import uuid
import enum

from .base import Base, BaseModel

# ============================================================================
# 1. ASSESSMENT SESSION TABLE
# ============================================================================

class AssessmentSession(Base, BaseModel):
    """
    Assessment session tracking - Links to Patient model
    
    Tracks the overall assessment flow including which modules have been
    completed and the current state of the session.
    """
    __tablename__ = "assessment_sessions"
    
    # Session identification
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Patient linkage - CASCADE DELETE ensures cleanup
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey('patients.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # User identification (for auth cross-reference)
    user_id = Column(String(100), nullable=False, index=True)
    
    # Session state
    current_module = Column(String(100))
    module_history = Column(ARRAY(String))  # Array of completed module names
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime(timezone=True))
    
    # Status
    is_complete = Column(Boolean, default=False, nullable=False, index=True)
    
    # Flexible metadata storage (renamed from 'metadata' to avoid SQLAlchemy reserved word)
    session_metadata = Column(JSONB)
    
    # Relationships
    patient = relationship("Patient", back_populates="assessment_sessions")
    module_states = relationship(
        "AssessmentModuleState",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    module_results = relationship(
        "AssessmentModuleResult",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    conversations = relationship(
        "AssessmentConversation",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    transitions = relationship(
        "AssessmentModuleTransition",
        back_populates="session",
        cascade="all, delete-orphan"
    )
    
    # Table args
    __table_args__ = (
        Index('idx_assessment_sessions_patient_active', 'patient_id', 'is_complete'),
        Index('idx_assessment_sessions_updated', 'updated_at'),
    )
    
    def __repr__(self):
        return f"<AssessmentSession(session_id='{self.session_id}', patient_id='{self.patient_id}', complete={self.is_complete})>"


# ============================================================================
# 2. ASSESSMENT MODULE STATE TABLE
# ============================================================================

class AssessmentModuleState(Base, BaseModel):
    """
    Module-specific state storage for checkpointing and recovery
    
    Stores the internal state of each module to allow for session
    pause/resume functionality.
    """
    __tablename__ = "assessment_module_states"
    
    # Session and patient linkage
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey('assessment_sessions.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey('patients.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Module information
    module_name = Column(String(100), nullable=False, index=True)
    
    # State data (flexible JSON)
    state_data = Column(JSONB, nullable=False)
    
    # Metadata
    # checkpoint_metadata = Column(JSONB, nullable=True)  # REMOVED: Column doesn't exist in database
    
    # Timestamps
    created_at_time = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at_time = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship("AssessmentSession", back_populates="module_states")
    patient = relationship("Patient")
    
    # Table args
    __table_args__ = (
        Index('idx_module_states_session_module', 'session_id', 'module_name', unique=True),
        Index('idx_module_states_patient', 'patient_id'),
        Index('idx_module_states_updated', 'updated_at_time'),
    )
    
    def __repr__(self):
        return f"<AssessmentModuleState(module='{self.module_name}', session='{self.session_id}')>"


# ============================================================================
# 3. ASSESSMENT MODULE RESULTS TABLE
# ============================================================================

class AssessmentModuleResult(Base, BaseModel):
    """
    Final results from completed assessment modules
    
    Stores the collected data from each module when it completes.
    """
    __tablename__ = "assessment_module_results"
    
    # Session and patient linkage
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey('assessment_sessions.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey('patients.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Module information
    module_name = Column(String(100), nullable=False, index=True)
    
    # Results data (flexible JSON)
    results_data = Column(JSONB, nullable=False)
    
    # Quality metrics
    # confidence_score = Column(Float, nullable=True)  # REMOVED: Column doesn't exist in database
    # parsing_method = Column(String(50), nullable=True)  # REMOVED: Column doesn't exist in database
    # processing_time_ms = Column(Integer, nullable=True)  # REMOVED: Column doesn't exist in database
    
    # Timestamps
    completed_at_time = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Relationships
    session = relationship("AssessmentSession", back_populates="module_results")
    patient = relationship("Patient")
    
    # Table args
    __table_args__ = (
        Index('idx_module_results_session_module', 'session_id', 'module_name', unique=True),
        Index('idx_module_results_patient_module', 'patient_id', 'module_name'),
        Index('idx_module_results_completed', 'completed_at_time'),
    )
    
    def __repr__(self):
        return f"<AssessmentModuleResult(module='{self.module_name}', patient='{self.patient_id}')>"


# ============================================================================
# 4. ASSESSMENT CONVERSATIONS TABLE
# ============================================================================

class AssessmentConversation(Base, BaseModel):
    """
    Complete conversation history for assessment sessions
    
    Stores all messages exchanged during the assessment with full context
    including which module was active at the time.
    """
    __tablename__ = "assessment_conversations"
    
    # Session and patient linkage
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey('assessment_sessions.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey('patients.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Message context
    module_name = Column(String(100), index=True)  # Which module was active
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    
    # Message content
    message = Column(Text, nullable=False)
    # message_type = Column(String(50), nullable=True, default='text')  # REMOVED: Column doesn't exist in database
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    
    # Flexible metadata (renamed to avoid SQLAlchemy reserved word)
    message_metadata = Column(JSONB)  # e.g., {"is_greeting": true, "extracted_data": {...}}
    # parsing_metadata column exists in newer schemas but isn't available in current DB.
    # Keeping it commented prevents ORM from selecting a non-existent column.
    # parsing_metadata = Column(JSONB, nullable=True)
    
    # Relationships
    session = relationship("AssessmentSession", back_populates="conversations")
    patient = relationship("Patient")
    
    # Table args
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant', 'system')", name='check_conversation_role'),
        Index('idx_conversations_session_timestamp', 'session_id', 'timestamp'),
        Index('idx_conversations_patient_timestamp', 'patient_id', 'timestamp'),
        Index('idx_conversations_module', 'module_name'),
    )
    
    @validates('role')
    def validate_role(self, key, role):
        """Validate role is one of the allowed values"""
        if role not in ['user', 'assistant', 'system']:
            raise ValueError(f"Invalid role: {role}. Must be 'user', 'assistant', or 'system'")
        return role
    
    def __repr__(self):
        return f"<AssessmentConversation(role='{self.role}', module='{self.module_name}', timestamp='{self.timestamp}')>"


# ============================================================================
# 5. ASSESSMENT MODULE TRANSITIONS TABLE
# ============================================================================

class AssessmentModuleTransition(Base, BaseModel):
    """
    Module transition tracking for analytics and flow analysis
    
    Records when the assessment moves from one module to another.
    """
    __tablename__ = "assessment_module_transitions"
    
    # Session and patient linkage
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey('assessment_sessions.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey('patients.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Transition information
    from_module = Column(String(100))  # NULL for session start
    to_module = Column(String(100), nullable=False)
    
    # Timestamp
    transitioned_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    
    # Flexible metadata (renamed to avoid SQLAlchemy reserved word)
    transition_metadata = Column(JSONB)  # e.g., {"reason": "module_complete", "duration": 120}
    # processing_time_ms = Column(Integer, nullable=True)  # REMOVED: Column doesn't exist in database
    
    # Relationships
    session = relationship("AssessmentSession", back_populates="transitions")
    patient = relationship("Patient")
    
    # Table args
    __table_args__ = (
        Index('idx_transitions_session', 'session_id'),
        Index('idx_transitions_patient', 'patient_id'),
        Index('idx_transitions_timestamp', 'transitioned_at'),
        Index('idx_transitions_modules', 'from_module', 'to_module'),
    )
    
    def __repr__(self):
        return f"<AssessmentModuleTransition(from='{self.from_module}', to='{self.to_module}')>"


# ============================================================================
# 6. ASSESSMENT DEMOGRAPHICS TABLE (Module-Specific)
# ============================================================================

class AssessmentDemographics(Base, BaseModel):
    """
    Demographics data collected during assessment
    
    Stores demographic information with proper patient linkage.
    One demographics record per patient (latest overwrites).
    """
    __tablename__ = "assessment_demographics"
    
    # Patient linkage (UNIQUE - one demographics per patient)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey('patients.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Session linkage (which session collected this)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey('assessment_sessions.id', ondelete='CASCADE'),
        nullable=False
    )
    
    # Demographics fields
    age = Column(Integer, CheckConstraint('age >= 18 AND age <= 120'))
    gender = Column(String(50), CheckConstraint("gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say')"))
    education_level = Column(String(100), CheckConstraint(
        "education_level IN ('No formal education', 'Primary school', 'High school', "
        "'Bachelor''s degree', 'Master''s degree', 'Doctorate')"
    ))
    occupation = Column(String(100), CheckConstraint(
        "occupation IN ('Student', 'Employed full-time', 'Employed part-time', "
        "'Self-employed', 'Unemployed', 'Retired')"
    ))
    marital_status = Column(String(50), CheckConstraint(
        "marital_status IN ('Single', 'Married', 'Divorced', 'Widowed', 'Separated')"
    ))
    cultural_background = Column(String(200))
    location = Column(String(200))
    family_psychiatric_conditions = Column(JSONB)  # Array stored as JSON
    living_situation = Column(String(50), CheckConstraint(
        "living_situation IN ('alone', 'with_family', 'with_partner', 'shared', 'institutionalized')"
    ))
    financial_status = Column(String(50), CheckConstraint(
        "financial_status IN ('stable', 'moderate', 'unstable')"
    ))
    recent_stressors = Column(JSONB)  # Array stored as JSON
    
    # Metadata
    collected_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at_demographics = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    collection_method = Column(String(50), nullable=True)  # Method used for collection
    confidence_score = Column(Float, nullable=True)  # Confidence score
    validation_status = Column(String(50), nullable=True)  # Validation status
    
    # Relationships
    patient = relationship("Patient", back_populates="demographics_assessment")
    session = relationship("AssessmentSession")
    
    # Table args
    __table_args__ = (
        Index('idx_demographics_patient', 'patient_id'),
        Index('idx_demographics_session', 'session_id'),
        Index('idx_demographics_collected', 'collected_at'),
    )
    
    def __repr__(self):
        return f"<AssessmentDemographics(patient_id='{self.patient_id}', age={self.age}, gender='{self.gender}')>"


# ============================================================================
# UPDATE PATIENT MODEL RELATIONSHIP
# ============================================================================

# NOTE: Add this to Patient model in patient_models.py:
# demographics_assessment = relationship("AssessmentDemographics", back_populates="patient", uselist=False, cascade="all, delete-orphan")
# assessment_sessions = relationship("AssessmentSession", back_populates="patient", cascade="all, delete-orphan")


# ============================================================================
# 7. ASSESSMENT MODULE DATA TABLE (Enhanced)
# ============================================================================

class AssessmentModuleData(Base, BaseModel):
    """
    Enhanced module-specific data storage for flexible assessment modules
    
    Stores module-specific data with proper indexing and relationships
    """
    __tablename__ = "assessment_module_data"
    
    # Session and patient linkage
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey('assessment_sessions.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey('patients.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Module identification
    module_name = Column(String(100), nullable=False, index=True)
    module_version = Column(String(50), nullable=True)
    
    # Data storage
    data_type = Column(String(50), nullable=False)  # e.g., 'demographics', 'mood', 'clinical'
    data_content = Column(JSONB, nullable=False)  # Flexible JSON storage
    data_summary = Column(Text, nullable=True)  # Human-readable summary
    
    # Metadata
    collected_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    is_validated = Column(Boolean, default=False, nullable=False)
    validation_notes = Column(Text, nullable=True)
    
    # Relationships
    session = relationship("AssessmentSession")
    patient = relationship("Patient")
    
    # Table args
    __table_args__ = (
        Index('idx_module_data_session_module', 'session_id', 'module_name'),
        Index('idx_module_data_patient_module', 'patient_id', 'module_name'),
        Index('idx_module_data_type', 'data_type'),
        Index('idx_module_data_collected', 'collected_at'),
    )
    
    def __repr__(self):
        return f"<AssessmentModuleData(module='{self.module_name}', type='{self.data_type}', patient='{self.patient_id}')>"


# ============================================================================
# 8. ASSESSMENT CONVERSATION ENHANCED TABLE
# ============================================================================

class AssessmentConversationEnhanced(Base, BaseModel):
    """
    Enhanced conversation storage with better metadata and context
    """
    __tablename__ = "assessment_conversations_enhanced"
    
    # Session and patient linkage
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey('assessment_sessions.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey('patients.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Message context
    module_name = Column(String(100), index=True)  # Which module was active
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    message_type = Column(String(50), default='text')  # 'text', 'question', 'answer', 'greeting'
    
    # Message content
    message = Column(Text, nullable=False)
    message_length = Column(Integer, nullable=True)  # Character count
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    
    # Enhanced metadata
    message_metadata = Column(JSONB)  # e.g., {"is_greeting": true, "extracted_data": {...}}
    processing_time_ms = Column(Integer, nullable=True)  # Response time in milliseconds
    confidence_score = Column(Float, nullable=True)  # AI confidence score if applicable
    
    # Message relationships
    parent_message_id = Column(
        UUID(as_uuid=True),
        ForeignKey('assessment_conversations_enhanced.id'),
        nullable=True
    )  # For threading conversations
    
    # Relationships
    session = relationship("AssessmentSession")
    patient = relationship("Patient")
    parent_message = relationship("AssessmentConversationEnhanced", remote_side="AssessmentConversationEnhanced.id")
    
    # Table args
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant', 'system')", name='check_enhanced_conversation_role'),
        CheckConstraint("message_type IN ('text', 'question', 'answer', 'greeting', 'system')", name='check_enhanced_message_type'),
        Index('idx_enhanced_conversations_session_timestamp', 'session_id', 'timestamp'),
        Index('idx_enhanced_conversations_patient_timestamp', 'patient_id', 'timestamp'),
        Index('idx_enhanced_conversations_module', 'module_name'),
        Index('idx_enhanced_conversations_role', 'role'),
    )
    
    @validates('role')
    def validate_role(self, key, role):
        """Validate role is one of the allowed values"""
        allowed_roles = ['user', 'assistant', 'system']
        if role not in allowed_roles:
            raise ValueError(f"Role must be one of {allowed_roles}")
        return role
    
    def __repr__(self):
        return f"<AssessmentConversationEnhanced(role='{self.role}', module='{self.module_name}', length={self.message_length})>"


# ============================================================================
# CLINICAL MODELS - DIAGNOSIS, TREATMENT, SYMPTOM MANAGEMENT
# ============================================================================

# Clinical Enumerations
class DiagnosisType(str, enum.Enum):
    """Diagnosis classifications"""
    PRIMARY = "primary"
    SECONDARY = "secondary" 
    PROVISIONAL = "provisional"
    DIFFERENTIAL = "differential"
    RULE_OUT = "rule_out"


class DiagnosisStatus(str, enum.Enum):
    """Diagnosis lifecycle status"""
    ACTIVE = "active"
    RESOLVED = "resolved"
    IN_REMISSION = "in_remission"
    UNDER_REVIEW = "under_review"
    DISCONTINUED = "discontinued"


class TreatmentStatus(str, enum.Enum):
    """Treatment lifecycle status"""
    PLANNED = "planned"
    ACTIVE = "active" 
    COMPLETED = "completed"
    DISCONTINUED = "discontinued"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


class TreatmentType(str, enum.Enum):
    """Treatment modalities"""
    MEDICATION = "medication"
    PSYCHOTHERAPY = "psychotherapy"
    BEHAVIORAL_THERAPY = "behavioral_therapy"
    COGNITIVE_THERAPY = "cognitive_therapy"
    COMBINATION = "combination"
    GROUP_THERAPY = "group_therapy"
    FAMILY_THERAPY = "family_therapy"


class SymptomSeverity(int, enum.Enum):
    """Symptom severity levels (0-5 scale)"""
    NONE = 0
    MINIMAL = 1
    MILD = 2
    MODERATE = 3
    SEVERE = 4
    VERY_SEVERE = 5


class SymptomFrequency(str, enum.Enum):
    """Symptom frequency patterns"""
    NEVER = "never"
    RARELY = "rarely"
    OCCASIONALLY = "occasionally" 
    SOMETIMES = "sometimes"
    OFTEN = "often"
    FREQUENTLY = "frequently"
    DAILY = "daily"
    CONSTANT = "constant"


class ImpactLevel(int, enum.Enum):
    """Impact on daily functioning (0-10 scale)"""
    NO_IMPACT = 0
    MINIMAL = 1
    SLIGHT = 2
    MILD = 3
    MODERATE = 4
    MARKED = 5
    SEVERE = 6
    VERY_SEVERE = 7
    EXTREME = 8
    INCAPACITATING = 9
    TOTAL_IMPAIRMENT = 10


# ============================================================================
# DIAGNOSIS RECORD MODEL
# ============================================================================

class DiagnosisRecord(Base, BaseModel):
    """SQLAlchemy model for diagnosis records"""
    __tablename__ = "diagnosis_records"

    # Primary key and relationships
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id'), nullable=False, index=True)
    
    # Diagnosis classification
    diagnosis_code = Column(String(20), nullable=False, index=True)  # ICD-11/DSM-5 code
    diagnosis_name = Column(String(300), nullable=False, index=True)
    diagnosis_type = Column(Enum(DiagnosisType), nullable=False, default=DiagnosisType.PRIMARY)
    diagnosis_status = Column(Enum(DiagnosisStatus), nullable=False, default=DiagnosisStatus.ACTIVE)
    
    # Clinical assessment
    confidence_level = Column(Integer, nullable=False, default=80)  # 0-100%
    diagnosis_date = Column(Date, nullable=False, default=func.current_date())
    onset_date = Column(Date)  # When symptoms first appeared
    
    # Supporting information
    presenting_symptoms = Column(Text)  # JSON array of symptoms
    clinical_notes = Column(Text)
    diagnostic_criteria_met = Column(Text)  # Which criteria were satisfied
    
    # Severity and specifiers
    severity_level = Column(String(50))  # mild, moderate, severe
    specifiers = Column(Text)  # Additional diagnostic specifiers
    
    # Review and updates
    last_review_date = Column(Date)
    next_review_date = Column(Date)
    reviewed_by = Column(String(100))
    
    # Provider information
    diagnosing_provider_id = Column(String(100))
    diagnosing_provider_name = Column(String(200))
    
    # Relationships
    patient = relationship("Patient", back_populates="diagnoses")
    treatments = relationship(
        "TreatmentRecord", 
        back_populates="diagnosis", 
        cascade="all, delete-orphan",
        order_by="TreatmentRecord.start_date.desc()"
    )
    symptoms = relationship(
        "SymptomRecord", 
        back_populates="diagnosis", 
        cascade="all, delete-orphan",
        order_by="SymptomRecord.recorded_date.desc()"
    )
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint(
            'confidence_level BETWEEN 0 AND 100', 
            name='chk_diagnosis_confidence_range'
        ),
        CheckConstraint(
            'onset_date IS NULL OR diagnosis_date IS NULL OR onset_date <= diagnosis_date',
            name='chk_diagnosis_onset_before_diagnosis'
        ),
        Index('idx_diagnosis_patient_status', 'patient_id', 'diagnosis_status'),
        Index('idx_diagnosis_code_status', 'diagnosis_code', 'diagnosis_status'),
        Index('idx_diagnosis_date', 'diagnosis_date'),
        Index('idx_diagnosis_provider', 'diagnosing_provider_id'),
    )

    # Validation methods
    @validates('diagnosis_code')
    def validate_diagnosis_code(self, key, code):
        """Validate diagnosis code format"""
        if not code or len(code.strip()) < 3:
            raise ValueError("Diagnosis code must be at least 3 characters")
        return code.upper().strip()

    @validates('confidence_level')
    def validate_confidence_level(self, key, level):
        """Validate confidence level range"""
        if level is not None and (level < 0 or level > 100):
            raise ValueError("Confidence level must be between 0 and 100")
        return level

    @validates('diagnosis_name')
    def validate_diagnosis_name(self, key, name):
        """Validate and clean diagnosis name"""
        if not name or len(name.strip()) < 5:
            raise ValueError("Diagnosis name must be at least 5 characters")
        return name.strip()

    # Hybrid properties
    @hybrid_property
    def is_active(self) -> bool:
        """Check if diagnosis is currently active"""
        return self.diagnosis_status == DiagnosisStatus.ACTIVE

    @hybrid_property
    def is_primary(self) -> bool:
        """Check if this is a primary diagnosis"""
        return self.diagnosis_type == DiagnosisType.PRIMARY

    @hybrid_property
    def days_since_diagnosis(self) -> Optional[int]:
        """Calculate days since diagnosis"""
        if self.diagnosis_date:
            return (date.today() - self.diagnosis_date).days
        return None

    @hybrid_property
    def days_since_onset(self) -> Optional[int]:
        """Calculate days since symptom onset"""
        if self.onset_date:
            return (date.today() - self.onset_date).days
        return None

    # Instance methods
    def update_status(self, new_status: DiagnosisStatus, notes: Optional[str] = None) -> None:
        """Update diagnosis status with optional notes"""
        old_status = self.diagnosis_status
        self.diagnosis_status = new_status
        self.last_review_date = date.today()
        
        if notes:
            self.add_clinical_note(f"Status changed from {old_status.value} to {new_status.value}: {notes}")

    def add_clinical_note(self, note: str) -> None:
        """Add a clinical note with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        current_notes = self.clinical_notes or ""
        self.clinical_notes = f"{current_notes}\n[{timestamp}] {note}".strip()

    def __repr__(self) -> str:
        return f"<DiagnosisRecord(id={self.id}, code={self.diagnosis_code}, status={self.diagnosis_status})>"


# ============================================================================
# TREATMENT RECORD MODEL
# ============================================================================

class TreatmentRecord(Base, BaseModel):
    """SQLAlchemy model for treatment records"""
    __tablename__ = "treatment_records"

    # Primary key and relationships
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id'), nullable=False, index=True)
    diagnosis_id = Column(UUID(as_uuid=True), ForeignKey('diagnosis_records.id'), index=True)
    
    # Treatment identification
    treatment_name = Column(String(300), nullable=False)
    treatment_type = Column(Enum(TreatmentType), nullable=False, index=True)
    status = Column(Enum(TreatmentStatus), nullable=False, default=TreatmentStatus.PLANNED)
    
    # Treatment details
    description = Column(Text)
    treatment_goals = Column(Text)  # Primary objectives
    intervention_details = Column(Text)  # Specific interventions used
    
    # Session tracking
    planned_sessions = Column(Integer)
    sessions_completed = Column(Integer, default=0)
    session_frequency = Column(String(100))  # e.g., "weekly", "biweekly"
    session_duration = Column(Integer)  # Duration in minutes
    
    # Effectiveness and progress
    effectiveness_rating = Column(Integer)  # 1-5 scale
    progress_notes = Column(Text)
    client_feedback = Column(Text)
    
    # Dates
    start_date = Column(Date, index=True)
    end_date = Column(Date)
    last_session_date = Column(Date)
    next_session_date = Column(Date)
    
    # Provider information
    provider_id = Column(String(100))
    provider_name = Column(String(200))
    provider_type = Column(String(100))  # psychiatrist, psychologist, counselor
    
    # Cost and insurance
    cost_per_session = Column(Numeric(10, 2))
    total_cost = Column(Numeric(10, 2))
    insurance_covered = Column(Boolean, default=False)
    
    # Additional notes
    notes = Column(Text)
    side_effects = Column(Text)  # For medication treatments
    contraindications = Column(Text)
    
    # Relationships
    patient = relationship("Patient", back_populates="treatments")
    diagnosis = relationship("DiagnosisRecord", back_populates="treatments")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint(
            'effectiveness_rating IS NULL OR effectiveness_rating BETWEEN 1 AND 5',
            name='chk_treatment_effectiveness_range'
        ),
        CheckConstraint(
            'sessions_completed >= 0',
            name='chk_treatment_sessions_positive'
        ),
        CheckConstraint(
            'planned_sessions IS NULL OR planned_sessions > 0',
            name='chk_treatment_planned_sessions_positive'
        ),
        CheckConstraint(
            'end_date IS NULL OR start_date IS NULL OR end_date >= start_date',
            name='chk_treatment_dates_logical'
        ),
        CheckConstraint(
            'session_duration IS NULL OR session_duration > 0',
            name='chk_treatment_duration_positive'
        ),
        CheckConstraint(
            'cost_per_session IS NULL OR cost_per_session >= 0',
            name='chk_treatment_cost_positive'
        ),
        Index('idx_treatment_patient_status', 'patient_id', 'status'),
        Index('idx_treatment_type_status', 'treatment_type', 'status'),
        Index('idx_treatment_provider', 'provider_id'),
        Index('idx_treatment_dates', 'start_date', 'end_date'),
    )

    # Validation methods
    @validates('sessions_completed')
    def validate_sessions_completed(self, key, sessions):
        """Validate completed sessions"""
        if sessions is not None:
            if sessions < 0:
                raise ValueError("Completed sessions cannot be negative")
            if self.planned_sessions and sessions > self.planned_sessions:
                raise ValueError("Completed sessions cannot exceed planned sessions")
        return sessions

    @validates('effectiveness_rating')
    def validate_effectiveness_rating(self, key, rating):
        """Validate effectiveness rating range"""
        if rating is not None and (rating < 1 or rating > 5):
            raise ValueError("Effectiveness rating must be between 1 and 5")
        return rating

    @validates('planned_sessions', 'session_duration')
    def validate_positive_values(self, key, value):
        """Validate that certain fields are positive"""
        if value is not None and value <= 0:
            raise ValueError(f"{key} must be positive")
        return value

    # Hybrid properties
    @hybrid_property
    def is_active(self) -> bool:
        """Check if treatment is currently active"""
        return self.status == TreatmentStatus.ACTIVE

    @hybrid_property
    def completion_percentage(self) -> float:
        """Calculate treatment completion percentage"""
        if self.planned_sessions and self.sessions_completed:
            return min(100.0, (self.sessions_completed / self.planned_sessions) * 100)
        return 0.0

    @hybrid_property
    def duration_days(self) -> Optional[int]:
        """Calculate treatment duration in days"""
        if self.start_date:
            end_date = self.end_date or date.today()
            return (end_date - self.start_date).days
        return None

    @hybrid_property
    def is_overdue(self) -> bool:
        """Check if treatment has sessions overdue"""
        return (
            self.next_session_date is not None and 
            self.next_session_date < date.today() and
            self.status == TreatmentStatus.ACTIVE
        )

    # Instance methods
    def start_treatment(self, start_date: Optional[date] = None) -> None:
        """Start treatment with proper status update"""
        self.start_date = start_date or date.today()
        self.status = TreatmentStatus.ACTIVE

    def complete_treatment(self, end_date: Optional[date] = None, notes: Optional[str] = None) -> None:
        """Complete treatment with proper status update"""
        self.end_date = end_date or date.today()
        self.status = TreatmentStatus.COMPLETED
        if notes:
            self.add_progress_note(f"Treatment completed: {notes}")

    def add_progress_note(self, note: str) -> None:
        """Add a progress note with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        current_notes = self.progress_notes or ""
        self.progress_notes = f"{current_notes}\n[{timestamp}] {note}".strip()

    def record_session(self, session_date: Optional[date] = None, notes: Optional[str] = None) -> None:
        """Record a completed session"""
        self.sessions_completed = (self.sessions_completed or 0) + 1
        self.last_session_date = session_date or date.today()
        
        if notes:
            self.add_progress_note(f"Session {self.sessions_completed}: {notes}")

    def calculate_total_cost(self) -> None:
        """Calculate total cost based on sessions and cost per session"""
        if self.cost_per_session and self.sessions_completed:
            self.total_cost = self.cost_per_session * self.sessions_completed

    def __repr__(self) -> str:
        return f"<TreatmentRecord(id={self.id}, name={self.treatment_name}, status={self.status})>"


# ============================================================================
# SYMPTOM RECORD MODEL  
# ============================================================================

class SymptomRecord(Base, BaseModel):
    """SQLAlchemy model for symptom records"""
    __tablename__ = "symptom_records"

    # Primary key and relationships
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id'), nullable=False, index=True)
    diagnosis_id = Column(UUID(as_uuid=True), ForeignKey('diagnosis_records.id'), index=True)
    
    # Symptom identification
    symptom_name = Column(String(200), nullable=False, index=True)
    symptom_category = Column(String(100))  # anxiety, depression, psychotic, etc.
    symptom_code = Column(String(20))  # Standardized symptom codes if available
    
    # Severity and frequency
    severity = Column(Enum(SymptomSeverity), nullable=False, index=True)
    frequency = Column(Enum(SymptomFrequency), nullable=False)
    impact_score = Column(Enum(ImpactLevel), default=ImpactLevel.NO_IMPACT)
    
    # Detailed description
    description = Column(Text)
    triggers = Column(Text)  # What triggers this symptom
    coping_strategies = Column(Text)  # What helps manage it
    
    # Timeline information
    recorded_date = Column(Date, nullable=False, default=func.current_date(), index=True)
    onset_date = Column(Date)  # When symptom first appeared
    last_occurrence = Column(Date)  # Most recent occurrence
    
    # Context and patterns
    time_of_day = Column(String(50))  # morning, afternoon, evening, night
    duration_minutes = Column(Integer)  # How long symptom lasts
    associated_symptoms = Column(Text)  # Other symptoms that occur together
    
    # Status and monitoring
    is_active = Column(Boolean, default=True, index=True)
    is_primary_complaint = Column(Boolean, default=False)
    monitoring_frequency = Column(String(50))  # daily, weekly, monthly
    
    # Provider assessment
    assessed_by = Column(String(100))
    assessment_notes = Column(Text)
    intervention_recommended = Column(Text)
    
    # Progress tracking
    improvement_rating = Column(Integer)  # 1-5 scale, how much improved
    worsening_factors = Column(Text)
    improvement_factors = Column(Text)
    
    # Relationships
    patient = relationship("Patient", back_populates="symptoms")
    diagnosis = relationship("DiagnosisRecord", back_populates="symptoms")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint(
            'duration_minutes IS NULL OR duration_minutes > 0',
            name='chk_symptom_duration_positive'
        ),
        CheckConstraint(
            'improvement_rating IS NULL OR improvement_rating BETWEEN 1 AND 5',
            name='chk_symptom_improvement_range'
        ),
        CheckConstraint(
            'onset_date IS NULL OR recorded_date IS NULL OR onset_date <= recorded_date',
            name='chk_symptom_onset_before_recorded'
        ),
        Index('idx_symptom_patient_active', 'patient_id', 'is_active'),
        Index('idx_symptom_severity_active', 'severity', 'is_active'),
        Index('idx_symptom_category', 'symptom_category'),
        Index('idx_symptom_dates', 'recorded_date', 'onset_date'),
    )

    # Validation methods
    @validates('symptom_name')
    def validate_symptom_name(self, key, name):
        """Validate and clean symptom name"""
        if not name or len(name.strip()) < 2:
            raise ValueError("Symptom name must be at least 2 characters")
        return name.strip().title()

    @validates('duration_minutes')
    def validate_duration(self, key, duration):
        """Validate duration is positive"""
        if duration is not None and duration <= 0:
            raise ValueError("Duration must be positive")
        return duration

    @validates('improvement_rating')
    def validate_improvement_rating(self, key, rating):
        """Validate improvement rating range"""
        if rating is not None and (rating < 1 or rating > 5):
            raise ValueError("Improvement rating must be between 1 and 5")
        return rating

    # Hybrid properties
    @hybrid_property
    def severity_numeric(self) -> int:
        """Get numeric severity value"""
        return self.severity.value

    @hybrid_property
    def is_severe(self) -> bool:
        """Check if symptom is severe (4+ on scale)"""
        return self.severity.value >= 4

    @hybrid_property
    def is_chronic(self) -> bool:
        """Check if symptom is chronic (ongoing for 6+ months)"""
        if self.onset_date:
            return (date.today() - self.onset_date).days >= 180
        return False

    @hybrid_property
    def days_since_onset(self) -> Optional[int]:
        """Calculate days since symptom onset"""
        if self.onset_date:
            return (date.today() - self.onset_date).days
        return None

    @hybrid_property
    def high_impact(self) -> bool:
        """Check if symptom has high impact on functioning"""
        return self.impact_score.value >= 7

    # Instance methods
    def update_severity(self, new_severity: SymptomSeverity, notes: Optional[str] = None) -> None:
        """Update symptom severity with notes"""
        old_severity = self.severity
        self.severity = new_severity
        self.last_occurrence = date.today()
        
        if notes:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            current_notes = self.assessment_notes or ""
            severity_note = f"Severity updated from {old_severity.name} to {new_severity.name}: {notes}"
            self.assessment_notes = f"{current_notes}\n[{timestamp}] {severity_note}".strip()

    def mark_inactive(self, reason: Optional[str] = None) -> None:
        """Mark symptom as inactive"""
        self.is_active = False
        if reason:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M") 
            current_notes = self.assessment_notes or ""
            self.assessment_notes = f"{current_notes}\n[{timestamp}] Marked inactive: {reason}".strip()

    def add_assessment_note(self, note: str) -> None:
        """Add an assessment note with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        current_notes = self.assessment_notes or ""
        self.assessment_notes = f"{current_notes}\n[{timestamp}] {note}".strip()

    def __repr__(self) -> str:
        return f"<SymptomRecord(id={self.id}, name={self.symptom_name}, severity={self.severity})>"


# ============================================================================
# CLINICAL ASSESSMENT MODEL
# ============================================================================

class ClinicalAssessment(Base, BaseModel):
    """Model for comprehensive clinical assessments"""
    __tablename__ = "clinical_assessments"

    # Primary key and relationships
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id'), nullable=False, index=True)
    
    # Assessment details
    assessment_type = Column(String(100), nullable=False)  # intake, progress, discharge
    assessment_date = Column(Date, nullable=False, default=func.current_date())
    assessor_id = Column(String(100))
    assessor_name = Column(String(200))
    
    # Assessment scores and findings
    mental_status_exam = Column(Text)  # JSON or structured text
    risk_assessment = Column(Text)  # Suicide, violence, self-harm risk
    functional_assessment = Column(Text)  # Daily functioning assessment
    
    # Standardized assessment scores
    phq9_score = Column(Integer)  # Depression screening
    gad7_score = Column(Integer)  # Anxiety screening
    other_assessment_scores = Column(Text)  # JSON for other standardized tools
    
    # Clinical impressions
    clinical_impressions = Column(Text)
    recommendations = Column(Text)
    treatment_planning_notes = Column(Text)
    
    # Follow-up information
    next_assessment_date = Column(Date)
    follow_up_required = Column(Boolean, default=False)
    priority_level = Column(String(20))  # low, medium, high, urgent
    
    # Relationships
    patient = relationship("Patient", back_populates="clinical_assessments")
    
    # Constraints and indexes
    __table_args__ = (
        CheckConstraint(
            'phq9_score IS NULL OR phq9_score BETWEEN 0 AND 27',
            name='chk_assessment_phq9_range'
        ),
        CheckConstraint(
            'gad7_score IS NULL OR gad7_score BETWEEN 0 AND 21', 
            name='chk_assessment_gad7_range'
        ),
        Index('idx_assessment_patient_date', 'patient_id', 'assessment_date'),
        Index('idx_assessment_type', 'assessment_type'),
        Index('idx_assessment_assessor', 'assessor_id'),
    )

    def __repr__(self) -> str:
        return f"<ClinicalAssessment(id={self.id}, type={self.assessment_type}, date={self.assessment_date})>"


# ============================================================================
# UTILITY FUNCTIONS FOR CLINICAL DATA MANAGEMENT
# ============================================================================

def get_active_diagnoses_for_patient(patient_id, session):
    """Get all active diagnoses for a patient"""
    return session.query(DiagnosisRecord).filter(
        DiagnosisRecord.patient_id == patient_id,
        DiagnosisRecord.diagnosis_status == DiagnosisStatus.ACTIVE,
        DiagnosisRecord.is_deleted == False
    ).order_by(DiagnosisRecord.diagnosis_date.desc()).all()


def get_primary_diagnoses_for_patient(patient_id, session):
    """Get primary diagnoses for a patient"""
    return session.query(DiagnosisRecord).filter(
        DiagnosisRecord.patient_id == patient_id,
        DiagnosisRecord.diagnosis_type == DiagnosisType.PRIMARY,
        DiagnosisRecord.is_deleted == False
    ).order_by(DiagnosisRecord.diagnosis_date.desc()).all()


def get_active_treatments_for_patient(patient_id, session):
    """Get all active treatments for a patient"""
    return session.query(TreatmentRecord).filter(
        TreatmentRecord.patient_id == patient_id,
        TreatmentRecord.status == TreatmentStatus.ACTIVE,
        TreatmentRecord.is_deleted == False
    ).order_by(TreatmentRecord.start_date.desc()).all()


def get_severe_symptoms_for_patient(patient_id, session):
    """Get severe symptoms for a patient"""
    return session.query(SymptomRecord).filter(
        SymptomRecord.patient_id == patient_id,
        SymptomRecord.severity >= SymptomSeverity.SEVERE,
        SymptomRecord.is_active == True,
        SymptomRecord.is_deleted == False
    ).order_by(SymptomRecord.severity.desc()).all()


def get_patient_clinical_overview(patient_id, session):
    """Get comprehensive clinical overview for a patient"""
    from collections import Counter
    
    # Get all clinical data
    diagnoses = session.query(DiagnosisRecord).filter(
        DiagnosisRecord.patient_id == patient_id,
        DiagnosisRecord.is_deleted == False
    ).all()
    
    treatments = session.query(TreatmentRecord).filter(
        TreatmentRecord.patient_id == patient_id,
        TreatmentRecord.is_deleted == False
    ).all()
    
    symptoms = session.query(SymptomRecord).filter(
        SymptomRecord.patient_id == patient_id,
        SymptomRecord.is_deleted == False
    ).all()
    
    # Calculate statistics
    active_diagnoses = [d for d in diagnoses if d.is_active]
    active_treatments = [t for t in treatments if t.is_active]
    active_symptoms = [s for s in symptoms if s.is_active]
    severe_symptoms = [s for s in active_symptoms if s.is_severe]
    
    # Treatment completion rates
    completed_treatments = [t for t in treatments if t.status == TreatmentStatus.COMPLETED]
    treatment_completion_rate = (
        len(completed_treatments) / len(treatments) * 100 
        if treatments else 0
    )
    
    # Symptom categories
    symptom_categories = Counter(s.symptom_category for s in active_symptoms if s.symptom_category)
    
    return {
        'patient_id': patient_id,
        'summary': {
            'total_diagnoses': len(diagnoses),
            'active_diagnoses': len(active_diagnoses),
            'primary_diagnoses': len([d for d in diagnoses if d.is_primary]),
            'total_treatments': len(treatments),
            'active_treatments': len(active_treatments),
            'treatment_completion_rate': round(treatment_completion_rate, 2),
            'total_symptoms': len(symptoms),
            'active_symptoms': len(active_symptoms),
            'severe_symptoms': len(severe_symptoms)
        },
        'current_active_diagnoses': [
            {
                'id': str(d.id),
                'code': d.diagnosis_code,
                'name': d.diagnosis_name,
                'type': d.diagnosis_type.value,
                'confidence': d.confidence_level,
                'days_since_diagnosis': d.days_since_diagnosis
            }
            for d in active_diagnoses
        ],
        'current_active_treatments': [
            {
                'id': str(t.id),
                'name': t.treatment_name,
                'type': t.treatment_type.value,
                'sessions_completed': t.sessions_completed,
                'planned_sessions': t.planned_sessions,
                'completion_percentage': t.completion_percentage,
                'effectiveness_rating': t.effectiveness_rating
            }
            for t in active_treatments
        ],
        'severe_symptoms': [
            {
                'id': str(s.id),
                'name': s.symptom_name,
                'severity': s.severity.name,
                'frequency': s.frequency.value,
                'impact_score': s.impact_score.value,
                'days_since_onset': s.days_since_onset
            }
            for s in severe_symptoms
        ],
        'symptom_categories': dict(symptom_categories),
        'risk_indicators': {
            'has_severe_symptoms': len(severe_symptoms) > 0,
            'multiple_active_diagnoses': len(active_diagnoses) > 1,
            'treatment_gaps': len(active_diagnoses) > len(active_treatments),
            'chronic_symptoms': len([s for s in active_symptoms if s.is_chronic]) > 0
        }
    }


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Assessment Models
    'AssessmentSession',
    'AssessmentModuleState',
    'AssessmentModuleResult',
    'AssessmentConversation',
    'AssessmentModuleTransition',
    'AssessmentDemographics',
    'AssessmentModuleData',
    'AssessmentConversationEnhanced',
    
    # Clinical Enumerations
    'DiagnosisType',
    'DiagnosisStatus', 
    'TreatmentStatus',
    'TreatmentType',
    'SymptomSeverity',
    'SymptomFrequency',
    'ImpactLevel',
    
    # Clinical SQLAlchemy Models
    'DiagnosisRecord',
    'TreatmentRecord',
    'SymptomRecord',
    'ClinicalAssessment',
    
    # Clinical Utility Functions
    'get_active_diagnoses_for_patient',
    'get_primary_diagnoses_for_patient', 
    'get_active_treatments_for_patient',
    'get_severe_symptoms_for_patient',
    'get_patient_clinical_overview',
]

