"""
Adjustment Disorder Module for SCID-CV V2
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


class AdjustmentModule(BaseSCIDModule):
    """Adjustment Disorder Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Adjustment Disorder module"""
        disorder_id = "ADJUSTMENT"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Adjustment Disorder",
            description="Assessment for Adjustment Disorder according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "sequential"),
            minimum_criteria_count=None,
            duration_requirement=dsm_criteria.get("duration_requirement", "Within 3 months of stressor"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=15,
            min_questions=4,
            max_questions=8,
            category="trauma_stressor_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Adjustment Disorder questions"""
        questions = []
        
        # ADJ_01: Identifiable stressor
        questions.append(create_yes_no_question(
            question_id="ADJ_01",
            sequence_number=1,
            simple_text="Have you experienced an identifiable stressor or life change in the past 3 months?",
            help_text="Stressors like job loss, relationship problems, illness, or major life changes",
            examples=["Job loss", "Relationship problems", "Illness", "Moving", "Financial problems"],
            clinical_text="Development of emotional or behavioral symptoms in response to an identifiable stressor",
            dsm_criterion_id="ADJ_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "ADJ_END"}
        ))
        
        # ADJ_02: Emotional/behavioral symptoms
        questions.append(create_yes_no_question(
            question_id="ADJ_02",
            sequence_number=2,
            simple_text="Did you develop emotional or behavioral symptoms in response to this stressor?",
            help_text="Symptoms like sadness, anxiety, worry, or changes in behavior",
            examples=["Feeling sad", "Feeling anxious", "Worrying", "Changes in behavior"],
            clinical_text="Development of emotional or behavioral symptoms in response to stressor",
            dsm_criterion_id="ADJ_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "ADJ_END"}
        ))
        
        # ADJ_03: Clinical significance
        questions.append(create_yes_no_question(
            question_id="ADJ_03",
            sequence_number=3,
            simple_text="Are these symptoms causing you significant distress or problems in your daily life?",
            help_text="Symptoms that are out of proportion or causing problems",
            examples=["Significant distress", "Problems at work", "Problems in relationships", "Daily life impact"],
            clinical_text="Symptoms are clinically significant (marked distress or significant impairment)",
            dsm_criterion_id="ADJ_B",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "ADJ_END"}
        ))
        
        # ADJ_04: Timing
        questions.append(create_yes_no_question(
            question_id="ADJ_04",
            sequence_number=4,
            simple_text="Did these symptoms start within 3 months of the stressor?",
            help_text="Symptoms should develop within 3 months of the stressor",
            examples=["Started within 3 months", "Symptoms after stressor", "Recent onset"],
            clinical_text="Symptoms develop within 3 months of onset of stressor",
            dsm_criterion_id="ADJ_TIMING",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "ADJ_END"}
        ))
        
        # ADJ_05: Duration
        questions.append(create_yes_no_question(
            question_id="ADJ_05",
            sequence_number=5,
            simple_text="Have these symptoms been present for less than 6 months after the stressor ended?",
            help_text="Symptoms should not persist for more than 6 months after stressor ends",
            examples=["Less than 6 months", "Symptoms resolved", "Short duration"],
            clinical_text="Symptoms do not persist for more than 6 months after stressor ends",
            dsm_criterion_id="ADJ_E",
            priority=2,
            dsm_criteria_required=True
        ))
        
        # ADJ_06: Functional impairment
        questions.append(create_mcq_question(
            question_id="ADJ_06",
            sequence_number=6,
            simple_text="How much do these symptoms affect your work, relationships, or daily life?",
            help_text="Impact on your ability to function",
            examples=["Problems at work", "Problems in relationships", "Daily life impact"],
            clinical_text="Significant impairment in social, occupational, or other important areas of functioning",
            dsm_criterion_id="ADJ_IMPAIRMENT",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Adjustment Disorder module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports identifiable stressor in past 3 months",
                "Emotional or behavioral symptoms in response to stressor",
                "Symptoms causing significant distress or impairment",
                "Symptoms developed within 3 months of stressor"
            ],
            dont_use_when=[
                "Symptoms meet criteria for another mental disorder",
                "Symptoms due to substance use",
                "Symptoms due to medical condition",
                "Normal bereavement"
            ],
            prerequisites=[
                "Completed SCID-SC screening",
                "No active psychosis",
                "Patient is capable of providing self-report"
            ],
            exclusion_criteria=[
                "Symptoms meet criteria for another mental disorder",
                "Substance-induced symptoms",
                "Medical condition causing symptoms",
                "Normal bereavement"
            ]
        )


def create_adjustment_module() -> SCIDModule:
    """Create Adjustment Disorder module"""
    module_creator = AdjustmentModule()
    return module_creator.create_module()

