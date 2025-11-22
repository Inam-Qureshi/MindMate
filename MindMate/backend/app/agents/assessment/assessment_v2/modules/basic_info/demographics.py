"""
Demographics Module for SCID-CV V2
Collects patient demographic information
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


class DemographicsModule(BaseSCIDModule):
    """Demographics Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Demographics module"""
        disorder_id = "DEMOGRAPHICS"
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Demographics",
            description="Collection of patient demographic information",
            version="2.0.0",
            questions=questions,
            dsm_criteria={},  # No DSM criteria for demographics
            dsm_criteria_type="information_collection",
            minimum_criteria_count=None,
            duration_requirement="",
            diagnostic_threshold=0.0,  # Not a diagnostic module
            severity_thresholds={},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=5,
            min_questions=5,
            max_questions=12,
            category="basic_info",
            clinical_notes="Demographic information collection",
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Demographics questions"""
        questions = []
        
        # DEMO_01: Age
        questions.append(SCIDQuestion(
            id="DEMO_01",
            sequence_number=1,
            simple_text="What is your age?",
            help_text="Please provide your age in years",
            examples=["25", "30 years old", "I'm 35"],
            clinical_text="Age in years",
            response_type=ResponseType.TEXT,
            priority=2,
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=True
        ))
        
        # DEMO_02: Gender
        questions.append(create_mcq_question(
            question_id="DEMO_02",
            sequence_number=2,
            simple_text="What is your gender?",
            help_text="Please select the option that best describes you",
            examples=["Male", "Female", "Non-binary"],
            clinical_text="Gender identity",
            custom_options=[
                "Male",
                "Female",
                "Non-binary",
                "Prefer not to say"
            ],
            priority=2,
            dsm_criteria_required=False
        ))
        
        # DEMO_03: Education Level
        questions.append(create_mcq_question(
            question_id="DEMO_03",
            sequence_number=3,
            simple_text="What is your highest level of education?",
            help_text="Please select your highest completed education level",
            examples=["High school", "Bachelor's degree", "Master's degree"],
            clinical_text="Education level",
            custom_options=[
                "High school or less",
                "Bachelor's degree",
                "Master's degree or higher",
                "Prefer not to say"
            ],
            priority=2,
            dsm_criteria_required=False
        ))
        
        # DEMO_04: Occupation
        questions.append(create_mcq_question(
            question_id="DEMO_04",
            sequence_number=4,
            simple_text="What is your current occupation?",
            help_text="Please select your current employment status",
            examples=["Employed full-time", "Student", "Retired"],
            clinical_text="Occupation status",
            custom_options=[
                "Employed (full-time or part-time)",
                "Student",
                "Unemployed or Retired",
                "Prefer not to say"
            ],
            priority=2,
            dsm_criteria_required=False
        ))
        
        # DEMO_05: Marital Status
        questions.append(create_mcq_question(
            question_id="DEMO_05",
            sequence_number=5,
            simple_text="What is your marital status?",
            help_text="Please select your current marital status",
            examples=["Single", "Married", "Divorced"],
            clinical_text="Marital status",
            custom_options=[
                "Single",
                "Married",
                "Divorced, Widowed, or Separated",
                "Prefer not to say"
            ],
            priority=2,
            dsm_criteria_required=False
        ))
        
        # DEMO_06: Cultural Background
        questions.append(SCIDQuestion(
            id="DEMO_06",
            sequence_number=6,
            simple_text="What is your cultural or ethnic background?",
            help_text="Please describe your cultural or ethnic background",
            examples=["Asian", "Hispanic", "Caucasian", "Mixed"],
            clinical_text="Cultural or ethnic background",
            response_type=ResponseType.TEXT,
            priority=3,
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        # DEMO_07: Location
        questions.append(SCIDQuestion(
            id="DEMO_07",
            sequence_number=7,
            simple_text="Where do you currently live? (City, Country)",
            help_text="Please provide your current location",
            examples=["New York, USA", "London, UK", "Toronto, Canada"],
            clinical_text="Current location",
            response_type=ResponseType.TEXT,
            priority=3,
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        # DEMO_08: Living Situation
        questions.append(create_mcq_question(
            question_id="DEMO_08",
            sequence_number=8,
            simple_text="What is your current living situation?",
            help_text="Please select your current living arrangement",
            examples=["Alone", "With family", "With partner"],
            clinical_text="Living situation",
            custom_options=[
                "Alone",
                "With family or partner",
                "Shared accommodation",
                "Prefer not to say"
            ],
            priority=2,
            dsm_criteria_required=False
        ))
        
        # DEMO_09: Financial Status (Optional)
        questions.append(SCIDQuestion(
            id="DEMO_09",
            sequence_number=9,
            simple_text="How would you describe your current financial situation?",
            help_text="Please select the option that best describes your financial situation",
            examples=["Stable", "Moderate", "Unstable"],
            clinical_text="Financial status",
            response_type=ResponseType.MULTIPLE_CHOICE,
            options=[
                "Stable - financially secure",
                "Moderate - some financial concerns",
                "Unstable - significant financial stress",
                "Prefer not to say"
            ],
            priority=3,
            dsm_criteria_required=False,
            required=False
        ))
        
        # DEMO_10: Family Psychiatric History
        questions.append(create_yes_no_question(
            question_id="DEMO_10",
            sequence_number=10,
            simple_text="Do you have any family history of psychiatric or mental health conditions?",
            help_text="This includes conditions like depression, anxiety, bipolar disorder, or other mental health issues in family members",
            examples=["Yes, my mother had depression", "No family history", "Not sure"],
            clinical_text="Family psychiatric history",
            priority=2,
            dsm_criteria_required=False,
            follow_up_questions=["DEMO_10A"]
        ))
        
        # DEMO_10A: Family History Details
        questions.append(SCIDQuestion(
            id="DEMO_10A",
            sequence_number=11,
            simple_text="Can you tell me more about your family's mental health history?",
            help_text="Please describe any mental health conditions in your family",
            examples=["Mother had depression", "Father had anxiety", "Sibling had bipolar"],
            clinical_text="Family psychiatric history details",
            response_type=ResponseType.TEXT,
            priority=3,
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        # DEMO_11: Recent Stressors (Optional)
        questions.append(SCIDQuestion(
            id="DEMO_11",
            sequence_number=12,
            simple_text="Have you experienced any recent major life stressors?",
            help_text="This includes events like job loss, relationship problems, health issues, or other significant life changes",
            examples=["Yes, job loss", "No recent stressors", "Some stress"],
            clinical_text="Recent life stressors",
            response_type=ResponseType.YES_NO,
            options=get_standard_options("yes_no_sometimes"),
            priority=3,
            dsm_criteria_required=False,
            required=False,
            follow_up_questions=["DEMO_11A"]
        ))
        
        # DEMO_11A: Stressors Details
        questions.append(SCIDQuestion(
            id="DEMO_11A",
            sequence_number=13,
            simple_text="Can you tell me about the recent stressors you've experienced?",
            help_text="Please describe any major life stressors or changes",
            examples=["Job loss", "Divorce", "Health problems", "Moving"],
            clinical_text="Recent stressors details",
            response_type=ResponseType.TEXT,
            priority=3,
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Demographics module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Starting a new assessment",
                "Patient demographics not yet collected",
                "Demographic information needed for assessment"
            ],
            dont_use_when=[
                "Demographics already collected",
                "Patient unable to provide demographic information"
            ],
            prerequisites=[
                "Patient is capable of providing self-report",
                "Patient is 18+ years old (or guardian present)"
            ],
            exclusion_criteria=[]
        )


def create_demographics_module() -> SCIDModule:
    """Create Demographics module"""
    module_creator = DemographicsModule()
    return module_creator.create_module()

