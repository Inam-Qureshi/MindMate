"""
Question formatter for SCID-CV V2
Formats questions for frontend display (user-facing only)
"""

from typing import Dict, Any, Optional
from ..base_types import SCIDQuestion, ResponseType


class QuestionFormatter:
    """Formats questions for frontend display"""
    
    @staticmethod
    def format_question_for_frontend(
        question: SCIDQuestion,
        question_number: int,
        total_questions: int,
        progress_percentage: float = 0.0,
        estimated_time_remaining: int = 0
    ) -> Dict[str, Any]:
        """
        Format question for frontend display.
        
        Args:
            question: SCID question
            question_number: Current question number (1-based)
            total_questions: Total number of questions
            progress_percentage: Progress percentage (0-100)
            estimated_time_remaining: Estimated time remaining in seconds
        
        Returns:
            Formatted question dict for frontend
        """
        formatted = {
            "question_id": question.id,
            "question_number": question_number,
            "total_questions": total_questions,
            "progress_percentage": progress_percentage,
            "estimated_time_remaining": estimated_time_remaining,
            "question_text": question.simple_text,
            "help_text": question.help_text if question.help_text else None,
            "examples": question.examples if question.examples else [],
            "response_type": question.response_type.value,
            "accepts_free_text": question.accepts_free_text,
            "free_text_prompt": question.free_text_prompt if question.accepts_free_text else None,
        }
        
        # Add response-specific fields
        if question.response_type == ResponseType.MULTIPLE_CHOICE:
            formatted["options"] = question.options
        elif question.response_type == ResponseType.SCALE:
            formatted["scale_range"] = question.scale_range
            formatted["scale_labels"] = question.scale_labels
        
        # Note: We do NOT include:
        # - clinical_text (backend only)
        # - dsm_criterion_id (backend only)
        # - criteria_weight (backend only)
        # - dsm_criteria_required (backend only)
        # - skip_logic (backend only)
        # - priority (backend only)
        
        return formatted
    
    @staticmethod
    def format_progress_info(
        current_question: int,
        total_questions: int,
        answered_questions: int,
        estimated_time_remaining: int = 0
    ) -> Dict[str, Any]:
        """
        Format progress information for frontend.
        
        Args:
            current_question: Current question number (1-based)
            total_questions: Total number of questions
            answered_questions: Number of answered questions
            estimated_time_remaining: Estimated time remaining in seconds
        
        Returns:
            Progress info dict
        """
        progress_percentage = (answered_questions / total_questions * 100) if total_questions > 0 else 0
        
        return {
            "current_question": current_question,
            "total_questions": total_questions,
            "answered_questions": answered_questions,
            "progress_percentage": round(progress_percentage, 1),
            "estimated_time_remaining": estimated_time_remaining,
            "estimated_time_remaining_minutes": round(estimated_time_remaining / 60, 1) if estimated_time_remaining > 0 else 0
        }

