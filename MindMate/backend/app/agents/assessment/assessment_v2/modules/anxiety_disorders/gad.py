"""
Generalized Anxiety Disorder (GAD) Module for SCID-CV V2
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


class GADModule(BaseSCIDModule):
    """GAD Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create GAD module"""
        disorder_id = "GAD"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Generalized Anxiety Disorder",
            description="Assessment for Generalized Anxiety Disorder (GAD) according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "hybrid"),
            minimum_criteria_count=dsm_criteria.get("minimum_criteria_count", 3),
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
        """Create GAD questions"""
        questions = []
        
        # GAD_01: Excessive worry (Required)
        questions.append(create_yes_no_question(
            question_id="GAD_01",
            sequence_number=1,
            simple_text="In the past 6 months, have you worried excessively about many different things?",
            help_text="Worry that is out of proportion and about many things",
            examples=["Worrying about everything", "Constant 'what if' thoughts", "Worrying more than others"],
            clinical_text="Excessive anxiety and worry about a number of events or activities",
            dsm_criterion_id="GAD_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "GAD_END"}
        ))
        
        # GAD_02: Difficulty controlling worry (Required)
        questions.append(create_yes_no_question(
            question_id="GAD_02",
            sequence_number=2,
            simple_text="Is it difficult for you to control or stop your worrying?",
            help_text="The worry feels like it has a mind of its own",
            examples=["Can't turn off worried thoughts", "Worry spirals out of control", "Can't just 'stop worrying'"],
            clinical_text="Difficulty controlling the worry",
            dsm_criterion_id="GAD_B",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "GAD_END"}
        ))
        
        # GAD_03: Restlessness
        questions.append(create_yes_no_question(
            question_id="GAD_03",
            sequence_number=3,
            simple_text="Do you feel restless, keyed up, or on edge?",
            help_text="Feeling unable to relax or feeling tense",
            examples=["Can't sit still", "Feeling on edge", "Unable to relax"],
            clinical_text="Restlessness or feeling keyed up or on edge",
            dsm_criterion_id="GAD_C1",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # GAD_04: Fatigue
        questions.append(create_yes_no_question(
            question_id="GAD_04",
            sequence_number=4,
            simple_text="Do you get tired easily or feel fatigued?",
            help_text="Feeling worn out from worrying",
            examples=["Feeling tired", "Easily fatigued", "Worn out"],
            clinical_text="Being easily fatigued",
            dsm_criterion_id="GAD_C2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # GAD_05: Concentration problems
        questions.append(create_yes_no_question(
            question_id="GAD_05",
            sequence_number=5,
            simple_text="Do you have trouble concentrating or does your mind go blank?",
            help_text="Difficulty focusing because of worry",
            examples=["Mind goes blank", "Trouble concentrating", "Can't focus"],
            clinical_text="Difficulty concentrating or mind going blank",
            dsm_criterion_id="GAD_C3",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # GAD_06: Irritability
        questions.append(create_yes_no_question(
            question_id="GAD_06",
            sequence_number=6,
            simple_text="Do you feel irritable or easily annoyed?",
            help_text="Feeling on edge or snapping at people",
            examples=["Feeling irritable", "Easily annoyed", "Snapping at people"],
            clinical_text="Irritability",
            dsm_criterion_id="GAD_C4",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # GAD_07: Muscle tension
        questions.append(create_yes_no_question(
            question_id="GAD_07",
            sequence_number=7,
            simple_text="Do you have muscle tension, aches, or feel tense?",
            help_text="Physical tension from worrying",
            examples=["Muscle tension", "Feeling tense", "Aches and pains"],
            clinical_text="Muscle tension",
            dsm_criterion_id="GAD_C5",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # GAD_08: Sleep disturbance
        questions.append(create_yes_no_question(
            question_id="GAD_08",
            sequence_number=8,
            simple_text="Do you have trouble falling asleep, staying asleep, or restless sleep?",
            help_text="Sleep problems related to worry",
            examples=["Trouble falling asleep", "Restless sleep", "Waking up"],
            clinical_text="Sleep disturbance",
            dsm_criterion_id="GAD_C6",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # GAD_09: Duration
        questions.append(create_yes_no_question(
            question_id="GAD_09",
            sequence_number=9,
            simple_text="Have these symptoms been present more days than not for at least 6 months?",
            help_text="Symptoms should be present most of the time",
            examples=["Present most days", "Lasting 6+ months", "Consistent symptoms"],
            clinical_text="Occurring more days than not for at least 6 months",
            dsm_criterion_id="GAD_DURATION",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "GAD_END"}
        ))
        
        # GAD_10: Functional impairment
        questions.append(create_mcq_question(
            question_id="GAD_10",
            sequence_number=10,
            simple_text="How much do these symptoms affect your work, relationships, or daily life?",
            help_text="Impact on your ability to function",
            examples=["Affects work", "Problems in relationships", "Daily life impact"],
            clinical_text="Clinically significant distress or impairment",
            dsm_criterion_id="GAD_IMPAIRMENT",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for GAD module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports excessive anxiety and worry",
                "Worry present for at least 6 months",
                "Worry about multiple events or activities",
                "Difficulty controlling worry"
            ],
            dont_use_when=[
                "Anxiety better explained by another disorder",
                "Anxiety due to substance use",
                "Anxiety due to medical condition"
            ],
            prerequisites=[
                "Completed SCID-SC screening",
                "No active psychosis",
                "Patient is 18+ years old"
            ],
            exclusion_criteria=[
                "Anxiety only in context of panic attacks",
                "Anxiety only in context of social situations",
                "Anxiety only in context of specific objects/situations"
            ]
        )


def create_gad_module() -> SCIDModule:
    """Create GAD module"""
    module_creator = GADModule()
    return module_creator.create_module()

