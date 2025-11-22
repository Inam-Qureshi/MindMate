"""
Social Anxiety Disorder Module for SCID-CV V2
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


class SocialAnxietyModule(BaseSCIDModule):
    """Social Anxiety Disorder Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Social Anxiety Disorder module"""
        disorder_id = "SOCIAL_ANXIETY"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Social Anxiety Disorder (Social Phobia)",
            description="Assessment for Social Anxiety Disorder according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "sequential"),
            minimum_criteria_count=None,
            duration_requirement=dsm_criteria.get("duration_requirement", "At least 6 months"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=15,
            min_questions=5,
            max_questions=10,
            category="anxiety_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Social Anxiety Disorder questions"""
        questions = []
        
        # SOC_01: Fear of social situations
        questions.append(create_yes_no_question(
            question_id="SOC_01",
            sequence_number=1,
            simple_text="Do you feel intense fear or anxiety in social situations where others might watch or judge you?",
            help_text="Fear of being watched, judged, or evaluated by others",
            examples=["Speaking in public", "Meeting new people", "Eating in public", "Being observed"],
            clinical_text="Marked fear or anxiety about social situations",
            dsm_criterion_id="SOC_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "SOC_END"}
        ))
        
        # SOC_02: Fear of negative evaluation
        questions.append(create_yes_no_question(
            question_id="SOC_02",
            sequence_number=2,
            simple_text="Do you worry that you'll act in a way that will be embarrassing or that others will judge you negatively?",
            help_text="Fear of being judged, embarrassed, or humiliated",
            examples=["Worry about embarrassing yourself", "Fear of being judged", "Worry about what others think"],
            clinical_text="Fear of acting in a way that will be negatively evaluated",
            dsm_criterion_id="SOC_B",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "SOC_END"}
        ))
        
        # SOC_03: Consistency
        questions.append(create_yes_no_question(
            question_id="SOC_03",
            sequence_number=3,
            simple_text="Do these social situations almost always make you feel anxious or afraid?",
            help_text="The fear is consistent and predictable",
            examples=["Always anxious", "Consistent fear", "Predictable anxiety"],
            clinical_text="Social situations almost always provoke fear or anxiety",
            dsm_criterion_id="SOC_C",
            priority=2,
            dsm_criteria_required=True
        ))
        
        # SOC_04: Avoidance
        questions.append(create_yes_no_question(
            question_id="SOC_04",
            sequence_number=4,
            simple_text="Do you avoid these social situations or endure them with intense fear or anxiety?",
            help_text="Either avoiding or suffering through social situations",
            examples=["Avoiding social events", "Enduring with fear", "Staying away from people"],
            clinical_text="Social situations are avoided or endured with intense fear or anxiety",
            dsm_criterion_id="SOC_D",
            priority=2,
            dsm_criteria_required=True
        ))
        
        # SOC_05: Proportionality
        questions.append(create_yes_no_question(
            question_id="SOC_05",
            sequence_number=5,
            simple_text="Is your fear or anxiety out of proportion to the actual threat of these social situations?",
            help_text="The fear is excessive compared to the actual situation",
            examples=["Excessive fear", "Out of proportion", "More fear than warranted"],
            clinical_text="Fear or anxiety is out of proportion to the actual threat",
            dsm_criterion_id="SOC_E",
            priority=2,
            dsm_criteria_required=True
        ))
        
        # SOC_06: Duration
        questions.append(create_yes_no_question(
            question_id="SOC_06",
            sequence_number=6,
            simple_text="Have these fears, anxiety, or avoidance behaviors been present for at least 6 months?",
            help_text="Symptoms should last at least 6 months",
            examples=["Lasting 6+ months", "Persistent fears", "Long-term avoidance"],
            clinical_text="Persistent, typically lasting for 6 months or more",
            dsm_criterion_id="SOC_F",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "SOC_END"}
        ))
        
        # SOC_07: Functional impairment
        questions.append(create_mcq_question(
            question_id="SOC_07",
            sequence_number=7,
            simple_text="How much do these fears or avoidance behaviors affect your work, relationships, or daily life?",
            help_text="Impact on your ability to function",
            examples=["Can't go to work", "Avoiding social activities", "Problems in relationships"],
            clinical_text="Clinically significant distress or impairment",
            dsm_criterion_id="SOC_G",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Social Anxiety Disorder module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports marked fear or anxiety about social situations",
                "Fear of being watched, judged, or evaluated by others",
                "Avoidance or intense fear/anxiety in social situations",
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


def create_social_anxiety_module() -> SCIDModule:
    """Create Social Anxiety Disorder module"""
    module_creator = SocialAnxietyModule()
    return module_creator.create_module()

