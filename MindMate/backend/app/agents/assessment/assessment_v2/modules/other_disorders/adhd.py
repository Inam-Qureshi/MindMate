"""
Attention-Deficit/Hyperactivity Disorder (ADHD) Module for SCID-CV V2
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


class ADHDModule(BaseSCIDModule):
    """ADHD Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create ADHD module"""
        disorder_id = "ADHD"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Attention-Deficit/Hyperactivity Disorder",
            description="Assessment for Attention-Deficit/Hyperactivity Disorder (ADHD) according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "cluster"),
            minimum_criteria_count=dsm_criteria.get("minimum_criteria_count", 6),
            duration_requirement=dsm_criteria.get("duration_requirement", "At least 6 months"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=25,
            min_questions=10,
            max_questions=20,
            category="neurodevelopmental_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create ADHD questions (inattention and hyperactivity-impulsivity)"""
        questions = []
        
        # ADHD_01: Fails to give close attention
        questions.append(create_yes_no_question(
            question_id="ADHD_01",
            sequence_number=1,
            simple_text="Do you often fail to give close attention to details or make careless mistakes?",
            help_text="Making mistakes because of not paying attention",
            examples=["Careless mistakes", "Missing details", "Not paying attention"],
            clinical_text="Often fails to give close attention to details or makes careless mistakes",
            dsm_criterion_id="ADHD_IN1",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_02: Difficulty sustaining attention
        questions.append(create_yes_no_question(
            question_id="ADHD_02",
            sequence_number=2,
            simple_text="Do you often have difficulty sustaining attention in tasks or activities?",
            help_text="Trouble staying focused on tasks",
            examples=["Can't stay focused", "Mind wanders", "Loses interest"],
            clinical_text="Often has difficulty sustaining attention in tasks or play activities",
            dsm_criterion_id="ADHD_IN2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_03: Does not seem to listen
        questions.append(create_yes_no_question(
            question_id="ADHD_03",
            sequence_number=3,
            simple_text="Do you often not seem to listen when spoken to directly?",
            help_text="Seems like you're not paying attention when people talk to you",
            examples=["Not listening", "Mind elsewhere", "Not paying attention"],
            clinical_text="Often does not seem to listen when spoken to directly",
            dsm_criterion_id="ADHD_IN3",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_04: Does not follow through
        questions.append(create_yes_no_question(
            question_id="ADHD_04",
            sequence_number=4,
            simple_text="Do you often not follow through on instructions or fail to finish tasks?",
            help_text="Starting things but not finishing them",
            examples=["Not finishing tasks", "Not following instructions", "Incomplete work"],
            clinical_text="Often does not follow through on instructions and fails to finish tasks",
            dsm_criterion_id="ADHD_IN4",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_05: Difficulty organizing
        questions.append(create_yes_no_question(
            question_id="ADHD_05",
            sequence_number=5,
            simple_text="Do you often have difficulty organizing tasks and activities?",
            help_text="Trouble keeping things organized or in order",
            examples=["Disorganized", "Can't organize", "Messy"],
            clinical_text="Often has difficulty organizing tasks and activities",
            dsm_criterion_id="ADHD_IN5",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_06: Avoids sustained mental effort
        questions.append(create_yes_no_question(
            question_id="ADHD_06",
            sequence_number=6,
            simple_text="Do you often avoid, dislike, or are reluctant to engage in tasks that require sustained mental effort?",
            help_text="Avoiding tasks that require a lot of thinking or concentration",
            examples=["Avoiding difficult tasks", "Disliking mental work", "Reluctant to start"],
            clinical_text="Often avoids, dislikes, or is reluctant to engage in tasks that require sustained mental effort",
            dsm_criterion_id="ADHD_IN6",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_07: Loses things
        questions.append(create_yes_no_question(
            question_id="ADHD_07",
            sequence_number=7,
            simple_text="Do you often lose things necessary for tasks or activities?",
            help_text="Misplacing or losing important items",
            examples=["Losing keys", "Losing phone", "Misplacing items"],
            clinical_text="Often loses things necessary for tasks or activities",
            dsm_criterion_id="ADHD_IN7",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_08: Easily distracted
        questions.append(create_yes_no_question(
            question_id="ADHD_08",
            sequence_number=8,
            simple_text="Are you often easily distracted by extraneous stimuli?",
            help_text="Distracted by things around you",
            examples=["Easily distracted", "Distracted by noise", "Can't ignore distractions"],
            clinical_text="Is often easily distracted by extraneous stimuli",
            dsm_criterion_id="ADHD_IN8",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_09: Forgetful
        questions.append(create_yes_no_question(
            question_id="ADHD_09",
            sequence_number=9,
            simple_text="Are you often forgetful in daily activities?",
            help_text="Forgetting to do things or forgetting appointments",
            examples=["Forgetting appointments", "Forgetting tasks", "Forgetful"],
            clinical_text="Is often forgetful in daily activities",
            dsm_criterion_id="ADHD_IN9",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_10: Fidgets
        questions.append(create_yes_no_question(
            question_id="ADHD_10",
            sequence_number=10,
            simple_text="Do you often fidget with or tap your hands or feet, or squirm in your seat?",
            help_text="Restless movements or fidgeting",
            examples=["Fidgeting", "Tapping", "Squirming", "Can't sit still"],
            clinical_text="Often fidgets with or taps hands or feet or squirms in seat",
            dsm_criterion_id="ADHD_HI1",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_11: Leaves seat
        questions.append(create_yes_no_question(
            question_id="ADHD_11",
            sequence_number=11,
            simple_text="Do you often leave your seat in situations when remaining seated is expected?",
            help_text="Getting up when you should stay seated",
            examples=["Leaving seat", "Getting up", "Can't stay seated"],
            clinical_text="Often leaves seat in situations when remaining seated is expected",
            dsm_criterion_id="ADHD_HI2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_12: Runs about or climbs
        questions.append(create_yes_no_question(
            question_id="ADHD_12",
            sequence_number=12,
            simple_text="Do you often feel restless or have difficulty sitting still for long periods?",
            help_text="Feeling restless or needing to move around",
            examples=["Feeling restless", "Can't sit still", "Need to move"],
            clinical_text="Often runs about or climbs in situations where it is inappropriate (adults: feeling restless)",
            dsm_criterion_id="ADHD_HI3",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_13: Unable to play quietly
        questions.append(create_yes_no_question(
            question_id="ADHD_13",
            sequence_number=13,
            simple_text="Are you often unable to play or engage in leisure activities quietly?",
            help_text="Being loud or active during quiet activities",
            examples=["Can't be quiet", "Loud activities", "Noisy"],
            clinical_text="Often unable to play or engage in leisure activities quietly",
            dsm_criterion_id="ADHD_HI4",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_14: On the go
        questions.append(create_yes_no_question(
            question_id="ADHD_14",
            sequence_number=14,
            simple_text="Are you often 'on the go,' acting as if 'driven by a motor'?",
            help_text="Feeling like you always need to be doing something",
            examples=["Always on the go", "Driven by motor", "Can't slow down"],
            clinical_text="Is often 'on the go,' acting as if 'driven by a motor'",
            dsm_criterion_id="ADHD_HI5",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_15: Talks excessively
        questions.append(create_yes_no_question(
            question_id="ADHD_15",
            sequence_number=15,
            simple_text="Do you often talk excessively?",
            help_text="Talking too much or non-stop",
            examples=["Talking too much", "Non-stop talking", "Excessive talking"],
            clinical_text="Often talks excessively",
            dsm_criterion_id="ADHD_HI6",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_16: Blurts out answers
        questions.append(create_yes_no_question(
            question_id="ADHD_16",
            sequence_number=16,
            simple_text="Do you often blurt out an answer before a question has been completed?",
            help_text="Answering before the question is finished",
            examples=["Blurting out answers", "Interrupting", "Answering too quickly"],
            clinical_text="Often blurts out an answer before a question has been completed",
            dsm_criterion_id="ADHD_HI7",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_17: Difficulty waiting
        questions.append(create_yes_no_question(
            question_id="ADHD_17",
            sequence_number=17,
            simple_text="Do you often have difficulty waiting your turn?",
            help_text="Trouble waiting in line or for your turn",
            examples=["Can't wait", "Impatient", "Difficulty waiting"],
            clinical_text="Often has difficulty waiting his or her turn",
            dsm_criterion_id="ADHD_HI8",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_18: Interrupts or intrudes
        questions.append(create_yes_no_question(
            question_id="ADHD_18",
            sequence_number=18,
            simple_text="Do you often interrupt or intrude on others?",
            help_text="Interrupting conversations or activities",
            examples=["Interrupting others", "Intruding", "Butting in"],
            clinical_text="Often interrupts or intrudes on others",
            dsm_criterion_id="ADHD_HI9",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # ADHD_19: Duration
        questions.append(create_yes_no_question(
            question_id="ADHD_19",
            sequence_number=19,
            simple_text="Have these symptoms been present for at least 6 months?",
            help_text="Symptoms should last at least 6 months",
            examples=["Lasting 6+ months", "Persistent symptoms", "Long-term symptoms"],
            clinical_text="Symptoms present for at least 6 months",
            dsm_criterion_id="ADHD_DURATION",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "ADHD_END"}
        ))
        
        # ADHD_20: Functional impairment
        questions.append(create_mcq_question(
            question_id="ADHD_20",
            sequence_number=20,
            simple_text="How much do these symptoms affect your work, school, relationships, or daily life?",
            help_text="Impact on your ability to function",
            examples=["Problems at work", "Problems in school", "Problems in relationships"],
            clinical_text="Clear evidence that symptoms interfere with functioning",
            dsm_criterion_id="ADHD_IMPAIRMENT",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for ADHD module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports symptoms of inattention or hyperactivity-impulsivity",
                "Symptoms present for at least 6 months",
                "Symptoms present in two or more settings",
                "Symptoms interfere with functioning"
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
                "Better explained by another mental disorder",
                "Symptoms occur exclusively during course of schizophrenia or another psychotic disorder"
            ]
        )


def create_adhd_module() -> SCIDModule:
    """Create ADHD module"""
    module_creator = ADHDModule()
    return module_creator.create_module()

