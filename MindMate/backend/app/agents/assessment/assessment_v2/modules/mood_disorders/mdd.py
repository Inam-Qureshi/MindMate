"""
Major Depressive Disorder (MDD) Module for SCID-CV V2
Optimized with minimal questions, intelligent routing, and LLM-based response processing
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
from ...shared.option_sets import get_standard_options

logger = logging.getLogger(__name__)


class MDDModule(BaseSCIDModule):
    """MDD Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create MDD module"""
        disorder_id = "MDD"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        # Create questions
        questions = self._create_questions()
        
        # Create module
        module = SCIDModule(
            id=disorder_id,
            name="Major Depressive Disorder",
            description="Assessment for Major Depressive Disorder (MDD) according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "symptom_count"),
            minimum_criteria_count=dsm_criteria.get("minimum_criteria_count", 5),
            duration_requirement=dsm_criteria.get("duration_requirement", "At least 2 weeks"),
            diagnostic_threshold=0.6,
            severity_thresholds={
                "mild": 0.4,
                "moderate": 0.6,
                "severe": 0.8
            },
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=15,
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
        """Create MDD questions (optimized, minimal)"""
        questions = []
        
        # MDD_01: Depressed mood or loss of interest (Priority 1 - Core criterion)
        questions.append(create_yes_no_question(
            question_id="MDD_01",
            sequence_number=1,
            simple_text="In the past month, have you felt very sad or down almost every day?",
            help_text="This refers to feeling persistently sad, empty, or down - not just occasional sadness",
            examples=["Feeling empty inside", "Crying frequently", "Feeling hopeless"],
            clinical_text="Depressed mood most of the day, nearly every day",
            dsm_criterion_id="MDD_A1",
            priority=1,  # Critical - core criterion
            dsm_criteria_required=True,
            skip_logic={
                "no": "MDD_08"  # Skip to safety question if no depressed mood
            },
            follow_up_questions=["MDD_01A"]
        ))
        
        # MDD_01A: Follow-up for mood description
        questions.append(SCIDQuestion(
            id="MDD_01A",
            sequence_number=2,
            simple_text="Can you describe how you've been feeling?",
            help_text="Tell us more about your mood and emotions",
            examples=["Feeling empty", "Crying a lot", "Feeling hopeless"],
            clinical_text="Mood description follow-up",
            dsm_criterion_id="MDD_A1",
            response_type=ResponseType.TEXT,
            priority=2,
            dsm_criteria_required=False,
            accepts_free_text=True
        ))
        
        # MDD_02: Loss of interest (Priority 1 - Core criterion)
        questions.append(create_yes_no_question(
            question_id="MDD_02",
            sequence_number=3,
            simple_text="In the past month, have you lost interest or pleasure in activities you used to enjoy?",
            help_text="This means you no longer enjoy activities that used to bring you pleasure",
            examples=["Not enjoying hobbies", "Not wanting to socialize", "Not enjoying food"],
            clinical_text="Markedly diminished interest or pleasure in all, or almost all, activities",
            dsm_criterion_id="MDD_A2",
            priority=1,  # Critical - core criterion
            dsm_criteria_required=True,
            skip_logic={
                "no": "MDD_08"  # Skip to safety question if no loss of interest
            }
        ))
        
        # MDD_03: Duration (Priority 2 - Required)
        questions.append(create_yes_no_question(
            question_id="MDD_03",
            sequence_number=4,
            simple_text="Have these feelings been present for at least 2 weeks?",
            help_text="The symptoms should have been present most of the day, nearly every day, for at least 2 weeks",
            examples=["Symptoms for 2+ weeks", "Consistent daily symptoms"],
            clinical_text="Symptoms present for at least 2 weeks",
            dsm_criterion_id="MDD_DURATION",
            priority=2,
            dsm_criteria_required=True,
            skip_logic={
                "no": "MDD_08"  # Skip to safety question if duration not met
            }
        ))
        
        # MDD_04: Sleep problems (Priority 2 - Required)
        questions.append(create_mcq_question(
            question_id="MDD_04",
            sequence_number=5,
            simple_text="In the past month, have you had problems with sleep?",
            help_text="This includes difficulty falling asleep, staying asleep, or sleeping too much",
            examples=["Trouble falling asleep", "Waking up frequently", "Sleeping too much"],
            clinical_text="Insomnia or hypersomnia nearly every day",
            dsm_criterion_id="MDD_B2",
            option_set_name="sleep_problems",
            priority=2,
            dsm_criteria_required=False,
            follow_up_questions=["MDD_04A"]
        ))
        
        # MDD_04A: Sleep details follow-up
        questions.append(SCIDQuestion(
            id="MDD_04A",
            sequence_number=6,
            simple_text="Can you tell me more about your sleep problems?",
            help_text="Describe your sleep patterns and any changes",
            examples=["Difficulty falling asleep", "Waking up early", "Sleeping too much"],
            clinical_text="Sleep problem details",
            dsm_criterion_id="MDD_B2",
            response_type=ResponseType.TEXT,
            priority=3,
            accepts_free_text=True
        ))
        
        # MDD_05: Appetite/weight changes (Priority 2 - Required)
        questions.append(create_mcq_question(
            question_id="MDD_05",
            sequence_number=7,
            simple_text="In the past month, have you noticed changes in your appetite or weight?",
            help_text="This includes eating more or less than usual, or significant weight changes",
            examples=["Eating less", "Eating more", "Weight loss", "Weight gain"],
            clinical_text="Significant weight loss when not dieting or weight gain, or decrease or increase in appetite",
            dsm_criterion_id="MDD_B1",
            option_set_name="appetite_changes",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # MDD_06: Fatigue/energy loss (Priority 2 - Required)
        questions.append(create_yes_no_question(
            question_id="MDD_06",
            sequence_number=8,
            simple_text="In the past month, have you felt tired or had low energy almost every day?",
            help_text="This means feeling physically drained or lacking energy",
            examples=["Feeling exhausted", "No energy to do things", "Feeling drained"],
            clinical_text="Fatigue or loss of energy nearly every day",
            dsm_criterion_id="MDD_B4",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # MDD_07: Concentration problems (Priority 2 - Required)
        questions.append(create_yes_no_question(
            question_id="MDD_07",
            sequence_number=9,
            simple_text="In the past month, have you had trouble concentrating or making decisions?",
            help_text="This includes difficulty focusing, thinking clearly, or making simple decisions",
            examples=["Can't focus", "Trouble making decisions", "Mind feels foggy"],
            clinical_text="Diminished ability to think or concentrate, or indecisiveness",
            dsm_criterion_id="MDD_C2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # MDD_08: Suicidal thoughts (Priority 1 - CRITICAL SAFETY QUESTION)
        questions.append(create_yes_no_question(
            question_id="MDD_08",
            sequence_number=10,
            simple_text="In the past month, have you had thoughts of hurting yourself or ending your life?",
            help_text="This is an important safety question. Please answer honestly.",
            examples=["Thoughts of suicide", "Wanting to die", "Thoughts of self-harm"],
            clinical_text="Recurrent thoughts of death, recurrent suicidal ideation, or suicide attempt",
            dsm_criterion_id="MDD_C3",
            priority=1,  # CRITICAL - Safety question
            dsm_criteria_required=False,
            # Note: If "yes", immediate safety protocol should be triggered
        ))
        
        # MDD_09: Guilt/worthlessness (Priority 3 - Supporting)
        questions.append(create_yes_no_question(
            question_id="MDD_09",
            sequence_number=11,
            simple_text="In the past month, have you felt worthless or guilty about things?",
            help_text="This includes feeling like you're a burden or that you've done something wrong",
            examples=["Feeling worthless", "Excessive guilt", "Feeling like a burden"],
            clinical_text="Feelings of worthlessness or excessive or inappropriate guilt",
            dsm_criterion_id="MDD_C1",
            priority=3,
            dsm_criteria_required=False
        ))
        
        # MDD_10: Psychomotor changes (Priority 3 - Supporting)
        questions.append(create_mcq_question(
            question_id="MDD_10",
            sequence_number=12,
            simple_text="In the past month, have you noticed changes in your movement or activity level?",
            help_text="This includes feeling restless and agitated, or moving and speaking very slowly",
            examples=["Feeling restless", "Moving slowly", "Feeling agitated"],
            clinical_text="Psychomotor agitation or retardation nearly every day",
            dsm_criterion_id="MDD_B3",
            option_set_name="severity",
            priority=3,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for MDD module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports depressed mood or loss of interest/pleasure",
                "Symptoms present for at least 2 weeks",
                "Symptoms represent change from previous functioning",
                "Not better explained by another mental disorder"
            ],
            dont_use_when=[
                "Patient has active manic or hypomanic episode",
                "Symptoms due to physiological effects of substance",
                "Symptoms due to another medical condition",
                "Better explained by schizophrenia spectrum disorder"
            ],
            prerequisites=[
                "Completed SCID-SC screening",
                "No active psychosis",
                "Patient is capable of providing self-report"
            ],
            exclusion_criteria=[
                "Active substance use disorder (unless independent)",
                "Medical condition causing depressive symptoms",
                "Normal bereavement (unless severe and prolonged)"
            ]
        )


def create_mdd_module() -> SCIDModule:
    """Create MDD module"""
    module_creator = MDDModule()
    return module_creator.create_module()

