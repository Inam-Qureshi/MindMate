"""
Shared utilities for question formatting, parsing, and presentation across assessment modules.

This module provides:
- Unified question formatting with progress indicators
- Shared response parsing utilities with LLM fallback
- Multi-field extraction from responses
- Consistent error message formatting
- Question routing helpers
- Question prioritization system
- Dynamic question generation
"""

import logging
import re
import json
from typing import Dict, Any, Optional, List, Tuple, Set
from enum import Enum

logger = logging.getLogger(__name__)

# FIXED: Import LLM for semantic understanding fallback
try:
    from ..core.llm.enhanced_llm import EnhancedLLMWrapper
    ENHANCED_LLM_AVAILABLE = True
except ImportError:
    try:
        from app.agents.assessment.assessment_v2.core.llm.enhanced_llm import EnhancedLLMWrapper
        ENHANCED_LLM_AVAILABLE = True
    except ImportError:
        try:
            from ..core.llm.llm_client import LLMWrapper
            ENHANCED_LLM_AVAILABLE = False
        except ImportError:
            try:
                from app.agents.assessment.assessment_v2.core.llm.llm_client import LLMWrapper
                ENHANCED_LLM_AVAILABLE = False
            except ImportError:
                # Fallback to old location
                try:
                    from app.agents.assessment.enhanced_llm import EnhancedLLMWrapper
                    ENHANCED_LLM_AVAILABLE = True
                except ImportError:
                    try:
                        from app.agents.assessment.llm import LLMWrapper
                        ENHANCED_LLM_AVAILABLE = False
                    except ImportError:
                        LLMWrapper = None
                        ENHANCED_LLM_AVAILABLE = False


class QuestionType(Enum):
    """Question type enumeration"""
    OPEN_ENDED = "open_ended"
    YES_NO = "yes_no"
    MULTIPLE_CHOICE = "mcq"
    SCALE = "scale"
    TEXT = "text"


class QuestionFormatter:
    """Unified question formatting system"""
    
    @staticmethod
    def format_question(
        question_text: str,
        question_number: Optional[int] = None,
        total_questions: Optional[int] = None,
        question_type: Optional[str] = None,
        options: Optional[List[Dict[str, Any]]] = None,
        help_text: Optional[str] = None,
        examples: Optional[List[str]] = None,
        category: Optional[str] = None,
        show_progress: bool = True,
        show_guidance: bool = True
    ) -> str:
        """
        Format a question with consistent styling and progress indicators.
        
        Args:
            question_text: The main question text
            question_number: Current question number (1-indexed)
            total_questions: Total number of questions
            question_type: Type of question (open_ended, yes_no, mcq, scale)
            options: List of options for MCQ questions
            help_text: Optional help text
            examples: Optional examples
            category: Optional category for context
            show_progress: Whether to show progress indicator
            show_guidance: Whether to show response guidance
        
        Returns:
            Formatted question string
        """
        formatted = ""
        
        # Progress indicator
        if show_progress and question_number and total_questions:
            progress_pct = int((question_number / total_questions) * 100)
            formatted += f"**Question {question_number} of {total_questions}** ({progress_pct}% complete)\n\n"
        
        # Category context (if provided)
        if category:
            category_icons = {
                "mood_disorders": "💭",
                "anxiety_disorders": "😰",
                "psychotic_disorders": "🔍",
                "substance_use": "🍷",
                "eating_disorders": "🍽️",
                "trauma": "🛡️",
                "suicide": "⚠️",
                "safety": "⚠️",
                "risk_assessment": "⚠️"
            }
            icon = category_icons.get(category, "📋")
            formatted += f"{icon} "
        
        # Main question text
        formatted += f"{question_text}\n\n"
        
        # Help text
        if help_text:
            formatted += f"💡 {help_text}\n\n"
        
        # Examples
        if examples:
            examples_text = ", ".join(examples[:3])
            formatted += f"📝 Examples: {examples_text}\n\n"
        
        # Response options based on type
        if show_guidance:
            if question_type == "yes_no":
                formatted += "💬 Please respond: **Yes** or **No**\n"
            elif question_type == "mcq" and options:
                formatted += "💬 Please choose one of the following:\n"
                for i, option in enumerate(options, 1):
                    option_display = option.get('display', option.get('value', str(option)))
                    formatted += f"  {i}. {option_display}\n"
            elif question_type == "scale":
                formatted += "💬 Please provide a number (e.g., 1-10)\n"
            elif question_type == "open_ended":
                formatted += "💬 Please share your experience in your own words\n"
        
        return formatted.strip()
    
    @staticmethod
    def format_error_message(
        user_response: str,
        question_type: str,
        options: Optional[List[Dict[str, Any]]] = None,
        closest_match: Optional[str] = None,
        question_text: Optional[str] = None
    ) -> str:
        """
        Format a helpful error message when response parsing fails.
        
        Args:
            user_response: The user's response that failed to parse
            question_type: Type of question
            options: Available options (for MCQ)
            closest_match: Closest matching option (if found)
            question_text: Original question text
        
        Returns:
            Formatted error message
        """
        error_msg = f"I didn't quite understand '{user_response}'."
        
        if closest_match:
            error_msg += f"\n\nDid you mean '{closest_match}'?"
        
        if question_type == "yes_no":
            error_msg += "\n\nPlease respond with **Yes** or **No**."
        elif question_type == "mcq" and options:
            error_msg += "\n\nPlease select one of the following options:"
            for i, option in enumerate(options, 1):
                option_display = option.get('display', option.get('value', str(option)))
                error_msg += f"\n  {i}. {option_display}"
        elif question_type == "scale":
            error_msg += "\n\nPlease provide a number (e.g., 1-10)."
        
        if question_text:
            error_msg += f"\n\n{question_text}"
        
        return error_msg


class ResponseParser:
    """Shared response parsing utilities with semantic matching"""
    
    # Synonym mapping for semantic matching
    SYNONYM_MAP = {
        'work': ['work', 'job', 'employment', 'career', 'occupation', 'profession'],
        'school': ['school', 'study', 'studying', 'education', 'university', 'college', 'academic', 'learning'],
        'money': ['money', 'financial', 'finance', 'finances', 'bills', 'payment', 'paying', 'economic'],
        'health': ['health', 'medical', 'illness', 'sick', 'disease', 'condition', 'wellness'],
        'family': ['family', 'relatives', 'parents', 'siblings', 'children', 'kin'],
        'relationships': ['relationships', 'friends', 'social', 'people', 'others', 'peers'],
        'responsibilities': ['responsibilities', 'duties', 'tasks', 'chores', 'obligations'],
        'future': ['future', 'tomorrow', 'later', 'ahead', 'coming', 'upcoming'],
        'safety': ['safety', 'security', 'safe', 'protected', 'secure'],
        'mistakes': ['mistakes', 'errors', 'wrong', 'faults', 'failures', 'blunders']
    }
    
    # Yes/No word variations
    YES_WORDS = ['yes', 'yeah', 'yep', 'sure', 'definitely', 'y', 'yea', 'absolutely', 'correct', 'right', 'true']
    NO_WORDS = ['no', 'nope', 'not', 'never', 'n', 'nah', 'none', 'negative', 'incorrect', 'wrong', 'false']
    
    @staticmethod
    def parse_yes_no(response: str) -> Tuple[Optional[str], bool]:
        """
        Parse yes/no response with typo tolerance and context awareness.
        
        Returns:
            Tuple of (parsed_value, is_valid)
        """
        if not response:
            return None, False
        
        response_lower = response.lower().strip()
        
        # STEP 1: Check for ambiguous responses FIRST (before any pattern matching)
        ambiguous_phrases = [
            'not sure', "don't know", "dont know", "i don't know", "i dont know",
            "i'm not sure", "im not sure", "am not sure", 'maybe', 'perhaps', 
            'possibly', 'might', 'uncertain', 'unsure'
        ]
        if any(phrase in response_lower for phrase in ambiguous_phrases):
            return None, False
        
        # STEP 2: Check for "No," or "No " at start (common pattern) - BEFORE checking positive patterns
        if response_lower.startswith('no,') or response_lower.startswith('no '):
            # Even if followed by "I have", if it starts with "No,", it's "no"
            return 'no', True
        
        # STEP 3: Check for negative qualifiers (e.g., "definitely not", "absolutely not")
        # These should override positive words
        negative_qualifiers = [' not', 'not ', "n't", "never", "no ", " no", "none", "nothing", "nobody"]
        positive_words_before_not = ['definitely', 'absolutely', 'sure', 'certainly', 'yes', 'yeah', 'yep']
        
        # Check if response has "not" or negative qualifier after a positive word
        for pos_word in positive_words_before_not:
            pos_index = response_lower.find(pos_word)
            if pos_index != -1:
                # Check if there's a negative qualifier after the positive word
                remaining = response_lower[pos_index + len(pos_word):]
                if any(neg in remaining for neg in negative_qualifiers):
                    return 'no', True
        
        # STEP 4: Check for explicit negative patterns with context
        explicit_no_patterns = [
            'no way', 'no thoughts', 'no not', 'not really', 'not at all',
            'definitely not', 'absolutely not', 'certainly not', 'sure not',
            'i have not', "i haven't", "i don't", "i didn't", "i wasn't", "i'm not",
            'i do not', 'i did not', 'i am not', 'i was not',
            'no i don\'t', "no i don't", 'no never', 'not really no',
            'i have no', 'i don\'t have', "i don't have", 'i never had',
            'i haven\'t had', "i haven't had", 'i don\'t think', "i don't think",
            'i think not', 'no not tried', 'no thoughts', 'no way are you',
            'i have never', 'i never tried', 'i never had'
        ]
        
        for pattern in explicit_no_patterns:
            if pattern in response_lower:
                return 'no', True
        
        # Check for explicit positive patterns with context
        # CRITICAL: Order matters - check longer patterns FIRST to avoid partial matches
        # Sort by length descending
        explicit_yes_patterns = [
            'yes i have', 'yes i do', 'yes i am', 'yes i was',
            'i have had', 'i do feel', 'i am feeling', 'i was feeling',
            'i have thought', 'i have tried', 'i do have', 'i am having',
            'yes, i have', 'yes i', 'i have', 'i do', 'i am', 'i was', 'i feel', 'i felt'
        ]
        # Sort by length descending to match longer patterns first
        explicit_yes_patterns.sort(key=len, reverse=True)
        
        # But exclude if followed by strong negative (but allow contextual negatives like "but not recently")
        for pattern in explicit_yes_patterns:
            pattern_index = response_lower.find(pattern)
            if pattern_index != -1:
                remaining = response_lower[pattern_index + len(pattern):].strip()
                
                # If remaining is empty or very short, it's a clear "yes"
                if len(remaining) <= 3:
                    return 'yes', True
                
                # Check for contextual phrases FIRST (before checking negatives)
                # Look for contextual words that indicate "yes but..." or "yes although..."
                contextual_phrases = ['but', 'although', 'though', 'however', 'except', 'other than']
                # Check first 30 characters for contextual phrases
                remaining_start = remaining[:30].lower()
                if any(phrase in remaining_start for phrase in contextual_phrases):
                    # Even if followed by negative, contextual phrases indicate "yes" with qualification
                    return 'yes', True
                
                # Strong negatives that override: "not", "never", "no" at start (but not after "but")
                # Only check if we haven't found a contextual phrase
                strong_negatives = [' not ', ' not,', ' never ', ' never,', ' no ', ' no,', ' none ', ' none,']
                if any(neg in remaining[:30] for neg in strong_negatives):  # Check first 30 chars after pattern
                    # Has strong negative without contextual phrase, skip this pattern
                    continue
                # Found a valid "yes" pattern
                return 'yes', True
        
        # Single word positive patterns (check after explicit patterns)
        single_yes_words = ['yes', 'yeah', 'yep', 'yup', 'sure', 'definitely', 'absolutely']
        for word in single_yes_words:
            # Use word boundaries to avoid false matches
            import re
            word_re = r'\b' + re.escape(word) + r'\b'
            if re.search(word_re, response_lower):
                return 'yes', True
        
        
        # Direct match (exact)
        if response_lower in ResponseParser.YES_WORDS:
            return 'yes', True
        if response_lower in ResponseParser.NO_WORDS:
            return 'no', True
        
        # Fuzzy matching for typos (simple Levenshtein-like) - only for short responses
        if len(response_lower) <= 5:
            for yes_word in ResponseParser.YES_WORDS:
                if len(response_lower) >= 2 and yes_word.startswith(response_lower[:2]):
                    return 'yes', True
            
            for no_word in ResponseParser.NO_WORDS:
                if len(response_lower) >= 1 and no_word.startswith(response_lower[:1]):
                    return 'no', True
        
        return None, False
    
    @staticmethod
    def parse_scale(response: str, min_val: int = 1, max_val: int = 10) -> Tuple[Optional[int], bool]:
        """
        Parse scale response (numeric).
        
        Returns:
            Tuple of (parsed_value, is_valid)
        """
        if not response:
            return None, False
        
        # Try direct integer
        try:
            value = int(response.strip())
            if min_val <= value <= max_val:
                return value, True
        except ValueError:
            pass
        
        # Extract number from text
        numbers = re.findall(r'\b(\d+)\b', response)
        if numbers:
            try:
                value = int(numbers[0])
                if min_val <= value <= max_val:
                    return value, True
            except (ValueError, IndexError):
                pass
        
        # Word to number mapping
        word_to_number = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        }
        response_lower = response.lower()
        for word, num in word_to_number.items():
            if word in response_lower and min_val <= num <= max_val:
                return num, True
        
        return None, False
    
    @staticmethod
    def parse_multiple_choice(
        response: str,
        options: List[Dict[str, Any]],
        threshold: float = 0.3
    ) -> Tuple[Optional[str], Optional[str], bool]:
        """
        Parse multiple choice response with semantic matching.
        
        Args:
            response: User's response
            options: List of option dicts with 'value' and 'display' keys
            threshold: Minimum similarity score (0.0-1.0)
        
        Returns:
            Tuple of (selected_value, closest_match, is_valid)
        """
        if not response or not options:
            return None, None, False
        
        response_lower = response.lower().strip()
        response_words = set(response_lower.split())
        
        # Try numeric selection first
        try:
            choice_num = int(response_lower)
            if 1 <= choice_num <= len(options):
                selected = options[choice_num - 1]
                return selected.get('value', selected.get('display')), None, True
        except ValueError:
            pass
        
        # Extract number from text
        numbers = re.findall(r'\d+', response_lower)
        if numbers:
            try:
                num = int(numbers[0])
                if 1 <= num <= len(options):
                    selected = options[num - 1]
                    return selected.get('value', selected.get('display')), None, True
            except (ValueError, IndexError):
                pass
        
        # Semantic matching
        best_match = None
        best_score = 0.0
        best_value = None
        
        for option in options:
            option_value = option.get('value', '').lower()
            option_display = option.get('display', '').lower()
            option_words = set(option_display.split())
            
            # Direct match
            if option_display in response_lower or response_lower in option_display:
                return option.get('value'), None, True
            
            # Word overlap
            word_overlap = option_words.intersection(response_words)
            if word_overlap:
                overlap_ratio = len(word_overlap) / len(option_words) if option_words else 0
                if overlap_ratio > best_score:
                    best_score = overlap_ratio
                    best_match = option_display
                    best_value = option.get('value')
            
            # Semantic similarity using synonyms
            for response_word in response_words:
                for key, synonyms in ResponseParser.SYNONYM_MAP.items():
                    if response_word in synonyms:
                        for synonym in synonyms:
                            if synonym in option_words:
                                semantic_score = 0.7
                                if response_word == synonym:
                                    semantic_score = 0.9
                                if semantic_score > best_score:
                                    best_score = semantic_score
                                    best_match = option_display
                                    best_value = option.get('value')
            
            # Partial word matches
            for response_word in response_words:
                for option_word in option_words:
                    if len(response_word) >= 3:
                        if response_word in option_word or option_word in response_word:
                            partial_score = min(len(response_word) / len(option_word),
                                              len(option_word) / len(response_word))
                            if partial_score > best_score:
                                best_score = partial_score
                                best_match = option_display
                                best_value = option.get('value')
        
        # Return best match if above threshold
        if best_match and best_score >= threshold:
            return best_value, best_match, True
        
        # FIXED: LLM fallback for ambiguous cases
        if best_score < threshold and ENHANCED_LLM_AVAILABLE:
            try:
                llm_result = ResponseParser._llm_parse_multiple_choice(response, options)
                if llm_result:
                    return llm_result, best_match, True
            except Exception as e:
                logger.debug(f"LLM fallback failed: {e}")
        
        return None, best_match, False
    
    @staticmethod
    def _llm_parse_multiple_choice(
        response: str,
        options: List[Dict[str, Any]],
        llm_client: Optional[Any] = None
    ) -> Optional[str]:
        """
        Use LLM to parse ambiguous multiple choice responses.
        
        Returns:
            Selected option value or None
        """
        if not llm_client:
            try:
                if ENHANCED_LLM_AVAILABLE:
                    llm_client = EnhancedLLMWrapper()
                elif LLMWrapper:
                    llm_client = LLMWrapper()
                else:
                    return None
            except Exception as e:
                logger.debug(f"Could not initialize LLM client: {e}")
                return None
        
        try:
            options_text = "\n".join([
                f"{i+1}. {opt.get('display', opt.get('value', str(opt)))}"
                for i, opt in enumerate(options)
            ])
            
            if hasattr(llm_client, 'extract_structured_data'):
                result = llm_client.extract_structured_data(
                    user_input=response,
                    field_name="multiple_choice_selection",
                    field_schema={
                        "type": "string",
                        "description": f"Select from options: {options_text}",
                        "enum": [opt.get('value', opt.get('display', str(opt))) for opt in options]
                    }
                )
                if result and result.data:
                    return result.data.get('value')
            elif hasattr(llm_client, 'generate_response'):
                prompt = f"""The user responded: "{response}"

Available options:
{options_text}

Which option best matches? Return only the option number (1-{len(options)}) or exact option text."""
                
                llm_response = llm_client.generate_response(prompt)
                llm_text = llm_response.content if hasattr(llm_response, 'content') else str(llm_response)
                
                numbers = re.findall(r'\d+', llm_text)
                if numbers:
                    num = int(numbers[0])
                    if 1 <= num <= len(options):
                        return options[num - 1].get('value')
                
                for option in options:
                    option_text = option.get('display', option.get('value', ''))
                    if option_text.lower() in llm_text.lower():
                        return option.get('value')
        except Exception as e:
            logger.debug(f"LLM parsing failed: {e}")
        
        return None
    
    @staticmethod
    def find_closest_match(response: str, options: List[str]) -> Optional[str]:
        """
        Find the closest matching option for error messages.
        
        Returns:
            Closest matching option text or None
        """
        if not response or not options:
            return None
        
        response_lower = response.lower().strip()
        response_words = set(response_lower.split())
        
        best_match = None
        best_score = 0.0
        
        for option in options:
            option_lower = option.lower()
            option_words = set(option_lower.split())
            
            # Word overlap
            overlap = option_words.intersection(response_words)
            if overlap:
                score = len(overlap) / max(len(response_words), len(option_words))
                if score > best_score:
                    best_score = score
                    best_match = option
            
            # Semantic similarity
            for response_word in response_words:
                for key, synonyms in ResponseParser.SYNONYM_MAP.items():
                    if response_word in synonyms:
                        for synonym in synonyms:
                            if synonym in option_words:
                                score = 0.7
                                if score > best_score:
                                    best_score = score
                                    best_match = option
        
        return best_match if best_score >= 0.3 else None


class MultiFieldExtractor:
    """FIXED: Extract multiple data fields from a single user response"""
    
    @staticmethod
    def extract_fields(
        response: str,
        target_fields: List[Dict[str, Any]],
        conversation_context: Optional[List[Dict[str, str]]] = None,
        llm_client: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Extract multiple fields from a single response.
        
        Args:
            response: User's response text
            target_fields: List of field definitions with 'name', 'type', 'description'
            conversation_context: Previous conversation messages
            llm_client: Optional LLM client for extraction
        
        Returns:
            Dictionary of extracted fields
        """
        extracted = {}
        
        # First, try rule-based extraction
        for field in target_fields:
            field_name = field.get('name')
            field_type = field.get('type', 'text')
            field_desc = field.get('description', '')
            
            # Rule-based extraction
            rule_value = MultiFieldExtractor._rule_based_extract(response, field_name, field_type, field_desc)
            if rule_value is not None:
                extracted[field_name] = rule_value
        
        # If LLM available and some fields missing, use LLM extraction
        if llm_client or ENHANCED_LLM_AVAILABLE:
            missing_fields = [f for f in target_fields if f.get('name') not in extracted]
            if missing_fields:
                try:
                    llm_extracted = MultiFieldExtractor._llm_extract_fields(
                        response, missing_fields, conversation_context, llm_client
                    )
                    extracted.update(llm_extracted)
                except Exception as e:
                    logger.debug(f"LLM extraction failed: {e}")
        
        return extracted
    
    @staticmethod
    def _rule_based_extract(
        response: str,
        field_name: str,
        field_type: str,
        field_description: str
    ) -> Optional[Any]:
        """Rule-based extraction for common patterns"""
        response_lower = response.lower()
        
        # Date/time extraction
        if field_type in ['date', 'time', 'duration', 'onset']:
            # Look for time references
            time_patterns = [
                (r'(\d+)\s*(?:weeks?|wks?)', 'weeks'),
                (r'(\d+)\s*(?:months?|mos?)', 'months'),
                (r'(\d+)\s*(?:days?|d)', 'days'),
                (r'(\d+)\s*(?:years?|yrs?)', 'years'),
                (r'(\d+)\s*(?:hours?|hrs?)', 'hours'),
            ]
            for pattern, unit in time_patterns:
                match = re.search(pattern, response_lower)
                if match:
                    return f"{match.group(1)} {unit}"
            
            # Look for relative time
            if any(word in response_lower for word in ['ago', 'since', 'started', 'began']):
                return response
        
        # Severity extraction
        if field_type == 'severity' or 'severity' in field_name.lower():
            # Look for numbers 1-10
            numbers = re.findall(r'\b([1-9]|10)\b', response)
            if numbers:
                return int(numbers[0])
            
            # Look for severity words
            severity_map = {
                'mild': 3, 'slight': 2, 'minor': 2,
                'moderate': 5, 'medium': 5,
                'severe': 8, 'serious': 8, 'bad': 7,
                'extreme': 10, 'severe': 9, 'worst': 10
            }
            for word, value in severity_map.items():
                if word in response_lower:
                    return value
        
        # Frequency extraction
        if field_type == 'frequency' or 'frequency' in field_name.lower():
            frequency_map = {
                'daily': 'daily', 'every day': 'daily',
                'weekly': 'weekly', 'once a week': 'weekly',
                'monthly': 'monthly', 'once a month': 'monthly',
                'often': 'often', 'frequently': 'often',
                'sometimes': 'sometimes', 'occasionally': 'sometimes',
                'rarely': 'rarely', 'seldom': 'rarely',
                'never': 'never'
            }
            for word, freq in frequency_map.items():
                if word in response_lower:
                    return freq
        
        # Yes/No extraction
        if field_type == 'boolean' or field_type == 'yes_no':
            yes_words = ['yes', 'yeah', 'yep', 'sure', 'definitely', 'y']
            no_words = ['no', 'nope', 'not', 'never', 'n', 'nah']
            if any(word in response_lower for word in yes_words):
                return True
            elif any(word in response_lower for word in no_words):
                return False
        
        return None
    
    @staticmethod
    def _llm_extract_fields(
        response: str,
        fields: List[Dict[str, Any]],
        conversation_context: Optional[List[Dict[str, str]]] = None,
        llm_client: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Use LLM to extract fields"""
        if not llm_client:
            try:
                if ENHANCED_LLM_AVAILABLE:
                    llm_client = EnhancedLLMWrapper()
                elif LLMWrapper:
                    llm_client = LLMWrapper()
                else:
                    return {}
            except Exception:
                return {}
        
        try:
            # Build extraction schema
            schema = {
                "type": "object",
                "properties": {
                    field.get('name'): {
                        "type": field.get('type', 'string'),
                        "description": field.get('description', '')
                    }
                    for field in fields
                }
            }
            
            if hasattr(llm_client, 'extract_structured_data'):
                result = llm_client.extract_structured_data(
                    user_input=response,
                    field_name="multi_field_extraction",
                    field_schema=schema,
                    conversation_context=conversation_context or []
                )
                if result and result.data:
                    return result.data
        except Exception as e:
            logger.debug(f"LLM field extraction failed: {e}")
        
        return {}


class QuestionRouter:
    """Intelligent question routing utilities"""
    
    @staticmethod
    def should_skip_question(
        question_id: str,
        question_text: str,
        answered_questions: Set[str],
        conversation_history: List[Dict[str, Any]],
        data_collected: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """
        Determine if a question should be skipped based on already collected data.
        
        Args:
            question_id: Question identifier
            question_text: Question text
            answered_questions: Set of already answered question IDs
            conversation_history: Previous conversation messages
            data_collected: Already collected data fields
        
        Returns:
            Tuple of (should_skip, reason)
        """
        # Already answered
        if question_id in answered_questions:
            return True, "Question already answered"
        
        # Check if data was already collected from conversation
        question_lower = question_text.lower()
        
        # Date/time questions
        if any(keyword in question_lower for keyword in ['when did', 'when did this', 'start', 'began', 'onset']):
            if any(keyword in str(data_collected).lower() for keyword in ['week', 'month', 'day', 'ago', 'since']):
                return True, "Timing information already collected"
        
        # Severity questions
        if any(keyword in question_lower for keyword in ['how severe', 'severity', 'scale', 'rate']):
            if 'severity' in data_collected or 'scale' in str(data_collected).lower():
                return True, "Severity information already collected"
        
        # Frequency questions
        if any(keyword in question_lower for keyword in ['how often', 'frequency', 'how many times']):
            if 'frequency' in data_collected or any(keyword in str(data_collected).lower() for keyword in ['daily', 'weekly', 'often']):
                return True, "Frequency information already collected"
        
        return False, None
    
    @staticmethod
    def extract_data_from_conversation(
        conversation_history: List[Dict[str, Any]],
        question_type: str
    ) -> Optional[Any]:
        """
        Extract relevant data from conversation history to avoid asking redundant questions.
        
        Args:
            conversation_history: List of conversation messages
            question_type: Type of data to extract (date, severity, frequency, etc.)
        
        Returns:
            Extracted data or None
        """
        # This is a placeholder for more sophisticated extraction
        # In Phase 3, this could use LLM-based extraction
        for message in conversation_history:
            content = message.get('content', '').lower()
            
            if question_type == 'date' or question_type == 'onset':
                # Look for time references
                if any(keyword in content for keyword in ['week', 'month', 'day', 'ago', 'since']):
                    return content
            
            elif question_type == 'severity':
                # Look for severity indicators
                if any(keyword in content for keyword in ['severe', 'mild', 'moderate', 'scale', 'rate']):
                    return content
            
            elif question_type == 'frequency':
                # Look for frequency indicators
                if any(keyword in content for keyword in ['daily', 'weekly', 'often', 'sometimes', 'rarely']):
                    return content
        
        return None

