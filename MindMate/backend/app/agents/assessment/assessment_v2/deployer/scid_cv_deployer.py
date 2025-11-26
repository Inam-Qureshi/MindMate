"""
SCID-CV Module Deployer

Seamlessly deploys and administers selected SCID-CV diagnostic modules within 
the assessment workflow. Presents questions one by one, collects responses,
and compiles comprehensive results.

Migrated to assessment_v2 with updated imports and SRA integration.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

# Import from assessment_v2
from ..base_module import BaseAssessmentModule
from ..types import ModuleResponse, ModuleProgress

# Import SCID types from assessment_v2
try:
    from ..base_types import (
        SCIDModule, SCIDQuestion, SCIDResponse, ModuleResult, 
        ResponseType, Severity
    )
except ImportError as e:
    logger.warning(f"Failed to import from assessment_v2.base_types: {e}")
    # Fallback to old location
    try:
        from app.agents.assessment.scid.scid_cv.base_types import (
            SCIDModule, SCIDQuestion, SCIDResponse, ModuleResult, 
            ResponseType, Severity
        )
    except ImportError as e2:
        logger.error(f"Failed to import from old location: {e2}")
        SCIDModule = None
        SCIDQuestion = None
        SCIDResponse = None
        ModuleResult = None
        ResponseType = None
        Severity = None

# Import module registry from assessment_v2 modules
try:
    from ..modules import MODULE_REGISTRY as CV_MODULE_REGISTRY
    logger.debug(f"Loaded assessment_v2 module registry with {len(CV_MODULE_REGISTRY)} modules: {list(CV_MODULE_REGISTRY.keys())[:5]}")
except ImportError as e:
    logger.warning(f"Could not import from assessment_v2.modules: {e}")
    # Fallback to old location
    try:
        from app.agents.assessment.scid.scid_cv import MODULE_REGISTRY as CV_MODULE_REGISTRY
        logger.debug(f"Loaded old scid_cv module registry with {len(CV_MODULE_REGISTRY)} modules")
    except ImportError as e2:
        logger.error(f"Could not import module registry from either location: {e2}")
        CV_MODULE_REGISTRY = {}

# Import selector types (will be migrated next)
try:
    from ..selector.module_selector import ModuleSelection
except ImportError:
    # Fallback to old location during migration
    try:
        from ...scid_cv_module_selector import ModuleSelection
    except ImportError:
        ModuleSelection = None

# Import shared utilities from assessment_v2
try:
    from ..utils.question_utils import QuestionFormatter, ResponseParser
except ImportError:
    QuestionFormatter = None
    ResponseParser = None

logger = logging.getLogger(__name__)


class SCID_CV_ModuleDeployer(BaseAssessmentModule):
    """
    Deploys and administers SCID-CV diagnostic modules seamlessly within assessment flow.
    
    This module:
    1. Takes a selected SCID-CV module (from selector)
    2. Presents questions one by one to the user
    3. Collects and validates responses
    4. Compiles comprehensive results
    5. Returns complete module results
    
    Updated for assessment_v2 with SRA integration support.
    """
    
    def __init__(self, module_selection: Optional[ModuleSelection] = None):
        """
        Initialize the SCID-CV module deployer.
        
        Args:
            module_selection: The selected module to deploy
        """
        # Module metadata (MUST set before super init as they're used in __init__)
        self._module_name = "scid_cv_deployer"
        self._version = "1.0.0"
        self._description = "SCID-CV diagnostic module deployment and administration"
        
        # Initialize parent
        super().__init__()
        
        # Current deployment state
        self.module_selection = module_selection
        self.scid_module: Optional[SCIDModule] = None
        self.current_question_index = 0
        self.responses: List[SCIDResponse] = []
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.selection_attempted: bool = False
        
        # Track answered questions to prevent repetition
        self.answered_question_ids: set = set()
        
        # Session data
        self.user_id: Optional[str] = None
        self.session_id: Optional[str] = None
        
        # Load the SCID module if selection provided
        if module_selection:
            self._load_scid_module(module_selection.module_id)
        
        logger.debug("SCID-CV Module Deployer initialized")
    
    # ========================================================================
    # REQUIRED PROPERTIES (from BaseAssessmentModule)
    # ========================================================================
    
    @property
    def module_name(self) -> str:
        """Module identifier"""
        return self._module_name
    
    @property
    def module_version(self) -> str:
        """Module version"""
        return self._version
    
    @property
    def module_description(self) -> str:
        """Module description"""
        return self._description
    
    # ========================================================================
    # REQUIRED METHODS (from BaseAssessmentModule)
    # ========================================================================
    
    def start_session(self, user_id: str, session_id: str, **kwargs) -> ModuleResponse:
        """
        Start a new session for SCID-CV deployment.
        
        If no module_selection is provided, automatically selects the highest priority
        module from available assessment data. ONLY ONE module will be deployed.
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            **kwargs: Additional arguments (may include previous_module_results)
        
        Returns:
            ModuleResponse with greeting and first question
        """
        # If no module selection provided, auto-select the best one (ONLY ONE)
        if not self.module_selection:
            self.selection_attempted = True
            self.module_selection = self._auto_select_best_module(session_id, kwargs)
            
            # If auto-selection failed, try fallback selection
            if not self.module_selection:
                logger.warning(f"Auto-selection failed for session {session_id}, trying fallback")
                self.module_selection = self._fallback_module_selection(session_id, kwargs)
            
            if self.module_selection:
                # Load the selected module
                load_success = self._load_scid_module(self.module_selection.module_id)
                if not load_success:
                    logger.error(f"Failed to load auto-selected module {self.module_selection.module_id}")
                    self.module_selection = None
            else:
                logger.error(f"Could not select any module for session {session_id}")
        else:
            # Mark that selection has already been provided externally
            self.selection_attempted = True
        
        return self.start(user_id, session_id, **kwargs)
    
    def process_message(self, message: str, session_id: str, **kwargs) -> ModuleResponse:
        """Process user message/response"""
        user_id = kwargs.pop('user_id', self.user_id or 'unknown')
        return self.process_response(user_id, session_id, message, **kwargs)
    
    def is_complete(self, session_id: str) -> bool:
        """
        Check if module is complete.
        
        A module is complete if:
        1. No module is loaded (nothing to do)
        2. All questions have been answered (current_question_index >= total questions)
        3. All questions have been answered (answered_question_ids contains all question IDs)
        
        Args:
            session_id: Session ID (for consistency with interface, though state is instance-based)
            
        Returns:
            True if module is complete
        """
        if not self.scid_module:
            # Before module selection/attempt, treat as incomplete so moderator can trigger deployment.
            return self.selection_attempted
        
        # Check if we've gone through all questions
        total_questions = len(self.scid_module.questions)
        if self.current_question_index >= total_questions:
            logger.debug(f"Module {self.scid_module.id} complete: index {self.current_question_index} >= total {total_questions}")
            return True
        
        # Also check if all questions have been answered (more robust check)
        if self.answered_question_ids:
            question_ids = {q.id for q in self.scid_module.questions}
            if self.answered_question_ids.issuperset(question_ids):
                logger.debug(f"Module {self.scid_module.id} complete: all {len(question_ids)} questions answered")
                return True
        
        # Check if we have responses for all questions
        if len(self.responses) >= total_questions:
            logger.debug(f"Module {self.scid_module.id} complete: {len(self.responses)} responses >= {total_questions} questions")
            return True
        
        return False
    
    def get_results(self, session_id: str) -> Dict[str, Any]:
        """Get module results"""
        if not self.scid_module:
            return {}
        
        result = self._calculate_module_results()
        return self._module_result_to_dict(result) if result else {}
    
    # ========================================================================
    # MODULE-SPECIFIC METHODS
    # ========================================================================
    
    def _load_scid_module(self, module_id: str) -> bool:
        """
        Load the specified SCID-CV module.
        
        Args:
            module_id: ID of the module to load
        
        Returns:
            True if successfully loaded
        """
        try:
            if not CV_MODULE_REGISTRY:
                logger.error("Module registry is empty - cannot load any modules")
                return False
            
            if module_id not in CV_MODULE_REGISTRY:
                logger.error(f"Module {module_id} not found in registry. Available modules: {list(CV_MODULE_REGISTRY.keys())[:10]}")
                return False
            
            # Create module instance
            module_creator = CV_MODULE_REGISTRY[module_id]
            self.scid_module = module_creator()
            
            logger.info(f"Loaded SCID-CV module: {self.scid_module.name} ({module_id})")
            return True
        
        except Exception as e:
            logger.error(f"Failed to load SCID module {module_id}: {e}")
            return False
    
    def start(
        self,
        user_id: str,
        session_id: str,
        module_selection: Optional[ModuleSelection] = None,
        **kwargs
    ) -> ModuleResponse:
        """
        Start the SCID-CV module deployment.
        
        Args:
            user_id: User ID
            session_id: Session ID
            module_selection: Module selection to deploy
            **kwargs: Additional parameters
        
        Returns:
            ModuleResponse with greeting and first question
        """
        self.user_id = user_id
        self.session_id = session_id
        self.start_time = datetime.now()
        self.selection_attempted = True
        
        # Use provided module_selection or fall back to self.module_selection
        module_to_load = module_selection or self.module_selection
        
        # Load module if we have a selection
        if module_to_load:
            self.module_selection = module_to_load
            load_success = self._load_scid_module(module_to_load.module_id)
            if not load_success:
                # Provide detailed error message
                if not CV_MODULE_REGISTRY:
                    error_msg = "Error: SCID-CV module registry is empty. No modules are available for deployment."
                elif module_to_load.module_id not in CV_MODULE_REGISTRY:
                    available = list(CV_MODULE_REGISTRY.keys())[:5]
                    error_msg = f"Error: SCID-CV module '{module_to_load.module_id}' not found in registry. Available modules: {available}"
                else:
                    error_msg = f"Error: Failed to load SCID-CV module '{module_to_load.module_id}'."
                
                logger.error(error_msg)
                return ModuleResponse(
                    message=error_msg,
                    is_complete=True,
                    metadata={'error': 'Module load failed', 'module_id': module_to_load.module_id},
                    next_module=None
                )
        
        # Check if module is loaded
        if not self.scid_module:
            # Provide helpful error message
            if not CV_MODULE_REGISTRY:
                error_msg = "Error: No SCID-CV module loaded for deployment. Module registry is empty."
            elif not self.module_selection:
                error_msg = "I'm ready to continue with more detailed questions, but I need to determine which assessment module to use. Please try again, and I'll automatically select the most appropriate module based on your responses."
            else:
                error_msg = f"Error: No SCID-CV module loaded for deployment. Module selection exists but failed to load."
            
            logger.error(error_msg)
            return ModuleResponse(
                message=error_msg,
                is_complete=True,
                metadata={'error': 'No module loaded', 'has_selection': self.module_selection is not None},
                next_module=None
            )
        
        # Create greeting
        greeting = self._create_greeting()
        
        # Get first question
        first_question = self._get_current_question()
        
        if not first_question:
            return ModuleResponse(
                message="Error: Module has no questions available.",
                is_complete=True,
                metadata={'error': 'No questions'},
                next_module=None
            )
        
        message = f"{greeting}\n\n{self._format_question(first_question)}"
        
        return ModuleResponse(
            message=message,
            is_complete=False,
            metadata={
                'module_id': self.scid_module.id,
                'module_name': self.scid_module.name,
                'total_questions': len(self.scid_module.questions),
                'current_question': 1,
                'question_id': first_question.id
            },
            next_module=None
        )
    
    def process_response(
        self,
        user_id: str,
        session_id: str,
        user_response: str,
        **kwargs
    ) -> ModuleResponse:
        """
        Process user response to current question.
        
        NOTE: This method should integrate with SRA service to process responses
        through continuous symptom recognition. The SRA service will extract symptoms
        from every response automatically.
        
        Args:
            user_id: User ID
            session_id: Session ID
            user_response: User's response
            **kwargs: Additional parameters (may include sra_service for symptom extraction)
        
        Returns:
            ModuleResponse with next question or completion
        """
        if not self.scid_module:
            return ModuleResponse(
                message="Error: No module loaded.",
                is_complete=True,
                metadata={'error': 'No module'},
                next_module=None
            )
        
        # NOTE: SRA service integration - responses are processed through SRA
        # in the response processor, so symptoms are extracted automatically.
        # No additional action needed here for SRA integration.
        
        current_question = self._get_current_question()
        
        if not current_question:
            # No more questions, complete the module
            return self._complete_module()
        
        # Validate and store response
        is_valid, parsed_response = self._validate_response(
            current_question,
            user_response
        )
        
        # Always accept responses, even if validation fails - be forgiving
        if not is_valid:
            logger.debug(f"Response validation failed for question {current_question.id}, but accepting anyway: '{user_response}'")
            # Use the original response as parsed_response if validation failed
            parsed_response = user_response
        
        # Check if question was already answered (prevent repetition)
        if current_question.id in self.answered_question_ids:
            logger.warning(f"Question {current_question.id} was already answered, moving to next question")
            # Move to next question without storing duplicate response
            self.current_question_index += 1
        else:
            # Store the response
            if SCIDResponse is None:
                logger.error("SCIDResponse class is not available - import failed")
                raise RuntimeError("SCIDResponse class is not available. Please check imports.")
            
            scid_response = SCIDResponse(
                question_id=current_question.id,
                response=parsed_response,
                timestamp=datetime.now()
            )
            self.responses.append(scid_response)
            
            # Mark question as answered
            self.answered_question_ids.add(current_question.id)
            
            # Generate acknowledgment
            acknowledgment = self._generate_acknowledgment(user_response, parsed_response)
            
            # Move to next question
            self.current_question_index += 1
        
        # Check if module is complete
        if self.current_question_index >= len(self.scid_module.questions):
            return self._complete_module()
        
        # Get next question
        next_question = self._get_current_question()
        
        if not next_question:
            return self._complete_module()
        
        progress = self._calculate_progress()
        
        # Combine acknowledgment with next question
        message = f"{acknowledgment}\n\n{self._format_question(next_question)}"
        
        return ModuleResponse(
            message=message,
            is_complete=False,
            metadata={
                'module_id': self.scid_module.id,
                'module_name': self.scid_module.name,
                'total_questions': len(self.scid_module.questions),
                'current_question': self.current_question_index + 1,
                'question_id': next_question.id,
                'progress_percentage': progress
            },
            next_module=None
        )
    
    def _create_greeting(self) -> str:
        """Create greeting message for module start with selector context"""
        if not self.scid_module:
            return "Starting diagnostic assessment..."
        
        # More concise greeting since transition message already explains the context
        greeting = f"We'll now do a detailed assessment for {self.scid_module.name}."
        
        if self.scid_module.estimated_time_mins:
            greeting += f" This will take approximately {self.scid_module.estimated_time_mins} minutes."
        
        greeting += " Please answer each question as honestly and accurately as you can."
        
        return greeting
    
    def _get_current_question(self) -> Optional[SCIDQuestion]:
        """Get the current question to ask"""
        if not self.scid_module:
            return None
        
        if self.current_question_index >= len(self.scid_module.questions):
            return None
        
        return self.scid_module.questions[self.current_question_index]
    
    def _format_question(self, question: SCIDQuestion) -> str:
        """Format a question for presentation to user"""
        # Use simple text (layman-friendly version)
        text = question.simple_text if hasattr(question, 'simple_text') and question.simple_text else getattr(question, 'text', '')
        
        # Add help text if available
        if question.help_text:
            text += f"\n\n💡 {question.help_text}"
        
        # Add examples if available
        if question.examples:
            examples_text = ", ".join(question.examples[:3])
            text += f"\n\n📝 Examples: {examples_text}"
        
        # Add response options based on type
        # Handle case where ResponseType might be None or question.response_type might be a string
        if ResponseType is None:
            # Fallback: check response_type as string or enum value
            response_type_str = str(question.response_type) if question.response_type else ""
            if "yes_no" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "yes_no"):
                text += "\n\nPlease respond: Yes or No"
            elif "multiple_choice" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "multiple_choice"):
                if question.options:
                    text += "\n\nPlease choose from:"
                    for i, option in enumerate(question.options, 1):
                        text += f"\n{i}. {option}"
            elif "scale" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "scale"):
                min_val, max_val = question.scale_range
                text += f"\n\nPlease rate from {min_val} to {max_val}"
                if question.scale_labels:
                    text += f"\n({question.scale_labels[0]} to {question.scale_labels[-1]})"
            elif "text" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "text"):
                text += "\n\nPlease describe in your own words:"
        else:
            # Normal case: ResponseType is available
            if question.response_type == ResponseType.YES_NO:
                text += "\n\nPlease respond: Yes or No"
            
            elif question.response_type == ResponseType.MULTIPLE_CHOICE and question.options:
                text += "\n\nPlease choose from:"
                for i, option in enumerate(question.options, 1):
                    text += f"\n{i}. {option}"
            
            elif question.response_type == ResponseType.SCALE:
                min_val, max_val = question.scale_range
                text += f"\n\nPlease rate from {min_val} to {max_val}"
                if question.scale_labels:
                    text += f"\n({question.scale_labels[0]} to {question.scale_labels[-1]})"
            
            elif question.response_type == ResponseType.TEXT:
                text += "\n\nPlease describe in your own words:"
        
        return text
    
    def _validate_response(
        self,
        question: SCIDQuestion,
        user_response: str
    ) -> tuple[bool, Any]:
        """
        Validate user response against question type with improved parsing.
        
        Args:
            question: The question being answered
            user_response: User's response string
        
        Returns:
            Tuple of (is_valid, parsed_response)
        """
        original_response = user_response.strip()
        user_response = original_response.lower().strip()
        
        # YES/NO questions - comprehensive matching
        # Handle case where ResponseType might be None
        is_yes_no = False
        if ResponseType is not None:
            is_yes_no = question.response_type == ResponseType.YES_NO
        else:
            # Fallback: check response_type as string or enum value
            response_type_str = str(question.response_type) if question.response_type else ""
            is_yes_no = "yes_no" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "yes_no")
        
        if is_yes_no:
            # CRITICAL: Check for negative qualifiers FIRST (e.g., "definitely not", "absolutely not")
            # These should override positive words
            negative_qualifiers = [' not', 'not ', "n't", "never", "no ", " no", "none", "nothing"]
            positive_words_before_not = ['definitely', 'absolutely', 'sure', 'certainly', 'yes', 'yeah', 'yep']
            
            # Check if response has "not" or negative qualifier after a positive word
            for pos_word in positive_words_before_not:
                pos_index = user_response.find(pos_word)
                if pos_index != -1:
                    remaining = user_response[pos_index + len(pos_word):]
                    if any(neg in remaining for neg in negative_qualifiers):
                        return True, 'no'
            
            # Explicit negative patterns (check these BEFORE positive patterns)
            explicit_no_patterns = [
                'no way', 'no thoughts', 'no not', 'not really', 'not at all',
                'definitely not', 'absolutely not', 'certainly not', 'sure not',
                'i have not', "i haven't", "i don't", "i didn't", "i wasn't", "i'm not",
                'i do not', 'i did not', 'i am not', 'i was not',
                'no i don\'t', "no i don't", 'no never', 'not really no',
                'i have no', 'i don\'t have', "i don't have", 'i never had',
                'i haven\'t had', "i haven't had", 'i don\'t think', "i don't think",
                'i think not', 'no not tried', 'no thoughts', 'no way are you',
                'no, i haven\'t', "no, i haven't", 'no i don\'t', "no i don't"
            ]
            
            for pattern in explicit_no_patterns:
                if pattern in user_response:
                    return True, 'no'
            
            # Expanded no patterns (single words and phrases)
            no_patterns = [
                'no', 'n', 'nope', 'nah', 'never', 'none', 'nothing', 
                'false', 'negative', 'rarely', 'seldom', 'hardly ever'
            ]
            
            for pattern in no_patterns:
                # Use word boundaries to avoid false matches
                import re
                pattern_re = r'\b' + re.escape(pattern) + r'\b'
                if re.search(pattern_re, user_response, re.IGNORECASE):
                    return True, 'no'
            
            # Explicit positive patterns with context
            explicit_yes_patterns = [
                'yes i have', 'yes i do', 'yes i am', 'yes i was',
                'i have had', 'i do feel', 'i am feeling', 'i was feeling',
                'i have thought', 'i have tried', 'i do have', 'i am having',
                'yes, i have', 'yes i', 'i have', 'i do', 'i am', 'i was', 'i feel', 'i felt'
            ]
            
            # Check positive patterns but exclude if followed by negative
            for pattern in explicit_yes_patterns:
                if pattern in user_response:
                    # Check if it's followed by a negative
                    pattern_index = user_response.find(pattern)
                    remaining = user_response[pattern_index + len(pattern):]
                    # If remaining text has strong negatives, it's actually "no"
                    if not any(neg in remaining for neg in [' not', 'not ', "n't", 'never', 'no ', ' none']):
                        return True, 'yes'
            
            # Expanded yes patterns (single words)
            yes_patterns = [
                'yes', 'y', 'yeah', 'yep', 'yup', 'sure', 'definitely', 
                'absolutely', 'correct', 'right', 'true', 'affirmative',
                'sometimes yes', 'occasionally yes', 'yes sometimes',
                'i agree', 'that\'s right', "that's right"
            ]
            
            for pattern in yes_patterns:
                # Use word boundaries to avoid false matches
                import re
                pattern_re = r'\b' + re.escape(pattern) + r'\b'
                if re.search(pattern_re, user_response, re.IGNORECASE):
                    return True, 'yes'
            
            # Check for ambiguous responses
            ambiguous_patterns = ['maybe', 'perhaps', 'possibly', 'might', 'uncertain', 'unsure', 'not sure', "don't know", "dont know"]
            if any(pattern in user_response for pattern in ambiguous_patterns):
                return False, None
            
            # If contains "not" but unclear, try to determine
            if 'not' in user_response:
                # More likely no if contains negative words
                negative_words = ['never', 'nothing', 'none', 'nobody', 'nowhere']
                if any(word in user_response for word in negative_words):
                    return True, 'no'
                # Ambiguous - ask for clarification
                return False, None
            
            # Default: unclear, need clarification
            return False, None
        
        # Multiple choice - Use shared parser
        is_multiple_choice = False
        if ResponseType is not None:
            is_multiple_choice = question.response_type == ResponseType.MULTIPLE_CHOICE
        else:
            response_type_str = str(question.response_type) if question.response_type else ""
            is_multiple_choice = "multiple_choice" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "multiple_choice")
        
        if is_multiple_choice:
            if ResponseParser and question.options:
                # Convert options to dict format
                options = [{'value': opt, 'display': opt} for opt in question.options]
                parsed_value, closest_match, is_valid = ResponseParser.parse_multiple_choice(
                    user_response, options, threshold=0.3
                )
                if is_valid and parsed_value:
                    return True, parsed_value
                return False, None
            
            # Fallback to original logic
            try:
                choice_num = int(user_response)
                if 1 <= choice_num <= len(question.options):
                    return True, question.options[choice_num - 1]
            except ValueError:
                import re
                numbers = re.findall(r'\d+', user_response)
                if numbers:
                    try:
                        num = int(numbers[0])
                        if 1 <= num <= len(question.options):
                            return True, question.options[num - 1]
                    except (ValueError, IndexError):
                        pass
            
            # Basic fuzzy matching
            for option in question.options:
                option_lower = option.lower()
                if option_lower in user_response or user_response in option_lower:
                    return True, option
            
            return False, None
        
        # Scale questions - extract number from various formats
        is_scale = False
        if ResponseType is not None:
            is_scale = question.response_type == ResponseType.SCALE
        else:
            response_type_str = str(question.response_type) if question.response_type else ""
            is_scale = "scale" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "scale")
        
        if is_scale:
            import re
            # Try direct integer
            try:
                value = int(user_response)
                min_val, max_val = question.scale_range
                if min_val <= value <= max_val:
                    return True, value
            except ValueError:
                pass
            
            # Extract number from text (e.g., "7 out of 10", "about 5", "level 8")
            numbers = re.findall(r'\d+', user_response)
            if numbers:
                try:
                    value = int(numbers[0])
                    min_val, max_val = question.scale_range
                    if min_val <= value <= max_val:
                        return True, value
                except ValueError:
                    pass
            
            # Check for word representations
            word_to_number = {
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
            }
            for word, num in word_to_number.items():
                if word in user_response:
                    min_val, max_val = question.scale_range
                    if min_val <= num <= max_val:
                        return True, num
            
            return False, None
        
        # Text questions (always valid if not empty)
        is_text = False
        if ResponseType is not None:
            is_text = question.response_type == ResponseType.TEXT
        else:
            response_type_str = str(question.response_type) if question.response_type else ""
            is_text = "text" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "text")
        
        if is_text:
            if len(original_response) > 0:
                return True, original_response
            else:
                return False, None
        
        # Default: accept as text if has content
        if len(original_response) > 0:
            return True, original_response

        # If we reach here, the response is empty or unrecognized
        # Instead of failing, provide a fallback mechanism
        return self._handle_unrecognized_response(question, original_response)

    def _handle_unrecognized_response(self, question, original_response: str):
        """
        Handle unrecognized responses by providing defaults or asking for clarification.
        This prevents the workflow from getting stuck on unexpected user input.
        """
        try:
            # Track unrecognized responses per question
            question_id = getattr(question, 'id', str(question))
            unrecognized_key = f"unrecognized_{question_id}"
            unrecognized_count = getattr(self, unrecognized_key, 0) + 1
            setattr(self, unrecognized_key, unrecognized_count)

            # For any unrecognized response, immediately provide a default based on question type
            logger.info(f"Question {question_id} received unrecognized response '{original_response}', providing default")

            # For boolean questions, default to "no"
            if hasattr(question, 'response_type') and str(question.response_type).lower() in ['boolean', 'yes_no']:
                logger.debug(f"Defaulting boolean question to 'no'")
                return True, 'no'

            # For multiple choice questions, default to first option
            if hasattr(question, 'options') and question.options:
                default_option = question.options[0] if question.options else None
                if default_option:
                    logger.debug(f"Defaulting multiple choice question to '{default_option}'")
                    return True, default_option

            # For scale questions, use minimum value
            if hasattr(question, 'scale_range') and question.scale_range:
                min_val, _ = question.scale_range
                logger.debug(f"Defaulting scale question to minimum value {min_val}")
                return True, min_val

            # For any other type, accept as text if not empty, otherwise default
            if len(original_response.strip()) > 0:
                logger.debug(f"Accepting unrecognized response as text: '{original_response.strip()}'")
                return True, original_response.strip()

            # Ultimate fallback
            logger.debug("Using ultimate fallback for unrecognized response")
            return True, "Not specified"

            # For text questions, accept any non-empty response
            if len(original_response.strip()) > 0:
                return True, original_response.strip()

            # If still no valid response after multiple attempts, provide a default
            if unrecognized_count >= 2:
                logger.warning(f"Question {question_id} received {unrecognized_count} unrecognized responses, providing final default")

                # Provide question-type specific defaults
                if hasattr(question, 'response_type'):
                    response_type = str(question.response_type).lower()
                    if 'boolean' in response_type or 'yes_no' in response_type:
                        return True, 'no'
                    elif 'scale' in response_type or 'numeric' in response_type:
                        return True, 1  # Minimum/default value
                    else:
                        return True, "Not specified"

                return True, "Not specified"

            # Ask for clarification by returning invalid response
            return False, None

        except Exception as e:
            logger.error(f"Error handling unrecognized response: {e}")
            # Ultimate fallback - accept any non-empty response
            if len(original_response.strip()) > 0:
                return True, original_response.strip()
            return True, "Not specified"

    def _find_closest_match(self, user_response: str, options: List[str]) -> Optional[str]:
        """Find the closest matching option using semantic similarity"""
        if ResponseParser:
            return ResponseParser.find_closest_match(user_response, options)
        
        # Fallback to basic matching
        user_lower = user_response.lower().strip()
        user_words = set(user_lower.split())
        
        best_match = None
        best_score = 0.0
        
        for option in options:
            option_lower = option.lower()
            option_words = set(option_lower.split())
            
            # Check word overlap
            overlap = user_words.intersection(option_words)
            if overlap:
                score = len(overlap) / max(len(user_words), len(option_words))
                if score > best_score:
                    best_score = score
                    best_match = option
        
        return best_match if best_score >= 0.3 else None
    
    def _get_validation_guidance(self, question: SCIDQuestion, user_response: str) -> str:
        """Get helpful guidance when validation fails"""
        # Use shared formatter if available
        if QuestionFormatter:
            # Handle ResponseType mapping safely
            if ResponseType is not None:
                question_type_map = {
                    ResponseType.YES_NO: "yes_no",
                    ResponseType.MULTIPLE_CHOICE: "mcq",
                    ResponseType.SCALE: "scale",
                    ResponseType.TEXT: "text"
                }
                question_type = question_type_map.get(question.response_type, "open_ended")
            else:
                # Fallback: determine type from string/enum value
                response_type_str = str(question.response_type) if question.response_type else ""
                if hasattr(question.response_type, 'value'):
                    response_type_str = question.response_type.value
                
                if "yes_no" in response_type_str.lower():
                    question_type = "yes_no"
                elif "multiple_choice" in response_type_str.lower():
                    question_type = "mcq"
                elif "scale" in response_type_str.lower():
                    question_type = "scale"
                elif "text" in response_type_str.lower():
                    question_type = "text"
                else:
                    question_type = "open_ended"
            
            # Convert options to dict format
            options = None
            if question.options:
                options = [{'value': opt, 'display': opt} for opt in question.options]
            
            # Find closest match
            closest_match = self._find_closest_match(user_response, question.options) if question.options else None
            
            question_text = question.simple_text if hasattr(question, 'simple_text') and question.simple_text else getattr(question, 'text', '')
            
            return QuestionFormatter.format_error_message(
                user_response=user_response,
                question_type=question_type,
                options=options,
                closest_match=closest_match,
                question_text=question_text
            )
        
        # Fallback to original logic
        # Handle ResponseType safely
        is_yes_no = ResponseType is not None and question.response_type == ResponseType.YES_NO
        if not is_yes_no and ResponseType is None:
            response_type_str = str(question.response_type) if question.response_type else ""
            is_yes_no = "yes_no" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "yes_no")
        
        if is_yes_no:
            return "I need a clear yes or no answer for this question. Please respond with 'yes' or 'no'."
        
        is_multiple_choice = ResponseType is not None and question.response_type == ResponseType.MULTIPLE_CHOICE
        if not is_multiple_choice and ResponseType is None:
            response_type_str = str(question.response_type) if question.response_type else ""
            is_multiple_choice = "multiple_choice" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "multiple_choice")
        
        if is_multiple_choice:
            closest = self._find_closest_match(user_response, question.options)

            if closest:
                # Accept the closest match and continue instead of asking for clarification
                logger.debug(f"Accepting closest match '{closest}' for response '{user_response}'")
                return closest
            else:
                # For unclear responses, provide options but don't force selection - accept as free text
                logger.debug(f"Accepting free text response '{user_response}' for multiple choice question")
                return user_response
        
        is_scale = ResponseType is not None and question.response_type == ResponseType.SCALE
        if not is_scale and ResponseType is None:
            response_type_str = str(question.response_type) if question.response_type else ""
            is_scale = "scale" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "scale")
        
        if is_scale:
            min_val, max_val = question.scale_range
            return f"Please provide a number between {min_val} and {max_val}."
        
        is_text = ResponseType is not None and question.response_type == ResponseType.TEXT
        if not is_text and ResponseType is None:
            response_type_str = str(question.response_type) if question.response_type else ""
            is_text = "text" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "text")
        
        if is_text:
            return "Please provide a brief description in your own words."
        
        # Accept any response and continue - don't force retries
        logger.debug(f"Accepting response '{user_response}' despite processing uncertainty")
        return user_response
    
    def _generate_acknowledgment(self, user_response: str, parsed_response: Any) -> str:
        """Generate contextual acknowledgment based on user response."""
        
        response_lower = user_response.lower().strip()
        
        # Short responses (yes/no)
        if len(user_response.strip()) < 15:
            if parsed_response == 'yes':
                return "✓ Got it, thank you."
            elif parsed_response == 'no':
                return "✓ Understood, thank you."
            else:
                return "✓ Thank you."
        
        # Longer responses with emotional content
        emotional_words = ['feel', 'feeling', 'anxious', 'sad', 'depressed', 'worried', 
                          'scared', 'difficult', 'hard', 'struggle', 'pain']
        if any(word in response_lower for word in emotional_words):
            return "✓ I appreciate you sharing that with me. Thank you."
        
        # Detailed responses
        if len(user_response.strip()) > 30:
            return "✓ Thank you for providing those details."
        
        # Default
        return "✓ Thank you for your response."
    
    def _calculate_progress(self) -> float:
        """Calculate progress percentage"""
        if not self.scid_module:
            return 0.0
        
        total = len(self.scid_module.questions)
        if total == 0:
            return 100.0
        
        return (self.current_question_index / total) * 100
    
    def _complete_module(self) -> ModuleResponse:
        """Complete the module and compile results"""
        self.end_time = datetime.now()
        
        if not self.scid_module:
            return ModuleResponse(
                message="Assessment completed.",
                is_complete=True,
                metadata={'error': 'No module loaded'},
                next_module=None
            )
        
        # Calculate results
        result = self._calculate_module_results()
        
        # Create completion message
        message = self._create_completion_message(result)
        
        return ModuleResponse(
            message=message,
            is_complete=True,
            metadata={
                'module_id': self.scid_module.id,
                'module_name': self.scid_module.name,
                'total_questions_answered': len(self.responses),
                'result': self._module_result_to_dict(result)
            },
            next_module=None
        )
    
    def _calculate_module_results(self) -> ModuleResult:
        """Calculate comprehensive results for the module"""
        if not self.scid_module:
            return None
        
        # Calculate total score
        total_score = 0.0
        max_possible_score = 0.0
        
        for response in self.responses:
            # Find the question
            question = next(
                (q for q in self.scid_module.questions if q.id == response.question_id),
                None
            )
            
            if not question:
                continue
            
            max_possible_score += question.criteria_weight
            
            # Score based on response type
            is_yes_no = ResponseType is not None and question.response_type == ResponseType.YES_NO
            if not is_yes_no and ResponseType is None:
                response_type_str = str(question.response_type) if question.response_type else ""
                is_yes_no = "yes_no" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "yes_no")
            
            if is_yes_no:
                if response.response == 'yes':
                    total_score += question.criteria_weight
            
            is_scale = ResponseType is not None and question.response_type == ResponseType.SCALE
            if not is_scale and ResponseType is None:
                response_type_str = str(question.response_type) if question.response_type else ""
                is_scale = "scale" in response_type_str.lower() or (hasattr(question.response_type, 'value') and question.response_type.value == "scale")
            
            if is_scale:
                min_val, max_val = question.scale_range
                normalized = (response.response - min_val) / (max_val - min_val)
                total_score += normalized * question.criteria_weight
        
        # Calculate percentage
        percentage_score = (total_score / max_possible_score * 100) if max_possible_score > 0 else 0
        
        # Check if criteria met
        criteria_met = percentage_score >= (self.scid_module.diagnostic_threshold * 100)
        
        # Determine severity
        severity_level = self._determine_severity(percentage_score)
        
        # Calculate administration time
        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds() / 60
            admin_time = int(duration)
        else:
            admin_time = 0
        
        return ModuleResult(
            module_id=self.scid_module.id,
            module_name=self.scid_module.name,
            total_score=total_score,
            max_possible_score=max_possible_score,
            percentage_score=percentage_score,
            criteria_met=criteria_met,
            severity_level=severity_level,
            responses=self.responses,
            administration_time_mins=admin_time,
            completion_date=datetime.now()
        )
    
    def _determine_severity(self, percentage_score: float) -> Optional[Severity]:
        """Determine severity level based on score"""
        if percentage_score < 25:
            return None  # Below threshold
        elif percentage_score < 40:
            return Severity.MILD
        elif percentage_score < 60:
            return Severity.MODERATE
        elif percentage_score < 80:
            return Severity.SEVERE
        else:
            return Severity.EXTREME
    
    def _create_completion_message(self, result: ModuleResult) -> str:
        """Create completion message with results summary"""
        if not result:
            return "Assessment completed. Thank you for your responses."
        
        message = f"✅ {result.module_name} assessment completed.\n\n"
        
        if result.criteria_met:
            message += f"Based on your responses, the criteria for {result.module_name} are met. "
            if result.severity_level:
                message += f"Severity level: {result.severity_level.value}.\n\n"
        else:
            message += f"Based on your responses, the criteria for {result.module_name} are not met.\n\n"
        
        message += f"You answered {len(result.responses)} questions in {result.administration_time_mins} minutes.\n\n"
        message += "Thank you for your honest and thoughtful responses."
        
        return message
    
    def _module_result_to_dict(self, result: ModuleResult) -> Dict[str, Any]:
        """Convert ModuleResult to dictionary"""
        if not result:
            return {}
        
        return {
            'module_id': result.module_id,
            'module_name': result.module_name,
            'total_score': result.total_score,
            'max_possible_score': result.max_possible_score,
            'percentage_score': result.percentage_score,
            'criteria_met': result.criteria_met,
            'severity_level': result.severity_level.value if result.severity_level else None,
            'administration_time_mins': result.administration_time_mins,
            'completion_date': result.completion_date.isoformat(),
            'total_responses': len(result.responses)
        }
    
    def get_progress(self, session_id: Optional[str] = None) -> ModuleProgress:
        """Get current progress"""
        if not self.scid_module:
            return ModuleProgress(
                total_steps=0,
                completed_steps=0,
                current_step="No module loaded",
                percentage=100.0
            )
        
        total_questions = len(self.scid_module.questions)
        completed_questions = self.current_question_index
        progress_percentage = (completed_questions / total_questions * 100) if total_questions > 0 else 0
        
        return ModuleProgress(
            total_steps=total_questions,
            completed_steps=completed_questions,
            current_step=f"Question {self.current_question_index + 1}",
            percentage=progress_percentage
        )
    
    def can_skip(self) -> bool:
        """Whether this module can be skipped"""
        return False  # SCID-CV modules should not be skipped once started
    
    def get_estimated_time(self) -> int:
        """Get estimated time in minutes"""
        if self.scid_module:
            return self.scid_module.estimated_time_mins
        return 20  # Default estimate

    def _auto_select_best_module(self, session_id: str, kwargs: Dict[str, Any]) -> Optional[ModuleSelection]:
        """
        Automatically select the best (highest priority) SCID-CV module from available data.
        
        Args:
            session_id: Session identifier
            kwargs: Additional context (may include previous_module_results)
            
        Returns:
            ModuleSelection for the highest priority module, or None if no selection possible
        """
        try:
            # Import from assessment_v2 selector (will be migrated next)
            try:
                from ..selector.module_selector import SCID_CV_ModuleSelector, AssessmentDataCollection
                from ..selector.scid_sc_selector import create_patient_data_summary, AssessmentDataSummary
            except ImportError:
                # Fallback to old location during migration
                from ...scid_cv_module_selector import SCID_CV_ModuleSelector, AssessmentDataCollection
                from ...scid_sc_items_selector import create_patient_data_summary, AssessmentDataSummary
            
            # Get assessment data
            previous_results = kwargs.get('previous_module_results', {})
            
            # Create assessment data collection
            assessment_data = create_patient_data_summary(session_id)
            
            # Type check: ensure it's a dataclass with attribute access
            if not isinstance(assessment_data, AssessmentDataSummary):
                if isinstance(assessment_data, dict):
                    # Convert dict to dataclass if needed
                    assessment_data = AssessmentDataSummary.from_dict(assessment_data)
                else:
                    logger.error(f"create_patient_data_summary returned unexpected type: {type(assessment_data)}")
                    assessment_data = AssessmentDataSummary(
                        demographics={},
                        presenting_concern={},
                        session_metadata={}
                    )
            
            # Get SCID-SC responses if available
            scid_sc_responses = {}
            if 'scid_screening' in previous_results:
                screening_results = previous_results['scid_screening']
                if isinstance(screening_results, dict):
                    responses = screening_results.get('responses', {})
                    positive_screens = []
                    for item_id, response_data in responses.items():
                        if isinstance(response_data, dict):
                            is_yes = response_data.get('is_yes', False)
                            if is_yes:
                                positive_screens.append(item_id)
                    scid_sc_responses = {
                        'positive_screens': positive_screens,
                        'responses': responses
                    }
            
            # Create collection - use attribute access
            collection = AssessmentDataCollection(
                demographics=assessment_data.demographics,
                presenting_concern=assessment_data.presenting_concern,
                scid_sc_responses=scid_sc_responses,
                session_metadata=assessment_data.session_metadata
            )
            
            # Select modules (may return multiple)
            selector = SCID_CV_ModuleSelector(use_llm=True)
            selection_result = selector.select_modules(collection, max_modules=3)
            
            # Return ONLY the highest priority module (priority=1, highest relevance)
            if selection_result.selected_modules:
                # Sort by priority (1 = highest) and then by relevance score
                best_module = min(
                    selection_result.selected_modules,
                    key=lambda m: (m.priority, -m.relevance_score)
                )
                
                logger.info(f"Auto-selected module: {best_module.module_id} (priority: {best_module.priority}, relevance: {best_module.relevance_score:.2f})")
                return best_module
            
            logger.warning("No modules selected for SCID-CV deployment")
            return None
            
        except Exception as e:
            logger.error(f"Error auto-selecting module: {e}", exc_info=True)
            return None
    
    def _fallback_module_selection(self, session_id: str, kwargs: Dict[str, Any]) -> Optional[ModuleSelection]:
        """
        Fallback module selection when auto-selection fails.
        Uses simple rule-based selection based on available data.
        
        Args:
            session_id: Session identifier
            kwargs: Additional context
            
        Returns:
            ModuleSelection for a default module, or None if not possible
        """
        try:
            # Import ModuleSelection type
            try:
                from ..selector.module_selector import ModuleSelection
            except ImportError:
                try:
                    from ...scid_cv_module_selector import ModuleSelection
                except ImportError:
                    logger.error("Could not import ModuleSelection for fallback")
                    return None
            
            # Check if we have any module results to base selection on
            previous_results = kwargs.get('previous_module_results', {})
            
            # Try to get assessment data
            try:
                from ..selector.scid_sc_selector import create_patient_data_summary
            except ImportError:
                try:
                    from ...scid_sc_items_selector import create_patient_data_summary
                except ImportError:
                    logger.warning("Could not import create_patient_data_summary for fallback")
                    create_patient_data_summary = None
            
            # Simple rule-based fallback: select based on common patterns
            # Priority order: MDD (most common), then GAD, then basic modules
            
            fallback_modules = [
                ("MDD", "Major Depressive Disorder", 1.0),
                ("GAD", "Generalized Anxiety Disorder", 0.9),
                ("CONCERN", "Presenting Concern", 0.8),
                ("DEMOGRAPHICS", "Demographics", 0.7)
            ]
            
            # Check if we have screening results that might indicate a specific disorder
            if 'scid_screening' in previous_results:
                screening = previous_results['scid_screening']
                if isinstance(screening, dict):
                    responses = screening.get('responses', {})
                    # Check for positive screens
                    for item_id, response_data in responses.items():
                        if isinstance(response_data, dict) and response_data.get('is_yes', False):
                            # Map screening items to modules (simplified)
                            item_lower = item_id.lower()
                            if 'depress' in item_lower or 'mdd' in item_lower:
                                return ModuleSelection(
                                    module_id="MDD",
                                    module_name="Major Depressive Disorder",
                                    priority=1,
                                    relevance_score=0.95,
                                    reasoning="Selected based on positive depression screening",
                                    estimated_duration_mins=20,
                                    key_indicators=["Positive depression screening"]
                                )
                            elif 'anxiety' in item_lower or 'gad' in item_lower:
                                return ModuleSelection(
                                    module_id="GAD",
                                    module_name="Generalized Anxiety Disorder",
                                    priority=1,
                                    relevance_score=0.95,
                                    reasoning="Selected based on positive anxiety screening",
                                    estimated_duration_mins=20,
                                    key_indicators=["Positive anxiety screening"]
                                )
            
            # If we have presenting concern, use that
            if create_patient_data_summary:
                try:
                    assessment_data = create_patient_data_summary(session_id)
                    if hasattr(assessment_data, 'presenting_concern') and assessment_data.presenting_concern:
                        concern_text = str(assessment_data.presenting_concern).lower()
                        if any(word in concern_text for word in ['depress', 'sad', 'down', 'hopeless']):
                            return ModuleSelection(
                                module_id="MDD",
                                module_name="Major Depressive Disorder",
                                priority=1,
                                relevance_score=0.85,
                                reasoning="Selected based on presenting concern mentioning depression",
                                estimated_duration_mins=20,
                                key_indicators=["Presenting concern mentions depression"]
                            )
                        elif any(word in concern_text for word in ['anxiety', 'worry', 'nervous', 'panic']):
                            return ModuleSelection(
                                module_id="GAD",
                                module_name="Generalized Anxiety Disorder",
                                priority=1,
                                relevance_score=0.85,
                                reasoning="Selected based on presenting concern mentioning anxiety",
                                estimated_duration_mins=20,
                                key_indicators=["Presenting concern mentions anxiety"]
                            )
                except Exception as e:
                    logger.warning(f"Error in fallback selection with assessment data: {e}")
            
            # Default: use MDD as it's the most common
            logger.info("Using default fallback: MDD module")
            return ModuleSelection(
                module_id="MDD",
                module_name="Major Depressive Disorder",
                priority=2,
                relevance_score=0.7,
                reasoning="Default fallback selection - most common disorder",
                estimated_duration_mins=20,
                key_indicators=["Default selection"]
            )
            
        except Exception as e:
            logger.error(f"Error in fallback module selection: {e}", exc_info=True)
            return None


def deploy_scid_cv_module(
    module_selection: ModuleSelection,
    user_id: str,
    session_id: str
) -> SCID_CV_ModuleDeployer:
    """
    Convenience function to deploy a SCID-CV module.
    
    Args:
        module_selection: Selected module to deploy
        user_id: User ID
        session_id: Session ID
    
    Returns:
        Initialized deployer ready to start
    """
    deployer = SCID_CV_ModuleDeployer(module_selection)
    return deployer

