"""
Bipolar I Disorder (Manic Episode) Module for SCID-CV V2
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


class BipolarModule(BaseSCIDModule):
    """Bipolar I Disorder Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Bipolar module"""
        disorder_id = "BIPOLAR"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Bipolar I Disorder (Manic Episode)",
            description="Assessment for Bipolar I Disorder with manic episode according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "hybrid"),
            minimum_criteria_count=dsm_criteria.get("minimum_criteria_count", 3),
            duration_requirement=dsm_criteria.get("duration_requirement", "At least 1 week"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=20,
            min_questions=5,
            max_questions=12,
            category="mood_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Bipolar questions"""
        questions = []
        
        # BIP_01: Elevated/expansive/irritable mood (Required)
        questions.append(create_yes_no_question(
            question_id="BIP_01",
            sequence_number=1,
            simple_text="Have you had a period when you felt unusually high, elated, or irritable for at least 1 week?",
            help_text="This is different from your usual mood - feeling on top of the world or very irritable",
            examples=["Feeling on top of the world", "Unusually energetic", "Very irritable"],
            clinical_text="A distinct period of abnormally and persistently elevated, expansive, or irritable mood",
            dsm_criterion_id="BIP_A",
            priority=1,
            dsm_criteria_required=True
        ))
        
        # BIP_02: Increased activity/energy (Required)
        questions.append(create_yes_no_question(
            question_id="BIP_02",
            sequence_number=2,
            simple_text="During this period, did you have much more energy or activity than usual?",
            help_text="Feeling like you're on overdrive or can't sit still",
            examples=["Can't sit still", "Feeling driven by a motor", "Much more active"],
            clinical_text="Abnormally and persistently increased activity or energy",
            dsm_criterion_id="BIP_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "BIP_END"}
        ))
        
        # BIP_03: Grandiosity
        questions.append(create_yes_no_question(
            question_id="BIP_03",
            sequence_number=3,
            simple_text="During this period, did you feel unusually important, powerful, or special?",
            help_text="Feeling like you have special powers or abilities",
            examples=["Feeling like a superstar", "Unusual confidence", "Feeling invincible"],
            clinical_text="Inflated self-esteem or grandiosity",
            dsm_criterion_id="BIP_B1",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # BIP_04: Decreased need for sleep
        questions.append(create_yes_no_question(
            question_id="BIP_04",
            sequence_number=4,
            simple_text="During this period, did you need much less sleep than usual but still feel rested?",
            help_text="Sleeping only a few hours but feeling fine",
            examples=["Sleeping 2-3 hours", "Feeling rested with little sleep", "Not needing sleep"],
            clinical_text="Decreased need for sleep",
            dsm_criterion_id="BIP_B2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # BIP_05: More talkative
        questions.append(create_yes_no_question(
            question_id="BIP_05",
            sequence_number=5,
            simple_text="During this period, were you much more talkative than usual?",
            help_text="Talking fast, non-stop, or feeling pressure to keep talking",
            examples=["Talking very fast", "Can't stop talking", "Pressure to keep talking"],
            clinical_text="More talkative than usual or pressure to keep talking",
            dsm_criterion_id="BIP_B3",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # BIP_06: Racing thoughts
        questions.append(create_yes_no_question(
            question_id="BIP_06",
            sequence_number=6,
            simple_text="During this period, did your thoughts race or jump quickly from one idea to another?",
            help_text="Thoughts moving too fast or jumping around",
            examples=["Thoughts racing", "Can't keep up with thoughts", "Ideas jumping around"],
            clinical_text="Flight of ideas or subjective experience that thoughts are racing",
            dsm_criterion_id="BIP_B4",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # BIP_07: Distractibility
        questions.append(create_yes_no_question(
            question_id="BIP_07",
            sequence_number=7,
            simple_text="During this period, were you easily distracted by things around you?",
            help_text="Attention drawn to unimportant things",
            examples=["Easily distracted", "Can't focus", "Attention jumps around"],
            clinical_text="Distractibility",
            dsm_criterion_id="BIP_B5",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # BIP_08: Increased goal-directed activity
        questions.append(create_yes_no_question(
            question_id="BIP_08",
            sequence_number=8,
            simple_text="During this period, did you start many new projects or activities?",
            help_text="Starting lots of new things or being very goal-directed",
            examples=["Starting many projects", "Very productive", "Many new activities"],
            clinical_text="Increase in goal-directed activity",
            dsm_criterion_id="BIP_B6",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # BIP_09: Risky behavior
        questions.append(create_yes_no_question(
            question_id="BIP_09",
            sequence_number=9,
            simple_text="During this period, did you do things that were risky or could have had bad consequences?",
            help_text="Risky behaviors like spending sprees, risky sex, or bad business decisions",
            examples=["Spending too much money", "Risky sexual behavior", "Foolish investments"],
            clinical_text="Excessive involvement in activities with high potential for painful consequences",
            dsm_criterion_id="BIP_B7",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # BIP_10: Duration
        questions.append(create_yes_no_question(
            question_id="BIP_10",
            sequence_number=10,
            simple_text="Did this period last at least 1 week, or were you hospitalized because of it?",
            help_text="The episode must last at least 1 week (or any duration if hospitalized)",
            examples=["Lasted 1+ weeks", "Hospitalized", "Persistent episode"],
            clinical_text="Lasting at least 1 week (or any duration if hospitalized)",
            dsm_criterion_id="BIP_DURATION",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "BIP_END"}
        ))
        
        # BIP_11: Functional impairment
        questions.append(create_mcq_question(
            question_id="BIP_11",
            sequence_number=11,
            simple_text="How much did this period affect your work, relationships, or daily life?",
            help_text="Impact on your ability to function normally",
            examples=["Couldn't work", "Problems in relationships", "Trouble functioning"],
            clinical_text="Marked impairment in social or occupational functioning",
            dsm_criterion_id="BIP_IMPAIRMENT",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Bipolar module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports period of elevated, expansive, or irritable mood",
                "Increased energy or activity",
                "Symptoms present for at least 1 week",
                "Not better explained by substance use or medical condition"
            ],
            dont_use_when=[
                "Symptoms due to substance use",
                "Symptoms due to medical condition",
                "Better explained by another mental disorder"
            ],
            prerequisites=[
                "Completed SCID-SC screening",
                "No active psychosis (unless part of manic episode)",
                "Patient is capable of providing self-report"
            ],
            exclusion_criteria=[
                "Substance-induced manic episode",
                "Medical condition causing symptoms",
                "Better explained by another mental disorder"
            ]
        )


def create_bipolar_module() -> SCIDModule:
    """Create Bipolar module"""
    module_creator = BipolarModule()
    return module_creator.create_module()

