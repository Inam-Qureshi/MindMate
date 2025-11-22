"""
Substance Use Disorder Module for SCID-CV V2
Generic module for substance use disorders (excluding alcohol)
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


class SubstanceUseModule(BaseSCIDModule):
    """Substance Use Disorder Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Substance Use Disorder module"""
        disorder_id = "SUBSTANCE_USE"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Substance Use Disorder",
            description="Assessment for Substance Use Disorder according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "symptom_count"),
            minimum_criteria_count=dsm_criteria.get("minimum_criteria_count", 2),
            duration_requirement=dsm_criteria.get("duration_requirement", "Within a 12-month period"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=20,
            min_questions=5,
            max_questions=15,
            category="substance_use_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Substance Use Disorder questions"""
        questions = []
        
        # SUD_01: Larger amounts than intended
        questions.append(create_yes_no_question(
            question_id="SUD_01",
            sequence_number=1,
            simple_text="In the past year, have you often used substances in larger amounts or over a longer period than you intended?",
            help_text="Using more than you planned to",
            examples=["Using more than planned", "Using longer than intended", "Can't stop once started"],
            clinical_text="Substance is often taken in larger amounts or over a longer period than was intended",
            dsm_criterion_id="SUD_1",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # SUD_02: Unsuccessful efforts to cut down
        questions.append(create_yes_no_question(
            question_id="SUD_02",
            sequence_number=2,
            simple_text="In the past year, have you wanted to cut down or stop using substances but found it difficult?",
            help_text="Trying to reduce or stop but unable to",
            examples=["Wanting to stop", "Trying to cut down", "Unable to control"],
            clinical_text="Persistent desire or unsuccessful efforts to cut down or control substance use",
            dsm_criterion_id="SUD_2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # SUD_03: Great deal of time spent
        questions.append(create_yes_no_question(
            question_id="SUD_03",
            sequence_number=3,
            simple_text="In the past year, have you spent a great deal of time obtaining substances, using substances, or recovering from their effects?",
            help_text="A lot of time focused on substances",
            examples=["Spending lots of time using", "Recovering from use", "Thinking about substances"],
            clinical_text="A great deal of time is spent in activities necessary to obtain the substance, use the substance, or recover from its effects",
            dsm_criterion_id="SUD_3",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # SUD_04: Craving
        questions.append(create_yes_no_question(
            question_id="SUD_04",
            sequence_number=4,
            simple_text="In the past year, have you had a strong desire or urge to use substances?",
            help_text="Strong craving or urge to use",
            examples=["Strong craving", "Urge to use", "Wanting substances"],
            clinical_text="Craving, or a strong desire or urge to use the substance",
            dsm_criterion_id="SUD_4",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # SUD_05: Failure to fulfill role obligations
        questions.append(create_yes_no_question(
            question_id="SUD_05",
            sequence_number=5,
            simple_text="In the past year, has your substance use caused you to fail to fulfill major obligations at work, school, or home?",
            help_text="Problems at work, school, or home because of substance use",
            examples=["Problems at work", "Problems at school", "Problems at home"],
            clinical_text="Recurrent substance use resulting in a failure to fulfill major role obligations",
            dsm_criterion_id="SUD_5",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # SUD_06: Continued use despite social problems
        questions.append(create_yes_no_question(
            question_id="SUD_06",
            sequence_number=6,
            simple_text="In the past year, have you continued to use substances despite having persistent or recurrent social or interpersonal problems caused or worsened by substance use?",
            help_text="Using even when it causes problems with others",
            examples=["Problems with family", "Problems with friends", "Relationship problems"],
            clinical_text="Continued substance use despite having persistent or recurrent social or interpersonal problems",
            dsm_criterion_id="SUD_6",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # SUD_07: Important activities given up
        questions.append(create_yes_no_question(
            question_id="SUD_07",
            sequence_number=7,
            simple_text="In the past year, have you given up or reduced important social, occupational, or recreational activities because of substance use?",
            help_text="Stopping activities you used to enjoy because of substance use",
            examples=["Stopping hobbies", "Reducing activities", "Giving up interests"],
            clinical_text="Important social, occupational, or recreational activities are given up or reduced because of substance use",
            dsm_criterion_id="SUD_7",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # SUD_08: Physically hazardous use
        questions.append(create_yes_no_question(
            question_id="SUD_08",
            sequence_number=8,
            simple_text="In the past year, have you repeatedly used substances in situations where it was physically hazardous?",
            help_text="Using in dangerous situations",
            examples=["Using and driving", "Using in dangerous situations", "Risky use"],
            clinical_text="Recurrent substance use in situations in which it is physically hazardous",
            dsm_criterion_id="SUD_8",
            priority=1,  # Safety concern
            dsm_criteria_required=False
        ))
        
        # SUD_09: Continued use despite problems
        questions.append(create_yes_no_question(
            question_id="SUD_09",
            sequence_number=9,
            simple_text="In the past year, have you continued to use substances despite knowing that you had a persistent or recurrent physical or psychological problem that was likely caused or worsened by substance use?",
            help_text="Using even when you know it's causing health problems",
            examples=["Health problems from use", "Psychological problems", "Continued use despite problems"],
            clinical_text="Substance use is continued despite knowledge of having a persistent or recurrent physical or psychological problem",
            dsm_criterion_id="SUD_9",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # SUD_10: Tolerance
        questions.append(create_yes_no_question(
            question_id="SUD_10",
            sequence_number=10,
            simple_text="In the past year, have you needed to use much more of the substance than before to get the same effect, or found that the same amount had less effect?",
            help_text="Needing more of the substance to feel the same effects",
            examples=["Needing more", "Less effect from same amount", "Building tolerance"],
            clinical_text="Tolerance, as defined by either: (a) a need for markedly increased amounts, or (b) a markedly diminished effect with continued use",
            dsm_criterion_id="SUD_10",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # SUD_11: Withdrawal
        questions.append(create_yes_no_question(
            question_id="SUD_11",
            sequence_number=11,
            simple_text="In the past year, have you experienced withdrawal symptoms when you stopped or reduced use, or used substances to avoid withdrawal symptoms?",
            help_text="Feeling sick or uncomfortable when you don't use",
            examples=["Withdrawal symptoms", "Feeling sick without use", "Using to avoid withdrawal"],
            clinical_text="Withdrawal, as manifested by either: (a) the characteristic withdrawal syndrome, or (b) the substance is taken to relieve or avoid withdrawal symptoms",
            dsm_criterion_id="SUD_11",
            priority=1,  # Safety concern
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Substance Use Disorder module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports problematic substance use",
                "Substance use causing impairment or distress",
                "At least 2 of 11 criteria present within 12-month period"
            ],
            dont_use_when=[
                "Substance use is not problematic",
                "Symptoms due to medical condition",
                "Better explained by another mental disorder"
            ],
            prerequisites=[
                "Completed SCID-SC screening",
                "No active psychosis",
                "Patient is capable of providing self-report"
            ],
            exclusion_criteria=[
                "Medical condition causing symptoms",
                "Better explained by another mental disorder"
            ]
        )


def create_substance_use_module() -> SCIDModule:
    """Create Substance Use Disorder module"""
    module_creator = SubstanceUseModule()
    return module_creator.create_module()

