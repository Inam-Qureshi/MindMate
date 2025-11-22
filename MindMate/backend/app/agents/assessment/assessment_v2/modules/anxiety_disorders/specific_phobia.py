"""
Specific Phobia Module for SCID-CV V2
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


class SpecificPhobiaModule(BaseSCIDModule):
    """Specific Phobia Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Specific Phobia module"""
        disorder_id = "SPECIFIC_PHOBIA"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Specific Phobia",
            description="Assessment for Specific Phobia according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "sequential"),
            minimum_criteria_count=None,
            duration_requirement=dsm_criteria.get("duration_requirement", "At least 6 months"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=10,
            min_questions=4,
            max_questions=8,
            category="anxiety_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Specific Phobia questions"""
        questions = []
        
        # SPH_01: Fear of specific object/situation
        questions.append(create_yes_no_question(
            question_id="SPH_01",
            sequence_number=1,
            simple_text="Do you have intense fear or anxiety about a specific object or situation?",
            help_text="Examples include animals, heights, flying, needles, or blood",
            examples=["Spiders", "Heights", "Flying", "Needles", "Blood"],
            clinical_text="Marked fear or anxiety about a specific object or situation",
            dsm_criterion_id="SPH_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "SPH_END"}
        ))
        
        # SPH_02: Immediate provocation
        questions.append(create_yes_no_question(
            question_id="SPH_02",
            sequence_number=2,
            simple_text="Does this object or situation almost always make you feel immediately afraid or anxious?",
            help_text="The fear is immediate and predictable",
            examples=["Immediate fear", "Always anxious", "Predictable fear"],
            clinical_text="Phobic object or situation almost always provokes immediate fear or anxiety",
            dsm_criterion_id="SPH_B",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "SPH_END"}
        ))
        
        # SPH_03: Avoidance
        questions.append(create_yes_no_question(
            question_id="SPH_03",
            sequence_number=3,
            simple_text="Do you avoid this object or situation, or endure it with intense fear or anxiety?",
            help_text="Either avoiding or suffering through exposure",
            examples=["Avoiding completely", "Enduring with fear", "Going out of way to avoid"],
            clinical_text="Phobic object or situation is actively avoided or endured with intense fear or anxiety",
            dsm_criterion_id="SPH_C",
            priority=2,
            dsm_criteria_required=True
        ))
        
        # SPH_04: Proportionality
        questions.append(create_yes_no_question(
            question_id="SPH_04",
            sequence_number=4,
            simple_text="Is your fear or anxiety out of proportion to the actual danger of this object or situation?",
            help_text="The fear is excessive compared to the actual risk",
            examples=["Excessive fear", "Out of proportion", "More fear than warranted"],
            clinical_text="Fear or anxiety is out of proportion to the actual danger",
            dsm_criterion_id="SPH_D",
            priority=2,
            dsm_criteria_required=True
        ))
        
        # SPH_05: Duration
        questions.append(create_yes_no_question(
            question_id="SPH_05",
            sequence_number=5,
            simple_text="Have these fears, anxiety, or avoidance behaviors been present for at least 6 months?",
            help_text="Symptoms should last at least 6 months",
            examples=["Lasting 6+ months", "Persistent fears", "Long-term avoidance"],
            clinical_text="Persistent, typically lasting for 6 months or more",
            dsm_criterion_id="SPH_E",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "SPH_END"}
        ))
        
        # SPH_06: Functional impairment
        questions.append(create_mcq_question(
            question_id="SPH_06",
            sequence_number=6,
            simple_text="How much do these fears or avoidance behaviors affect your daily life?",
            help_text="Impact on your ability to function",
            examples=["Avoiding activities", "Daily life impact", "Problems functioning"],
            clinical_text="Clinically significant distress or impairment",
            dsm_criterion_id="SPH_F",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Specific Phobia module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports marked fear or anxiety about a specific object or situation",
                "Fear is immediate and predictable",
                "Avoidance or intense fear/anxiety",
                "Symptoms present for at least 6 months"
            ],
            dont_use_when=[
                "Fear due to substance use",
                "Fear due to medical condition",
                "Better explained by another mental disorder"
            ],
            prerequisites=[
                "Completed SCID-SC screening",
                "No active psychosis",
                "Patient is capable of providing self-report"
            ],
            exclusion_criteria=[
                "Substance-induced fear",
                "Medical condition causing fear",
                "Better explained by another mental disorder"
            ]
        )


def create_specific_phobia_module() -> SCIDModule:
    """Create Specific Phobia module"""
    module_creator = SpecificPhobiaModule()
    return module_creator.create_module()

