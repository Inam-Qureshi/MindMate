
"""
Base Assessment Module

Abstract base class for all assessment modules in the MindMate assessment system.
All assessment modules must inherit from this class and implement the required methods.

Author: Mental Health Platform Team
Version: 2.0.0
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging

# Import types - handle import errors gracefully
try:
    from .assessment_v2.types import ModuleResponse
except ImportError:
    try:
        from .module_types import ModuleResponse
    except ImportError:
        # Fallback: define minimal ModuleResponse if types not available
        from dataclasses import dataclass
        from typing import Dict, Any, Optional
        
        @dataclass
        class ModuleResponse:
            message: str
            is_complete: bool = False
            requires_input: bool = True
            metadata: Dict[str, Any] = None
            
            def __post_init__(self):
                if self.metadata is None:
                    self.metadata = {}

logger = logging.getLogger(__name__)


class BaseAssessmentModule(ABC):
    """
    Abstract base class for all assessment modules.
    
    All assessment modules must inherit from this class and implement:
    - module_name: Property returning the module identifier
    - start_session(): Initialize a new module session
    - process_message(): Process user messages
    - is_complete(): Check if module is complete
    
    Optional properties:
    - module_version: Module version string
    - module_description: Module description string
    """
    
    def __init__(self):
        """Initialize the base module"""
        self._sessions: Dict[str, Dict[str, Any]] = {}
        logger.debug(f"{self.__class__.__name__} initialized")
    
    # ========================================================================
    # REQUIRED PROPERTIES (must be implemented by subclasses)
    # ========================================================================
    
    @property
    @abstractmethod
    def module_name(self) -> str:
        """
        Module identifier (e.g., "demographics", "da_diagnostic_analysis")
        
        Returns:
            str: Unique module identifier
        """
        pass
    
    # ========================================================================
    # OPTIONAL PROPERTIES (can be overridden by subclasses)
    # ========================================================================
    
    @property
    def module_version(self) -> str:
        """
        Module version string
        
        Returns:
            str: Module version (default: "1.0.0")
        """
        return "1.0.0"
    
    @property
    def module_description(self) -> str:
        """
        Module description
        
        Returns:
            str: Module description (default: class name)
        """
        return self.__class__.__name__
    
    # ========================================================================
    # REQUIRED METHODS (must be implemented by subclasses)
    # ========================================================================
    
    @abstractmethod
    def start_session(self, user_id: str, session_id: str, **kwargs) -> ModuleResponse:
        """
        Initialize a new session for this module.
        
        This method is called when the module is first activated for a session.
        It should initialize any session-specific state and return an initial
        greeting or first question.
        
        Args:
            user_id: Unique identifier for the user
            session_id: Unique identifier for the assessment session
            **kwargs: Additional context (e.g., previous module results, user data)
            
        Returns:
            ModuleResponse: Initial response with greeting/first question
            
        Raises:
            ValueError: If session initialization fails
        """
        pass
    
    @abstractmethod
    def process_message(self, message: str, session_id: str, **kwargs) -> ModuleResponse:
        """
        Process a user message and generate a response.
        
        This method is called for each user message during an active module session.
        It should process the message, update session state, and return an appropriate
        response.
        
        Args:
            message: User's message text
            session_id: Unique identifier for the assessment session
            **kwargs: Additional context (e.g., user_id, previous responses)
            
        Returns:
            ModuleResponse: Response to the user's message
            
        Raises:
            ValueError: If message processing fails
            RuntimeError: If session is not found or invalid
        """
        pass
    
    @abstractmethod
    def is_complete(self, session_id: str) -> bool:
        """
        Check if the module session is complete.
        
        Args:
            session_id: Unique identifier for the assessment session
            
        Returns:
            bool: True if module is complete, False otherwise
        """
        pass
    
    # ========================================================================
    # OPTIONAL HELPER METHODS (can be overridden by subclasses)
    # ========================================================================
    
    def _ensure_session_exists(self, session_id: str) -> None:
        """
        Ensure a session exists in the session dictionary.
        
        Args:
            session_id: Unique identifier for the assessment session
        """
        if session_id not in self._sessions:
            self._sessions[session_id] = {
                "session_id": session_id,
                "status": "active",
                "messages": [],
                "data": {}
            }
    
    def get_session_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the current state of a session.
        
        Args:
            session_id: Unique identifier for the assessment session
            
        Returns:
            Dict containing session state, or None if session doesn't exist
        """
        return self._sessions.get(session_id)
    
    def reset_session(self, session_id: str) -> None:
        """
        Reset a session to its initial state.
        
        Args:
            session_id: Unique identifier for the assessment session
        """
        if session_id in self._sessions:
            self._sessions[session_id] = {
                "session_id": session_id,
                "status": "active",
                "messages": [],
                "data": {}
            }
    
    def cleanup_session(self, session_id: str) -> None:
        """
        Clean up a session (remove from memory).
        
        Args:
            session_id: Unique identifier for the assessment session
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.debug(f"Cleaned up session {session_id} for {self.module_name}")

