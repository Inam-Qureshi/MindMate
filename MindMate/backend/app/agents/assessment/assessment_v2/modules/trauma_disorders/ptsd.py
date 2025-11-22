"""
Post-Traumatic Stress Disorder (PTSD) Module for SCID-CV V2
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


class PTSDModule(BaseSCIDModule):
    """PTSD Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create PTSD module"""
        disorder_id = "PTSD"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Posttraumatic Stress Disorder",
            description="Assessment for Posttraumatic Stress Disorder (PTSD) according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "cluster"),
            minimum_criteria_count=None,
            duration_requirement=dsm_criteria.get("duration_requirement", "More than 1 month"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=25,
            min_questions=8,
            max_questions=20,
            category="trauma_stressor_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create PTSD questions"""
        questions = []
        
        # PTSD_01: Trauma exposure
        questions.append(create_yes_no_question(
            question_id="PTSD_01",
            sequence_number=1,
            simple_text="Have you experienced or witnessed a traumatic event involving actual or threatened death, serious injury, or sexual violence?",
            help_text="Traumatic events like accidents, assaults, natural disasters, or combat",
            examples=["Car accident", "Assault", "Natural disaster", "Combat", "Sexual assault"],
            clinical_text="Exposure to actual or threatened death, serious injury, or sexual violence",
            dsm_criterion_id="PTSD_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "PTSD_END"}
        ))
        
        # PTSD_02: Intrusive memories
        questions.append(create_yes_no_question(
            question_id="PTSD_02",
            sequence_number=2,
            simple_text="Do you have unwanted, distressing memories of the traumatic event that come back to you?",
            help_text="Memories that intrude into your thoughts",
            examples=["Unwanted memories", "Distressing thoughts", "Intrusive memories"],
            clinical_text="Recurrent, involuntary, and intrusive distressing memories",
            dsm_criterion_id="PTSD_B1",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # PTSD_03: Nightmares
        questions.append(create_yes_no_question(
            question_id="PTSD_03",
            sequence_number=3,
            simple_text="Do you have distressing dreams or nightmares about the traumatic event?",
            help_text="Dreams related to the trauma",
            examples=["Trauma-related nightmares", "Distressing dreams", "Bad dreams"],
            clinical_text="Recurrent distressing dreams related to the traumatic event",
            dsm_criterion_id="PTSD_B2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # PTSD_04: Flashbacks
        questions.append(create_yes_no_question(
            question_id="PTSD_04",
            sequence_number=4,
            simple_text="Do you ever feel or act as if the traumatic event is happening again (flashbacks)?",
            help_text="Feeling like you're reliving the event",
            examples=["Feeling like it's happening again", "Flashbacks", "Reliving the event"],
            clinical_text="Dissociative reactions (flashbacks) in which the individual feels or acts as if the traumatic event were recurring",
            dsm_criterion_id="PTSD_B3",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # PTSD_05: Avoidance of memories
        questions.append(create_yes_no_question(
            question_id="PTSD_05",
            sequence_number=5,
            simple_text="Do you avoid thoughts, feelings, or memories about the traumatic event?",
            help_text="Trying to avoid thinking about or remembering the trauma",
            examples=["Avoiding thoughts", "Avoiding memories", "Trying not to think about it"],
            clinical_text="Avoidance of distressing memories, thoughts, or feelings about the traumatic event",
            dsm_criterion_id="PTSD_C1",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # PTSD_06: Avoidance of reminders
        questions.append(create_yes_no_question(
            question_id="PTSD_06",
            sequence_number=6,
            simple_text="Do you avoid people, places, or situations that remind you of the traumatic event?",
            help_text="Avoiding things that trigger memories of the trauma",
            examples=["Avoiding places", "Avoiding people", "Avoiding situations"],
            clinical_text="Avoidance of external reminders that arouse distressing memories",
            dsm_criterion_id="PTSD_C2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # PTSD_07: Negative beliefs
        questions.append(create_yes_no_question(
            question_id="PTSD_07",
            sequence_number=7,
            simple_text="Do you have persistent negative beliefs about yourself, others, or the world?",
            help_text="Beliefs like 'I'm bad', 'The world is dangerous', or 'I can't trust anyone'",
            examples=["Negative beliefs about self", "Negative beliefs about world", "Can't trust anyone"],
            clinical_text="Persistent and exaggerated negative beliefs or expectations about oneself, others, or the world",
            dsm_criterion_id="PTSD_D2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # PTSD_08: Hypervigilance
        questions.append(create_yes_no_question(
            question_id="PTSD_08",
            sequence_number=8,
            simple_text="Are you hypervigilant or constantly on guard, watching for danger?",
            help_text="Feeling like you always need to be alert and watchful",
            examples=["Always on guard", "Watching for danger", "Hypervigilant"],
            clinical_text="Hypervigilance",
            dsm_criterion_id="PTSD_E3",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # PTSD_09: Duration
        questions.append(create_yes_no_question(
            question_id="PTSD_09",
            sequence_number=9,
            simple_text="Have these symptoms been present for more than 1 month?",
            help_text="Symptoms should last more than 1 month",
            examples=["Lasting 1+ months", "Persistent symptoms", "Long-term symptoms"],
            clinical_text="Duration of disturbance is more than 1 month",
            dsm_criterion_id="PTSD_DURATION",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "PTSD_END"}
        ))
        
        # PTSD_10: Functional impairment
        questions.append(create_mcq_question(
            question_id="PTSD_10",
            sequence_number=10,
            simple_text="How much do these symptoms affect your work, relationships, or daily life?",
            help_text="Impact on your ability to function",
            examples=["Can't work", "Problems in relationships", "Daily life impact"],
            clinical_text="Clinically significant distress or impairment",
            dsm_criterion_id="PTSD_IMPAIRMENT",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for PTSD module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports exposure to traumatic event",
                "Intrusion symptoms (memories, nightmares, flashbacks)",
                "Avoidance of trauma-related stimuli",
                "Negative alterations in cognitions and mood",
                "Marked alterations in arousal and reactivity",
                "Symptoms present for more than 1 month"
            ],
            dont_use_when=[
                "Symptoms due to substance use",
                "Symptoms due to medical condition",
                "Better explained by another mental disorder"
            ],
            prerequisites=[
                "Completed SCID-SC screening",
                "No active psychosis (unless trauma-related)",
                "Patient is capable of providing self-report"
            ],
            exclusion_criteria=[
                "Substance-induced symptoms",
                "Medical condition causing symptoms",
                "Better explained by another mental disorder"
            ]
        )


def create_ptsd_module() -> SCIDModule:
    """Create PTSD module"""
    module_creator = PTSDModule()
    return module_creator.create_module()

