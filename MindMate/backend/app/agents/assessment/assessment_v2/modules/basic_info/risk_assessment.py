"""
Risk Assessment Module for SCID-CV V2
Safety evaluation including suicide risk and self-harm assessment
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

logger = logging.getLogger(__name__)


class RiskAssessmentModule(BaseSCIDModule):
    """Risk Assessment Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Risk Assessment module"""
        disorder_id = "RISK_ASSESSMENT"
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Risk Assessment",
            description="Comprehensive risk assessment for mental health safety evaluation",
            version="2.0.0",
            questions=questions,
            dsm_criteria={},  # No DSM criteria for risk assessment
            dsm_criteria_type="safety_assessment",
            minimum_criteria_count=None,
            duration_requirement="",
            diagnostic_threshold=0.0,  # Not a diagnostic module
            severity_thresholds={},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=8,
            min_questions=5,  # Core safety questions (RISK_01-05)
            max_questions=10,
            category="basic_info",
            clinical_notes="Risk assessment for safety evaluation",
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Risk Assessment questions"""
        questions = []
        
        # RISK_01: Suicidal Ideation (CRITICAL - Priority 1)
        questions.append(create_yes_no_question(
            question_id="RISK_01",
            sequence_number=1,
            simple_text="Have you had any thoughts about wanting to hurt yourself or end your life?",
            help_text="This is an important safety question. Please answer honestly.",
            examples=["Thoughts of suicide", "Wanting to die", "Thoughts of self-harm"],
            clinical_text="Suicidal ideation screening",
            priority=1,  # CRITICAL - Safety question
            dsm_criteria_required=False,
            follow_up_questions=["RISK_01A"],
            skip_logic={"no": "RISK_02"}  # Skip follow-up if no
        ))
        
        # RISK_01A: Suicidal Ideation Details
        questions.append(SCIDQuestion(
            id="RISK_01A",
            sequence_number=2,
            simple_text="Can you tell me more about these thoughts? When did they start?",
            help_text="Please describe your thoughts about self-harm or suicide",
            examples=["Recent thoughts", "Thoughts for weeks", "Occasional thoughts"],
            clinical_text="Suicidal ideation details",
            response_type=ResponseType.TEXT,
            priority=1,  # CRITICAL
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        # RISK_02: Suicide Plan
        questions.append(create_yes_no_question(
            question_id="RISK_02",
            sequence_number=3,
            simple_text="Have you thought about how you might hurt yourself or made any specific plans?",
            help_text="This includes thinking about methods or ways to harm yourself",
            examples=["Thought about methods", "Made plans", "No specific plans"],
            clinical_text="Suicide plan",
            priority=1,  # CRITICAL
            dsm_criteria_required=False,
            follow_up_questions=["RISK_02A"],
            skip_logic={"no": "RISK_03"}  # Skip follow-up if no
        ))
        
        # RISK_02A: Suicide Plan Details
        questions.append(SCIDQuestion(
            id="RISK_02A",
            sequence_number=4,
            simple_text="What specific methods have you considered?",
            help_text="Please describe what you've thought about",
            examples=["Specific methods", "Ways to harm", "Plans made"],
            clinical_text="Suicide plan details",
            response_type=ResponseType.TEXT,
            priority=1,  # CRITICAL
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        # RISK_03: Suicide Intent
        questions.append(create_yes_no_question(
            question_id="RISK_03",
            sequence_number=5,
            simple_text="Do you have any intention to act on these thoughts?",
            help_text="This means you plan to or want to act on these thoughts",
            examples=["Yes, I plan to", "No, just thoughts", "Not sure"],
            clinical_text="Suicide intent",
            priority=1,  # CRITICAL
            dsm_criteria_required=False,
            skip_logic={"no": "RISK_04"}  # If no intent, move to past attempts
        ))
        
        # RISK_04: Past Attempts
        questions.append(create_yes_no_question(
            question_id="RISK_04",
            sequence_number=6,
            simple_text="Have you ever tried to hurt yourself or end your life before?",
            help_text="This includes any previous suicide attempts or self-harm",
            examples=["Yes, previous attempts", "No, never tried", "Thought about it"],
            clinical_text="Past suicide attempts",
            priority=1,  # CRITICAL
            dsm_criteria_required=False,
            follow_up_questions=["RISK_04A"],
            skip_logic={"no": "RISK_05"}  # Skip follow-up if no
        ))
        
        # RISK_04A: Past Attempts Details
        questions.append(SCIDQuestion(
            id="RISK_04A",
            sequence_number=7,
            simple_text="Can you tell me about what happened?",
            help_text="Please describe the previous attempt(s)",
            examples=["What happened", "When it occurred", "What led to it"],
            clinical_text="Past attempts details",
            response_type=ResponseType.TEXT,
            priority=1,  # CRITICAL
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        # RISK_05: Self-Harm
        questions.append(create_yes_no_question(
            question_id="RISK_05",
            sequence_number=8,
            simple_text="Have you been hurting yourself in any way recently?",
            help_text="This includes cutting, burning, or other forms of self-harm",
            examples=["Cutting", "Burning", "Other self-harm", "No self-harm"],
            clinical_text="Current self-harm behavior",
            priority=1,  # CRITICAL
            dsm_criteria_required=False,
            follow_up_questions=["RISK_05A"],
            skip_logic={"no": "RISK_06"}  # Skip follow-up if no, move to protective factors
        ))
        
        # RISK_05A: Self-Harm Details
        questions.append(SCIDQuestion(
            id="RISK_05A",
            sequence_number=9,
            simple_text="Can you tell me about the self-harm?",
            help_text="Please describe how you've been hurting yourself",
            examples=["Methods used", "Frequency", "Severity"],
            clinical_text="Self-harm details",
            response_type=ResponseType.TEXT,
            priority=1,  # CRITICAL
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        # RISK_06: Protective Factors
        questions.append(SCIDQuestion(
            id="RISK_06",
            sequence_number=10,
            simple_text="What keeps you safe or prevents you from acting on these thoughts?",
            help_text="This could include family, friends, pets, religion, or other protective factors",
            examples=["Family", "Friends", "Pets", "Religion", "Hope for the future"],
            clinical_text="Protective factors",
            response_type=ResponseType.TEXT,
            priority=2,
            dsm_criteria_required=False,
            accepts_free_text=True,
            required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Risk Assessment module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Starting assessment",
                "Patient reports concerning symptoms",
                "Safety evaluation needed",
                "Suicide risk screening required"
            ],
            dont_use_when=[
                "Risk assessment already completed",
                "Patient unable to provide information"
            ],
            prerequisites=[
                "Patient is capable of providing self-report",
                "Patient is 18+ years old (or guardian present)"
            ],
            exclusion_criteria=[]
        )


def create_risk_assessment_module() -> SCIDModule:
    """Create Risk Assessment module"""
    module_creator = RiskAssessmentModule()
    return module_creator.create_module()

