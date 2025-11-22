"""
Question Router for SCID-CV V2
Intelligently routes to next question based on responses and DSM criteria
"""

import logging
from typing import Dict, List, Any, Optional, Set
from ..base_types import SCIDQuestion, SCIDModule, ProcessedResponse

logger = logging.getLogger(__name__)


class QuestionRouter:
    """Intelligent question routing system"""
    
    def get_next_question(
        self,
        current_question: SCIDQuestion,
        processed_response: ProcessedResponse,
        module: SCIDModule,
        answered_questions: Set[str],
        dsm_criteria_status: Dict[str, bool],
        conversation_history: List[Dict[str, str]],
        session_responses: Optional[Dict[str, Any]] = None
    ) -> Optional[SCIDQuestion]:
        """
        Get next question based on routing logic.
        
        Routing Priority:
        1. Skip logic (if response triggers skip)
        2. Follow-up questions (if parent question answered "yes")
        3. Priority-based (critical questions first)
        4. DSM criteria optimization (skip if criteria already met/not possible)
        5. Sequential (default order)
        
        Args:
            current_question: Current question that was just answered
            processed_response: Processed response from user
            module: The SCID module being administered
            answered_questions: Set of question IDs that have been answered
            dsm_criteria_status: Current DSM criteria status
            conversation_history: Conversation history
        
        Returns:
            Next question to ask, or None if assessment is complete
        """
        try:
            # 1. Check skip logic
            skip_question = self._apply_skip_logic(
                current_question=current_question,
                processed_response=processed_response,
                module=module,
                answered_questions=answered_questions
            )
            if skip_question:
                return skip_question
            
            # 2. Check follow-up questions
            follow_up_questions = self._get_follow_up_questions(
                current_question=current_question,
                processed_response=processed_response,
                module=module,
                answered_questions=answered_questions
            )
            if follow_up_questions:
                # Return first unanswered follow-up question
                for follow_up in follow_up_questions:
                    if follow_up.id not in answered_questions:
                        return follow_up
            
            # 3. Get next question based on priority and DSM criteria optimization
            next_question = self._get_next_priority_question(
                module=module,
                answered_questions=answered_questions,
                dsm_criteria_status=dsm_criteria_status,
                current_question=current_question,
                session_responses=session_responses
            )
            
            return next_question
            
        except Exception as e:
            logger.error(f"Error routing to next question: {e}")
            # Fallback to sequential routing
            return self._get_next_sequential_question(
                module=module,
                answered_questions=answered_questions,
                current_question=current_question
            )
    
    def _apply_skip_logic(
        self,
        current_question: SCIDQuestion,
        processed_response: ProcessedResponse,
        module: SCIDModule,
        answered_questions: Set[str]
    ) -> Optional[SCIDQuestion]:
        """Apply skip logic based on response"""
        if not current_question.skip_logic:
            return None
        
        selected_option = processed_response.selected_option
        if not selected_option:
            return None
        
        # Check if response matches skip logic
        selected_option_lower = selected_option.lower()
        for response_pattern, next_question_id in current_question.skip_logic.items():
            if response_pattern.lower() in selected_option_lower or selected_option_lower in response_pattern.lower():
                next_question = module.get_question_by_id(next_question_id)
                if next_question and next_question.id not in answered_questions:
                    logger.info(f"Skip logic: {current_question.id} -> {next_question_id}")
                    return next_question
        
        return None
    
    def _get_follow_up_questions(
        self,
        current_question: SCIDQuestion,
        processed_response: ProcessedResponse,
        module: SCIDModule,
        answered_questions: Set[str]
    ) -> List[SCIDQuestion]:
        """Get follow-up questions if parent question answered positively"""
        if not current_question.follow_up_questions:
            return []
        
        # Check if response is positive (triggers follow-ups)
        selected_option = processed_response.selected_option
        raw_response = processed_response.raw_response.lower() if processed_response.raw_response else ""
        
        # Enhanced positive response detection
        positive_responses = ["yes", "sometimes", "option 1", "option 2", "y", "true", "1"]
        is_positive = False
        
        if selected_option:
            is_positive = selected_option.lower() in [r.lower() for r in positive_responses]
        
        # Also check raw response for natural language
        if not is_positive and raw_response:
            positive_keywords = ["yes", "have", "do", "did", "sometimes", "occasionally", "often"]
            negative_keywords = ["no", "never", "none", "not", "don't", "didn't", "haven't"]
            
            # Check for positive keywords without negative keywords
            has_positive = any(keyword in raw_response for keyword in positive_keywords)
            has_negative = any(keyword in raw_response for keyword in negative_keywords)
            
            if has_positive and not has_negative:
                is_positive = True
        
        if not is_positive:
            return []
        
        # Get follow-up questions
        follow_up_questions = []
        for follow_up_id in current_question.follow_up_questions:
            follow_up = module.get_question_by_id(follow_up_id)
            if follow_up and follow_up.id not in answered_questions:
                follow_up_questions.append(follow_up)
        
        return follow_up_questions
    
    def _get_next_priority_question(
        self,
        module: SCIDModule,
        answered_questions: Set[str],
        dsm_criteria_status: Dict[str, bool],
        current_question: SCIDQuestion,
        session_responses: Optional[Dict[str, Any]] = None
    ) -> Optional[SCIDQuestion]:
        """Get next question based on priority and DSM criteria optimization"""
        
        # Get unanswered questions
        unanswered_questions = [
            q for q in module.questions
            if q.id not in answered_questions
        ]
        
        if not unanswered_questions:
            return None
        
        # Module-specific optimizations
        module_id = module.id.upper()
        
        # Separate required and optional questions
        required_unanswered = [q for q in unanswered_questions if q.required]
        optional_unanswered = [q for q in unanswered_questions if not q.required]
        
        # Always prioritize required questions
        if required_unanswered:
            # Sort required by priority and sequence
            required_unanswered.sort(key=lambda q: (q.priority, q.sequence_number))
            
            # Check if we should ask any required question
            for question in required_unanswered:
                if self._should_ask_question(question, dsm_criteria_status, module, session_responses):
                    return question
        
        # If all required answered, check optional questions
        # But only if we haven't met min_questions threshold
        min_questions = module.min_questions or 1
        total_answered = len(answered_questions)
        
        if total_answered < min_questions and optional_unanswered:
            # Sort optional by priority and sequence
            optional_unanswered.sort(key=lambda q: (q.priority, q.sequence_number))
            
            # Check if we should ask optional questions
            for question in optional_unanswered:
                if self._should_ask_question(question, dsm_criteria_status, module, session_responses):
                    return question
        
        # Fallback: return first unanswered required question, or first optional if no required
        if required_unanswered:
            return required_unanswered[0]
        elif optional_unanswered and total_answered < min_questions:
            return optional_unanswered[0]
        
        return None
    
    def _should_ask_question(
        self,
        question: SCIDQuestion,
        dsm_criteria_status: Dict[str, bool],
        module: SCIDModule,
        session_responses: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Determine if question should be asked based on DSM criteria status and module-specific logic"""
        
        # Always ask critical questions (safety questions)
        if question.priority == 1:
            return True
        
        # Module-specific optimizations
        module_id = module.id.upper()
        
        # RISK_ASSESSMENT: Enhanced routing logic
        if module_id == "RISK_ASSESSMENT":
            # Skip optional questions (like RISK_06) if all critical questions answered with "no"
            if question.priority > 1 and not question.required:
                # Get critical questions (RISK_01 through RISK_05)
                critical_question_ids = ["RISK_01", "RISK_02", "RISK_03", "RISK_04", "RISK_05"]
                critical_questions = [q for q in module.questions if q.id in critical_question_ids]
                
                # Check if we have responses for critical questions
                if session_responses:
                    low_risk_count = 0
                    answered_critical_count = 0
                    
                    for crit_q_id in critical_question_ids:
                        if crit_q_id in session_responses:
                            answered_critical_count += 1
                            response_data = session_responses.get(crit_q_id, {})
                            
                            # Check response value
                            response_value = str(response_data.get('response', '')).lower()
                            selected_option = str(response_data.get('processed', {}).get('selected_option', '')).lower()
                            
                            # Check if response indicates low risk
                            low_risk_indicators = ["no", "none", "never", "n", "false", "0", "not"]
                            if (selected_option in low_risk_indicators or 
                                any(indicator in response_value for indicator in low_risk_indicators)):
                                low_risk_count += 1
                    
                    # If all answered critical questions indicate low risk, skip optional questions
                    if answered_critical_count >= 3 and low_risk_count == answered_critical_count:
                        logger.info(f"Skipping optional question {question.id} - all critical questions indicate low risk")
                        return False
            
            # Skip RISK_02 and RISK_03 if RISK_01 is "no" (no suicidal ideation)
            if question.id in ["RISK_02", "RISK_03"] and session_responses:
                risk_01_response = session_responses.get("RISK_01", {})
                response_value = str(risk_01_response.get('response', '')).lower()
                selected_option = str(risk_01_response.get('processed', {}).get('selected_option', '')).lower()
                
                low_risk_indicators = ["no", "none", "never", "n", "false", "0", "not"]
                if (selected_option in low_risk_indicators or 
                    any(indicator in response_value for indicator in low_risk_indicators)):
                    # RISK_01 is "no", so skip RISK_02 and RISK_03 (plan and intent)
                    logger.info(f"Skipping {question.id} - RISK_01 indicates no suicidal ideation")
                    return False
        
        # CONCERN: Skip optional questions if core info collected
        if module_id == "CONCERN":
            # If we have primary concern, onset, duration, severity, and impact, skip optional details
            if question.priority >= 3 and not question.required:
                core_question_ids = ["CONCERN_01", "CONCERN_02", "CONCERN_03", "CONCERN_04", "CONCERN_08"]
                # Check both dsm_criteria_status and session_responses
                core_answered_dsm = sum(1 for qid in core_question_ids if qid in dsm_criteria_status)
                
                # Also check session_responses if available
                if session_responses:
                    core_answered_responses = sum(1 for qid in core_question_ids 
                                                 if qid in session_responses)
                    core_answered = max(core_answered_dsm, core_answered_responses)
                else:
                    core_answered = core_answered_dsm
                
                if core_answered >= 4:  # At least 4 of 5 core questions answered
                    # Skip optional questions if core info is sufficient
                    return False
        
        # Check if criterion is already determined
        if question.dsm_criterion_id:
            criterion_status = dsm_criteria_status.get(question.dsm_criterion_id)
            
            # If criterion is already met and we have enough criteria, skip
            if criterion_status is True:
                # Check if we have enough criteria for diagnosis
                met_criteria_count = sum(1 for v in dsm_criteria_status.values() if v is True)
                if met_criteria_count >= (module.minimum_criteria_count or 5):
                    # Skip optional questions if we have enough criteria
                    if question.dsm_criteria_optional and not question.dsm_criteria_required:
                        return False
        
        return True
    
    def _get_next_sequential_question(
        self,
        module: SCIDModule,
        answered_questions: Set[str],
        current_question: SCIDQuestion
    ) -> Optional[SCIDQuestion]:
        """Get next question in sequence order (fallback)"""
        unanswered_questions = [
            q for q in module.questions
            if q.id not in answered_questions
        ]
        
        if not unanswered_questions:
            return None
        
        # Sort by sequence number
        unanswered_questions.sort(key=lambda q: q.sequence_number)
        
        return unanswered_questions[0]

