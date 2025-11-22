"""
Agoraphobia Module for SCID-CV V2
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


class AgoraphobiaModule(BaseSCIDModule):
    """Agoraphobia Module for SCID-CV V2"""
    
    def create_module(self) -> SCIDModule:
        """Create Agoraphobia module"""
        disorder_id = "AGORAPHOBIA"
        dsm_criteria = self.get_dsm_criteria(disorder_id)
        
        questions = self._create_questions()
        
        module = SCIDModule(
            id=disorder_id,
            name="Agoraphobia",
            description="Assessment for Agoraphobia according to DSM-5 criteria",
            version="2.0.0",
            questions=questions,
            dsm_criteria=dsm_criteria,
            dsm_criteria_type=dsm_criteria.get("criteria_type", "hybrid"),
            minimum_criteria_count=dsm_criteria.get("minimum_criteria_count", 2),
            duration_requirement=dsm_criteria.get("duration_requirement", "At least 6 months"),
            diagnostic_threshold=0.6,
            severity_thresholds={"mild": 0.4, "moderate": 0.6, "severe": 0.8},
            deployment_criteria=self.get_deployment_criteria(),
            estimated_time_mins=15,
            min_questions=5,
            max_questions=12,
            category="anxiety_disorders",
            clinical_notes=dsm_criteria.get("clinical_notes", ""),
            created_date=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat(),
            author="SCID-CV V2 System"
        )
        
        return module
    
    def _create_questions(self) -> List[SCIDQuestion]:
        """Create Agoraphobia questions"""
        questions = []
        
        # AGO_01: Fear of situations (need 2+ of 5)
        questions.append(create_yes_no_question(
            question_id="AGO_01",
            sequence_number=1,
            simple_text="Do you fear or avoid being in situations where it might be hard to escape or get help?",
            help_text="Situations like crowds, open spaces, or being alone",
            examples=["Crowds", "Open spaces", "Public transportation", "Being alone"],
            clinical_text="Marked fear or anxiety about agoraphobic situations",
            dsm_criterion_id="AGO_A",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "AGO_END"}
        ))
        
        # AGO_02: Public transportation
        questions.append(create_yes_no_question(
            question_id="AGO_02",
            sequence_number=2,
            simple_text="Do you fear or avoid using public transportation like buses, trains, or planes?",
            help_text="Fear of being trapped or unable to escape",
            examples=["Buses", "Trains", "Planes", "Subways"],
            clinical_text="Using public transportation",
            dsm_criterion_id="AGO_A1",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AGO_03: Open spaces
        questions.append(create_yes_no_question(
            question_id="AGO_03",
            sequence_number=3,
            simple_text="Do you fear or avoid being in open spaces like parking lots or marketplaces?",
            help_text="Fear of open, exposed areas",
            examples=["Parking lots", "Marketplaces", "Bridges", "Open areas"],
            clinical_text="Being in open spaces",
            dsm_criterion_id="AGO_A2",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AGO_04: Enclosed places
        questions.append(create_yes_no_question(
            question_id="AGO_04",
            sequence_number=4,
            simple_text="Do you fear or avoid being in enclosed places like shops, theaters, or cinemas?",
            help_text="Fear of being trapped in enclosed spaces",
            examples=["Shops", "Theaters", "Cinemas", "Enclosed spaces"],
            clinical_text="Being in enclosed places",
            dsm_criterion_id="AGO_A3",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AGO_05: Crowds or lines
        questions.append(create_yes_no_question(
            question_id="AGO_05",
            sequence_number=5,
            simple_text="Do you fear or avoid standing in line or being in a crowd?",
            help_text="Fear of being trapped in crowds",
            examples=["Standing in line", "Crowds", "Waiting in queues", "Busy places"],
            clinical_text="Standing in line or being in a crowd",
            dsm_criterion_id="AGO_A4",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AGO_06: Being outside alone
        questions.append(create_yes_no_question(
            question_id="AGO_06",
            sequence_number=6,
            simple_text="Do you fear or avoid being outside of your home alone?",
            help_text="Fear of being away from home without a companion",
            examples=["Being outside alone", "Leaving home alone", "Being away from home"],
            clinical_text="Being outside of the home alone",
            dsm_criterion_id="AGO_A5",
            priority=2,
            dsm_criteria_required=False
        ))
        
        # AGO_07: Fear rationale
        questions.append(create_yes_no_question(
            question_id="AGO_07",
            sequence_number=7,
            simple_text="Do you fear these situations because you think escape might be difficult or help might not be available?",
            help_text="Worry about not being able to escape or get help",
            examples=["Worry about escape", "Fear of no help", "Worry about being trapped"],
            clinical_text="Fear that escape might be difficult or help might not be available",
            dsm_criterion_id="AGO_B",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "AGO_END"}
        ))
        
        # AGO_08: Duration
        questions.append(create_yes_no_question(
            question_id="AGO_08",
            sequence_number=8,
            simple_text="Have these fears or avoidance behaviors been present for at least 6 months?",
            help_text="Symptoms should last at least 6 months",
            examples=["Lasting 6+ months", "Persistent fears", "Long-term avoidance"],
            clinical_text="Persistent, typically lasting for 6 months or more",
            dsm_criterion_id="AGO_F",
            priority=1,
            dsm_criteria_required=True,
            skip_logic={"no": "AGO_END"}
        ))
        
        # AGO_09: Functional impairment
        questions.append(create_mcq_question(
            question_id="AGO_09",
            sequence_number=9,
            simple_text="How much do these fears or avoidance behaviors affect your daily life?",
            help_text="Impact on your ability to function",
            examples=["Can't go to work", "Avoiding social activities", "Daily life impact"],
            clinical_text="Clinically significant distress or impairment",
            dsm_criterion_id="AGO_G",
            option_set_name="impact",
            priority=2,
            dsm_criteria_required=False
        ))
        
        return questions
    
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for Agoraphobia module"""
        return ModuleDeploymentCriteria(
            use_when=[
                "Patient reports fear or avoidance of agoraphobic situations",
                "Fear of 2+ situations (public transportation, open spaces, enclosed places, crowds, being outside alone)",
                "Fear that escape might be difficult or help might not be available",
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


def create_agoraphobia_module() -> SCIDModule:
    """Create Agoraphobia module"""
    module_creator = AgoraphobiaModule()
    return module_creator.create_module()

