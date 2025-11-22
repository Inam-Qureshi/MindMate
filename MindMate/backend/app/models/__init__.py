# app/models/__init__.py

from .base import (
    Base,
    BaseModel,
    USERTYPE,
)

from .patient import (
    Patient,
    PatientAuthInfo,
    PatientHistory,
    PatientPreferences,
    PatientPresentingConcerns,
    PatientRiskAssessment,
    MoodAssessment,
    MoodTrend,
    MoodEntry,
    JournalEntry,
    ExerciseProgress,
    ExerciseSession,
    UserGoal,
    UserAchievement,
    UserStreak,
    PracticeCalendar,
    MandatoryQuestionnaireSubmission,
)

from .specialist import (
    Specialists,
    SpecialistDocuments,
    SpecialistsApprovalData,
    SpecialistsAuthInfo,
    SpecialistSpecializations,
    SpecialistReview,
    ReviewHelpful,
    ReviewStatusEnum,
    SpecialistAvailability,
    SpecialistTimeSlots,
    SpecialistTypeEnum,
    SpecializationEnum,
    AvailabilityStatusEnum,
    ApprovalStatusEnum,
    EmailVerificationStatusEnum,
    DocumentTypeEnum,
    DocumentStatusEnum,
    TimeSlotEnum,
    ConsultationModeEnum,
    SpecialistRegistrationProgress,
    DocumentVerificationLog,
    ApprovalWorkflowLog,
    ApplicationTimeline,
    ApplicationComments,
)

from .admin import (
    Admin,
    AdminCreate,
    AdminResponse,
    AdminUpdate,
    AdminRoleEnum,
    AdminStatusEnum,
)

from .appointment import (
    Appointment,
    SpecialistAvailabilityTemplate,
    GeneratedTimeSlot,
    DayOfWeekEnum,
    SlotStatusEnum,
    AppointmentStatusEnum,
    AppointmentTypeEnum,
    PaymentStatusEnum,
)

from .forum import (
    Forum,
    ForumAnswer,
    ForumQuestion,
    ForumUserType,
    ForumReport,
    ForumBookmark,
)

from .assessment import (
    AssessmentSession,
    AssessmentModuleState,
    AssessmentModuleResult,
    AssessmentConversation,
    AssessmentModuleTransition,
    AssessmentDemographics,
    AssessmentModuleData,
    AssessmentConversationEnhanced,
    DiagnosisRecord,
    TreatmentRecord,
    SymptomRecord,
    ClinicalAssessment,
    DiagnosisType,
    DiagnosisStatus,
    TreatmentStatus,
    TreatmentType,
    SymptomSeverity,
    SymptomFrequency,
    ImpactLevel,
)

from .session_models import (
    AppointmentSession,
    SessionMessage,
    SessionParticipant,
    SessionStatusEnum,
    MessageTypeEnum,
)

from .specialist_favorites import (
    SpecialistFavorite,
)

__all__ = [
    # Base
    "Base",
    "BaseModel",
    "USERTYPE",

    # Patient Models
    "Patient",
    "PatientAuthInfo",
    "PatientHistory",
    "PatientPreferences",
    "PatientPresentingConcerns",
    "PatientRiskAssessment",
    
    # Mood Models
    "MoodAssessment",
    "MoodTrend",
    "MoodEntry",
    
    # Journal Models
    "JournalEntry",
    
    # Progress Models
    "ExerciseProgress",
    "ExerciseSession",
    "UserGoal",
    "UserAchievement",
    "UserStreak",
    "PracticeCalendar",
    
    # Questionnaire Models
    "MandatoryQuestionnaireSubmission",

    # Specialist Models
    "Specialists",
    "SpecialistDocuments",
    "SpecialistsApprovalData",
    "SpecialistsAuthInfo",
    "SpecialistSpecializations",
    "SpecialistAvailability",
    "SpecialistTimeSlots",
    "SpecialistFavorite",
    "SpecialistRegistrationProgress",
    "DocumentVerificationLog",
    "ApprovalWorkflowLog",
    "ApplicationTimeline",
    "ApplicationComments",
    
    # Specialist Enums
    "SpecialistTypeEnum",
    "SpecializationEnum",
    "AvailabilityStatusEnum",
    "ApprovalStatusEnum",
    "EmailVerificationStatusEnum",
    "DocumentTypeEnum",
    "DocumentStatusEnum",
    "TimeSlotEnum",
    "ConsultationModeEnum",
    
    # Specialist Review Models
    "SpecialistReview",
    "ReviewHelpful",
    "ReviewStatusEnum",
    
    # Admin
    "Admin",
    "AdminCreate",
    "AdminResponse",
    "AdminUpdate",
    "AdminRoleEnum",
    "AdminStatusEnum",

    # Appointment
    "Appointment",
    "SpecialistAvailabilityTemplate",
    "GeneratedTimeSlot",
    "DayOfWeekEnum",
    "SlotStatusEnum",
    "AppointmentStatusEnum",
    "AppointmentTypeEnum",
    "PaymentStatusEnum",

    # Session
    "AppointmentSession",
    "SessionMessage",
    "SessionParticipant",
    "SessionStatusEnum",
    "MessageTypeEnum",

    # Forum
    "Forum",
    "ForumAnswer",
    "ForumQuestion",
    "ForumUserType",
    "ForumReport",
    "ForumBookmark",
    
    # Assessment Module Models
    "AssessmentSession",
    "AssessmentModuleState",
    "AssessmentModuleResult",
    "AssessmentConversation",
    "AssessmentModuleTransition",
    "AssessmentDemographics",
    "AssessmentModuleData",
    "AssessmentConversationEnhanced",
    
    # Clinical Models
    "DiagnosisRecord",
    "TreatmentRecord",
    "SymptomRecord",
    "ClinicalAssessment",
    "DiagnosisType",
    "DiagnosisStatus",
    "TreatmentStatus",
    "TreatmentType",
    "SymptomSeverity",
    "SymptomFrequency",
    "ImpactLevel",
]
