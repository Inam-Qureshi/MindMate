"""
Module Deployer for SCID-CV V2
Handles deployment and administration of SCID-CV modules with new routing system
"""

import logging
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from ..base_types import SCIDModule, SCIDQuestion, ProcessedResponse, ModuleResult
from ..core.response_processor import GlobalResponseProcessor
from ..core.question_router import QuestionRouter
from ..core.question_prioritizer import QuestionPrioritizer
from ..core.dsm_criteria_engine import DSMCriteriaEngine
from ..utils.question_formatter import QuestionFormatter
from ..utils.progress_tracker import ProgressTracker

logger = logging.getLogger(__name__)


class SCIDCV2ModuleDeployer:
    """
    Deploys and administers SCID-CV V2 modules with intelligent routing and LLM-based response processing.
    
    Features:
    - Global response processor for free text + options
    - Intelligent question routing with skip logic and follow-ups
    - DSM criteria tracking (backend only)
    - Progress tracking and time estimation
    - Question prioritization (safety first)
    """
    
    def __init__(self, module: Optional[SCIDModule] = None):
        """
        Initialize module deployer.
        
        Args:
            module: SCID module to deploy (if None, must be set later)
        """
        self.module = module
        self.response_processor = GlobalResponseProcessor()
        self.question_router = QuestionRouter()
        self.question_prioritizer = QuestionPrioritizer()
        self.dsm_criteria_engine = DSMCriteriaEngine()
        self.question_formatter = QuestionFormatter()
        self.progress_tracker = ProgressTracker()
        
        # Assessment state
        self.current_question: Optional[SCIDQuestion] = None
        self.answered_questions: Set[str] = set()
        self.conversation_history: List[Dict[str, str]] = []
        self.responses: List[ProcessedResponse] = []
        self.dsm_criteria_status: Dict[str, bool] = {}
        self.start_time: Optional[datetime] = None
        
        # Safety flag
        self.safety_alert_triggered = False
    
    def start_assessment(self, module: Optional[SCIDModule] = None) -> Dict[str, Any]:
        """
        Start assessment with module.
        
        Args:
            module: SCID module to deploy (if not provided, uses self.module)
        
        Returns:
            First question formatted for frontend
        """
        if module:
            self.module = module
        
        if not self.module:
            raise ValueError("Module must be provided")
        
        # Initialize state
        self.answered_questions = set()
        self.conversation_history = []
        self.responses = []
        self.dsm_criteria_status = {}
        self.start_time = datetime.now()
        self.safety_alert_triggered = False
        
        # Initialize progress tracker
        self.progress_tracker = ProgressTracker(total_questions=len(self.module.questions))
        self.progress_tracker.start_assessment()
        
        # Get first question (prioritized)
        prioritized_questions = self.question_prioritizer.prioritize_questions(
            questions=self.module.questions,
            dsm_criteria=self.module.dsm_criteria,
            module_metadata={}
        )
        
        if not prioritized_questions:
            raise ValueError("Module has no questions")
        
        self.current_question = prioritized_questions[0]
        
        # Format first question for frontend
        return self.get_current_question_for_frontend()
    
    def get_current_question_for_frontend(self) -> Dict[str, Any]:
        """
        Get current question formatted for frontend.
        
        Returns:
            Formatted question dict for frontend
        """
        if not self.current_question:
            return {
                "question": None,
                "assessment_complete": True,
                "message": "Assessment complete"
            }
        
        progress = self.progress_tracker.get_progress()
        
        # Format question
        question_data = self.question_formatter.format_question_for_frontend(
            question=self.current_question,
            question_number=len(self.answered_questions) + 1,
            total_questions=self.progress_tracker.total_questions,
            progress_percentage=progress["progress_percentage"],
            estimated_time_remaining=progress["estimated_time_remaining"]
        )
        
        return {
            "question": question_data,
            "progress": progress,
            "assessment_complete": False,
            "safety_alert": self.safety_alert_triggered
        }
    
    def process_response(self, user_response: str) -> Dict[str, Any]:
        """
        Process user response and get next question.
        
        Args:
            user_response: User's free text response
        
        Returns:
            Dict with next question, results, or completion status
        """
        if not self.current_question:
            return {
                "error": "No current question",
                "assessment_complete": True
            }
        
        try:
            # Process response using global response processor
            processed_response = self.response_processor.process_response(
                user_response=user_response,
                question=self.current_question,
                conversation_history=self.conversation_history,
                dsm_criteria_context=self.module.dsm_criteria
            )
            
            # Update conversation history
            self.conversation_history.append({
                "role": "user",
                "content": user_response
            })
            
            # Check for safety alerts (suicidal thoughts, etc.)
            if self._check_safety_alert(processed_response):
                self.safety_alert_triggered = True
                # Continue assessment but flag safety concern
            
            # Update DSM criteria status
            self.dsm_criteria_status = self.dsm_criteria_engine.update_criteria_status(
                question_id=self.current_question.id,
                processed_response=processed_response,
                module_id=self.module.id,
                dsm_criteria=self.module.dsm_criteria
            )
            
            # Record response
            self.responses.append(processed_response)
            self.progress_tracker.record_response(self.current_question.id, processed_response)
            self.answered_questions.add(self.current_question.id)
            
            # Check if assessment can stop early
            can_stop, reason = self.dsm_criteria_engine.can_stop_early(
                criteria_status=self.dsm_criteria_status,
                dsm_criteria=self.module.dsm_criteria,
                module_id=self.module.id
            )
            
            if can_stop and len(self.answered_questions) >= self.module.min_questions:
                # Assessment can stop early
                return self._complete_assessment(reason=reason)
            
            # Get next question using router
            next_question = self.question_router.get_next_question(
                current_question=self.current_question,
                processed_response=processed_response,
                module=self.module,
                answered_questions=self.answered_questions,
                dsm_criteria_status=self.dsm_criteria_status,
                conversation_history=self.conversation_history
            )
            
            if not next_question:
                # No more questions
                return self._complete_assessment(reason="All questions answered")
            
            # Update current question
            self.current_question = next_question
            
            # Return next question
            return self.get_current_question_for_frontend()
            
        except Exception as e:
            logger.error(f"Error processing response: {e}")
            return {
                "error": str(e),
                "assessment_complete": False,
                "current_question": self.get_current_question_for_frontend() if self.current_question else None
            }
    
    def _check_safety_alert(self, processed_response: ProcessedResponse) -> bool:
        """Check if response triggers safety alert"""
        # Check for suicidal thoughts or self-harm
        if "suicide" in processed_response.raw_response.lower():
            return True
        if "hurt myself" in processed_response.raw_response.lower():
            return True
        if "kill myself" in processed_response.raw_response.lower():
            return True
        
        # Check DSM criteria mapping for suicidal ideation
        if processed_response.dsm_criteria_mapping.get("MDD_C3", False):
            return True
        
        return False
    
    def _complete_assessment(self, reason: str = "Assessment complete") -> Dict[str, Any]:
        """Complete assessment and return results"""
        self.progress_tracker.end_assessment()
        
        # Calculate results
        criteria_summary = self.dsm_criteria_engine.get_criteria_summary(
            criteria_status=self.dsm_criteria_status,
            dsm_criteria=self.module.dsm_criteria
        )
        
        diagnosis_possible, diagnosis_reason = self.dsm_criteria_engine.check_diagnosis_possible(
            criteria_status=self.dsm_criteria_status,
            dsm_criteria=self.module.dsm_criteria
        )
        
        # Create module result
        module_result = ModuleResult(
            module_id=self.module.id,
            module_name=self.module.name,
            total_score=criteria_summary.get("met_count", 0),
            max_possible_score=self.module.minimum_criteria_count or 5,
            percentage_score=criteria_summary.get("progress_percentage", 0),
            criteria_met=criteria_summary.get("criteria_met", False),
            severity_level=self._determine_severity(criteria_summary),
            responses=self.responses,
            administration_time_mins=int(self.progress_tracker.get_assessment_duration() or 0) // 60,
            completion_date=datetime.now(),
            notes=reason,
            dsm_criteria_status=self.dsm_criteria_status,
            diagnosis_possible=diagnosis_possible,
            diagnosis_not_possible=not diagnosis_possible and len(self.answered_questions) >= self.module.min_questions
        )
        
        return {
            "assessment_complete": True,
            "reason": reason,
            "result": {
                "module_id": module_result.module_id,
                "module_name": module_result.module_name,
                "criteria_met": module_result.criteria_met,
                "diagnosis_possible": module_result.diagnosis_possible,
                "severity_level": module_result.severity_level,
                "criteria_summary": criteria_summary,
                "total_questions_answered": len(self.answered_questions),
                "administration_time_mins": module_result.administration_time_mins
            },
            "safety_alert": self.safety_alert_triggered,
            "progress": self.progress_tracker.get_progress()
        }
    
    def _determine_severity(self, criteria_summary: Dict[str, Any]) -> Optional[str]:
        """Determine severity level based on criteria summary"""
        met_count = criteria_summary.get("met_count", 0)
        minimum_required = criteria_summary.get("minimum_required", 5)
        
        if met_count >= minimum_required + 3:
            return "severe"
        elif met_count >= minimum_required + 1:
            return "moderate"
        elif met_count >= minimum_required:
            return "mild"
        else:
            return None
    
    def get_progress(self) -> Dict[str, Any]:
        """Get current assessment progress"""
        return self.progress_tracker.get_progress()
    
    def get_criteria_status(self) -> Dict[str, Any]:
        """Get current DSM criteria status (backend only)"""
        return {
            "criteria_status": self.dsm_criteria_status,
            "criteria_summary": self.dsm_criteria_engine.get_criteria_summary(
                criteria_status=self.dsm_criteria_status,
                dsm_criteria=self.module.dsm_criteria if self.module else {}
            )
        }

