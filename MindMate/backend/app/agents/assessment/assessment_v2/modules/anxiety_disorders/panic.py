"""
Panic Disorder Module for SCID-CV V2
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


class PanicModule(BaseSCIDModule):
    """Panic Disorder Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Panic Disorder module"""
        disorder_id = "PANIC"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Panic Disorder",
            description="Assessment for Panic Disorder according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "sequential"),
            minimum_criteria_count=None,
            duration_requirement=dsm_criteria.get("duration_requirement", "At least 1 month"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=20,
            min_questions=5,
            max_questions=15,
            category="anxiety_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Panic Disorder questions"""
        questions = []
        
        # PAN_01: Panic attacks
        questions.append(create_yes_no_question(
            question_id="PAN_01",
            sequence_number=1,
            simple_text="Have you had sudden attacks of intense fear or discomfort that came on quickly?",
            help_text="These are panic attacks - sudden, intense fear that peaks within minutes",
            examples=["Sudden intense fear", "Feeling like you're dying", "Heart racing suddenly"],
            clinical_text="Recurrent unexpected panic attacks",
            dsm_criterion_id="PAN_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "PAN_END"}
        ))
        
        # PAN_02: Panic attack symptoms (need 4+)
        questions.append(create_mcq_question(
            question_id="PAN_02",
            sequence_number=2,
            simple_text="During these attacks, did you experience physical symptoms like heart racing, sweating, shaking, or difficulty breathing?",
            help_text="Panic attacks involve multiple physical symptoms",
            examples=["Heart racing", "Sweating", "Shaking", "Difficulty breathing"],
            clinical_text="Panic attack symptoms (need 4+ of 13)",
            dsm_criterion_id="PAN_SYMPTOMS",
            option_set_name="frequency",
            priority=1,
            dsm_criteria_required=False
        ))
        
        # PAN_03: Persistent concern
        questions.append(create_yes_no_question(
            question_id="PAN_03",
            sequence_number=3,
            simple_text="After having these attacks, did you worry a lot about having another attack or about what might happen?",
            help_text="Worry about future attacks or their consequences",
            examples=["Worried about another attack", "Afraid of what might happen", "Changed behavior"],
            clinical_text="Persistent concern about additional panic attacks",
            dsm_criterion_id="PAN_B",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "PAN_END"}
        ))
        
        # PAN_04: Duration of concern
        questions.append(create_yes_no_question(
            question_id="PAN_04",
            sequence_number=4,
            simple_text="Did this worry or concern last for at least 1 month?",
            help_text="The worry about attacks should last at least 1 month",
            examples=["Worried for 1+ months", "Persistent concern", "Long-term worry"],
            clinical_text="At least 1 month of persistent concern",
            dsm_criterion_id="PAN_DURATION",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "PAN_END"}
        ))
        
        # PAN_05: Behavioral changes
        questions.append(create_yes_no_question(
            question_id="PAN_05",
            sequence_number=5,
            simple_text="Did you change your behavior because of these attacks?",
            help_text="Avoiding places or situations because of fear of attacks",
            examples=["Avoiding places", "Changed routine", "Avoiding situations"],
            clinical_text="Significant maladaptive change in behavior",
            dsm_criterion_id="PAN_BEHAVIOR",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Panic Disorder module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports sudden attacks of intense fear",
                "Attacks include physical symptoms",
                "Worry about future attacks",
                "Symptoms present for at least 1 month"
            ],
            dont_use_when=[
                "Attacks due to substance use",
                "Attacks due to medical condition",
                "Better explained by another mental disorder"
            ],
            prerequisites=[
                "Completed SCID-SC screening",
                "No active psychosis",
                "Patient is capable of providing self-report"
            ],
            exclusion_criteria=[
                "Substance-induced panic attacks",
                "Medical condition causing attacks",
                "Better explained by another mental disorder"
            ]
        )


def create_panic_module() -> SCIDModule:
    """Create Panic Disorder module"""
    module_creator = PanicModule()
    return module_creator.create_module()

