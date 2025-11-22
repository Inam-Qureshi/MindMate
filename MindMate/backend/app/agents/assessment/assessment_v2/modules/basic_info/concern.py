"""
Presenting Concern Module for SCID-CV V2
Collects information about the patient's presenting concern
"""

import logging
from datetime import datetime
from typing import List
from ..base_module import BaseSCIDModule
from ...base_types import (
    SCIDModule,
    SCIDQuestion,
    ModuleDeploymentCriteria,
    ResponseType
)
from ...shared.question_templates import create_yes_no_question, create_mcq_question
from ...shared.option_sets import get_standard_options

logger = logging.getLogger(__name__)


class ConcernModule(BaseSCIDModule):
    """Presenting Concern Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Presenting Concern module"""
        disorder_id = "CONCERN"
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Presenting Concern",
            description="Collection of information about the patient's presenting concern",
            version="2.0.0",
            questions=questions,
            dsm_criteria={},  # No DSM criteria for concern collection
            dsm_criteria_type="information_collection",
            minimum_criteria_count=None,
            duration_requirement="",
            diagnostic_threshold=0.0,  # Not a diagnostic module
            severity_thresholds={},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=10,
            min_questions=5,  # Core questions: CONCERN_01, 02, 03, 04, 08
            max_questions=12,
            category="basic_info",
            clinical_notes="Presenting concern information collection",
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Presenting Concern questions"""
        questions = []
        
        # CONCERN_01: Primary Concern
        questions.append(SCIDQuestion(
            id="CONCERN_01",
            sequence_number=1,
            simple_text="What brings you here today? What is your main concern?",
            help_text="Please describe what's troubling you or what you'd like help with",
            examples=["Feeling anxious", "Depressed mood", "Relationship problems", "Work stress"],
            clinical_text="Primary presenting concern",
            response_type=ResponseType.TEXT,
            priority=1,
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=True
        ))
        
        # CONCERN_02: Onset
        questions.append(SCIDQuestion(
            id="CONCERN_02",
            sequence_number=2,
            simple_text="When did this concern first start?",
            help_text="Please tell us when these symptoms or concerns began",
            examples=["2 weeks ago", "About a month ago", "Several months ago", "A few years ago"],
            clinical_text="Onset of presenting concern",
            response_type=ResponseType.TEXT,
            priority=2,
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=True
        ))
        
        # CONCERN_03: Duration
        questions.append(create_mcq_question(
            question_id="CONCERN_03",
            sequence_number=3,
            simple_text="How long have you been experiencing this concern?",
            help_text="Please select how long this has been going on",
            examples=["Less than 1 week", "1-2 weeks", "2-4 weeks", "More than 4 weeks"],
            clinical_text="Duration of presenting concern",
            option_set_name="duration",
            priority=2,
            dsm_criteria_required=False,
            required=True  # Core question
        ))
        
        # CONCERN_04: Severity
        questions.append(create_mcq_question(
            question_id="CONCERN_04",
            sequence_number=4,
            simple_text="How severe would you say this concern is?",
            help_text="Please rate the severity of your concern",
            examples=["Mild", "Moderate", "Severe", "Extreme"],
            clinical_text="Severity of presenting concern",
            option_set_name="severity",
            priority=2,
            dsm_criteria_required=False,
            required=True  # Core question
        ))
        
        # CONCERN_05: Frequency (Optional - can be inferred from other responses)
        questions.append(create_mcq_question(
            question_id="CONCERN_05",
            sequence_number=5,
            simple_text="How often do you experience this concern?",
            help_text="Please select how frequently this occurs",
            examples=["Daily", "Several times a week", "Once or twice a week", "Rarely"],
            clinical_text="Frequency of presenting concern",
            option_set_name="frequency",
            priority=3,  # Lower priority - optional
            dsm_criteria_required=False,
            required=False  # Optional - can be inferred
        ))
        
        # CONCERN_06: Impact on Work (Optional)
        questions.append(SCIDQuestion(
            id="CONCERN_06",
            sequence_number=6,
            simple_text="Has this concern affected your work or school performance?",
            help_text="Please indicate if this has impacted your work or studies",
            examples=["Yes, it affects my work", "No, work is fine", "Sometimes"],
            clinical_text="Impact on work or school",
            response_type=ResponseType.YES_NO,
            options=get_standard_options("yes_no_sometimes"),
            priority=3,  # Lower priority - optional
            dsm_criteria_required=False,
            required=False
        ))
        
        # CONCERN_07: Impact on Relationships (Optional)
        questions.append(SCIDQuestion(
            id="CONCERN_07",
            sequence_number=7,
            simple_text="Has this concern affected your relationships with family or friends?",
            help_text="Please indicate if this has impacted your relationships",
            examples=["Yes, it affects relationships", "No, relationships are fine", "Sometimes"],
            clinical_text="Impact on relationships",
            response_type=ResponseType.YES_NO,
            options=get_standard_options("yes_no_sometimes"),
            priority=3,  # Lower priority - optional
            dsm_criteria_required=False,
            required=False
        ))
        
        # CONCERN_08: Impact on Daily Life (Core question)
        questions.append(create_mcq_question(
            question_id="CONCERN_08",
            sequence_number=8,
            simple_text="How much does this concern affect your daily life?",
            help_text="Please rate the impact on your daily activities",
            examples=["No impact", "Minor impact", "Moderate impact", "Severe impact"],
            clinical_text="Impact on daily life",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False,
            required=True  # Core question
        ))
        
        # CONCERN_09: Triggers (Optional)
        questions.append(SCIDQuestion(
            id="CONCERN_09",
            sequence_number=9,
            simple_text="Are there specific things that trigger or worsen this concern?",
            help_text="Please indicate if certain situations or events make it worse",
            examples=["Yes, specific triggers", "No, no triggers", "Sometimes"],
            clinical_text="Triggers or exacerbating factors",
            response_type=ResponseType.YES_NO,
            options=get_standard_options("yes_no_sometimes"),
            priority=3,
            dsm_criteria_required=False,
            required=False,
            follow_up_questions=["CONCERN_09A"]
        ))
        
        # CONCERN_09A: Triggers Details
        questions.append(SCIDQuestion(
            id="CONCERN_09A",
            sequence_number=10,
            simple_text="Can you tell me about the things that trigger or worsen this concern?",
            help_text="Please describe what makes it worse",
            examples=["Work stress", "Social situations", "Certain thoughts", "Specific events"],
            clinical_text="Triggers details",
            response_type=ResponseType.TEXT,
            priority=3,
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        # CONCERN_10: Prior Episodes (Optional)
        questions.append(SCIDQuestion(
            id="CONCERN_10",
            sequence_number=11,
            simple_text="Have you experienced similar concerns or episodes in the past?",
            help_text="Please indicate if you've had similar issues before",
            examples=["Yes, similar episodes", "No, first time", "Not sure"],
            clinical_text="Prior episodes",
            response_type=ResponseType.YES_NO,
            options=get_standard_options("yes_no_sometimes"),
            priority=3,
            dsm_criteria_required=False,
            required=False,
            follow_up_questions=["CONCERN_10A"]
        ))
        
        # CONCERN_10A: Prior Episodes Details
        questions.append(SCIDQuestion(
            id="CONCERN_10A",
            sequence_number=12,
            simple_text="Can you tell me about the previous episodes?",
            help_text="Please describe what happened in the past",
            examples=["Similar symptoms before", "Previous treatment", "How it resolved"],
            clinical_text="Prior episodes details",
            response_type=ResponseType.TEXT,
            priority=3,
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Presenting Concern module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Starting assessment",
                "Patient's presenting concern not yet collected",
                "Need to understand patient's main concern"
            ],
            dont_use_when=[
                "Presenting concern already collected",
                "Patient unable to describe concern"
            ],
            prerequisites=[
                "Patient is capable of providing self-report",
                "Patient is 18+ years old (or guardian present)"
            ],
            exclusion_criteria=[]
        )


def create_concern_module() -> SCIDModule:
    """Create Presenting Concern module"""
    module_creator = ConcernModule()
    return module_creator.create_module()

