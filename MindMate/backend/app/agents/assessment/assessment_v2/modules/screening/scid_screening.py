"""
SCID Screening Module

Presents selected SCID-5-SC screening items to users one by one,
collects responses, and builds a screening profile based on assessment data.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.agents.assessment.assessment_v2.base_module import BaseAssessmentModule
try:
    from ...types import ModuleResponse, ModuleProgress
except ImportError:
    from app.agents.assessment.assessment_v2.types import ModuleResponse, ModuleProgress
from ...selector.scid_sc_selector import SCID_SC_ItemsSelector, SCID_SC_Presenter, SCIDItemSelection

logger = logging.getLogger(__name__)


class SCIDScreeningModule(BaseAssessmentModule):
    """
    SCID Screening Module for presenting targeted SCID-5-SC items.

    This module uses assessment data to intelligently select relevant SCID screening
    questions and presents them to users for responses.
    """

    def __init__(self):
        """Initialize the SCID screening module"""
        # Module identification (set before calling super().__init__())
        self._module_name = "scid_screening"
        self._version = "1.0.0"
        self._description = "Targeted SCID-5-SC screening based on assessment data"

        super().__init__()

        # Module components
        self.selector = SCID_SC_ItemsSelector()
        self.presenter = SCID_SC_Presenter()

        # Session tracking
        self.active_sessions: Dict[str, Dict[str, Any]] = {}

        logger.debug("SCIDScreeningModule initialized")

    # ========================================================================
    # REQUIRED PROPERTIES
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
    # REQUIRED METHODS - Module Lifecycle
    # ========================================================================

    def activate(self, session_id: str) -> None:
        """Activate the module for a session"""
        try:
            logger.info(f"Activating SCID screening module for session {session_id}")

            # Select SCID items for this session
            selected_items = self.selector.select_scid_items(session_id, max_items=5)

            if not selected_items:
                logger.warning(f"No SCID items selected for session {session_id}")
                selected_items = []  # Continue with empty list

            # Initialize presenter with selected items
            self.presenter.initialize_with_items(selected_items)

            # Track session
            self.active_sessions[session_id] = {
                "activated_at": datetime.now(),
                "selected_items_count": len(selected_items),
                "responses_count": 0
            }

            logger.info(f"SCID screening module activated with {len(selected_items)} items for session {session_id}")

        except Exception as e:
            logger.error(f"Failed to activate SCID screening module for session {session_id}: {e}")
            raise

    def deactivate(self, session_id: str) -> None:
        """Deactivate the module for a session"""
        try:
            if session_id in self.active_sessions:
                # Save final results
                results = self.presenter.get_screening_results()

                # Store in database
                self._save_screening_results(session_id, results)

                # Clean up
                del self.active_sessions[session_id]

                logger.info(f"SCID screening module deactivated for session {session_id}")

        except Exception as e:
            logger.error(f"Error deactivating SCID screening module for session {session_id}: {e}")

    def start_session(self, user_id: str, session_id: str, **kwargs) -> ModuleResponse:
        """
        Start a SCID screening session with improved introduction.

        Args:
            user_id: User identifier
            session_id: Session identifier
            **kwargs: Additional arguments (may include previous_module_results)

        Returns:
            ModuleResponse with first question or completion message
        """
        try:
            # Activate module if not already active
            if session_id not in self.active_sessions:
                self.activate(session_id)

            # Get first question
            question_data = self.presenter.get_next_question()

            if question_data is None:
                # No questions to ask, session is complete
                return ModuleResponse(
                    message="SCID screening completed. All relevant screening questions have been asked.",
                    is_complete=True,
                    requires_input=False,
                    metadata={"screening_complete": True}
                )

            # Create introduction message
            intro = self._create_introduction(question_data)
            
            # Format question for user
            question_text = self._format_question(question_data, show_progress=True)
            
            # Combine introduction and first question
            full_message = f"{intro}\n\n{question_text}"

            return ModuleResponse(
                message=full_message,
                is_complete=False,
                requires_input=True,
                metadata={
                    "question_id": question_data["question_id"],
                    "question_number": question_data["item_number"],
                    "total_questions": question_data["total_items"],
                    "category": question_data["category"],
                    "severity": question_data.get("severity", "medium")
                }
            )

        except Exception as e:
            logger.error(f"Error starting SCID screening session: {e}", exc_info=True)
            return ModuleResponse(
                message="I encountered an error starting the SCID screening. Let's try again.",
                is_complete=False,
                requires_input=False,
                error=str(e)
            )
    
    def _create_introduction(self, first_question: Dict[str, Any]) -> str:
        """Create an introduction message for SCID screening with selector context."""
        total_questions = first_question.get("total_items", 5)
        
        # More concise intro since transition message already explains the context
        if total_questions == 1:
            intro = "I have 1 targeted question for you."
        else:
            intro = f"I have {total_questions} targeted questions for you."
        
        intro += " These questions are specifically chosen based on what you've shared with me."
        intro += " Please answer honestly - there are no right or wrong answers."
        
        return intro

    def process_message(self, message: str, session_id: str, **kwargs) -> ModuleResponse:
        """
        Process user response to current SCID question with improved parsing and flow.

        Args:
            message: User's response
            session_id: Session identifier
            **kwargs: Additional arguments (should include current_metadata with question_id)

        Returns:
            ModuleResponse with next question or completion message
        """
        try:
            # Get current question metadata from kwargs
            current_metadata = kwargs.get('current_metadata', {})
            question_id = current_metadata.get('question_id') or kwargs.get('question_id')

            if not question_id:
                # Try to get from presenter's current state
                current_q = self.presenter.get_next_question()
                if current_q:
                    question_id = current_q.get('question_id')
                else:
                    return ModuleResponse(
                        message="I need more context about which question you're answering. Let's start over.",
                        is_complete=False,
                        requires_input=True,
                        error="Missing question_id"
                    )

            # Parse response for better understanding
            parsed_response = self.presenter.parse_response(message)
            
            # Generate acknowledgment based on response
            acknowledgment = self._generate_acknowledgment(message, parsed_response)
            
            # Record response with parsing (this increments current_index and may set is_complete)
            self.presenter.record_response(question_id, message)

            # Update session tracking
            if session_id in self.active_sessions:
                self.active_sessions[session_id]["responses_count"] += 1

            # Check if complete (after recording response, which may have set is_complete)
            if self.presenter.is_complete:
                # Get final results
                results = self.presenter.get_screening_results()

                # Save results
                self._save_screening_results(session_id, results)

                # Create completion message
                completion_message = self._create_completion_message(results)
                
                # Add acknowledgment before completion
                full_message = f"{acknowledgment}\n\n{completion_message}"

                return ModuleResponse(
                    message=full_message,
                    is_complete=True,
                    requires_input=False,
                    metadata={
                        "screening_complete": True,
                        "results": results
                    }
                )

            # Get next question
            next_question = self.presenter.get_next_question()

            if next_question is None:
                # Should not happen if is_complete check above is correct
                return ModuleResponse(
                    message="SCID screening completed unexpectedly.",
                    is_complete=True,
                    requires_input=False
                )

            # Format next question with transition
            question_text = self._format_question(next_question, show_progress=True)
            
            # Combine acknowledgment with next question
            full_message = f"{acknowledgment}\n\n{question_text}"

            return ModuleResponse(
                message=full_message,
                is_complete=False,
                requires_input=True,
                metadata={
                    "question_id": next_question["question_id"],
                    "question_number": next_question["item_number"],
                    "total_questions": next_question["total_items"],
                    "category": next_question["category"],
                    "severity": next_question["severity"]
                }
            )

        except Exception as e:
            logger.error(f"Error processing SCID screening message: {e}", exc_info=True)
            return ModuleResponse(
                message="I encountered an error processing your response. Could you please rephrase your answer?",
                is_complete=False,
                requires_input=True,
                error=str(e)
            )

    def get_progress(self, session_id: str) -> ModuleProgress:
        """
        Get current progress of SCID screening.

        Args:
            session_id: Session identifier

        Returns:
            ModuleProgress object
        """
        try:
            progress_data = self.presenter.get_progress()

            return ModuleProgress(
                total_steps=progress_data["total_items"],
                completed_steps=progress_data.get("completed_items", 0),
                current_step=str(progress_data["current_item"]),
                percentage=progress_data["progress_percentage"]
            )

        except Exception as e:
            logger.error(f"Error getting SCID screening progress: {e}")
            return ModuleProgress(
                total_steps=0,
                completed_steps=0,
                current_step="error",
                percentage=0.0
            )

    def get_results(self, session_id: str) -> Dict[str, Any]:
        """
        Get SCID screening results for a session.

        Args:
            session_id: Session identifier

        Returns:
            Dictionary with screening results
        """
        try:
            return self.presenter.get_screening_results()

        except Exception as e:
            logger.error(f"Error getting SCID screening results: {e}")
            return {
                "error": str(e),
                "module": "scid_screening",
                "session_id": session_id
            }

    def is_complete(self, session_id: str) -> bool:
        """
        Check if SCID screening is complete for a session.

        Args:
            session_id: Session identifier

        Returns:
            True if complete, False otherwise
        """
        return self.presenter.is_complete

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    def _format_question(self, question_data: Dict[str, Any], show_progress: bool = True) -> str:
        """Format a SCID question for presentation to the user with improved flow."""

        question_num = question_data["item_number"]
        total_questions = question_data["total_items"]
        question_text = question_data["question"]
        category = question_data["category"]
        severity = question_data.get("severity", "medium")
        
        # Calculate progress
        progress_pct = int((question_num / total_questions) * 100)

        # Create formatted question with better structure
        formatted = ""
        
        # Progress indicator
        if show_progress and total_questions > 1:
            formatted += f"**Question {question_num} of {total_questions}** ({progress_pct}% complete)\n\n"

        # Question text
        formatted += f"{question_text}\n\n"

        # Add helpful context based on category
        category_context = {
            "mood_disorders": "💭 This question relates to your mood and emotional experiences.",
            "anxiety_disorders": "😰 This question relates to anxiety, worry, or fear.",
            "psychotic_disorders": "🔍 This question relates to unusual thoughts or perceptions.",
            "substance_use": "🍷 This question relates to alcohol or substance use.",
            "eating_disorders": "🍽️ This question relates to eating habits and body image.",
            "trauma": "🛡️ This question relates to past traumatic experiences.",
            "suicide": "⚠️ This is an important safety question."
        }
        
        if category in category_context:
            formatted += f"{category_context[category]}\n\n"

        # Response guidance
        formatted += "💬 Please share your experience - you can answer with:"
        formatted += "\n  • Yes/No"
        formatted += "\n  • A brief description"
        formatted += "\n  • Any relevant details"

        return formatted
    
    def _generate_acknowledgment(self, user_message: str, parsed_response: Dict[str, Any]) -> str:
        """Generate contextual acknowledgment based on user response."""
        
        # Check response type
        response_type = parsed_response.get("response_type", "text")
        is_yes = parsed_response.get("is_yes")
        is_no = parsed_response.get("is_no")
        
        # Short responses get brief acknowledgment
        if len(user_message.strip()) < 20:
            if is_yes:
                return "✓ Got it, thank you."
            elif is_no:
                return "✓ Understood, thank you."
            else:
                return "✓ Thank you for that."
        
        # Longer responses get more acknowledgment
        if response_type == "detailed":
            # Check for emotional indicators
            emotional_words = ['feel', 'feeling', 'anxious', 'sad', 'depressed', 'worried', 'scared']
            if any(word in user_message.lower() for word in emotional_words):
                return "✓ I appreciate you sharing that with me. Thank you."
            else:
                return "✓ Thank you for providing those details."
        
        # Default acknowledgment
        return "✓ Thank you for your response."

    def _create_completion_message(self, results: Dict[str, Any]) -> str:
        """Create a completion message with screening results summary."""

        total_items = results.get("total_items", 0)
        responded_items = results.get("responded_items", 0)
        completion_rate = results.get("completion_rate", 0)

        message = "Thank you for completing the SCID screening questions!\n\n"

        message += f"**Screening Summary:**\n"
        message += f"• Questions completed: {responded_items}/{total_items}\n"
        message += f"• Completion rate: {completion_rate:.1%}\n\n"

        # Add brief analysis
        responses = results.get("responses", {})
        if responses:
            message += "**Your responses have been recorded and will help us provide better care recommendations.**\n\n"

        message += "These screening results will be reviewed by your healthcare provider to determine if further assessment is needed."

        return message

    def _save_screening_results(self, session_id: str, results: Dict[str, Any]):
        """Save screening results to database."""

        try:
            from ...database import ModeratorDatabase
            db = ModeratorDatabase()

            # Store screening results
            # patient_id=None will trigger get_patient_id_from_session() helper
            db.store_module_data(
                session_id=session_id,
                patient_id=None,  # Unified helper will extract from session
                module_name="scid_screening",
                data_type="screening_results",
                data_content=results,
                data_summary=f"SCID screening completed with {results.get('responded_items', 0)} responses",
                is_validated=True
            )

            logger.info(f"Saved SCID screening results for session {session_id}")

        except Exception as e:
            logger.error(f"Error saving SCID screening results: {e}")

    # ========================================================================
    # STATIC METHODS FOR EXTERNAL USE
    # ========================================================================

    @staticmethod
    def get_patient_data_summary(session_id: str) -> Dict[str, Any]:
        """Get patient data summary as dict for external use."""
        from dataclasses import asdict
        from .scid_sc_items_selector import create_patient_data_summary
        summary = create_patient_data_summary(session_id)
        # Convert dataclass to dict for backward compatibility
        return asdict(summary)

    @staticmethod
    def select_scid_items(session_id: str, max_items: int = 5) -> List[SCIDItemSelection]:
        """Select SCID items for a session."""
        from .scid_sc_items_selector import select_scid_items_for_session
        return select_scid_items_for_session(session_id, max_items)
