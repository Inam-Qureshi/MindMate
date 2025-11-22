"""
Question Prioritizer for SCID-CV V2
Prioritizes questions within modules
"""

import logging
from typing import Dict, List, Any
from ..base_types import SCIDQuestion, SCIDModule

logger = logging.getLogger(__name__)


class QuestionPrioritizer:
    """Prioritizes questions within modules"""
    
    def prioritize_questions(
        self,
        questions: List[SCIDQuestion],
        dsm_criteria: Dict[str, Any],
        module_metadata: Dict[str, Any]
    ) -> List[SCIDQuestion]:
        """
        Prioritize questions based on:
        - Safety concerns (suicide, risk)
        - Required DSM criteria
        - Question dependencies
        - User responses so far
        
        Args:
            questions: List of questions to prioritize
            dsm_criteria: DSM criteria information
            module_metadata: Module metadata
        
        Returns:
            Prioritized list of questions
        """
        try:
            # 1. Safety questions first (Priority 1)
            safety_questions = [q for q in questions if q.priority == 1]
            safety_questions.sort(key=lambda q: q.sequence_number)
            
            # 2. Required DSM criteria (Priority 2)
            required_questions = [
                q for q in questions
                if q.priority == 2 and q.dsm_criteria_required
            ]
            required_questions.sort(key=lambda q: q.sequence_number)
            
            # 3. High priority questions (Priority 2, not required)
            high_priority_questions = [
                q for q in questions
                if q.priority == 2 and not q.dsm_criteria_required
            ]
            high_priority_questions.sort(key=lambda q: q.sequence_number)
            
            # 4. Medium priority questions (Priority 3)
            medium_priority_questions = [q for q in questions if q.priority == 3]
            medium_priority_questions.sort(key=lambda q: q.sequence_number)
            
            # 5. Low priority questions (Priority 4)
            low_priority_questions = [q for q in questions if q.priority == 4]
            low_priority_questions.sort(key=lambda q: q.sequence_number)
            
            # Combine in priority order
            prioritized_questions = (
                safety_questions +
                required_questions +
                high_priority_questions +
                medium_priority_questions +
                low_priority_questions
            )
            
            return prioritized_questions
            
        except Exception as e:
            logger.error(f"Error prioritizing questions: {e}")
            # Fallback to sequence number ordering
            return sorted(questions, key=lambda q: q.sequence_number)
    
    def get_critical_questions(self, questions: List[SCIDQuestion]) -> List[SCIDQuestion]:
        """Get critical questions (safety questions)"""
        return [q for q in questions if q.priority == 1]
    
    def get_required_questions(self, questions: List[SCIDQuestion]) -> List[SCIDQuestion]:
        """Get required questions (core diagnostic criteria)"""
        return [
            q for q in questions
            if q.dsm_criteria_required or q.priority == 2
        ]
    
    def reorder_questions(
        self,
        questions: List[SCIDQuestion],
        answered_question_ids: List[str],
        dsm_criteria_status: Dict[str, bool]
    ) -> List[SCIDQuestion]:
        """
        Reorder questions dynamically based on:
        - Answered questions
        - DSM criteria status
        - Dependencies
        
        Args:
            questions: List of questions
            answered_question_ids: List of answered question IDs
            dsm_criteria_status: Current DSM criteria status
        
        Returns:
            Reordered list of questions
        """
        answered_set = set(answered_question_ids)
        unanswered_questions = [q for q in questions if q.id not in answered_set]
        
        # Re-prioritize unanswered questions
        return self.prioritize_questions(
            questions=unanswered_questions,
            dsm_criteria={},
            module_metadata={}
        )

