"""
Global Response Processor Node for SCID-CV V2
Centralized response processing for all SCID-CV modules
Integrated with continuous SRA service for symptom extraction
"""

import logging
from typing import Dict, List, Any, Optional
from ..base_types import SCIDQuestion, ProcessedResponse, ResponseType
from .llm_response_parser import LLMResponseParser
from .sra_service import get_sra_service, SRAService

logger = logging.getLogger(__name__)


class GlobalResponseProcessor:
    """Global node for processing all SCID-CV responses"""
    
    def __init__(self, llm_parser: Optional[LLMResponseParser] = None, sra_service: Optional[SRAService] = None):
        """
        Initialize global response processor.
        
        Args:
            llm_parser: LLM response parser instance (if None, creates new one)
            sra_service: SRA service instance (if None, creates new one)
        """
        self.llm_parser = llm_parser or LLMResponseParser()
        self.sra_service = sra_service or get_sra_service()
    
    def process_response(
        self,
        user_response: str,
        question: SCIDQuestion,
        conversation_history: List[Dict[str, str]],
        dsm_criteria_context: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
        **kwargs
    ) -> ProcessedResponse:
        """
        Process user response (free text + options).
        
        Args:
            user_response: User's response (free text, may include option selection)
            question: The question being answered
            conversation_history: Previous conversation history
            dsm_criteria_context: Context about DSM criteria (optional)
        
        Returns:
            ProcessedResponse with:
            - selected_option: str (if MCQ) or None
            - extracted_fields: Dict[str, Any] (duration, severity, etc.)
            - confidence: float (0.0-1.0)
            - dsm_criteria_mapping: Dict[str, bool] (which criteria met)
            - next_question_hint: Optional[str] (suggested next question)
        """
        try:
            # Handle empty or whitespace-only responses
            if not user_response or not user_response.strip():
                return ProcessedResponse(
                    selected_option=None,
                    extracted_fields={},
                    confidence=0.0,
                    dsm_criteria_mapping={},
                    validation={
                        "is_valid": False,
                        "needs_clarification": True,
                        "suggested_clarification": "Please provide a response to continue."
                    },
                    raw_response=user_response or ""
                )
            
            # Normalize response
            user_response = user_response.strip()
            
            # LLM-FIRST APPROACH: Try LLM extraction first for all responses
            # This provides better accuracy and handles edge cases naturally
            try:
                # Get module context if available (for comprehensive prompts)
                module = kwargs.get("module") if "module" in kwargs else None
                
                processed = self.llm_parser.parse_response(
                    user_response=user_response,
                    question=question,
                    conversation_history=conversation_history,
                    dsm_criteria_context=dsm_criteria_context,
                    module=module
                )
                
                # Normalize selected_option BEFORE validation (for consistent storage/comparison)
                if processed.selected_option is not None:
                    if question.response_type == ResponseType.YES_NO:
                        processed.selected_option = str(processed.selected_option).lower().strip()
                    elif question.response_type == ResponseType.TEXT:
                        processed.selected_option = str(processed.selected_option).lower().strip()
                
                # Validate and enhance the processed response
                processed = self._validate_processed_response(processed, question)
                
                # Check if LLM extraction was successful (high confidence or valid option)
                llm_success = (
                    processed.confidence >= 0.6 and processed.selected_option is not None  # Good confidence with option
                ) or (
                    processed.selected_option is not None and 
                    processed.selected_option in (question.options or [])  # Valid option matched
                ) or (
                    processed.confidence >= 0.8  # Very high confidence even if None (for ambiguous)
                )
                
                if llm_success:
                    logger.debug(f"LLM extraction successful: {processed.selected_option} (confidence: {processed.confidence:.2f})")
                    # Process through SRA service for symptom extraction
                    self._process_sra_if_needed(session_id, user_response, question, processed, conversation_history)
                    return processed
                else:
                    logger.debug(f"LLM extraction had low confidence or no option (confidence: {processed.confidence:.2f}, option: {processed.selected_option}), trying rule-based fallback")
                    # Fall through to rule-based fallback
                    
            except Exception as e:
                logger.warning(f"LLM parsing error: {e}, falling back to rule-based")
                processed = None  # Ensure processed is defined
                # Fall through to rule-based fallback
            
            # RULE-BASED FALLBACK: More aggressive - try for any response if LLM failed
            # Check if response can be parsed with rule-based logic
            option_selection = self._extract_option_selection(user_response, question)
            
            # Try rule-based if:
            # 1. We have an option selection, OR
            # 2. It's a simple response (short, clear), OR
            # 3. LLM returned None with low confidence (if processed exists)
            should_try_rule_based = (
                option_selection is not None or
                self._is_simple_option_response(user_response, question) or
                ('processed' in locals() and processed and processed.selected_option is None and processed.confidence < 0.6)
            )
            
            if should_try_rule_based:
                if option_selection:
                    logger.debug(f"Using rule-based parsing: {option_selection}")
                    processed = self._process_option_response(
                        user_response=user_response,
                        question=question,
                        selected_option=option_selection
                    )
                    # Mark as rule-based with good confidence if it's a clear match
                    if option_selection in (question.options or []):
                        processed.confidence = 0.85  # Good confidence for clear rule-based match
                    else:
                        processed.confidence = min(processed.confidence or 0.7, 0.75)  # Moderate confidence
                    processed = self._validate_processed_response(processed, question)
                    # Process through SRA service
                    self._process_sra_if_needed(session_id, user_response, question, processed, conversation_history)
                    return processed
                elif question.response_type == ResponseType.YES_NO:
                    # Try yes/no parsing for yes/no questions
                    from ..utils.question_utils import ResponseParser
                    parser = ResponseParser()
                    yes_no_result, confidence = parser.parse_yes_no(user_response)
                    if yes_no_result is not None:
                        # Normalize to lowercase
                        yes_no_result = str(yes_no_result).lower().strip()
                        if yes_no_result not in ["yes", "no", "sometimes"]:
                            # Try to infer
                            if "no" in yes_no_result or "not" in yes_no_result:
                                yes_no_result = "no"
                            elif "yes" in yes_no_result:
                                yes_no_result = "yes"
                            else:
                                yes_no_result = None
                        
                        if yes_no_result:
                            logger.debug(f"Using rule-based yes/no parsing: {yes_no_result}")
                            processed = ProcessedResponse(
                                selected_option=yes_no_result,  # Already lowercase
                                extracted_fields={},
                                confidence=confidence or 0.8,
                                dsm_criteria_mapping={},
                                validation={"is_valid": True, "needs_clarification": False},
                                raw_response=user_response
                            )
                            processed = self._validate_processed_response(processed, question)
                            self._process_sra_if_needed(session_id, user_response, question, processed, conversation_history)
                            return processed
            
            # If we get here, both LLM and rule-based failed
            # Return the LLM result even if low confidence (better than nothing)
            if 'processed' in locals() and processed:
                logger.debug("Returning LLM result despite low confidence")
                # Process through SRA service
                self._process_sra_if_needed(session_id, user_response, question, processed, conversation_history)
                return processed
            
            # Final fallback: return error response
            logger.error("Both LLM and rule-based parsing failed")
            fallback_response = ProcessedResponse(
                selected_option=None,
                extracted_fields={},
                confidence=0.0,
                dsm_criteria_mapping={},
                validation={
                    "is_valid": False,
                    "needs_clarification": True,
                    "suggested_clarification": "Could you please rephrase your response?"
                },
                free_text_analysis={"error": "Parsing failed", "processing_failed": True},
                raw_response=user_response
            )
            return fallback_response
            
        except Exception as e:
            logger.error(f"Error processing response: {e}", exc_info=True)
            # Return fallback response
            return ProcessedResponse(
                selected_option=None,
                extracted_fields={},
                confidence=0.3,
                dsm_criteria_mapping={},
                validation={
                    "is_valid": False,
                    "needs_clarification": True,
                    "error": str(e)
                },
                free_text_analysis={"error": str(e), "processing_failed": True},
                raw_response=user_response or ""
            )
    
    def _extract_option_selection(self, user_response: str, question: SCIDQuestion) -> Optional[str]:
        """Extract option selection from user response with improved matching"""
        if not user_response:
            return None
        
        user_response_lower = user_response.strip().lower()
        
        # Check for numeric selection (1, 2, 3, 4)
        if user_response_lower.isdigit():
            option_num = int(user_response_lower)
            if question.options and 1 <= option_num <= len(question.options):
                return question.options[option_num - 1]
        
        # Check for "option X" format
        import re
        option_match = re.search(r'option\s*(\d+)', user_response_lower)
        if option_match:
            option_num = int(option_match.group(1))
            if question.options and 1 <= option_num <= len(question.options):
                return question.options[option_num - 1]
        
        # Check for exact match with options (case-insensitive) with fuzzy matching
        if question.options:
            best_match = None
            best_score = 0.0
            
            for option in question.options:
                option_lower = option.lower()
                score = 0.0
                
                # Exact match (highest priority)
                if option_lower == user_response_lower:
                    return option
                
                # Check if response starts with option (handles "yes, I have" -> "Yes")
                if user_response_lower.startswith(option_lower + ",") or user_response_lower.startswith(option_lower + " "):
                    return option
                
                # Check if option is in response (for longer responses)
                if len(user_response_lower) <= 50 and option_lower in user_response_lower:
                    # Only if response is short enough to avoid false positives
                    return option
                
                # Fuzzy matching: check similarity
                # Calculate simple similarity score
                if len(option_lower) > 0 and len(user_response_lower) > 0:
                    # Check if option words are in response
                    option_words = set(option_lower.split())
                    response_words = set(user_response_lower.split())
                    common_words = option_words.intersection(response_words)
                    
                    if common_words:
                        # Calculate similarity based on common words
                        score = len(common_words) / max(len(option_words), len(response_words))
                        
                        # Bonus for longer common sequences
                        if option_lower in user_response_lower:
                            score += 0.3
                        
                        if score > best_score:
                            best_score = score
                            best_match = option
            
            # If we have a good fuzzy match (score > 0.6), use it
            if best_match and best_score > 0.6:
                logger.debug(f"Fuzzy matched '{user_response}' to '{best_match}' (score: {best_score:.2f})")
                return best_match
        
        # Check for yes/no responses (expanded list)
        yes_variants = ["yes", "y", "true", "1", "yeah", "yep", "sure", "definitely", "absolutely", "correct", "right"]
        no_variants = ["no", "n", "false", "0", "nope", "nah", "never", "not", "incorrect", "wrong"]
        sometimes_variants = ["sometimes", "maybe", "occasionally", "perhaps", "possibly", "might"]
        unsure_variants = ["not sure", "unsure", "don't know", "i don't know", "uncertain", "dunno", "not certain"]
        
        if user_response_lower in yes_variants:
            # Return "Yes" if it's in options, otherwise return first option
            if question.options and "Yes" in question.options:
                return "Yes"
            elif question.options:
                return question.options[0]  # First option is typically positive
        elif user_response_lower in no_variants:
            # Return "No" if it's in options, otherwise return second option
            if question.options and "No" in question.options:
                return "No"
            elif question.options and len(question.options) >= 2:
                return question.options[1]  # Second option is typically negative
        elif user_response_lower in sometimes_variants:
            if question.options and "Sometimes" in question.options:
                return "Sometimes"
            elif question.options and len(question.options) >= 3:
                return question.options[2]  # Third option
        elif user_response_lower in unsure_variants:
            if question.options and "Not sure" in question.options:
                return "Not sure"
            elif question.options and len(question.options) >= 4:
                return question.options[3]  # Fourth option
        
        return None
    
    def _is_simple_option_response(self, user_response: str, question: SCIDQuestion) -> bool:
        """Check if response is a simple option selection without additional context"""
        user_response = user_response.strip().lower()
        
        # Check if response is just an option (number, yes/no, or exact match)
        if user_response.isdigit():
            return True
        
        if user_response in ["yes", "no", "y", "n", "sometimes", "not sure", "unsure"]:
            return True
        
        # Check for exact match with options
        if question.options:
            for option in question.options:
                if option.lower() == user_response:
                    return True
        
        # If response is longer than 20 characters, likely has additional context
        if len(user_response) > 20:
            return False
        
        return False
    
    def _process_sra_if_needed(
        self,
        session_id: Optional[str],
        user_response: str,
        question: SCIDQuestion,
        processed_response: ProcessedResponse,
        conversation_history: List[Dict[str, str]]
    ):
        """Process through SRA service if session_id is available"""
        if session_id and self.sra_service:
            try:
                sra_result = self.sra_service.process_response(
                    session_id=session_id,
                    user_response=user_response,
                    question=question,
                    processed_response=processed_response,
                    conversation_history=conversation_history
                )
                # SRA result is stored in symptom database, no need to add to processed response
                logger.debug(f"SRA processed response: {sra_result.get('symptoms_extracted', 0)} symptoms extracted")
            except Exception as e:
                logger.warning(f"SRA service error (non-critical): {e}")
    
    def _process_option_response(
        self,
        user_response: str,
        question: SCIDQuestion,
        selected_option: str
    ) -> ProcessedResponse:
        """Process simple option response using rule-based logic"""
        
        # Map option to DSM criteria (basic mapping)
        dsm_criteria_mapping = {}
        if question.dsm_criterion_id:
            # Positive responses (Yes, Sometimes) typically indicate criterion met
            positive_responses = ["yes", "sometimes", "option 1", "option 2"]
            selected_lower = selected_option.lower()
            if selected_lower in [r.lower() for r in positive_responses]:
                dsm_criteria_mapping[question.dsm_criterion_id] = True
            elif selected_lower in ["no", "not sure", "option 3", "option 4"]:
                dsm_criteria_mapping[question.dsm_criterion_id] = False
            # For other options, don't set DSM mapping (neutral)
        
        # Final normalization before creating ProcessedResponse
        if selected_option is not None:
            if question.response_type == ResponseType.YES_NO:
                selected_option = str(selected_option).lower().strip()
                if selected_option not in ["yes", "no", "sometimes"]:
                    if "no" in selected_option or "not" in selected_option:
                        selected_option = "no"
                    elif "yes" in selected_option:
                        selected_option = "yes"
                    else:
                        selected_option = None
            elif question.response_type == ResponseType.TEXT:
                selected_option = str(selected_option).lower().strip()
        
        return ProcessedResponse(
            selected_option=selected_option,  # Already normalized to lowercase
            extracted_fields={},
            confidence=1.0,
            dsm_criteria_mapping=dsm_criteria_mapping,
            validation={"is_valid": True, "needs_clarification": False},
            raw_response=user_response
        )
    
    def _validate_processed_response(
        self,
        processed: ProcessedResponse,
        question: SCIDQuestion
    ) -> ProcessedResponse:
        """Validate and enhance processed response"""
        # Normalize all text responses to lowercase for consistent storage and comparison
        if processed.selected_option is not None:
            # For yes/no: always lowercase
            if question.response_type == ResponseType.YES_NO:
                processed.selected_option = str(processed.selected_option).lower().strip()
                if processed.selected_option not in ["yes", "no", "sometimes"]:
                    # Try to infer
                    if "no" in processed.selected_option or "not" in processed.selected_option:
                        processed.selected_option = "no"
                    elif "yes" in processed.selected_option:
                        processed.selected_option = "yes"
                    else:
                        processed.selected_option = None
            
            # For TEXT: normalize to lowercase
            elif question.response_type == ResponseType.TEXT:
                processed.selected_option = str(processed.selected_option).lower().strip()
            
            # For MCQ: keep original case but normalize for comparison
            # (Options should match exactly, but we normalize for internal comparison)
        
        # Validate selected_option matches question options
        if processed.selected_option and question.options:
            # First check exact match (case-sensitive)
            if processed.selected_option in question.options:
                # Exact match found, no further processing needed
                pass
            else:
                # Try to find closest match (case-insensitive)
                selected_lower = processed.selected_option.lower().strip()
                matched = False
                matched_option = None
                
                for option in question.options:
                    option_lower = str(option).lower().strip()
                    # Exact match (case-insensitive)
                    if option_lower == selected_lower:
                        matched_option = option  # Use exact option text from question
                        matched = True
                        break
                    # Check if selected option contains option text or vice versa (for partial matches)
                    if selected_lower in option_lower or option_lower in selected_lower:
                        # Prefer longer match, but only if it's a reasonable match
                        if len(option) >= len(processed.selected_option) * 0.8:  # At least 80% of length
                            if matched_option is None or len(option) > len(matched_option):
                                matched_option = option
                                matched = True
                
                if matched and matched_option:
                    # Case-insensitive match found, use the option from question
                    processed.selected_option = matched_option
                    # No warning needed - this is expected behavior for case-insensitive matching
                elif not matched:
                    # No match found, try rule-based extraction as fallback
                    logger.debug(f"Selected option '{processed.selected_option}' not in question options {question.options}, trying rule-based fallback")
                    rule_based_option = self._extract_option_selection(processed.raw_response, question)
                    if rule_based_option:
                        # Try to match rule-based option case-insensitively
                        rule_lower = str(rule_based_option).lower().strip()
                        for option in question.options:
                            if str(option).lower().strip() == rule_lower:
                                processed.selected_option = option
                                processed.confidence = min(processed.confidence, 0.7)  # Lower confidence for fallback
                                logger.debug(f"Rule-based fallback matched: {option}")
                                matched = True
                                break
                    
                    if not matched:
                        # Still no match, log warning only if it's a significant issue
                        # For TEXT response types, this might be expected
                        if question.response_type != ResponseType.TEXT:
                            logger.warning(f"Selected option '{processed.selected_option}' not in question options {question.options}")
                        processed.selected_option = None
                        processed.confidence = max(0.0, processed.confidence - 0.3)
        
        # Validate confidence is in range
        if processed.confidence < 0.0:
            processed.confidence = 0.0
        elif processed.confidence > 1.0:
            processed.confidence = 1.0
        
        # Ensure validation dict exists
        if not processed.validation:
            processed.validation = {}
        
        # Set needs_clarification if confidence is low
        if processed.confidence < 0.5 and not processed.validation.get("needs_clarification"):
            processed.validation["needs_clarification"] = True
            if not processed.validation.get("suggested_clarification"):
                processed.validation["suggested_clarification"] = "Could you provide more details?"
        
        return processed

