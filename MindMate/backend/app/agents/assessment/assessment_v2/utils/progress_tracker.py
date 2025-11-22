"""
Progress tracker for SCID-CV V2
Tracks assessment progress and timing
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional
from ..base_types import SCIDQuestion, ProcessedResponse

logger = logging.getLogger(__name__)


class ProgressTracker:
    """Tracks assessment progress and timing"""
    
    def __init__(self, total_questions: int = 0):
        """
        Initialize progress tracker.
        
        Args:
            total_questions: Total number of questions in assessment
        """
        self.total_questions = total_questions
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.answered_questions: Set[str] = set()
        self.question_times: Dict[str, datetime] = {}
        self.responses: List[ProcessedResponse] = []
    
    def start_assessment(self):
        """Start assessment tracking"""
        self.start_time = datetime.now()
        logger.info(f"Assessment started at {self.start_time}")
    
    def end_assessment(self):
        """End assessment tracking"""
        self.end_time = datetime.now()
        logger.info(f"Assessment ended at {self.end_time}")
    
    def record_response(self, question_id: str, response: ProcessedResponse):
        """
        Record a response to a question.
        
        Args:
            question_id: Question ID
            response: Processed response
        """
        self.answered_questions.add(question_id)
        self.question_times[question_id] = datetime.now()
        self.responses.append(response)
        logger.debug(f"Recorded response for question {question_id}")
    
    def get_progress(self) -> Dict[str, any]:
        """
        Get current progress information.
        
        Returns:
            Progress information dict
        """
        answered_count = len(self.answered_questions)
        progress_percentage = (answered_count / self.total_questions * 100) if self.total_questions > 0 else 0
        
        # Calculate estimated time remaining
        estimated_time_remaining = 0
        if self.start_time and answered_count > 0:
            elapsed_time = datetime.now() - self.start_time
            avg_time_per_question = elapsed_time.total_seconds() / answered_count
            remaining_questions = self.total_questions - answered_count
            estimated_time_remaining = int(avg_time_per_question * remaining_questions)
        
        return {
            "answered_questions": answered_count,
            "total_questions": self.total_questions,
            "remaining_questions": self.total_questions - answered_count,
            "progress_percentage": round(progress_percentage, 1),
            "estimated_time_remaining": estimated_time_remaining,
            "estimated_time_remaining_minutes": round(estimated_time_remaining / 60, 1) if estimated_time_remaining > 0 else 0,
            "elapsed_time": (datetime.now() - self.start_time).total_seconds() if self.start_time else 0,
            "elapsed_time_minutes": round((datetime.now() - self.start_time).total_seconds() / 60, 1) if self.start_time else 0
        }
    
    def get_assessment_duration(self) -> Optional[float]:
        """
        Get total assessment duration in seconds.
        
        Returns:
            Duration in seconds, or None if assessment not completed
        """
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return None
    
    def is_complete(self) -> bool:
        """Check if assessment is complete"""
        return len(self.answered_questions) >= self.total_questions
    
    def get_answered_question_ids(self) -> Set[str]:
        """Get set of answered question IDs"""
        return self.answered_questions.copy()

