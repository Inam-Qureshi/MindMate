"""
Enhanced Patient Models - Complete Patient Management System
===========================================================
Comprehensive patient models including demographics, authentication, preferences, 
history, presenting concerns, and risk assessment
"""

from sqlalchemy import (
    Column, Integer, String, Date, DateTime, Boolean, Enum, Text, JSON,
    ForeignKey, Index, UniqueConstraint, CheckConstraint, Numeric
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship, validates
from pydantic import BaseModel, Field, field_validator, computed_field, ConfigDict
from datetime import datetime, date, timezone
from typing import List, Optional, Dict, Any, Literal
from dataclasses import dataclass, field
import enum
import uuid
import re

# Import your base model
from .base import BaseModel as SQLAlchemyBaseModel, USERTYPE, Base

# Import related models
from .appointment import Appointment
# Clinical models imported conditionally to avoid circular imports
# Relationships defined using string references in the models

# ============================================================================
# SHARED ENUMERATIONS
# ============================================================================

class GenderEnum(str, enum.Enum):
    """Gender identity options"""
    MALE = "male"
    FEMALE = "female"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"
    OTHER = "other"

class RecordStatusEnum(str, enum.Enum):
    """Patient record status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    TRANSFERRED = "transferred"

class LanguageEnum(str, enum.Enum):
    """Language options for Pakistan context"""
    ENGLISH = "english"
    URDU = "urdu"
    PUNJABI = "punjabi"
    SINDHI = "sindhi"
    PASHTO = "pashto"

class ConsultationModeEnum(str, enum.Enum):
    """Consultation mode preferences"""
    VIRTUAL = "virtual"
    IN_PERSON = "in_person"
    HYBRID = "hybrid"

class RiskLevel(str, enum.Enum):
    """Risk assessment levels"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class TherapyModalityEnum(str, enum.Enum):
    """Therapy modality preferences"""
    INDIVIDUAL = "individual"
    GROUP = "group"
    COUPLES = "couples"
    FAMILY = "family"
    NO_PREFERENCE = "no_preference"

class TherapyApproachEnum(str, enum.Enum):
    """Therapeutic approach preferences"""
    CBT = "cognitive_behavioral_therapy"
    DBT = "dialectical_behavior_therapy"
    PSYCHODYNAMIC = "psychodynamic_therapy"
    HUMANISTIC = "humanistic_person_centered"
    EMDR = "eye_movement_desensitization_reprocessing"
    MINDFULNESS = "mindfulness_based_therapy"
    SOLUTION_FOCUSED = "solution_focused_brief_therapy"
    NO_PREFERENCE = "no_preference"

class PaymentMethodEnum(str, enum.Enum):
    """Payment method preferences"""
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    JAZZCASH = "jazzcash"
    EASYPAISA = "easypaisa"
    CARD = "card"
    INSURANCE = "insurance"

class UrgencyLevelEnum(str, enum.Enum):
    """Appointment urgency levels"""
    EMERGENCY = "emergency"
    URGENT = "urgent"
    STANDARD = "standard"
    FLEXIBLE = "flexible"


# ============================================================================
# DATACLASSES FOR COMPLEX DATA STRUCTURES
# ============================================================================

# Note: These dataclasses are no longer used as data is collected via questionnaire
# Keeping for potential future use or reference

# ============================================================================
# 1. CORE PATIENT TABLE
# ============================================================================

class Patient(Base, SQLAlchemyBaseModel):
    """Core patient demographics and identity information"""
    
    __tablename__ = "patients"

    # User Type
    user_type = Column(Enum(USERTYPE), nullable=False, default=USERTYPE.PATIENT)
    
    # Personal Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(Enum(GenderEnum), nullable=False )
    primary_language = Column(Enum(LanguageEnum), default=LanguageEnum.URDU)
    
    # Contact Information
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(20))
    
    # Address Information
    city = Column(String(100), nullable=True, index=True)
    district = Column(String(100))
    province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), default="Pakistan")
    
    # Record Management
    record_status = Column(Enum(RecordStatusEnum), default=RecordStatusEnum.ACTIVE)
    assigned_therapist_id = Column(String(100))
    intake_completed_date = Column(Date)
    last_contact_date = Column(Date)
    next_appointment_date = Column(DateTime(timezone=True))
    
    # Consent to policy
    accepts_terms_and_conditions = Column(Boolean, default=False)
    
    # Relationships
    auth_info = relationship("PatientAuthInfo", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    preferences = relationship("PatientPreferences", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    history = relationship("PatientHistory", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    presenting_concerns = relationship("PatientPresentingConcerns", back_populates="patient", cascade="all, delete-orphan")
    risk_assessments = relationship("PatientRiskAssessment", back_populates="patient", cascade="all, delete-orphan")
    
    forum_questions = relationship("ForumQuestion", back_populates="patient", lazy="dynamic", cascade="all, delete-orphan")
    forum_bookmarks = relationship("ForumBookmark", back_populates="patient", lazy="dynamic", cascade="all, delete-orphan")
    
    # New relationships for journal and forum
    journal_entries = relationship("JournalEntry", back_populates="patient", cascade="all, delete-orphan")
    
    # Clinical relationships
    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    reviews = relationship("SpecialistReview", back_populates="patient", cascade="all, delete-orphan")
    specialist_favorites = relationship("SpecialistFavorite", back_populates="patient", cascade="all, delete-orphan")
    
    # Progress tracking relationships
    exercise_progress = relationship("ExerciseProgress", back_populates="patient", cascade="all, delete-orphan")
    exercise_sessions = relationship("ExerciseSession", back_populates="patient", cascade="all, delete-orphan")
    user_goals = relationship("UserGoal", back_populates="patient", cascade="all, delete-orphan")
    user_achievements = relationship("UserAchievement", back_populates="patient", cascade="all, delete-orphan")
    
    # Mood assessment relationships
    mood_assessments = relationship("MoodAssessment", back_populates="patient", cascade="all, delete-orphan")
    mood_trends = relationship("MoodTrend", back_populates="patient", cascade="all, delete-orphan")
    mood_entries = relationship("MoodEntry", back_populates="patient", cascade="all, delete-orphan")
    user_streak = relationship("UserStreak", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    practice_calendar = relationship("PracticeCalendar", back_populates="patient", cascade="all, delete-orphan")
    
    # Assessment module relationships
    assessment_sessions = relationship("AssessmentSession", back_populates="patient", cascade="all, delete-orphan")
    demographics_assessment = relationship("AssessmentDemographics", back_populates="patient", uselist=False, cascade="all, delete-orphan")
    
    # Clinical relationships
    diagnoses = relationship("DiagnosisRecord", back_populates="patient", cascade="all, delete-orphan")
    treatments = relationship("TreatmentRecord", back_populates="patient", cascade="all, delete-orphan")
    symptoms = relationship("SymptomRecord", back_populates="patient", cascade="all, delete-orphan")
    clinical_assessments = relationship("ClinicalAssessment", back_populates="patient", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        Index('idx_patient_name', 'last_name', 'first_name'),
        Index('idx_patient_email', 'email'),
        Index('idx_patient_phone', 'phone'),
        Index('idx_patient_status', 'record_status'),
        Index('idx_patient_user_type', 'user_type'),
        Index('idx_patient_deleted', 'is_deleted'),
        Index('idx_patient_therapist', 'assigned_therapist_id'),
        Index('idx_patient_dob', 'date_of_birth'),
        UniqueConstraint('email', name='uq_patient_email'),
    )
    
    # Computed properties
    @property
    def age(self) -> int:
        """Calculate patient's age in years"""
        if self.date_of_birth:
            return (date.today() - self.date_of_birth).days // 365
        return None
    
    @property
    def full_name(self) -> str:
        """Full name"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_address(self) -> str:
        """Format full address as string"""
        parts = [self.city, self.district, self.province, self.country]
        return ", ".join(filter(None, parts))
    
    # Validation
    @validates('date_of_birth')
    def validate_dob(self, key, dob):
        if isinstance(dob, datetime):
            dob = dob.date()
        if dob > date.today():
            raise ValueError("Date of birth cannot be in the future")
        if (date.today() - dob).days > 36500:
            raise ValueError("Date of birth seems unrealistic (over 100 years old)")
        return dob
    
    @validates('user_type')
    def validate_user_type(self, key, user_type):
        if user_type != USERTYPE.PATIENT:
            raise ValueError("Patient model can only have user_type as PATIENT")
        return user_type
    
    @validates('email')
    def validate_email(self, key, email):
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError(f"Invalid email format: {email}")
        return email
    
    @validates('phone')
    def validate_phone(self, key, phone):
        if phone and not re.match(r'^\+?[\d\s\-\(\)]{10,20}$', phone):
            raise ValueError(f"Invalid phone number format: {phone}")
        return phone

# ============================================================================
# 2. PATIENT AUTHENTICATION INFO TABLE idx_auth_last_login
# ============================================================================

class PatientAuthInfo(Base, SQLAlchemyBaseModel):
    """Patient authentication and security information"""
    
    __tablename__ = "patient_auth_info"
    
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Authentication fields
    hashed_password = Column(String, nullable=True)
    password_salt = Column(String, nullable=True)
    password_changed_at = Column(DateTime(timezone=True))
    password_reset_token = Column(String, nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)
    
    # OTP and verification
    otp = Column(String, nullable=True)  # Legacy field - use otp_code instead
    otp_expiry = Column(DateTime(timezone=True), nullable=True)  # Legacy field - use otp_expires_at instead
    otp_code = Column(String(6), nullable=True)  # Standardized OTP field
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)  # Standardized expiry field
    otp_last_request_at = Column(DateTime(timezone=True), nullable=True)  # For rate limiting
    verification_token = Column(String, nullable=True)
    verification_token_expiry = Column(DateTime(timezone=True), nullable=True)
    
    # Login tracking
    login_attempts = Column(Integer, default=0)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(String(45))
    last_activity = Column(DateTime(timezone=True))
    
    # External authentication
    google_id = Column(String, unique=True, nullable=True)
    
    # Profile and preferences
    avatar_url = Column(String, nullable=True)
    theme_preference = Column(String(20), default="light")
    
    # Security settings
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_code = Column(String(6), nullable=True)
    two_factor_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Session management
    max_concurrent_sessions = Column(Integer, default=3)
    
    # Relationship
    patient = relationship("Patient", back_populates="auth_info")
    
    # Constraints
    __table_args__ = (
        Index('idx_auth_patient', 'patient_id'),
        Index('idx_auth_google', 'google_id'),
    )
    
    @property
    def is_account_locked(self) -> bool:
        """Check if account is currently locked"""
        if self.is_locked:
            return True
        if self.locked_until and self.locked_until > datetime.now():
            return True
        return False

# ============================================================================
# 3. PATIENT PREFERENCES TABLE
# ============================================================================

class PatientPreferences(Base, SQLAlchemyBaseModel):
    """Patient preferences for matching and treatment"""
    
    __tablename__ = "patient_preferences"

    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Basic preferences
    consultation_mode = Column(Enum(ConsultationModeEnum), default=ConsultationModeEnum.VIRTUAL)
    urgency_level = Column(Enum(UrgencyLevelEnum), default=UrgencyLevelEnum.STANDARD)
    max_budget = Column(Numeric(10, 2), nullable=True)
    
    # Additional preferences
    notes = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="preferences")

    # Constraints and Indexes
    __table_args__ = (
        CheckConstraint('max_budget >= 0', name='check_max_budget_positive'),
        Index('idx_patient_preferences_patient', 'patient_id'),
        Index('idx_patient_preferences_mode', 'consultation_mode'),
        Index('idx_patient_preferences_urgency', 'urgency_level'),
        Index('idx_patient_preferences_active', 'is_active'),
    )

# ============================================================================
# 4. PATIENT HISTORY TABLE - SIMPLIFIED
# ============================================================================

class PatientHistory(Base, SQLAlchemyBaseModel):
    """Patient basic medical history summary"""
    
    __tablename__ = "patient_history"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Basic medical summary
    medical_summary = Column(Text, nullable=True)
    last_updated = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="history")

    # Constraints
    __table_args__ = (
        Index('idx_patient_history_patient', 'patient_id'),
        Index('idx_patient_history_updated', 'last_updated'),
    )

# ============================================================================
# 5. PATIENT PRESENTING CONCERNS TABLE - SIMPLIFIED
# ============================================================================

class PatientPresentingConcerns(Base, SQLAlchemyBaseModel):
    """Patient current presenting concerns"""
    
    __tablename__ = "patient_presenting_concerns"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    
    # Current concern
    presenting_concern = Column(Text, nullable=True)
    severity_level = Column(Enum(UrgencyLevelEnum), default=UrgencyLevelEnum.STANDARD)
    
    # Session metadata
    conversation_complete = Column(Boolean, default=False)
    completion_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Status tracking
    is_active = Column(Boolean, default=True)
    
    # Relationships
    patient = relationship("Patient", back_populates="presenting_concerns")
    
    # Constraints
    __table_args__ = (
        Index('idx_presenting_concerns_patient', 'patient_id'),
        Index('idx_presenting_concerns_complete', 'conversation_complete'),
        Index('idx_presenting_concerns_active', 'is_active'),
        Index('idx_presenting_concerns_timestamp', 'completion_timestamp'),
    )

# ============================================================================
# 6. PATIENT RISK ASSESSMENT TABLE - SIMPLIFIED
# ============================================================================

class PatientRiskAssessment(Base, SQLAlchemyBaseModel):
    """Patient safety and risk assessment"""
    
    __tablename__ = "patient_risk_assessment"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    
    # Risk assessment
    risk_level = Column(Enum(RiskLevel), nullable=True)
    risk_summary = Column(Text, nullable=True)
    
    # Assessment metadata
    assessment_timestamp = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    assessed_by = Column(String(100), nullable=True)
    is_current = Column(Boolean, default=True)
    
    # Follow-up information
    requires_immediate_attention = Column(Boolean, default=False)
    safety_plan_created = Column(Boolean, default=False)
    
    # Relationships
    patient = relationship("Patient", back_populates="risk_assessments")
    
    # Constraints
    __table_args__ = (
        Index('idx_risk_assessment_patient', 'patient_id'),
        Index('idx_risk_assessment_level', 'risk_level'),
        Index('idx_risk_assessment_current', 'is_current'),
        Index('idx_risk_assessment_timestamp', 'assessment_timestamp'),
        Index('idx_risk_assessment_attention', 'requires_immediate_attention'),
    )
    
    @property
    def is_high_risk(self) -> bool:
        """Check if this assessment indicates high risk"""
        return self.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    
    @property
    def requires_crisis_intervention(self) -> bool:
        """Check if crisis intervention is needed"""
        return (self.risk_level == RiskLevel.CRITICAL or 
                self.requires_immediate_attention)

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def create_complete_patient_record(
    session,
    patient_data: dict,
    hashed_password: str
) -> Patient:
    """Create a complete patient record with auth info and default preferences"""
    
    # Create core patient record
    patient = Patient(**patient_data)
    session.add(patient)
    session.flush()  # Get the patient ID
    
    # Create auth info
    from app.utils.email_utils import generate_otp, get_otp_expiry
    
    otp = generate_otp()
    otp_expiry = get_otp_expiry()
    
    auth_info = PatientAuthInfo(
        patient_id=patient.id,
        hashed_password=hashed_password,
        is_active=False,  # Inactive until verified
        is_verified=False,
        otp=otp,
        otp_expiry=otp_expiry,
        theme_preference="light",
        max_concurrent_sessions=3
    )
    
    session.add(auth_info)
    
    # Create default preferences
    default_preferences = PatientPreferences(
        patient_id=patient.id,
        consultation_mode=ConsultationModeEnum.VIRTUAL,
        urgency_level=UrgencyLevelEnum.STANDARD,
        max_budget=5000.0,
        is_active=True
    )
    
    session.add(default_preferences)
    
    return patient

def create_patient_profile(
    session,
    patient_data: dict,
    hashed_password: str
) -> Patient:
    """Create a complete patient profile with basic records"""
    
    # Create the basic patient record first
    patient = create_complete_patient_record(session, patient_data, hashed_password)
    
    # Create history record if provided
    if history_data:
        history_dict = {
            'patient_id': patient.id,
            'past_psych_dx': history_data.past_psych_dx,
            'past_psych_treatment': history_data.past_psych_treatment,
            'hospitalizations': history_data.hospitalizations,
            'ect_history': history_data.ect_history,
            'current_meds': history_data.current_meds,
            'med_allergies': history_data.med_allergies,
            'otc_supplements': history_data.otc_supplements,
            'medication_adherence': history_data.medication_adherence,
            'medical_history_summary': history_data.medical_history_summary,
            'chronic_illnesses': history_data.chronic_illnesses,
            'neurological_problems': history_data.neurological_problems,
            'head_injury': history_data.head_injury,
            'seizure_history': history_data.seizure_history,
            'pregnancy_status': history_data.pregnancy_status,
            'alcohol_use': history_data.alcohol_use,
            'drug_use': history_data.drug_use,
            'prescription_drug_abuse': history_data.prescription_drug_abuse,
            'last_use_date': history_data.last_use_date,
            'substance_treatment': history_data.substance_treatment,
            'tobacco_use': history_data.tobacco_use,
            'cultural_background': history_data.cultural_background,
            'cultural_beliefs': history_data.cultural_beliefs,
            'spiritual_supports': history_data.spiritual_supports,
            'family_mental_health_stigma': history_data.family_mental_health_stigma,
            'completion_timestamp': history_data.completion_timestamp,
            'sections_completed': history_data.sections_completed
        }
        
        history = PatientHistory(**history_dict)
        session.add(history)
    
    # Create presenting concerns record if provided
    if presenting_concern_data:
        concerns_dict = {
            'patient_id': patient.id,
            'presenting_concern': presenting_concern_data.presenting_concern,
            'presenting_onset': presenting_concern_data.presenting_onset,
            'hpi_onset': presenting_concern_data.hpi_onset,
            'hpi_duration': presenting_concern_data.hpi_duration,
            'hpi_course': presenting_concern_data.hpi_course,
            'hpi_severity': presenting_concern_data.hpi_severity,
            'hpi_frequency': presenting_concern_data.hpi_frequency,
            'hpi_triggers': presenting_concern_data.hpi_triggers,
            'hpi_impact_work': presenting_concern_data.hpi_impact_work,
            'hpi_impact_relationships': presenting_concern_data.hpi_impact_relationships,
            'hpi_prior_episodes': presenting_concern_data.hpi_prior_episodes,
            'function_ADL': presenting_concern_data.function_ADL,
            'social_activities': presenting_concern_data.social_activities,
            'conversation_complete': presenting_concern_data.conversation_complete,
            'total_questions_asked': presenting_concern_data.total_questions_asked,
            'completion_timestamp': presenting_concern_data.completion_timestamp
        }
        
        concerns = PatientPresentingConcerns(**concerns_dict)
        session.add(concerns)
    
    # Create initial risk assessment if provided
    if initial_risk_assessment:
        risk_dict = {
            'patient_id': patient.id,
            'suicide_ideation': initial_risk_assessment.suicide_ideation,
            'suicide_plan': initial_risk_assessment.suicide_plan,
            'suicide_intent': initial_risk_assessment.suicide_intent,
            'past_attempts': initial_risk_assessment.past_attempts,
            'self_harm_history': initial_risk_assessment.self_harm_history,
            'homicidal_thoughts': initial_risk_assessment.homicidal_thoughts,
            'access_means': initial_risk_assessment.access_means,
            'protective_factors': initial_risk_assessment.protective_factors,
            'risk_level': initial_risk_assessment.risk_level,
            'risk_value': initial_risk_assessment.risk_value,
            'risk_reason': initial_risk_assessment.risk_reason,
            'assessment_timestamp': initial_risk_assessment.assessment_timestamp or datetime.utcnow(),
            'assessment_type': 'initial'
        }
        
        risk_assessment = PatientRiskAssessment(**risk_dict)
        session.add(risk_assessment)
    
    return patient


# ============================================================================
# MOOD MODELS (Consolidated from mood.py)
# ============================================================================

class MoodAssessment(Base, SQLAlchemyBaseModel):
    """
    Stores completed mood assessments for patients
    Links conversational mood assessment results to patient records
    Enhanced with PRD mood metrics: MS, IL, EI, TI, CE, MSI
    """
    __tablename__ = "mood_assessments"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Session information
    session_id = Column(String(200), unique=True, nullable=False, index=True)
    assessment_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Legacy mood metrics (1-10 scale) - kept for backward compatibility
    stress_level = Column(Numeric(3, 2), nullable=True)
    energy_level = Column(Numeric(3, 2), nullable=True)
    gratitude_level = Column(Numeric(3, 2), nullable=True)
    reflection_level = Column(Numeric(3, 2), nullable=True)
    overall_mood_score = Column(Numeric(3, 2), nullable=True, index=True)
    overall_mood_label = Column(String(100), nullable=True)
    
    # PRD Core Metrics (from Mood Tracking System PRD)
    mood_score = Column(Numeric(3, 2), nullable=True, comment="MS: Mood Score (-2 to +2)")  # MS
    intensity_level = Column(Numeric(3, 2), nullable=True, comment="IL: Intensity Level (1-5)")  # IL
    energy_index = Column(Numeric(3, 2), nullable=True, comment="EI: Energy Index (1-5)")  # EI
    trigger_index = Column(Numeric(3, 2), nullable=True, comment="TI: Trigger Index (1-5)")  # TI
    coping_effectiveness = Column(Numeric(3, 2), nullable=True, comment="CE: Coping Effectiveness (-1 to +2)")  # CE
    msi = Column(Numeric(3, 2), nullable=True, comment="MSI: Mood Stability Index (0-1)")  # MSI
    
    # Emotions and analysis
    dominant_emotions = Column(ARRAY(String), nullable=True)
    summary = Column(Text, nullable=True)
    
    # Trigger factors
    positive_triggers = Column(ARRAY(String), nullable=True)
    negative_triggers = Column(ARRAY(String), nullable=True)
    
    # Reasoning - explanation of the assessment results
    reasoning = Column(Text, nullable=True)
    
    # LLM-generated reflective summary
    llm_summary = Column(Text, nullable=True, comment="LLM-generated reflective summary after assessment")
    
    # Conversation data (stores all Q&A)
    responses = Column(JSON, nullable=True)  # Stores full conversation and extracted responses
    
    # Metadata
    assessment_type = Column(String(50), default="conversational", nullable=False)  # conversational, quick, etc.
    completed = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    patient = relationship("Patient", back_populates="mood_assessments")
    
    def __repr__(self):
        return f"<MoodAssessment(patient_id={self.patient_id}, date={self.assessment_date}, overall_mood_score={self.overall_mood_score}, msi={self.msi})>"


class MoodTrend(Base, SQLAlchemyBaseModel):
    """
    Aggregated mood trends for analytics
    Stores daily/weekly summaries for faster querying
    """
    __tablename__ = "mood_trends"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Time period
    trend_date = Column(Date, nullable=False, index=True)
    trend_period = Column(String(20), nullable=False, default="daily")  # daily, weekly, monthly
    
    # Aggregated metrics
    avg_stress_level = Column(Numeric(3, 2), nullable=True)
    avg_energy_level = Column(Numeric(3, 2), nullable=True)
    avg_gratitude_level = Column(Numeric(3, 2), nullable=True)
    avg_reflection_level = Column(Numeric(3, 2), nullable=True)
    avg_overall_mood = Column(Numeric(3, 2), nullable=True)
    
    # Counts
    assessment_count = Column(Integer, default=0)
    
    # Most common emotions
    common_emotions = Column(ARRAY(String), nullable=True)
    
    # Relationships
    patient = relationship("Patient", back_populates="mood_trends")
    
    __table_args__ = (
        # Unique constraint on patient + date + period
        {'schema': None}
    )
    
    def __repr__(self):
        return f"<MoodTrend(patient_id={self.patient_id}, date={self.trend_date}, avg_mood={self.avg_overall_mood})>"


class MoodEntry(Base, SQLAlchemyBaseModel):
    """
    Daily mood tracker entry capturing five core well-being dimensions
    """

    __tablename__ = "mood_entries"

    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    entry_date = Column(Date, nullable=False, default=date.today, index=True)

    mood_score = Column(Numeric(4, 2), nullable=False, comment="Overall mood / valence (0-10)")
    energy_level = Column(Numeric(4, 2), nullable=False, comment="Energy / fatigue (0-10)")
    stress_level = Column(Numeric(4, 2), nullable=False, comment="Stress vs calm (0-10)")
    sleep_quality = Column(Numeric(4, 2), nullable=False, comment="Sleep quality (0-10)")
    motivation_level = Column(Numeric(4, 2), nullable=False, comment="Motivation / interest (0-10)")

    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="mood_entries")

    __table_args__ = (
        UniqueConstraint('patient_id', 'entry_date', name='uq_mood_entry_patient_date'),
        Index('idx_mood_entry_patient_date', 'patient_id', 'entry_date'),
    )

    def __repr__(self):
        return (
            f"<MoodEntry(patient_id={self.patient_id}, date={self.entry_date}, "
            f"mood={self.mood_score}, energy={self.energy_level})>"
        )


# ============================================================================
# JOURNAL MODELS (Consolidated from journal.py)
# ============================================================================

class JournalEntry(Base, SQLAlchemyBaseModel):
    """User journal entry with content and metadata"""
    
    __tablename__ = "journal_entries"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Entry content
    content = Column(Text, nullable=False)
    
    # Entry metadata
    mood = Column(String(50), nullable=True)  # Optional mood tracking
    tags = Column(String(500), nullable=True)  # Comma-separated tags
    
    # Timestamps
    entry_date = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )
    
    # Status
    is_archived = Column(Boolean, default=False, index=True)
    
    # Relationships
    patient = relationship("Patient", back_populates="journal_entries")
    
    # ============================================================================
    # PROPERTIES
    # ============================================================================
    
    @property
    def formatted_date(self) -> str:
        """Get formatted date for display"""
        return self.entry_date.strftime("%B %d, %Y at %I:%M %p")
    
    @property
    def short_date(self) -> str:
        """Get short date for display"""
        return self.entry_date.strftime("%b %d, %Y")
    
    @property
    def time_ago(self) -> str:
        """Get relative time (e.g., '2 hours ago')"""
        entry_ts = self.entry_date
        if not entry_ts:
            return "Just now"

        if entry_ts.tzinfo is None:
            entry_ts = entry_ts.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        diff = now - entry_ts

        if diff.total_seconds() < 0:
            diff = -diff
        
        if diff.days > 0:
            if diff.days == 1:
                return "1 day ago"
            return f"{diff.days} days ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            if hours == 1:
                return "1 hour ago"
            return f"{hours} hours ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            if minutes == 1:
                return "1 minute ago"
            return f"{minutes} minutes ago"
        else:
            return "Just now"


# ============================================================================
# PROGRESS MODELS (Consolidated from progress.py)
# ============================================================================

class ExerciseStatus(str, enum.Enum):
    """Exercise completion status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class MasteryLevel(str, enum.Enum):
    """User's mastery level for an exercise"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class TimeOfDay(str, enum.Enum):
    """Time of day categories"""
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"


class LocationType(str, enum.Enum):
    """Practice location types"""
    HOME = "home"
    WORK = "work"
    OUTDOOR = "outdoor"
    OTHER = "other"


class GoalType(str, enum.Enum):
    """Types of user goals"""
    DAILY_PRACTICE = "daily_practice"
    WEEKLY_PRACTICE = "weekly_practice"
    EXERCISE_VARIETY = "exercise_variety"
    STREAK_MILESTONE = "streak_milestone"
    TOTAL_SESSIONS = "total_sessions"
    SPECIFIC_EXERCISE = "specific_exercise"
    TIME_BASED = "time_based"
    MOOD_IMPROVEMENT = "mood_improvement"
    CUSTOM = "custom"


class GoalStatus(str, enum.Enum):
    """Goal completion status"""
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class AchievementCategory(str, enum.Enum):
    """Achievement categories"""
    STREAK = "streak"
    COMPLETION = "completion"
    VARIETY = "variety"
    MASTERY = "mastery"
    SPECIAL = "special"


class AchievementRarity(str, enum.Enum):
    """Achievement rarity levels"""
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class ExerciseProgress(Base, SQLAlchemyBaseModel):
    """
    Tracks overall progress for each exercise per patient.
    One record per patient-exercise combination.
    """
    
    __tablename__ = "exercise_progress"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    
    # Exercise identification
    exercise_name = Column(String(255), nullable=False)
    exercise_category = Column(String(100), nullable=True)
    
    # Progress metrics
    status = Column(Enum(ExerciseStatus), default=ExerciseStatus.NOT_STARTED, nullable=False)
    completion_count = Column(Integer, default=0, nullable=False)
    total_time_seconds = Column(Integer, default=0, nullable=False)
    
    # Dates
    first_attempted_at = Column(DateTime(timezone=True), nullable=True)
    last_practiced_at = Column(DateTime(timezone=True), nullable=True)
    
    # Ratings and effectiveness
    average_mood_improvement = Column(Numeric(5, 2), nullable=True)
    effectiveness_rating = Column(Numeric(3, 2), nullable=True)  # 1-5 scale
    
    # Mastery
    mastery_level = Column(Enum(MasteryLevel), default=MasteryLevel.BEGINNER, nullable=False)
    is_favorite = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    patient = relationship("Patient", back_populates="exercise_progress")
    
    # Constraints
    __table_args__ = (
        Index('idx_progress_patient', 'patient_id'),
        Index('idx_progress_patient_exercise', 'patient_id', 'exercise_name'),
        Index('idx_progress_status', 'status'),
        Index('idx_progress_favorite', 'is_favorite'),
        Index('idx_progress_mastery', 'mastery_level'),
        UniqueConstraint('patient_id', 'exercise_name', name='uq_patient_exercise'),
    )
    
    @property
    def total_time_hours(self) -> float:
        """Convert total time to hours"""
        return round(self.total_time_seconds / 3600, 2)
    
    @property
    def average_session_duration_minutes(self) -> float:
        """Calculate average session duration in minutes"""
        if self.completion_count == 0:
            return 0
        return round((self.total_time_seconds / self.completion_count) / 60, 1)


class ExerciseSession(Base, SQLAlchemyBaseModel):
    """
    Tracks individual practice sessions.
    One record per practice session.
    """
    
    __tablename__ = "exercise_sessions"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    
    # Exercise identification
    exercise_name = Column(String(255), nullable=False)
    exercise_category = Column(String(100), nullable=True)
    
    # Session details
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Mood tracking (1-10 scale)
    mood_before = Column(Integer, nullable=True)
    mood_after = Column(Integer, nullable=True)
    mood_improvement = Column(Integer, nullable=True)  # Calculated: after - before
    
    # Session metadata
    steps_completed = Column(JSON, nullable=True)  # Array of completed step indices
    completion_percentage = Column(Numeric(5, 2), default=0, nullable=False)
    session_completed = Column(Boolean, default=False, nullable=False)
    
    # Notes and reflections
    notes = Column(Text, nullable=True)
    tags = Column(String(500), nullable=True)  # Comma-separated tags
    
    # Context
    time_of_day = Column(Enum(TimeOfDay), nullable=True)
    location_type = Column(Enum(LocationType), nullable=True)
    
    # Relationships
    patient = relationship("Patient", back_populates="exercise_sessions")
    
    # Constraints
    __table_args__ = (
        Index('idx_session_patient', 'patient_id'),
        Index('idx_session_patient_date', 'patient_id', 'start_time'),
        Index('idx_session_exercise', 'exercise_name'),
        Index('idx_session_completed', 'session_completed'),
        Index('idx_session_start_time', 'start_time'),
    )
    
    @property
    def computed_duration_minutes(self) -> float:
        """Calculate duration in minutes from stored values."""
        if self.duration_seconds is not None:
            return round(self.duration_seconds / 60, 1)
        return 0.0
    
    @property
    def duration_minutes(self) -> Optional[float]:
        """Alias for computed_duration_minutes for API compatibility."""
        return self.computed_duration_minutes if self.computed_duration_minutes > 0 else None
    
    @validates('mood_before', 'mood_after')
    def validate_mood(self, key, value):
        """Validate mood is between 1 and 10"""
        if value is not None and (value < 1 or value > 10):
            raise ValueError(f"{key} must be between 1 and 10")
        return value


class UserGoal(Base, SQLAlchemyBaseModel):
    """
    Tracks user-defined goals for exercise practice.
    """
    
    __tablename__ = "user_goals"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    
    # Goal details
    goal_type = Column(Enum(GoalType), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Target values
    target_value = Column(Integer, nullable=False)
    current_value = Column(Integer, default=0, nullable=False)
    
    # Exercise-specific (for specific_exercise goal type)
    target_exercise_name = Column(String(255), nullable=True)
    
    # Reminder settings
    reminder_frequency = Column(String(50), default="weekly", nullable=True)  # daily, weekly, fortnight, monthly
    
    # Timeline
    start_date = Column(Date, nullable=False)
    deadline = Column(Date, nullable=True)
    
    # Status
    status = Column(Enum(GoalStatus), default=GoalStatus.ACTIVE, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Rewards
    reward_badge_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Relationships
    patient = relationship("Patient", back_populates="user_goals")
    
    # Constraints
    __table_args__ = (
        Index('idx_goal_patient', 'patient_id'),
        Index('idx_goal_status', 'status'),
        Index('idx_goal_type', 'goal_type'),
        Index('idx_goal_deadline', 'deadline'),
    )
    
    @property
    def progress_percentage(self) -> float:
        """Calculate goal progress percentage"""
        if self.target_value == 0:
            return 0
        return min(round((self.current_value / self.target_value) * 100, 1), 100)
    
    @property
    def is_completed(self) -> bool:
        """Check if goal is completed"""
        return self.current_value >= self.target_value
    
    @property
    def days_remaining(self) -> int:
        """Calculate days remaining until deadline"""
        if not self.deadline:
            return None
        delta = self.deadline - date.today()
        return max(delta.days, 0)


class UserAchievement(Base, SQLAlchemyBaseModel):
    """
    Tracks unlocked achievements for users.
    """
    
    __tablename__ = "user_achievements"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    
    # Achievement details
    achievement_id = Column(String(100), nullable=False)  # Predefined achievement identifier
    achievement_name = Column(String(200), nullable=False)
    achievement_description = Column(Text, nullable=True)
    achievement_icon = Column(String(50), nullable=True)  # Emoji or icon name
    achievement_category = Column(Enum(AchievementCategory), nullable=False)
    
    # Progress
    unlocked_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    progress_value = Column(Integer, nullable=True)  # e.g., 7 for "7 day streak"
    
    # Rarity
    rarity = Column(Enum(AchievementRarity), default=AchievementRarity.COMMON, nullable=False)
    
    # Display
    is_featured = Column(Boolean, default=False, nullable=False)
    is_notified = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    patient = relationship("Patient", back_populates="user_achievements")
    
    # Constraints
    __table_args__ = (
        Index('idx_achievement_patient', 'patient_id'),
        Index('idx_achievement_unlocked', 'unlocked_at'),
        Index('idx_achievement_category', 'achievement_category'),
        Index('idx_achievement_rarity', 'rarity'),
        UniqueConstraint('patient_id', 'achievement_id', name='uq_patient_achievement'),
    )


class UserStreak(Base, SQLAlchemyBaseModel):
    """
    Tracks daily practice streaks for users.
    One record per patient.
    """
    
    __tablename__ = "user_streaks"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Streak data
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    
    # Dates
    last_practice_date = Column(Date, nullable=True)
    streak_start_date = Column(Date, nullable=True)
    longest_streak_start = Column(Date, nullable=True)
    longest_streak_end = Column(Date, nullable=True)
    
    # Statistics
    total_practice_days = Column(Integer, default=0, nullable=False)
    
    # Relationships
    patient = relationship("Patient", back_populates="user_streak", uselist=False)
    
    # Constraints
    __table_args__ = (
        Index('idx_streak_patient', 'patient_id'),
        Index('idx_streak_current', 'current_streak'),
        Index('idx_streak_longest', 'longest_streak'),
        UniqueConstraint('patient_id', name='uq_patient_streak'),
    )
    
    @property
    def is_active(self) -> bool:
        """Check if streak is currently active (practiced today or yesterday)"""
        if not self.last_practice_date:
            return False
        days_since = (date.today() - self.last_practice_date).days
        return days_since <= 1


class PracticeCalendar(Base, SQLAlchemyBaseModel):
    """
    Tracks daily practice for calendar heat map visualization.
    One record per patient per day.
    """
    
    __tablename__ = "practice_calendar"
    
    # Foreign key to patient
    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False)
    
    # Calendar data
    practice_date = Column(Date, nullable=False)
    session_count = Column(Integer, default=0, nullable=False)
    total_duration_seconds = Column(Integer, default=0, nullable=False)
    exercises_practiced = Column(JSON, nullable=True)  # Array of exercise names
    
    # Intensity (for heat map color - 0 to 4 scale)
    intensity_level = Column(Integer, default=0, nullable=False)
    
    # Relationships
    patient = relationship("Patient", back_populates="practice_calendar")
    
    # Constraints
    __table_args__ = (
        Index('idx_calendar_patient', 'patient_id'),
        Index('idx_calendar_date', 'practice_date'),
        Index('idx_calendar_patient_date', 'patient_id', 'practice_date'),
        Index('idx_calendar_intensity', 'intensity_level'),
        UniqueConstraint('patient_id', 'practice_date', name='uq_patient_practice_date'),
    )
    
    @property
    def total_duration_minutes(self) -> float:
        """Get total duration in minutes"""
        return round(self.total_duration_seconds / 60, 1)
    
    @validates('intensity_level')
    def validate_intensity(self, key, value):
        """Validate intensity is between 0 and 4"""
        if value < 0 or value > 4:
            raise ValueError("Intensity level must be between 0 and 4")
        return value


# ============================================================================
# QUESTIONNAIRE MODELS (Consolidated from questionnaire_models.py)
# ============================================================================

class MandatoryQuestionnaireSubmission(Base, SQLAlchemyBaseModel):
    """Mandatory health questionnaire submission model"""
    __tablename__ = "mandatory_questionnaires"

    patient_id = Column(UUID(as_uuid=True), ForeignKey('patients.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Basic Information (already collected during registration)
    age = Column(String(10), nullable=False)

    # Location Information (city was removed in migration f3a493c3f4a9)
    country = Column(String(100), nullable=False)

    # Personal Information
    marital_status = Column(String(50), nullable=False)
    occupation = Column(String(100), nullable=False)
    education = Column(String(100), nullable=False)
    employment_status = Column(String(50), nullable=False)
    
    # Mental Health Treatment Data
    past_psychiatric_diagnosis = Column(Text, nullable=True)
    past_psychiatric_treatment = Column(Text, nullable=True)
    hospitalizations = Column(Text, nullable=True)
    ect_history = Column(Text, nullable=True)
    
    # Medical and Substance History
    current_medications = Column(Text, nullable=True)
    medication_allergies = Column(Text, nullable=True)
    otc_supplements = Column(Text, nullable=True)
    medication_adherence = Column(String(50), nullable=True)
    medical_history_summary = Column(Text, nullable=True)
    chronic_illnesses = Column(Text, nullable=True)
    neurological_problems = Column(Text, nullable=True)
    head_injury = Column(Text, nullable=True)
    seizure_history = Column(Text, nullable=True)
    pregnancy_status = Column(String(50), nullable=True)
    
    # Substance Use
    alcohol_use = Column(String(50), nullable=True)
    drug_use = Column(String(50), nullable=True)
    prescription_drug_abuse = Column(String(50), nullable=True)
    last_use_date = Column(String(100), nullable=True)
    substance_treatment = Column(Text, nullable=True)
    tobacco_use = Column(String(50), nullable=True)
    
    # Family Mental Health History
    family_mental_health_history = Column(Text, nullable=True)
    family_mental_health_stigma = Column(String(50), nullable=True)
    
    # Cultural and Spiritual Context
    cultural_background = Column(Text, nullable=True)
    cultural_beliefs = Column(Text, nullable=True)
    spiritual_supports = Column(Text, nullable=True)
    
    # Lifestyle Factors
    lifestyle_smoking = Column(String(50), nullable=True)
    lifestyle_alcohol = Column(String(50), nullable=True)
    lifestyle_activity = Column(String(50), nullable=True)
    
    # Metadata
    meta = Column(JSON, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    is_complete = Column(Boolean, default=False, nullable=False)

    patient = relationship("Patient", backref="mandatory_questionnaires")
    
    # ============================================================================
    # COMPATIBILITY PROPERTIES - city column was removed from database
    # ============================================================================
    
    @property
    def city(self) -> Optional[str]:
        return None
    
    @city.setter
    def city(self, value):
        pass

    __table_args__ = (
        Index('idx_mandatory_q_patient', 'patient_id'),
        Index('idx_mandatory_q_submitted_at', 'submitted_at'),
        Index('idx_mandatory_q_complete', 'is_complete'),
    )

    def to_dict(self):
        """Convert questionnaire to dictionary"""
        return {
            "id": str(self.id),
            "patient_id": str(self.patient_id),
            "age": self.age,
            "city": self.city,
            "country": self.country,
            "marital_status": self.marital_status,
            "occupation": self.occupation,
            "education": self.education,
            "employment_status": self.employment_status,
            "past_psychiatric_diagnosis": self.past_psychiatric_diagnosis,
            "past_psychiatric_treatment": self.past_psychiatric_treatment,
            "hospitalizations": self.hospitalizations,
            "ect_history": self.ect_history,
            "current_medications": self.current_medications,
            "medication_allergies": self.medication_allergies,
            "otc_supplements": self.otc_supplements,
            "medication_adherence": self.medication_adherence,
            "medical_history_summary": self.medical_history_summary,
            "chronic_illnesses": self.chronic_illnesses,
            "neurological_problems": self.neurological_problems,
            "head_injury": self.head_injury,
            "seizure_history": self.seizure_history,
            "pregnancy_status": self.pregnancy_status,
            "alcohol_use": self.alcohol_use,
            "drug_use": self.drug_use,
            "prescription_drug_abuse": self.prescription_drug_abuse,
            "last_use_date": self.last_use_date,
            "substance_treatment": self.substance_treatment,
            "tobacco_use": self.tobacco_use,
            "family_mental_health_history": self.family_mental_health_history,
            "family_mental_health_stigma": self.family_mental_health_stigma,
            "cultural_background": self.cultural_background,
            "cultural_beliefs": self.cultural_beliefs,
            "spiritual_supports": self.spiritual_supports,
            "lifestyle_smoking": self.lifestyle_smoking,
            "lifestyle_alcohol": self.lifestyle_alcohol,
            "lifestyle_activity": self.lifestyle_activity,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "processed": self.processed,
            "is_complete": self.is_complete
        }


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Enums
    'GenderEnum',
    'RecordStatusEnum', 
    'LanguageEnum',
    'ConsultationModeEnum',
    'RiskLevel',
    'TherapyModalityEnum',
    'TherapyApproachEnum',
    'PaymentMethodEnum',
    'UrgencyLevelEnum',
    
    # Patient Models
    'Patient',
    'PatientAuthInfo',
    'PatientPreferences',
    'PatientHistory',
    'PatientPresentingConcerns',
    'PatientRiskAssessment',
    
    # Mood Models
    'MoodAssessment',
    'MoodTrend',
    
    # Journal Models
    'JournalEntry',
    
    # Progress Models
    'ExerciseProgress',
    'ExerciseSession',
    'UserGoal',
    'UserAchievement',
    'UserStreak',
    'PracticeCalendar',
    
    # Progress Enums
    'ExerciseStatus',
    'MasteryLevel',
    'TimeOfDay',
    'LocationType',
    'GoalType',
    'GoalStatus',
    'AchievementCategory',
    'AchievementRarity',
        
    # Questionnaire Models
    'MandatoryQuestionnaireSubmission',
        
    # Utility Functions
    'create_complete_patient_record',
    'create_patient_profile',
]
