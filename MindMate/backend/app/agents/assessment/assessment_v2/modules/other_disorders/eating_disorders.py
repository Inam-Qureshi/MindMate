"""
Eating Disorders Module for SCID-CV V2
Focuses on Anorexia Nervosa criteria
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


class EatingDisordersModule(BaseSCIDModule):
    """Eating Disorders Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Eating Disorders module"""
        disorder_id = "EATING_DISORDERS"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Eating Disorders (Anorexia Nervosa)",
            description="Assessment for Eating Disorders (Anorexia Nervosa) according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "sequential"),
            minimum_criteria_count=None,
            duration_requirement=dsm_criteria.get("duration_requirement", "Persistent"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=20,
            min_questions=4,
            max_questions=10,
            category="eating_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Eating Disorders questions"""
        questions = []
        
        # EAT_01: Restriction of energy intake
        questions.append(create_yes_no_question(
            question_id="EAT_01",
            sequence_number=1,
            simple_text="Have you been restricting your food intake, leading to significantly low body weight?",
            help_text="Eating much less than needed, resulting in low weight",
            examples=["Restricting food", "Eating very little", "Low body weight"],
            clinical_text="Restriction of energy intake relative to requirements, leading to significantly low body weight",
            dsm_criterion_id="AN_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "EAT_END"}
        ))
        
        # EAT_02: Fear of gaining weight
        questions.append(create_yes_no_question(
            question_id="EAT_02",
            sequence_number=2,
            simple_text="Do you have an intense fear of gaining weight or becoming fat?",
            help_text="Strong fear of weight gain, even when underweight",
            examples=["Fear of gaining weight", "Afraid of getting fat", "Intense fear"],
            clinical_text="Intense fear of gaining weight or of becoming fat",
            dsm_criterion_id="AN_B",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "EAT_END"}
        ))
        
        # EAT_03: Body image disturbance
        questions.append(create_yes_no_question(
            question_id="EAT_03",
            sequence_number=3,
            simple_text="Do you have a disturbance in how you see your body weight or shape, or does your weight/shape strongly influence how you feel about yourself?",
            help_text="Seeing yourself as fat when you're thin, or basing self-worth on weight",
            examples=["Seeing self as fat", "Weight affects self-esteem", "Body image problems"],
            clinical_text="Disturbance in the way in which one's body weight or shape is experienced",
            dsm_criterion_id="AN_C",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "EAT_END"}
        ))
        
        # EAT_04: Recognition of seriousness
        questions.append(create_yes_no_question(
            question_id="EAT_04",
            sequence_number=4,
            simple_text="Do you have trouble recognizing the seriousness of your current low body weight?",
            help_text="Not seeing that your weight is dangerously low",
            examples=["Don't see problem", "Not recognizing seriousness", "Denying problem"],
            clinical_text="Persistent lack of recognition of the seriousness of the current low body weight",
            dsm_criterion_id="AN_C",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # EAT_05: Functional impairment
        questions.append(create_mcq_question(
            question_id="EAT_05",
            sequence_number=5,
            simple_text="How much do your eating behaviors and concerns about weight affect your daily life?",
            help_text="Impact on your ability to function",
            examples=["Problems at work", "Problems in relationships", "Daily life impact"],
            clinical_text="Significant impairment in functioning",
            dsm_criterion_id="AN_IMPAIRMENT",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Eating Disorders module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports restriction of food intake",
                "Significantly low body weight",
                "Intense fear of gaining weight",
                "Disturbance in body image or self-evaluation based on weight"
            ],
            dont_use_when=[
                "Symptoms due to medical condition",
                "Better explained by another mental disorder",
                "Restriction due to lack of availability of food"
            ],
            prerequisites=[
                "Completed SCID-SC screening",
                "No active psychosis",
                "Patient is capable of providing self-report"
            ],
            exclusion_criteria=[
                "Medical condition causing weight loss",
                "Better explained by another mental disorder",
                "Restriction due to lack of availability of food"
            ]
        )


def create_eating_disorders_module() -> SCIDModule:
    """Create Eating Disorders module"""
    module_creator = EatingDisordersModule()
    return module_creator.create_module()

