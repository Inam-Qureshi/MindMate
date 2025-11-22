"""
Assessment Module System

A modular, scalable assessment system for deploying multiple
assessment modules through a unified chat interface.

Main Components:
- BaseAssessmentModule: Abstract base class for all modules
- AssessmentModerator: Orchestrator managing module lifecycle
- ModuleResponse, SessionState, etc.: Shared types

Example Usage:
    from assessment import AssessmentModerator
    
    moderator = AssessmentModerator()
    greeting = moderator.start_assessment(user_id="123", session_id="abc")
    response = moderator.process_message(
        user_id="123",
        session_id="abc",
        message="User input"
    )
"""

from .assessment_v2.base_module import BaseAssessmentModule

# Moderator and types are in assessment_v2
try:
    from .assessment_v2.moderator import AssessmentModerator
    from .assessment_v2.types import (
        ModuleResponse,
        ModuleProgress,
        SessionState,
        ModuleStatus,
        ErrorResponse,
        RecoveryAction,
        ModuleConfig,
        ModuleMetadata
    )
    from .assessment_v2.database import ModeratorDatabase
    from .assessment_v2.config import (
        MODULE_REGISTRY,
        get_module_config,
        get_starting_module,
        get_next_module,
        get_module_sequence
    )
    ASSESSMENT_V2_AVAILABLE = True
except ImportError as e:
    AssessmentModerator = None
    ModuleResponse = None
    ModuleProgress = None
    SessionState = None
    ModuleStatus = None
    ErrorResponse = None
    RecoveryAction = None
    ModuleConfig = None
    ModuleMetadata = None
    ModeratorDatabase = None
    MODULE_REGISTRY = {}
    get_module_config = None
    get_starting_module = None
    get_next_module = None
    get_module_sequence = None
    ASSESSMENT_V2_AVAILABLE = False

# Legacy imports - try to import from old locations if assessment_v2 not available
if not ASSESSMENT_V2_AVAILABLE:
    try:
        from .module_types import (
            ModuleResponse,
            ModuleProgress,
            SessionState,
            ModuleStatus,
            RecoveryAction,
            ErrorResponse,
            ModuleConfig,
            ModuleMetadata
        )
    except ImportError:
        pass
    
    try:
        from .database import ModeratorDatabase
    except ImportError:
        pass
    
    try:
        from .config import (
            MODULE_REGISTRY,
            ASSESSMENT_FLOW,
            get_module_config,
            get_enabled_modules,
            get_starting_module,
            get_next_module,
            get_module_sequence
        )
    except ImportError:
        ASSESSMENT_FLOW = None
        get_enabled_modules = None
# Optional imports - wrap in try/except to prevent import errors
try:
    from .enhanced_llm import EnhancedLLMWrapper, ConfidenceResult, Observation, Reasoning, ExtractionPlan
except ImportError:
    EnhancedLLMWrapper = None
    ConfidenceResult = None
    Observation = None
    Reasoning = None
    ExtractionPlan = None

try:
    from .react_nodes import ReActOrchestrator, ObserveNode, ReasonNode, PlanNode, ActionNode, ValidateNode, LearnNode
except ImportError:
    ReActOrchestrator = None
    ObserveNode = None
    ReasonNode = None
    PlanNode = None
    ActionNode = None
    ValidateNode = None
    LearnNode = None

# Internal Agent Modules (replacing external microservice wrappers)
# Note: SRA is now a continuous service in assessment_v2, not a discrete module
# from .sra.sra_module import SymptomRecognitionModule  # REMOVED - replaced by assessment_v2/core/sra_service.py

# Import from assessment_v2 (old locations removed)
try:
    from .assessment_v2.agents.da.da_module import DiagnosticAnalysisModule
except ImportError:
    DiagnosticAnalysisModule = None

try:
    from .assessment_v2.agents.tpa.tpa_module import TreatmentPlanningModule
except ImportError:
    TreatmentPlanningModule = None

__version__ = "1.0.0"

__all__ = [
    # Core classes
    'BaseAssessmentModule',
    'AssessmentModerator',
    'ModeratorDatabase',

    # Enhanced LLM and ReAct
    'EnhancedLLMWrapper',
    'ReActOrchestrator',
    'ObserveNode',
    'ReasonNode',
    'PlanNode',
    'ActionNode',
    'ValidateNode',
    'LearnNode',

    # Internal Agent Modules
    # 'SymptomRecognitionModule',  # REMOVED - replaced by assessment_v2/core/sra_service.py
    'DiagnosticAnalysisModule',
    'TreatmentPlanningModule',

    # Types
    'ModuleResponse',
    'ModuleProgress',
    'SessionState',
    'ModuleStatus',
    'RecoveryAction',
    'ErrorResponse',
    'ModuleConfig',
    'ModuleMetadata',

    # Confidence and ReAct types
    'ConfidenceResult',
    'Observation',
    'Reasoning',
    'ExtractionPlan',

    # Configuration
    'MODULE_REGISTRY',
    'ASSESSMENT_FLOW',
    'get_module_config',
    'get_enabled_modules',
    'get_starting_module',
    'get_next_module',
    'get_module_sequence',
]

