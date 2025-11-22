"""
Base data types and classes for SCID-CV V2 implementation
Refactored with minimal questions, intelligent routing, and LLM-based response processing
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Tuple, Any, Optional


class ResponseType(Enum):
    """Types of responses for SCID questions"""
    YES_NO = "yes_no"
    MULTIPLE_CHOICE = "multiple_choice"
    SCALE = "scale"
    TEXT = "text"
    DATE = "date"


class Severity(Enum):
    """Severity levels for diagnoses and symptoms"""
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    EXTREME = "extreme"


@dataclass
class ProcessedResponse:
    """Processed response from global response processor"""
    selected_option: Optional[str] = None  # Option selected (if MCQ) or None
    extracted_fields: Dict[str, Any] = field(default_factory=dict)  # Duration, severity, frequency, impact, etc.
    confidence: float = 1.0  # Confidence score (0.0-1.0)
    dsm_criteria_mapping: Dict[str, bool] = field(default_factory=dict)  # Which criteria met
    next_question_hint: Optional[str] = None  # Suggested next question ID
    free_text_analysis: Dict[str, Any] = field(default_factory=dict)  # Sentiment, key phrases, etc.
    validation: Dict[str, Any] = field(default_factory=dict)  # Validation results
    raw_response: str = ""  # Original user response


@dataclass
class SCIDQuestion:
    """Standardized SCID-CV question structure"""
    
    # Identification
    id: str  # Format: {MODULE_ID}_{NUMBER}[{SUFFIX}]
    sequence_number: int  # Order in which question should be asked (1, 2, 3, ...)
    
    # Question Text (User-Facing)
    simple_text: str  # Concise, clear question text (shown to user)
    help_text: str = ""  # Optional help text (shown to user)
    examples: List[str] = field(default_factory=list)  # 2-3 examples (shown to user)
    
    # Clinical Text (Backend Only)
    clinical_text: str = ""  # Clinical version (NOT shown to user)
    dsm_criterion_id: str = ""  # Maps to DSM criteria (e.g., "MDD_A1")
    
    # Response Type
    response_type: ResponseType = ResponseType.TEXT  # YES_NO, MULTIPLE_CHOICE, SCALE, TEXT
    options: List[str] = field(default_factory=list)  # Exactly 4 options for MCQ
    scale_range: Tuple[int, int] = (1, 10)
    scale_labels: List[str] = field(default_factory=list)
    
    # Accepts Free Text
    accepts_free_text: bool = True  # Always True - users can provide free text
    free_text_prompt: str = "You can also describe your experience in your own words."
    
    # Routing & Logic
    priority: int = 3  # 1=Critical, 2=High, 3=Medium, 4=Low
    skip_logic: Dict[str, str] = field(default_factory=dict)  # response -> next_question_id
    follow_up_questions: List[str] = field(default_factory=list)  # Question IDs to ask if "yes"
    conditional_logic: Dict[str, Any] = field(default_factory=dict)  # Advanced conditional logic
    
    # DSM Criteria Mapping
    criteria_weight: float = 1.0
    symptom_category: str = ""
    dsm_criteria_required: bool = False  # Is this required for diagnosis?
    dsm_criteria_optional: bool = True  # Is this optional/supporting?
    
    # Metadata
    required: bool = True
    estimated_time_seconds: int = 30
    
    # Validation
    validation_rules: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate question data after initialization"""
        # Validate MCQ options - must have exactly 4 options
        if self.response_type == ResponseType.MULTIPLE_CHOICE:
            if len(self.options) != 4:
                raise ValueError(
                    f"Question {self.id} must have exactly 4 options for MCQ. "
                    f"Found {len(self.options)} options."
                )


@dataclass
class ModuleDeploymentCriteria:
    """Clear criteria for when to use/not use a module"""
    
    # When to Use
    use_when: List[str] = field(default_factory=list)  # Clear, concise points
    
    # When NOT to Use
    dont_use_when: List[str] = field(default_factory=list)  # Clear, concise points
    
    # Prerequisites
    prerequisites: List[str] = field(default_factory=list)  # What must be true before using
    
    # Exclusion Criteria
    exclusion_criteria: List[str] = field(default_factory=list)  # What excludes this module


@dataclass
class SCIDModule:
    """Standardized SCID-CV module structure"""
    
    # Identification
    id: str  # e.g., "MDD"
    name: str  # e.g., "Major Depressive Disorder"
    description: str  # Brief description
    version: str = "2.0.0"  # Semantic versioning
    
    # Questions
    questions: List[SCIDQuestion] = field(default_factory=list)  # All questions in module
    
    # DSM Criteria (Backend Only)
    dsm_criteria: Dict[str, Any] = field(default_factory=dict)  # From dsm_criteria.json
    dsm_criteria_type: str = "symptom_count"  # "symptom_count", "sequential", "hybrid", "cluster"
    minimum_criteria_count: Optional[int] = None  # Minimum criteria needed
    duration_requirement: str = ""  # Duration requirement (e.g., "At least 2 weeks")
    
    # Diagnostic Thresholds
    diagnostic_threshold: float = 0.6  # 0.0-1.0
    severity_thresholds: Dict[str, float] = field(default_factory=dict)  # {"mild": 0.4, "moderate": 0.6, "severe": 0.8}
    
    # Deployment Criteria (When to Use/Not Use)
    deployment_criteria: ModuleDeploymentCriteria = field(default_factory=ModuleDeploymentCriteria)
    
    # Time Estimates
    estimated_time_mins: int = 20  # Realistic time estimate
    min_questions: int = 5  # Minimum questions needed
    max_questions: int = 15  # Maximum questions (with follow-ups)
    
    # Category
    category: str = "mood_disorders"  # "mood_disorders", "anxiety_disorders", etc.
    
    # Clinical Notes (Backend Only)
    clinical_notes: str = ""  # Clinical context (NOT shown to users)
    
    # Metadata
    created_date: str = ""
    last_updated: str = ""
    author: str = ""
    
    def __post_init__(self):
        """Validate module data after initialization"""
        if not self.questions:
            raise ValueError(f"Module {self.id} must have at least one question")
        
        if not 0 <= self.diagnostic_threshold <= 1:
            raise ValueError(f"Diagnostic threshold must be between 0 and 1, got {self.diagnostic_threshold}")
        
        # Validate question IDs are unique
        question_ids = [q.id for q in self.questions]
        if len(question_ids) != len(set(question_ids)):
            raise ValueError(f"Duplicate question IDs found in module {self.id}")
        
        # Validate sequence numbers
        sequence_numbers = [q.sequence_number for q in self.questions]
        if len(sequence_numbers) != len(set(sequence_numbers)):
            raise ValueError(f"Duplicate sequence numbers found in module {self.id}")
    
    def get_question_by_id(self, question_id: str) -> Optional[SCIDQuestion]:
        """Get a specific question by ID"""
        for question in self.questions:
            if question.id == question_id:
                return question
        return None
    
    def get_questions_by_priority(self, priority: int) -> List[SCIDQuestion]:
        """Get all questions with a specific priority"""
        return [q for q in self.questions if q.priority == priority]
    
    def get_critical_questions(self) -> List[SCIDQuestion]:
        """Get all critical questions (Priority 1 - safety questions)"""
        return self.get_questions_by_priority(1)
    
    def get_required_questions(self) -> List[SCIDQuestion]:
        """Get all required questions"""
        return [q for q in self.questions if q.required]
    
    def get_follow_up_questions(self, parent_question_id: str) -> List[SCIDQuestion]:
        """Get follow-up questions for a parent question"""
        parent_question = self.get_question_by_id(parent_question_id)
        if not parent_question:
            return []
        
        follow_up_questions = []
        for follow_up_id in parent_question.follow_up_questions:
            follow_up = self.get_question_by_id(follow_up_id)
            if follow_up:
                follow_up_questions.append(follow_up)
        
        return follow_up_questions


@dataclass
class SCIDResponse:
    """Response to a SCID question"""
    question_id: str
    response: Any  # The actual response value (yes/no, text, number, etc.)
    timestamp: datetime = field(default_factory=datetime.now)
    raw_response: Optional[str] = None  # Original user input
    confidence: float = 1.0  # Confidence in parsing (0.0-1.0)
    response_type: Optional[str] = None  # Type of response (yes_no, text, scale, etc.)


@dataclass
class ModuleResult:
    """Results for a completed SCID-CV module"""
    module_id: str
    module_name: str
    total_score: float
    max_possible_score: float
    percentage_score: float
    criteria_met: bool
    severity_level: Optional[str] = None
    responses: List[ProcessedResponse] = field(default_factory=list)
    administration_time_mins: int = 0
    completion_date: datetime = field(default_factory=datetime.now)
    notes: str = ""
    dsm_criteria_status: Dict[str, bool] = field(default_factory=dict)
    diagnosis_possible: bool = False
    diagnosis_not_possible: bool = False

