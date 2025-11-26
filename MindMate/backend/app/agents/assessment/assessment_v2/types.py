"""
Shared types and data structures for the assessment module system
Migrated from assessment/module_types.py
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class ModuleStatus(Enum):
    """Status of a module in the assessment flow"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    FAILED = "failed"


class RecoveryAction(Enum):
    """Actions to take when an error occurs"""
    RETRY = "retry"
    SKIP = "skip"
    RESTART = "restart"
    ABORT = "abort"
    CONTINUE = "continue"


@dataclass
class ModuleResponse:
    """Standard response format for all modules"""
    message: str                                    # Response message to user
    is_complete: bool = False                       # Module completion status
    requires_input: bool = True                     # Waiting for user input
    metadata: Dict[str, Any] = field(default_factory=dict)  # Additional context
    next_module: Optional[str] = None              # Suggest next module
    error: Optional[str] = None                    # Error message if any
    progress: Optional['ModuleProgress'] = None    # Progress information
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "message": self.message,
            "is_complete": self.is_complete,
            "requires_input": self.requires_input,
            "metadata": self.metadata,
            "next_module": self.next_module,
            "error": self.error,
            "progress": self.progress.to_dict() if self.progress else None
        }


@dataclass
class ModuleProgress:
    """Progress tracking for a module"""
    total_steps: int
    completed_steps: int
    current_step: str
    percentage: float
    estimated_time_remaining: Optional[int] = None  # seconds
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "total_steps": self.total_steps,
            "completed_steps": self.completed_steps,
            "current_step": self.current_step,
            "percentage": self.percentage,
            "estimated_time_remaining": self.estimated_time_remaining
        }


@dataclass
class SessionState:
    """State of an assessment session"""
    def __init__(
        self,
        session_id: str,
        user_id: str,
        version: int = 0,  # Version for optimistic locking
        current_module: Optional[str] = None,
        module_history: Optional[List[str]] = None,
        module_states: Optional[Dict[str, Any]] = None,
        module_results: Optional[Dict[str, Any]] = None,
        started_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        is_complete: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
        current_metadata: Optional[Dict[str, Any]] = None,
    ):
        self.session_id = session_id
        self.user_id = user_id
        self.version = version
        self.current_module = current_module
        self.module_history = module_history or []
        self.module_states = module_states or {}
        self.module_results = module_results or {}
        self.started_at = started_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
        self.completed_at = completed_at
        self.is_complete = is_complete
        self.metadata = metadata or {}
        self.current_metadata = current_metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "current_module": self.current_module,
            "module_history": self.module_history,
            "module_states": self.module_states,
            "module_results": self.module_results,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "is_complete": self.is_complete,
            "metadata": self.metadata,
            "version": self.version
        }


@dataclass
class ModuleConfig:
    """Configuration for a module"""
    name: str
    class_path: str
    enabled: bool = True
    priority: int = 0
    auto_start: bool = False
    description: str = ""
    estimated_duration: int = 300  # seconds
    dependencies: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "class_path": self.class_path,
            "enabled": self.enabled,
            "priority": self.priority,
            "auto_start": self.auto_start,
            "description": self.description,
            "estimated_duration": self.estimated_duration,
            "dependencies": self.dependencies,
            "metadata": self.metadata
        }


@dataclass
class ErrorResponse:
    """Error response with recovery information"""
    error_type: str
    error_message: str
    user_message: str
    recovery_action: RecoveryAction
    retry_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_module_response(self) -> ModuleResponse:
        """Convert to ModuleResponse"""
        return ModuleResponse(
            message=self.user_message,
            is_complete=False,
            requires_input=True,
            error=self.error_message,
            metadata={
                "error_type": self.error_type,
                "recovery_action": self.recovery_action.value,
                "retry_count": self.retry_count,
                **self.metadata
            }
        )


@dataclass
class ModuleMetadata:
    """Metadata about a module"""
    name: str
    version: str
    description: str
    author: str = ""
    requires_llm: bool = True
    requires_database: bool = True
    tags: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "author": self.author,
            "requires_llm": self.requires_llm,
            "requires_database": self.requires_database,
            "tags": self.tags
        }


