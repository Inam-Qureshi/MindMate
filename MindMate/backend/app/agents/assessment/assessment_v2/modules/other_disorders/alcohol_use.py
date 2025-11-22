"""
Alcohol Use Disorder Module for SCID-CV V2
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


class AlcoholUseModule(BaseSCIDModule):
    """Alcohol Use Disorder Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Alcohol Use Disorder module"""
        disorder_id = "ALCOHOL_USE"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Alcohol Use Disorder",
            description="Assessment for Alcohol Use Disorder according to DSM-5 criteria",
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
        """Create Alcohol Use Disorder questions"""
        questions = []
        
        # AUD_01: Larger amounts than intended
        questions.append(create_yes_no_question(
            question_id="AUD_01",
            sequence_number=1,
            simple_text="In the past year, have you often drunk alcohol in larger amounts or over a longer period than you intended?",
            help_text="Drinking more than you planned to",
            examples=["Drinking more than planned", "Drinking longer than intended", "Can't stop once started"],
            clinical_text="Alcohol is often taken in larger amounts or over a longer period than was intended",
            dsm_criterion_id="AUD_1",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AUD_02: Unsuccessful efforts to cut down
        questions.append(create_yes_no_question(
            question_id="AUD_02",
            sequence_number=2,
            simple_text="In the past year, have you wanted to cut down or stop drinking but found it difficult?",
            help_text="Trying to reduce or stop but unable to",
            examples=["Wanting to stop", "Trying to cut down", "Unable to control"],
            clinical_text="Persistent desire or unsuccessful efforts to cut down or control alcohol use",
            dsm_criterion_id="AUD_2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AUD_03: Great deal of time spent
        questions.append(create_yes_no_question(
            question_id="AUD_03",
            sequence_number=3,
            simple_text="In the past year, have you spent a great deal of time obtaining alcohol, drinking, or recovering from its effects?",
            help_text="A lot of time focused on alcohol",
            examples=["Spending lots of time drinking", "Recovering from drinking", "Thinking about alcohol"],
            clinical_text="A great deal of time is spent in activities necessary to obtain alcohol, use alcohol, or recover from its effects",
            dsm_criterion_id="AUD_3",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AUD_04: Craving
        questions.append(create_yes_no_question(
            question_id="AUD_04",
            sequence_number=4,
            simple_text="In the past year, have you had a strong desire or urge to use alcohol?",
            help_text="Strong craving or urge to drink",
            examples=["Strong craving", "Urge to drink", "Wanting alcohol"],
            clinical_text="Craving, or a strong desire or urge to use alcohol",
            dsm_criterion_id="AUD_4",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AUD_05: Failure to fulfill role obligations
        questions.append(create_yes_no_question(
            question_id="AUD_05",
            sequence_number=5,
            simple_text="In the past year, has your alcohol use caused you to fail to fulfill major obligations at work, school, or home?",
            help_text="Problems at work, school, or home because of drinking",
            examples=["Problems at work", "Problems at school", "Problems at home"],
            clinical_text="Recurrent alcohol use resulting in a failure to fulfill major role obligations",
            dsm_criterion_id="AUD_5",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AUD_06: Continued use despite social problems
        questions.append(create_yes_no_question(
            question_id="AUD_06",
            sequence_number=6,
            simple_text="In the past year, have you continued to drink despite having persistent or recurrent social or interpersonal problems caused or worsened by alcohol?",
            help_text="Drinking even when it causes problems with others",
            examples=["Problems with family", "Problems with friends", "Relationship problems"],
            clinical_text="Continued alcohol use despite having persistent or recurrent social or interpersonal problems",
            dsm_criterion_id="AUD_6",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AUD_07: Important activities given up
        questions.append(create_yes_no_question(
            question_id="AUD_07",
            sequence_number=7,
            simple_text="In the past year, have you given up or reduced important social, occupational, or recreational activities because of alcohol use?",
            help_text="Stopping activities you used to enjoy because of drinking",
            examples=["Stopping hobbies", "Reducing activities", "Giving up interests"],
            clinical_text="Important social, occupational, or recreational activities are given up or reduced because of alcohol use",
            dsm_criterion_id="AUD_7",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AUD_08: Physically hazardous use
        questions.append(create_yes_no_question(
            question_id="AUD_08",
            sequence_number=8,
            simple_text="In the past year, have you repeatedly used alcohol in situations where it was physically hazardous?",
            help_text="Drinking in dangerous situations like driving",
            examples=["Drinking and driving", "Drinking in dangerous situations", "Risky use"],
            clinical_text="Recurrent alcohol use in situations in which it is physically hazardous",
            dsm_criterion_id="AUD_8",
            priority=1,  # Safety concern
            dsm_criteria_required=False
        ))
        
        # AUD_09: Continued use despite problems
        questions.append(create_yes_no_question(
            question_id="AUD_09",
            sequence_number=9,
            simple_text="In the past year, have you continued to drink despite knowing that you had a persistent or recurrent physical or psychological problem that was likely caused or worsened by alcohol?",
            help_text="Drinking even when you know it's causing health problems",
            examples=["Health problems from drinking", "Psychological problems", "Continued use despite problems"],
            clinical_text="Alcohol use is continued despite knowledge of having a persistent or recurrent physical or psychological problem",
            dsm_criterion_id="AUD_9",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AUD_10: Tolerance
        questions.append(create_yes_no_question(
            question_id="AUD_10",
            sequence_number=10,
            simple_text="In the past year, have you needed to drink much more alcohol than before to get the same effect, or found that the same amount had less effect?",
            help_text="Needing more alcohol to feel the same effects",
            examples=["Needing more alcohol", "Less effect from same amount", "Building tolerance"],
            clinical_text="Tolerance, as defined by either: (a) a need for markedly increased amounts, or (b) a markedly diminished effect with continued use",
            dsm_criterion_id="AUD_10",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AUD_11: Withdrawal
        questions.append(create_yes_no_question(
            question_id="AUD_11",
            sequence_number=11,
            simple_text="In the past year, have you experienced withdrawal symptoms when you stopped or reduced drinking, or drank to avoid withdrawal symptoms?",
            help_text="Feeling sick or uncomfortable when you don't drink",
            examples=["Withdrawal symptoms", "Feeling sick without alcohol", "Drinking to avoid withdrawal"],
            clinical_text="Withdrawal, as manifested by either: (a) the characteristic withdrawal syndrome, or (b) alcohol is taken to relieve or avoid withdrawal symptoms",
            dsm_criterion_id="AUD_11",
            priority=1,  # Safety concern
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Alcohol Use Disorder module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports problematic alcohol use",
                "Alcohol use causing impairment or distress",
                "At least 2 of 11 criteria present within 12-month period"
            ],
            dont_use_when=[
                "Alcohol use is not problematic",
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


def create_alcohol_use_module() -> SCIDModule:
    """Create Alcohol Use Disorder module"""
    module_creator = AlcoholUseModule()
    return module_creator.create_module()

