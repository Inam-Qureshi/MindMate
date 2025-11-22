"""
Obsessive-Compulsive Disorder (OCD) Module for SCID-CV V2
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


class OCDModule(BaseSCIDModule):
    """OCD Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create OCD module"""
        disorder_id = "OCD"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Obsessive-Compulsive Disorder",
            description="Assessment for Obsessive-Compulsive Disorder (OCD) according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "sequential"),
            minimum_criteria_count=None,
            duration_requirement=dsm_criteria.get("duration_requirement", "Time-consuming or cause impairment"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=20,
            min_questions=5,
            max_questions=12,
            category="obsessive_compulsive_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create OCD questions"""
        questions = []
        
        # OCD_01: Obsessions
        questions.append(create_yes_no_question(
            question_id="OCD_01",
            sequence_number=1,
            simple_text="Do you have unwanted, intrusive thoughts, images, or urges that keep coming back?",
            help_text="Thoughts that are disturbing and hard to get rid of",
            examples=["Unwanted thoughts", "Intrusive images", "Disturbing urges", "Repetitive thoughts"],
            clinical_text="Recurrent and persistent thoughts, urges, or images that are intrusive and unwanted",
            dsm_criterion_id="OCD_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "OCD_02"}
        ))
        
        # OCD_02: Compulsions
        questions.append(create_yes_no_question(
            question_id="OCD_02",
            sequence_number=2,
            simple_text="Do you feel driven to repeat certain behaviors or mental acts over and over?",
            help_text="Behaviors like checking, washing, counting, or arranging things",
            examples=["Checking things", "Washing hands", "Counting", "Arranging things", "Repeating actions"],
            clinical_text="Repetitive behaviors or mental acts that the individual feels driven to perform",
            dsm_criterion_id="OCD_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "OCD_END"}
        ))
        
        # OCD_03: Attempts to suppress
        questions.append(create_yes_no_question(
            question_id="OCD_03",
            sequence_number=3,
            simple_text="Do you try to ignore or suppress these unwanted thoughts, or neutralize them with actions?",
            help_text="Trying to push thoughts away or doing something to make them go away",
            examples=["Trying to ignore thoughts", "Pushing thoughts away", "Doing something to make them stop"],
            clinical_text="Individual attempts to ignore or suppress such thoughts, urges, or images",
            dsm_criterion_id="OCD_SUPPRESS",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # OCD_04: Purpose of compulsions
        questions.append(create_yes_no_question(
            question_id="OCD_04",
            sequence_number=4,
            simple_text="Do you perform these behaviors to reduce anxiety or prevent something bad from happening?",
            help_text="Behaviors aimed at reducing distress or preventing feared outcomes",
            examples=["To reduce anxiety", "To prevent bad things", "To feel better", "To be safe"],
            clinical_text="Behaviors or mental acts are aimed at preventing or reducing anxiety or distress",
            dsm_criterion_id="OCD_PURPOSE",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # OCD_05: Time-consuming
        questions.append(create_yes_no_question(
            question_id="OCD_05",
            sequence_number=5,
            simple_text="Do these thoughts or behaviors take up more than 1 hour per day?",
            help_text="Time spent on obsessions or compulsions",
            examples=["More than 1 hour", "Takes up lots of time", "Time-consuming"],
            clinical_text="Obsessions or compulsions are time-consuming (more than 1 hour per day)",
            dsm_criterion_id="OCD_B",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "OCD_06"}
        ))
        
        # OCD_06: Distress or impairment
        questions.append(create_yes_no_question(
            question_id="OCD_06",
            sequence_number=6,
            simple_text="Do these thoughts or behaviors cause you significant distress or problems in your daily life?",
            help_text="Impact on your ability to function",
            examples=["Significant distress", "Problems at work", "Problems in relationships", "Daily life impact"],
            clinical_text="Cause clinically significant distress or impairment",
            dsm_criterion_id="OCD_B",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "OCD_END"}
        ))
        
        # OCD_07: Functional impairment
        questions.append(create_mcq_question(
            question_id="OCD_07",
            sequence_number=7,
            simple_text="How much do these thoughts or behaviors affect your work, relationships, or daily life?",
            help_text="Impact on your ability to function",
            examples=["Can't work", "Problems in relationships", "Daily life impact"],
            clinical_text="Impairment in social, occupational, or other important areas of functioning",
            dsm_criterion_id="OCD_IMPAIRMENT",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for OCD module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports unwanted, intrusive thoughts (obsessions)",
                "Patient reports repetitive behaviors or mental acts (compulsions)",
                "Obsessions or compulsions are time-consuming or cause distress",
                "Symptoms not better explained by another mental disorder"
            ],
            dont_use_when=[
                "Symptoms due to substance use",
                "Symptoms due to medical condition",
                "Better explained by another mental disorder"
            ],
            prerequisites=[
                "Completed SCID-SC screening",
                "No active psychosis",
                "Patient is capable of providing self-report"
            ],
            exclusion_criteria=[
                "Substance-induced symptoms",
                "Medical condition causing symptoms",
                "Better explained by another mental disorder"
            ]
        )


def create_ocd_module() -> SCIDModule:
    """Create OCD module"""
    module_creator = OCDModule()
    return module_creator.create_module()

