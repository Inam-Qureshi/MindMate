"""
Base Module Adapter

Bridges SCIDModule (from base_types.py) with BaseAssessmentModule (from base_module.py).
This adapter allows SCID-based modules to work with the existing assessment system
during migration.

The adapter wraps a SCIDModule and implements the BaseAssessmentModule interface,
enabling seamless integration between the new SCID module structure and the existing
moderator system.
"""

import logging
from typing import Dict, Any, Optional, Set, List
from datetime import datetime

# Import base types
from ..base_types import SCIDModule, SCIDQuestion, ModuleResult, ProcessedResponse
from ..types import ModuleResponse, ModuleProgress, ModuleMetadata

# Import base module interface
try:
    from ..base_module import BaseAssessmentModule
except ImportError:
    # Fallback if base_module is not available
    from abc import ABC, abstractmethod
    BaseAssessmentModule = ABC

# Import question router and response processor
try:
    from ..core.question_router import QuestionRouter
    from ..core.response_processor import GlobalResponseProcessor
    ROUTER_AVAILABLE = True
except ImportError:
    QuestionRouter = None
    GlobalResponseProcessor = None
    ROUTER_AVAILABLE = False
    logger.warning("QuestionRouter not available - using simple sequential routing")

logger = logging.getLogger(__name__)


class SCIDModuleAdapter(BaseAssessmentModule):
    """
    Adapter that wraps a SCIDModule and implements BaseAssessmentModule interface.
    
    This allows SCID-based modules to work with the existing assessment moderator
    and workflow system during migration.
    """
    
    def __init__(self, scid_module: SCIDModule, deployer=None):
        """
        Initialize the adapter with a SCID module.
        
        Args:
            scid_module: The SCIDModule to wrap
            deployer: Optional deployer instance for administering the module
        """
        # Set module metadata before calling super().__init__()
        self._module_name = scid_module.id.lower().replace(' ', '_')
        self._version = scid_module.version
        self._description = scid_module.description
        
        # Initialize parent
        super().__init__()
        
        # Store the wrapped SCID module
        self.scid_module = scid_module
        self.deployer = deployer
        
        # Session state tracking
        self._session_states: Dict[str, Dict[str, Any]] = {}
        
        # Initialize question router and response processor if available
        if ROUTER_AVAILABLE:
            self.question_router = QuestionRouter()
            self.response_processor = GlobalResponseProcessor()
        else:
            self.question_router = None
            self.response_processor = None
        
        logger.debug(f"SCIDModuleAdapter initialized for module: {scid_module.id}")
    
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
    
    @property
    def module_metadata(self) -> ModuleMetadata:
        """Extended metadata about the module"""
        return ModuleMetadata(
            name=self.module_name,
            version=self.module_version,
            description=self.module_description,
            category=self.scid_module.category,
            estimated_time_mins=self.scid_module.estimated_time_mins
        )

    # ========================================================================
    # SESSION MANAGEMENT OVERRIDES
    # ========================================================================

    def _ensure_session_exists(self, session_id: str) -> None:
        """
        Ensure a session exists with proper SCID module state initialization.

        Overrides base implementation to include SCID-specific session fields.
        """
        if session_id not in self._sessions:
            self._sessions[session_id] = {
                "session_id": session_id,
                "status": "active",
                "messages": [],
                "data": {},
                # SCID-specific fields
                "responses": [],
                "answered_questions": [],
                "conversation_history": [],
                "current_question_id": None,
                "is_complete": False,
                "start_time": None,
                "end_time": None
            }

    # ========================================================================
    # ERROR HANDLING METHODS
    # ========================================================================

    def on_error(self, session_id: str, error: Exception, **kwargs) -> ModuleResponse:
        """
        Handle errors gracefully and return appropriate response.

        Args:
            session_id: Session identifier
            error: The exception that occurred
            **kwargs: Additional context

        Returns:
            ModuleResponse with error handling
        """
        logger.error(f"Error in SCIDModuleAdapter for session {session_id}: {error}")

        # Try to get current question for context
        try:
            self._ensure_session_exists(session_id)
            session_state = self._sessions[session_id]
            current_question_id = session_state.get('current_question_id')

            if current_question_id:
                current_question = self.scid_module.get_question_by_id(current_question_id)
                question_text = getattr(current_question, 'text', 'current question') if current_question else 'current question'
            else:
                question_text = 'assessment question'
        except Exception:
            question_text = 'assessment question'

        return ModuleResponse(
            message=f"I apologize, but there was an issue processing your response to the {question_text}. "
                   f"Let's continue with the assessment. Could you please rephrase your answer?",
            is_complete=False,
            requires_input=True,
            metadata={
                'error_occurred': True,
                'error_type': type(error).__name__,
                'error_message': str(error)
            }
        )

    # ========================================================================
    # REQUIRED METHODS (from BaseAssessmentModule)
    # ========================================================================
    
    def start_session(self, user_id: str, session_id: str, **kwargs) -> ModuleResponse:
        """
        Initialize a new session for this module.
        
        Args:
            user_id: Unique identifier for the user
            session_id: Unique identifier for the assessment session
            **kwargs: Additional context (e.g., previous module results)
        
        Returns:
            ModuleResponse with greeting message and first question
        """
        try:
            # Initialize session state
            self._ensure_session_exists(session_id)
            session_state = self._sessions[session_id]
            
            # Initialize session state
            session_state.update({
                'user_id': user_id,
                'session_id': session_id,
                'started_at': datetime.now(),
                'current_question_index': 0,
                'current_question_id': None,
                'answered_questions': [],
                'responses': [],
                'conversation_history': [],
                'dsm_criteria_status': {},
                'is_complete': False
            })
            
            # Get first required question (or first question if no required questions)
            required_questions = [q for q in self.scid_module.questions if q.required]
            if required_questions:
                # Sort by priority and sequence
                required_questions.sort(key=lambda q: (q.priority, q.sequence_number))
                first_question = required_questions[0]
            elif self.scid_module.questions:
                first_question = self.scid_module.questions[0]
            else:
                # No questions, mark as complete
                session_state['is_complete'] = True
                return ModuleResponse(
                    message=f"Error: Module {self.scid_module.name} has no questions.",
                    is_complete=True,
                    requires_input=False,
                    error="No questions available"
                )
            
            session_state['current_question_id'] = first_question.id
            
            # Format and return first question
            greeting = f"Let's begin the {self.scid_module.name} assessment."
            message = f"{greeting}\n\n{self._format_question(first_question)}"
            
            return ModuleResponse(
                message=message,
                is_complete=False,
                requires_input=True,
                metadata={
                    'module_id': self.scid_module.id,
                    'module_name': self.scid_module.name,
                    'total_questions': len(self.scid_module.questions),
                    'current_question': 1,
                    'question_id': first_question.id
                }
            )
                
        except Exception as e:
            logger.error(f"Error starting session {session_id}: {e}", exc_info=True)
            return ModuleResponse(
                message="I encountered an error starting this assessment. Please try again.",
                is_complete=True,
                requires_input=False,
                error=str(e)
            )
    
    def process_message(self, message: str, session_id: str, **kwargs) -> ModuleResponse:
        """
        Process a user message and return a response.
        
        Uses QuestionRouter for intelligent question routing with skip logic,
        follow-up questions, and optional question handling.
        
        Args:
            message: User's message text
            session_id: Session identifier
            **kwargs: Additional context (user_id, etc.)
        
        Returns:
            ModuleResponse with the reply and status
        """
        try:
            self._ensure_session_exists(session_id)
            session_state = self._sessions[session_id]
            
            # Check if module is complete
            if session_state.get('is_complete', False) or self.is_complete(session_id):
                return ModuleResponse(
                    message="This assessment module has already been completed.",
                    is_complete=True,
                    requires_input=False
                )
            
            # Get current question
            current_question_id = session_state.get('current_question_id')
            if not current_question_id:
                # Get first unanswered required question
                answered_questions = set(session_state.get('answered_questions', []))
                required_questions = [q for q in self.scid_module.questions if q.required]
                unanswered_required = [q for q in required_questions if q.id not in answered_questions]
                if unanswered_required:
                    current_question = unanswered_required[0]
                    current_question_id = current_question.id
                elif self.scid_module.questions:
                    # Fallback to first question
                    current_question = self.scid_module.questions[0]
                    current_question_id = current_question.id
                else:
                    return self._complete_module(session_id)
            else:
                current_question = self.scid_module.get_question_by_id(current_question_id)
                if not current_question:
                    # Question not found, get next unanswered question
                    answered_questions = set(session_state.get('answered_questions', []))
                    unanswered = [q for q in self.scid_module.questions if q.id not in answered_questions]
                    if unanswered:
                        current_question = unanswered[0]
                        current_question_id = current_question.id
                    else:
                        return self._complete_module(session_id)
            
            # Process response using response processor if available
            processed_response = None
            if self.response_processor:
                try:
                    conversation_history = session_state.get('conversation_history', [])
                    processed_response = self.response_processor.process_response(
                        user_response=message,
                        question=current_question,
                        conversation_history=conversation_history,
                        session_id=session_id
                    )
                except Exception as e:
                    logger.warning(f"Error processing response with response processor: {e}")
            
            # Store response
            answered_questions = set(session_state.get('answered_questions', []))
            answered_questions.add(current_question_id)
            session_state['answered_questions'] = list(answered_questions)
            
            session_state['responses'].append({
                'question_id': current_question_id,
                'response': message,
                'processed': processed_response.__dict__ if processed_response else None
            })
            
            # Update conversation history
            if 'conversation_history' not in session_state:
                session_state['conversation_history'] = []
            session_state['conversation_history'].append({
                'role': 'user',
                'content': message
            })
            
            # Get next question using QuestionRouter if available
            next_question = None
            if self.question_router and processed_response:
                try:
                    dsm_criteria_status = session_state.get('dsm_criteria_status', {})
                    if processed_response.dsm_criteria_mapping:
                        dsm_criteria_status.update(processed_response.dsm_criteria_mapping)
                        session_state['dsm_criteria_status'] = dsm_criteria_status
                    
                    # Build session responses dict for router optimization
                    session_responses_dict = {}
                    for resp in session_state.get('responses', []):
                        qid = resp.get('question_id')
                        if qid:
                            session_responses_dict[qid] = resp
                    
                    next_question = self.question_router.get_next_question(
                        current_question=current_question,
                        processed_response=processed_response,
                        module=self.scid_module,
                        answered_questions=answered_questions,
                        dsm_criteria_status=dsm_criteria_status,
                        conversation_history=session_state.get('conversation_history', []),
                        session_responses=session_responses_dict
                    )
                except Exception as e:
                    logger.warning(f"Error routing to next question: {e}")
            
            # Fallback: Get next sequential question if router didn't provide one
            if not next_question:
                answered_questions = set(session_state.get('answered_questions', []))
                unanswered = [q for q in self.scid_module.questions if q.id not in answered_questions]
                
                # Prioritize required questions
                required_unanswered = [q for q in unanswered if q.required]
                if required_unanswered:
                    # Sort by priority and sequence
                    required_unanswered.sort(key=lambda q: (q.priority, q.sequence_number))
                    next_question = required_unanswered[0]
                elif unanswered:
                    # If all required are answered, check if we've met min_questions
                    min_questions = self.scid_module.min_questions or 1
                    if len(answered_questions) >= min_questions:
                        # We've answered enough, complete the module
                        return self._complete_module(session_id)
                    else:
                        # Still need more questions, get next by priority
                        unanswered.sort(key=lambda q: (q.priority, q.sequence_number))
                        next_question = unanswered[0]
            
            # Check if module is complete
            if not next_question or self.is_complete(session_id):
                return self._complete_module(session_id)
            
            # Update current question
            session_state['current_question_id'] = next_question.id
            
            # Format and return next question
            return ModuleResponse(
                message=self._format_question(next_question),
                is_complete=False,
                requires_input=True,
                metadata={
                    'module_id': self.scid_module.id,
                    'module_name': self.scid_module.name,
                    'question_id': next_question.id,
                    'answered_count': len(answered_questions),
                    'total_questions': len(self.scid_module.questions)
                },
                progress=self.get_progress(session_id)
            )
            
        except Exception as e:
            logger.error(f"Error processing message for session {session_id}: {e}", exc_info=True)
            # Don't use on_error for processing failures - always continue the module
            # Just log the error and try to continue with next question
            try:
                # Still try to get next question and continue
                answered_questions = set(session_state.get('answered_questions', []))
                answered_questions.add(current_question_id)
                session_state['answered_questions'] = list(answered_questions)

                # Store the response even if processing failed
                session_state['responses'].append({
                    'question_id': current_question_id,
                    'response': message,
                    'processed': None,
                    'processing_error': str(e)
                })

                # Try to get next question
                unanswered = [q for q in self.scid_module.questions if q.id not in answered_questions]
                if unanswered:
                    unanswered.sort(key=lambda q: (q.priority, q.sequence_number))
                    next_question = unanswered[0]
                    session_state['current_question_id'] = next_question.id

                    return ModuleResponse(
                        message=f"Thank you for sharing that information. Let's continue with the next question:\n\n{self._format_question(next_question)}",
                        is_complete=False,
                        requires_input=True,
                        metadata={
                            'module_id': self.scid_module.id,
                            'module_name': self.scid_module.name,
                            'question_id': next_question.id,
                            'answered_count': len(answered_questions),
                            'total_questions': len(self.scid_module.questions),
                            'processing_error': True
                        }
                    )
                else:
                    return self._complete_module(session_id)

            except Exception as continue_error:
                logger.error(f"Failed to continue after processing error: {continue_error}")
                return self.on_error(session_id, e, **kwargs)
    
    def is_complete(self, session_id: str) -> bool:
        """
        Check if this module has completed its task.
        
        Args:
            session_id: Session identifier
        
        Returns:
            True if module is complete, False otherwise
        """
        self._ensure_session_exists(session_id)
        session_state = self._sessions[session_id]
        
        # Check if explicitly marked as complete
        if session_state.get('is_complete', False):
            return True
        
        # Get required questions count (use min_questions from module config)
        min_questions = self.scid_module.min_questions or 1
        answered_questions = set(session_state.get('answered_questions', []))
        
        # Count required questions that have been answered
        required_questions = [
            q for q in self.scid_module.questions 
            if q.required
        ]
        answered_required = sum(1 for q in required_questions if q.id in answered_questions)
        
        # Module is complete if:
        # 1. All required questions are answered, OR
        # 2. Minimum number of questions (min_questions) are answered, OR
        # 3. All questions have been answered
        total_questions = len(self.scid_module.questions)
        total_answered = len(answered_questions)
        
        # Check if all questions have been answered (most definitive check)
        if total_answered >= total_questions:
            logger.debug(f"Module {self.scid_module.id} complete: all {total_questions} questions answered")
            return True
        
        if len(required_questions) > 0:
            # Check if all required questions are answered
            if answered_required >= len(required_questions):
                logger.debug(f"Module {self.scid_module.id} complete: all {len(required_questions)} required questions answered")
                return True
        
        # Check if minimum questions threshold is met
        if total_answered >= min_questions:
            logger.debug(f"Module {self.scid_module.id} complete: {total_answered} answers >= min {min_questions}")
            # Also check if we've answered enough to satisfy module requirements
            return True
        
        return False
    
    def get_results(self, session_id: str) -> Dict[str, Any]:
        """
        Get the results/data collected by this module.
        
        Args:
            session_id: Session identifier
        
        Returns:
            Dictionary containing all collected data
        """
        self._ensure_session_exists(session_id)
        session_state = self._sessions[session_id]
        
        # Compile results
        results = {
            'module_id': self.scid_module.id,
            'module_name': self.scid_module.name,
            'module_version': self.scid_module.version,
            'total_questions': len(self.scid_module.questions),
            'answered_questions': len(session_state.get('answered_questions', [])),
            'responses': session_state.get('responses', []),
            'started_at': session_state.get('started_at'),
            'completed_at': session_state.get('completed_at'),
            'is_complete': session_state.get('is_complete', False),
            'module_metadata': {
                'category': self.scid_module.category,
                'estimated_time_mins': self.scid_module.estimated_time_mins
            }
        }
        
        # If deployer has results, include them
        if self.deployer and hasattr(self.deployer, 'get_results'):
            try:
                deployer_results = self.deployer.get_results(session_id)
                results['deployer_results'] = deployer_results
            except Exception as e:
                logger.warning(f"Could not get deployer results: {e}")
        
        return results
    
    # ========================================================================
    # OPTIONAL METHODS
    # ========================================================================
    
    def get_progress(self, session_id: str) -> Optional[ModuleProgress]:
        """
        Get current progress through the module.
        
        Args:
            session_id: Session identifier
        
        Returns:
            ModuleProgress object or None
        """
        self._ensure_session_exists(session_id)
        session_state = self._sessions[session_id]
        
        total_questions = len(self.scid_module.questions)
        current_index = session_state.get('current_question_index', 0)
        answered_count = len(session_state.get('answered_questions', []))
        
        percentage = (answered_count / total_questions * 100) if total_questions > 0 else 0
        
        return ModuleProgress(
            total_steps=total_questions,
            completed_steps=answered_count,
            current_step=f"Question {current_index + 1} of {total_questions}",
            percentage=percentage
        )
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _format_question(self, question: SCIDQuestion) -> str:
        """Format a SCID question for display to user"""
        formatted = question.simple_text
        
        if question.help_text:
            formatted += f"\n\n{question.help_text}"
        
        if question.examples:
            formatted += "\n\nExamples:"
            for example in question.examples:
                formatted += f"\n- {example}"
        
        if question.response_type.value == "multiple_choice" and question.options:
            formatted += "\n\nOptions:"
            for i, option in enumerate(question.options, 1):
                formatted += f"\n{i}. {option}"
        
        if question.accepts_free_text and question.free_text_prompt:
            formatted += f"\n\n{question.free_text_prompt}"
        
        return formatted
    
    def _complete_module(self, session_id: str) -> ModuleResponse:
        """Mark module as complete and return completion message with smooth transition"""
        self._ensure_session_exists(session_id)
        session_state = self._sessions[session_id]
        
        session_state['is_complete'] = True
        session_state['completed_at'] = datetime.now()
        
        # Create module-specific completion messages
        module_id = self.scid_module.id.upper()
        answered_count = len(session_state.get('answered_questions', []))
        
        if module_id == "DEMOGRAPHICS":
            completion_message = "Thank you for providing your demographic information. This helps us better understand your background."
        elif module_id == "CONCERN":
            completion_message = "Thank you for sharing your concerns. I understand what's bringing you here today."
        elif module_id == "RISK_ASSESSMENT":
            # Check if low risk was detected
            responses = session_state.get('responses', [])
            low_risk_indicators = ["no", "none", "never", "n"]
            risk_responses = [r.get('response', '').lower() for r in responses[:5]]  # First 5 responses
            is_low_risk = any(indicator in resp for resp in risk_responses for indicator in low_risk_indicators)
            
            if is_low_risk:
                completion_message = "Thank you for answering the safety questions. I'm glad to hear you're safe. Let's continue with the assessment."
            else:
                completion_message = "Thank you for being open about your safety concerns. This information is important for your care."
        else:
            completion_message = f"Thank you! You have completed the {self.scid_module.name} assessment."
        
        return ModuleResponse(
            message=completion_message,
            is_complete=True,
            requires_input=False,
            metadata={
                'module_id': self.scid_module.id,
                'module_name': self.scid_module.name,
                'total_questions': len(self.scid_module.questions),
                'answered_questions': answered_count,
                'completion_type': 'normal'
            }
        )

