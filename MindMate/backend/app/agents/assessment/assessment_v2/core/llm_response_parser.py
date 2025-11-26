"""
LLM-based response parser for SCID-CV V2
Parses free text responses and maps to options, extracts fields, and maps to DSM criteria
"""

import json
import logging
from typing import Dict, List, Any, Optional
from ..base_types import SCIDQuestion, ProcessedResponse, ResponseType

# Import LLM client from the main agents directory
# Path: assessment_v2/core/llm_response_parser.py -> app/agents/llm_client.py
try:
    # Try direct import first (if running from backend directory)
    from app.agents.llm_client import LLMClient
except ImportError:
    # Fallback: Add parent directory to path and import
    import sys
    from pathlib import Path
    # assessment_v2/core/ -> assessment/ -> agents/ -> app/
    # Go up 4 levels from this file to reach app/agents/
    agents_path = Path(__file__).parent.parent.parent.parent
    if str(agents_path) not in sys.path:
        sys.path.insert(0, str(agents_path))
    from app.agents.llm_client import LLMClient

logger = logging.getLogger(__name__)


class LLMResponseParser:
    """LLM-based response parser for SCID-CV responses"""
    
    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialize LLM response parser.
        
        Args:
            llm_client: LLM client instance (if None, creates new one)
        """
        try:
            self.llm_client = llm_client or LLMClient(enable_cache=True, verify_connection=False)
        except Exception as e:
            logger.warning(f"Failed to initialize LLMClient: {e}. LLM parsing will be disabled.")
            self.llm_client = None
        self.system_prompt = self._get_system_prompt()
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for LLM response parsing"""
        return """You are a clinical assessment assistant specializing in psychiatric assessment.
Your role is to analyze user responses to psychiatric assessment questions and extract structured information.

CRITICAL INSTRUCTIONS:
1. ALWAYS return valid JSON in the exact format specified - no markdown, no explanations, just JSON
2. For yes/no questions, carefully analyze the response to determine intent:
   - "yes", "yeah", "I have", "I do" → "yes"
   - "no", "never", "I don't", "I haven't" → "no"
   - "definitely not", "absolutely not" → "no" (even if contains positive words)
   - "yes but not recently" → "yes" (with contextual qualifier)
   - "not sure", "I don't know" → null (ambiguous)
3. Extract structured information accurately
4. Provide confidence scores (0.0-1.0) based on clarity of response
5. Map to DSM-5 criteria when applicable

Be accurate, clinical, and empathetic. Consider context and conversation history.
Return ONLY valid JSON - no additional text, no markdown code blocks, just the JSON object."""
    
    def parse_response(
        self,
        user_response: str,
        question: SCIDQuestion,
        conversation_history: List[Dict[str, str]],
        dsm_criteria_context: Optional[Dict[str, Any]] = None,
        module: Optional[Any] = None  # SCIDModule type
    ) -> ProcessedResponse:
        """
        Parse user response using LLM.
        
        Args:
            user_response: User's free text response
            question: The question being answered
            conversation_history: Previous conversation history
            dsm_criteria_context: Context about DSM criteria (optional)
        
        Returns:
            ProcessedResponse with extracted information
        """
        # Check if LLM client is available
        if not self.llm_client:
            logger.warning("LLM client not available, using fallback parsing")
            return self._fallback_parse_response(user_response, question)
        
        try:
            # Build comprehensive, data-driven prompt for LLM
            prompt = self._build_parsing_prompt(
                user_response=user_response,
                question=question,
                conversation_history=conversation_history,
                dsm_criteria_context=dsm_criteria_context,
                module=module
            )
            
            # Call LLM with lower temperature for more consistent results
            # Use a more focused system prompt for this specific task
            focused_system_prompt = """You are a data extraction assistant for psychiatric assessments.
Your task is to extract structured information from user responses.
- Return ONLY valid JSON
- Match responses to the exact options provided
- For yes/no: return "yes", "no", "sometimes", or null
- For multiple choice: return the EXACT option text
- Do NOT return values from previous questions
- Be precise and conservative"""
            
            response_text = self.llm_client.generate(
                prompt=prompt,
                system_prompt=focused_system_prompt,
                max_tokens=500,  # Reduced for faster, more focused responses
                temperature=0.1  # Very low temperature for consistent parsing
            )
            
            # Parse JSON response
            parsed_data = self._parse_json_response(response_text)
            parsed_data = self._normalize_parsed_strings(parsed_data)
            
            # Validate against schema (optional but recommended)
            try:
                from .response_schemas import get_yes_no_schema, validate_response_schema
                if question.response_type == ResponseType.YES_NO:
                    schema = get_yes_no_schema()
                    is_valid, error_msg = validate_response_schema(parsed_data, schema)
                    if not is_valid:
                        logger.warning(f"Schema validation failed: {error_msg}, but continuing with parsed data")
            except ImportError:
                # Schema validation optional
                pass
            except Exception as e:
                logger.debug(f"Schema validation error (non-critical): {e}")
            
            # Get selected_option from parsed data
            selected_option = parsed_data.get("selected_option")
            
            # Normalize to lowercase for all text responses (for consistent storage and comparison)
            if selected_option is not None:
                if isinstance(selected_option, str):
                    selected_option = selected_option.strip()
                else:
                    selected_option = str(selected_option).strip().lower()
            
            if selected_option is not None:
                # For yes/no questions: normalize to lowercase and validate
                if question.response_type == ResponseType.YES_NO:
                    # Direct matches
                    if selected_option in ["yes", "no", "sometimes"]:
                        pass
                    # Short forms
                    elif selected_option in ["y", "yeah", "yep", "sure", "true", "1"]:
                        selected_option = "yes"
                    elif selected_option in ["n", "nope", "nah", "never", "false", "0"]:
                        selected_option = "no"
                    # Keyword matching
                    elif isinstance(selected_option, str) and ("no" in selected_option or "not" in selected_option):
                        selected_option = "no"
                    elif isinstance(selected_option, str) and "yes" in selected_option:
                        selected_option = "yes"
                    else:
                        # Try to infer from extracted fields if None
                        extracted_fields = parsed_data.get("extracted_fields", {})
                        if extracted_fields.get("negation_detected") is True:
                            selected_option = "no"
                        else:
                            selected_option = None
                
                # For MCQ: normalize option text to lowercase for comparison (but keep original for display)
                elif question.response_type == ResponseType.MULTIPLE_CHOICE:
                    # Keep original case for MCQ options (they should match exactly)
                    # But normalize for internal comparison
                    if question.options:
                        matched_option = False
                        if isinstance(selected_option, str) and selected_option.isdigit():
                            option_index = int(selected_option) - 1
                            if 0 <= option_index < len(question.options):
                                selected_option = question.options[option_index]
                                matched_option = True
                        if not matched_option:
                            selected_lower = str(selected_option).lower()
                            # Try to find case-insensitive match
                            for opt in question.options:
                                if opt.lower() == selected_lower:
                                    selected_option = opt  # Use exact option text
                                    matched_option = True
                                    break
                        if not matched_option:
                            # No match found, keep as-is (will be validated later)
                            pass
                
                # For TEXT: normalize to lowercase for consistent storage
                elif question.response_type == ResponseType.TEXT:
                    selected_option = selected_option.lower()
            
            # Handle None for yes/no - try to infer from user response
            elif question.response_type == ResponseType.YES_NO:
                extracted_fields = parsed_data.get("extracted_fields", {})
                reasoning = parsed_data.get("reasoning", "").lower()
                user_lower = user_response.lower().strip() if user_response else ""
                
                if extracted_fields.get("negation_detected") is True:
                    selected_option = "no"
                elif "no" in reasoning or "negative" in reasoning or "not" in reasoning:
                    selected_option = "no"
                elif "yes" in reasoning or "positive" in reasoning:
                    selected_option = "yes"
                elif user_lower in ["no", "nope", "never", "not", "n"] or user_lower.startswith("no "):
                    selected_option = "no"
                elif user_lower in ["yes", "yeah", "yep", "y"] or user_lower.startswith("yes "):
                    selected_option = "yes"
            
            # Final normalization: ensure lowercase for yes/no and text (for consistent storage/comparison)
            if selected_option is not None:
                if question.response_type == ResponseType.YES_NO:
                    selected_option = str(selected_option).lower().strip()
                    # Ensure it's a valid yes/no value
                    if selected_option not in ["yes", "no", "sometimes"]:
                        if "no" in selected_option or "not" in selected_option:
                            selected_option = "no"
                        elif "yes" in selected_option:
                            selected_option = "yes"
                        else:
                            selected_option = None
                elif question.response_type == ResponseType.TEXT:
                    selected_option = str(selected_option).lower().strip()
            
            # Create ProcessedResponse
            processed_response = ProcessedResponse(
                selected_option=selected_option,  # Already normalized to lowercase
                extracted_fields=parsed_data.get("extracted_fields", {}),
                confidence=parsed_data.get("confidence", 1.0),
                dsm_criteria_mapping=parsed_data.get("dsm_criteria_mapping", {}),
                next_question_hint=parsed_data.get("next_question_hint"),
                free_text_analysis=parsed_data.get("free_text_analysis", {}),
                validation=parsed_data.get("validation", {}),
                raw_response=user_response
            )
            
            return processed_response
            
        except Exception as e:
            logger.error(f"Error parsing response with LLM: {e}")
            return self._fallback_parse_response(user_response, question, error=str(e))
    
    def _fallback_parse_response(self, user_response: str, question: SCIDQuestion, error: str = None) -> ProcessedResponse:
        """Fallback parsing when LLM is not available or fails"""
        # Try to infer from user response as fallback
        selected_option = None
        if question.response_type == ResponseType.YES_NO and user_response:
            user_lower = user_response.lower().strip()
            if user_lower in ["no", "nope", "never", "not", "n"] or user_lower.startswith("no "):
                selected_option = "no"
            elif user_lower in ["yes", "yeah", "yep", "y"] or user_lower.startswith("yes "):
                selected_option = "yes"
        
        # Return fallback response (already normalized)
        fallback_free_text = self._normalize_parsed_strings({"error": error or "LLM not available", "fallback": True})
        fallback_validation = self._normalize_parsed_strings({
            "is_valid": True,
            "needs_clarification": True,
            "suggested_clarification": "could you provide more details?"
        })
        return ProcessedResponse(
            selected_option=selected_option,  # Already lowercase if set
            extracted_fields={},
            confidence=0.5,
            dsm_criteria_mapping={},
            free_text_analysis=fallback_free_text,
            validation=fallback_validation,
            raw_response=user_response
        )
    
    def _build_parsing_prompt(
        self,
        user_response: str,
        question: SCIDQuestion,
        conversation_history: List[Dict[str, str]],
        dsm_criteria_context: Optional[Dict[str, Any]] = None,
        module: Optional[Any] = None  # SCIDModule type
    ) -> str:
        """Build comprehensive, data-driven prompt for LLM parsing"""
        
        # Use new context builder for comprehensive context
        from .response_context_builder import ResponseContextBuilder
        
        # Build comprehensive context
        context = ResponseContextBuilder.build_context(
            question=question,
            user_response=user_response,
            conversation_history=conversation_history,
            dsm_criteria_context=dsm_criteria_context,
            module=module
        )
        
        # Format context for prompt
        context_text = ResponseContextBuilder.format_context_for_prompt(context)
        
        # Build question type-specific extraction instructions
        extraction_instructions = self._build_extraction_instructions(question, context)
        
        # Build a clearer, more focused prompt
        # Start with the most important information first
        question_type_label = {
            ResponseType.YES_NO: "YES/NO QUESTION",
            ResponseType.MULTIPLE_CHOICE: "MULTIPLE CHOICE QUESTION",
            ResponseType.TEXT: "TEXT QUESTION",
            ResponseType.SCALE: "SCALE QUESTION"
        }.get(question.response_type, "QUESTION")
        
        # Build focused prompt - question first, then context
        prompt_parts = [
            f"=== {question_type_label} ===",
            f"QUESTION: {question.simple_text}",
        ]
        
        # Add options for MCQ
        if question.response_type == ResponseType.MULTIPLE_CHOICE and question.options:
            prompt_parts.append("\nAVAILABLE OPTIONS (return EXACT text):")
            for i, opt in enumerate(question.options, 1):
                prompt_parts.append(f"  {i}. {opt}")
        
        # Add examples if available
        if question.examples:
            prompt_parts.append("\nEXAMPLE RESPONSES:")
            for ex in question.examples[:3]:
                prompt_parts.append(f"  - {ex}")
        
        # Add help text if available
        if question.help_text:
            prompt_parts.append(f"\nHELP: {question.help_text}")
        
        # User response
        prompt_parts.append(f"\nUSER RESPONSE: \"{user_response}\"")
        
        # Extraction instructions
        prompt_parts.append(f"\n=== EXTRACTION RULES ===")
        prompt_parts.append(extraction_instructions)
        
        # Output format
        prompt_parts.append(f"\n=== OUTPUT FORMAT ===")
        prompt_parts.append("Return ONLY valid JSON (no markdown, no code blocks):")
        prompt_parts.append(self._get_output_format(question))
        
        # Critical reminders
        if question.response_type == ResponseType.MULTIPLE_CHOICE:
            prompt_parts.append("\nCRITICAL: Return EXACT option text from the options list above. DO NOT return numbers or values from other questions.")
        elif question.response_type == ResponseType.YES_NO:
            prompt_parts.append("\nCRITICAL: Return 'yes', 'no', 'sometimes', or null. DO NOT return other values.")
        
        prompt_parts.append("\nReturn ONLY the JSON object, nothing else.")
        
        prompt = "\n".join(prompt_parts)
        return prompt
    
    def _build_extraction_instructions(self, question: SCIDQuestion, context: Dict[str, Any]) -> str:
        """Build extraction instructions based on question type and metadata"""
        instructions = []
        
        if question.response_type == ResponseType.YES_NO:
            instructions.extend([
                "YES/NO EXTRACTION:",
                "Return 'yes', 'no', 'sometimes', or null",
                "",
                "YES patterns:",
                '  - "yes", "yeah", "yep", "I have", "I do", "I am", "I was", "I feel", "I have had"',
                '  - "yes but not recently" → "yes" (qualifier doesn\'t change answer)',
                '  - "I have had thoughts" → "yes"',
                "",
                "NO patterns:",
                '  - "no", "nope", "never", "I don\'t", "I haven\'t", "I\'m not", "I wasn\'t"',
                '  - "definitely not", "absolutely not", "no way" → "no"',
                '  - "no way are you crazy" → "no" (strong negative)',
                '  - "no thoughts", "no not tried", "no I have never" → "no"',
                "",
                "AMBIGUOUS (return null):",
                '  - "not sure", "I don\'t know", "uncertain", "maybe"',
            ])
        
        elif question.response_type == ResponseType.MULTIPLE_CHOICE:
            options = question.options or []
            instructions.extend([
                "MULTIPLE CHOICE EXTRACTION:",
                f"1. The user must select ONE option from: {', '.join([f'{i+1}. {opt}' for i, opt in enumerate(options)])}",
                "2. If user says a NUMBER (1, 2, 3, 4): Return the EXACT text of that option number",
                "3. If user says OPTION TEXT: Return that EXACT text from the list",
                "4. If user says PARTIAL TEXT: Match to closest option",
                "   Examples:",
                f"   - '1' → '{options[0] if options else 'Option 1'}'",
                f"   - 'Male' → 'Male' (if in options)",
                "   - 'im not employed' → 'Unemployed or Retired' (if in options)",
                "5. If NO MATCH: Return null",
                "",
                "CRITICAL: DO NOT return values from other questions. Only return option text from the list above.",
            ])
        
        elif question.response_type == ResponseType.TEXT:
            instructions.extend([
                "EXTRACTION RULES FOR TEXT:",
                "- Extract the main value/information from the response",
                "- For age questions: extract the number (e.g., 'I am 34' → '34')",
                "- For location questions: extract the location text",
                "- For descriptive questions: extract key phrases or return the response as-is",
                "- Return null if response is unclear, empty, or doesn't match the question",
                "",
                "Use the examples provided above to guide your extraction.",
            ])
        
        # Add DSM criteria guidance if available
        if question.dsm_criterion_id:
            instructions.append("")
            instructions.append(f"DSM CRITERION: {question.dsm_criterion_id}")
            instructions.append("Determine if this criterion is met (true/false) based on the response.")
        
        return "\n".join(instructions)
    
    def _get_output_format(self, question: SCIDQuestion) -> str:
        """Get output format JSON schema based on question type"""
        if question.response_type == ResponseType.YES_NO:
            return """{
    "selected_option": "yes" | "no" | "sometimes" | null,
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation of extraction logic",
    "extracted_fields": {
        "intent_clarity": "clear" | "ambiguous" | "uncertain",
        "negation_detected": true | false,
        "contextual_qualifiers": ["but not recently"] or [],
        "certainty_level": "high" | "medium" | "low",
        "raw_sentiment": "positive" | "negative" | "neutral"
    },
    "validation": {
        "is_valid": true | false,
        "needs_clarification": true | false,
        "suggested_clarification": null or "string"
    },
    "dsm_criteria_mapping": {
        "CRITERION_ID": true | false
    },
    "free_text_analysis": {
        "key_phrases": ["phrase1", "phrase2"],
        "sentiment": "positive" | "negative" | "neutral"
    }
}"""
        elif question.response_type == ResponseType.MULTIPLE_CHOICE:
            return """{
    "selected_option": "EXACT option text from list above" or null,
    "confidence": 0.0-1.0,
    "reasoning": "Why this option was selected",
    "extracted_fields": {
        "closest_match": "Option text" or null,
        "match_confidence": 0.0-1.0,
        "alternative_options": ["Option 2"] or []
    },
    "validation": {
        "is_valid": true | false,
        "needs_clarification": true | false,
        "suggested_clarification": null or "string"
    }
}"""
        else:  # TEXT or other
            return """{
    "selected_option": "extracted value relevant to THIS question only" or null,
    "confidence": 0.0-1.0,
    "reasoning": "What was extracted and why",
    "extracted_fields": {
        "raw_text": "original response",
        "key_information": "extracted key info"
    },
    "validation": {
        "is_valid": true | false,
        "needs_clarification": true | false,
        "suggested_clarification": null or "string"
    }
}"""
    
    def _build_yes_no_prompt(
        self,
        user_response: str,
        question: SCIDQuestion,
        conversation_history: List[Dict[str, str]],
        dsm_criteria_context: Optional[Dict[str, Any]],
        history_text: str,
        dsm_context_text: str
    ) -> str:
        """Build optimized prompt for yes/no questions"""
        prompt = f"""Extract the user's response to this yes/no question and return structured JSON.

QUESTION: {question.simple_text}
HELP TEXT: {question.help_text if question.help_text else "None"}
EXAMPLES: {chr(10).join(question.examples) if question.examples else "None"}

USER RESPONSE: "{user_response}"

CONVERSATION CONTEXT:
{history_text if history_text else "No previous conversation"}
{dsm_context_text}

EXTRACTION RULES FOR YES/NO:
- "yes", "yeah", "yep", "I have", "I do", "I am", "I was", "I feel", "I have had" → "yes"
- "no", "nope", "never", "I don't", "I haven't", "I'm not", "I wasn't", "I have not" → "no"
- "definitely not", "absolutely not", "sure not", "no way" → "no" (negation overrides positive words)
- "no way are you crazy" → "no" (strong negative, ignore "crazy")
- "yes but not recently", "yes although", "yes though" → "yes" (with contextual qualifier)
- "not sure", "I don't know", "uncertain", "maybe" → null (ambiguous)
- "no thoughts", "no not tried", "no I have never" → "no"
- "I have had thoughts" → "yes" (even if followed by qualifiers)

Return JSON in this exact format (no markdown, no code blocks):
{{
    "selected_option": "yes" | "no" | "sometimes" | null,
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation of extraction logic",
    "extracted_fields": {{
        "intent_clarity": "clear" | "ambiguous" | "uncertain",
        "negation_detected": true | false,
        "contextual_qualifiers": ["but not recently"] or [],
        "certainty_level": "high" | "medium" | "low",
        "raw_sentiment": "positive" | "negative" | "neutral"
    }},
    "validation": {{
        "is_valid": true | false,
        "needs_clarification": true | false,
        "suggested_clarification": null or "string"
    }},
    "dsm_criteria_mapping": {{
        "{question.dsm_criterion_id if question.dsm_criterion_id else "CRITERION_ID"}": true | false
    }},
    "free_text_analysis": {{
        "key_phrases": ["phrase1", "phrase2"],
        "sentiment": "positive" | "negative" | "neutral"
    }}
}}

Return ONLY the JSON object, nothing else."""
        
        return prompt
    
    def _build_mcq_prompt(
        self,
        user_response: str,
        question: SCIDQuestion,
        conversation_history: List[Dict[str, str]],
        dsm_criteria_context: Optional[Dict[str, Any]],
        options_text: str,
        history_text: str,
        dsm_context_text: str
    ) -> str:
        """Build prompt for multiple choice questions"""
        # Build numbered options list for clarity
        options_list = []
        if question.options:
            for i, opt in enumerate(question.options, 1):
                options_list.append(f"{i}. {opt}")
            options_list_text = "\n".join(options_list)
        else:
            options_list_text = options_text
        
        prompt = f"""Extract the user's selected option from their response. You MUST return the EXACT option text from the list below.

QUESTION: {question.simple_text}

AVAILABLE OPTIONS (return EXACT text):
{options_list_text}

USER RESPONSE: "{user_response}"

CRITICAL INSTRUCTIONS:
1. Match the user's response to ONE of the options above
2. Return the EXACT option text provided - do NOT modify it
3. NUMBER MAPPING: If user says "1", return option 1; if "2", return option 2, etc.
4. TEXT MATCHING: If user says "Male" and option is "Male", return "Male" exactly
5. PARTIAL MATCHING: If user says "im not employed", match to "Unemployed or Retired"
6. If user says "just graduated", match to "Bachelor's degree" or closest education option
7. If user says "single yet" or "single", match to "Single"
8. If no clear match, return null
9. DO NOT return values from previous questions or unrelated data

EXAMPLES:
- User: "1" → Return: "{question.options[0] if question.options else 'Option 1'}"
- User: "Male" → Return: "Male" (if in options)
- User: "im not employed" → Return: "Unemployed or Retired" (if in options)
- User: "just graduated" → Return: "Bachelor's degree" (if in options)

Return JSON:
{{
    "selected_option": "EXACT option text from list above" or null,
    "confidence": 0.0-1.0,
    "reasoning": "Why this option was selected",
    "extracted_fields": {{
        "closest_match": "Option text" or null,
        "match_confidence": 0.0-1.0,
        "alternative_options": ["Option 2"] or []
    }},
    "validation": {{
        "is_valid": true | false,
        "needs_clarification": true | false,
        "suggested_clarification": null or "string"
    }}
}}

Return ONLY the JSON object, nothing else."""
        
        return prompt
    
    def _build_generic_prompt(
        self,
        user_response: str,
        question: SCIDQuestion,
        conversation_history: List[Dict[str, str]],
        dsm_criteria_context: Optional[Dict[str, Any]],
        options_text: str,
        history_text: str,
        dsm_context_text: str
    ) -> str:
        """Build generic prompt for other question types (TEXT, SCALE, etc.)"""
        # For TEXT questions, extract the actual value
        if question.response_type == ResponseType.TEXT:
            prompt = f"""Extract the key information from the user's text response. Focus ONLY on this question, ignore any previous context.

QUESTION: {question.simple_text}
HELP TEXT: {question.help_text if question.help_text else "None"}
EXAMPLES: {chr(10).join(question.examples) if question.examples else "None"}

USER RESPONSE: "{user_response}"

CRITICAL INSTRUCTIONS:
- Extract ONLY information relevant to THIS specific question
- DO NOT use values from previous questions or unrelated data
- For age questions: extract ONLY the number (e.g., "I am 34" -> "34")
- For location questions: extract ONLY the location text (e.g., "New York, USA" -> "New York, USA")
- For cultural background: extract the cultural/ethnic identifier (e.g., "Asian" -> "Asian")
- For descriptive questions: return the response as-is or extract key phrases
- Return null if response is unclear, empty, or doesn't match the question

Return JSON:
{{
    "selected_option": "extracted value relevant to THIS question only" or null,
    "confidence": 0.0-1.0,
    "reasoning": "What was extracted and why (mention it's for this specific question)",
    "extracted_fields": {{
        "raw_text": "{user_response}",
        "key_information": "extracted key info"
    }},
    "validation": {{
        "is_valid": true | false,
        "needs_clarification": true | false,
        "suggested_clarification": null or "string"
    }}
}}

Return ONLY the JSON object."""
        else:
            # For other types (SCALE, etc.)
            prompt = f"""Analyze the user's response to this question.

QUESTION: {question.simple_text}
OPTIONS: {options_text if options_text else "Free text response"}

USER RESPONSE: "{user_response}"

Return JSON with extracted information:
{{
    "selected_option": "extracted value" or null,
    "confidence": 0.0-1.0,
    "extracted_fields": {{}},
    "validation": {{
        "is_valid": true | false,
        "needs_clarification": true | false
    }}
}}

Return ONLY the JSON object."""
        
        return prompt
    
    def _parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """Parse JSON response from LLM, handling potential formatting issues"""
        if not response_text or not response_text.strip():
            return self._get_fallback_response("Empty response")
        
        original_text = response_text
        response_text = response_text.strip()
        
        # Step 1: Remove markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text[7:].strip()
        elif response_text.startswith("```"):
            response_text = response_text[3:].strip()
        
        if response_text.endswith("```"):
            response_text = response_text[:-3].strip()
        
        # Step 2: Remove LLM artifacts and reasoning text
        import re
        # Remove XML-like tags (e.g., <think>, <think>, etc.)
        response_text = re.sub(r'<[^>]+>', '', response_text)
        # Remove common reasoning prefixes
        response_text = re.sub(r'^(Okay,|Let\'s|First,|I need to|Looking at|Based on|The user)', '', response_text, flags=re.IGNORECASE | re.MULTILINE)
        # Remove text before first {
        first_brace = response_text.find('{')
        if first_brace > 0:
            # Check if there's meaningful text before the brace
            text_before = response_text[:first_brace].strip()
            # If it's just reasoning text, remove it
            if len(text_before) > 50 or any(word in text_before.lower() for word in ['okay', 'let\'s', 'first', 'need', 'looking', 'based', 'user']):
                response_text = response_text[first_brace:]
        # Remove text after last }
        last_brace = response_text.rfind('}')
        if last_brace >= 0 and last_brace < len(response_text) - 1:
            text_after = response_text[last_brace + 1:].strip()
            # If there's text after, it's likely reasoning - remove it
            if text_after:
                response_text = response_text[:last_brace + 1]
        response_text = response_text.strip()
        
        # Step 3: Try direct JSON parsing first
        try:
            parsed_data = json.loads(response_text)
            return parsed_data
        except json.JSONDecodeError:
            pass
        
        # Step 4: Try fixing common JSON issues
        # Fix trailing commas
        fixed_text = re.sub(r',(\s*[}\]])', r'\1', response_text)
        # Fix single quotes to double quotes (common LLM mistake)
        fixed_text = re.sub(r"'([^']*)':", r'"\1":', fixed_text)  # Keys
        fixed_text = re.sub(r":\s*'([^']*)'", r': "\1"', fixed_text)  # String values
        # Fix unquoted keys
        fixed_text = re.sub(r'(\w+):', r'"\1":', fixed_text)
        # Remove comments (JSON doesn't support comments)
        fixed_text = re.sub(r'//.*?$', '', fixed_text, flags=re.MULTILINE)
        fixed_text = re.sub(r'/\*.*?\*/', '', fixed_text, flags=re.DOTALL)
        
        try:
            parsed_data = json.loads(fixed_text)
            logger.debug("Successfully parsed JSON after fixing common issues")
            return parsed_data
        except json.JSONDecodeError:
            pass
        
        # Step 5: Extract JSON object from text (handles text before/after JSON)
        # Use balanced brace matching to find complete JSON objects
        json_objects = []
        brace_count = 0
        start_idx = -1
        
        for i, char in enumerate(response_text):
            if char == '{':
                if brace_count == 0:
                    start_idx = i
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0 and start_idx >= 0:
                    json_candidate = response_text[start_idx:i+1]
                    json_objects.append(json_candidate)
                    start_idx = -1
        
        # If multiple JSON objects found, prefer the one with "selected_option" or most complete
        if len(json_objects) > 1:
            # Sort by preference: ones with "selected_option" first, then by length
            json_objects.sort(key=lambda x: (
                "selected_option" not in x.lower(),  # False first (has selected_option)
                -len(x)  # Longer first
            ))
        
        # Try parsing each extracted JSON object
        for json_obj in json_objects:
            try:
                parsed_data = json.loads(json_obj)
                logger.debug(f"Successfully extracted JSON from text: {json_obj[:100]}...")
                return parsed_data
            except json.JSONDecodeError:
                # Try fixing trailing comma
                fixed_obj = re.sub(r',(\s*[}\]])', r'\1', json_obj)
                try:
                    parsed_data = json.loads(fixed_obj)
                    logger.debug("Successfully parsed JSON after fixing trailing comma in extracted object")
                    return parsed_data
                except json.JSONDecodeError:
                    continue
        
        # Step 6: Try simple regex as last resort (less reliable for nested objects)
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text)
        if json_match:
            try:
                parsed_data = json.loads(json_match.group())
                logger.debug("Successfully parsed JSON using simple regex")
                return parsed_data
            except json.JSONDecodeError:
                # Try fixing trailing comma
                fixed_match = re.sub(r',(\s*[}\]])', r'\1', json_match.group())
                try:
                    parsed_data = json.loads(fixed_match)
                    logger.debug("Successfully parsed JSON after fixing trailing comma in regex match")
                    return parsed_data
                except json.JSONDecodeError:
                    pass
        
        # Step 7: All parsing attempts failed
        logger.error(f"Failed to parse JSON response after all attempts")
        logger.error(f"Original text (first 500 chars): {original_text[:500]}")
        return self._get_fallback_response("Failed to parse JSON after all recovery attempts")
    
    def _get_fallback_response(self, error_reason: str) -> Dict[str, Any]:
        """Get fallback response when JSON parsing fails"""
        return {
            "selected_option": None,
            "extracted_fields": {},
            "confidence": 0.5,
            "dsm_criteria_mapping": {},
            "next_question_hint": None,
            "free_text_analysis": {"error": error_reason, "parsing_failed": True},
            "validation": {
                "is_valid": True,
                "needs_clarification": True,
                "suggested_clarification": "Could you provide more details?"
            }
        }

    def _normalize_parsed_strings(self, data: Any) -> Any:
        """Recursively normalize string values to lowercase for consistent downstream handling."""
        if isinstance(data, str):
            return data.lower().strip()
        if isinstance(data, list):
            return [self._normalize_parsed_strings(item) for item in data]
        if isinstance(data, dict):
            return {key: self._normalize_parsed_strings(value) for key, value in data.items()}
        return data

