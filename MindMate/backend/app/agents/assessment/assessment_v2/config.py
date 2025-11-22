"""
Configuration and module registry for the assessment system
Migrated from assessment/config.py
Updated to use assessment_v2 modules
"""

import logging
from typing import Dict, List, Any
from .types import ModuleConfig

logger = logging.getLogger(__name__)

# ============================================================================
# MODULE REGISTRY
# ============================================================================

MODULE_REGISTRY: Dict[str, ModuleConfig] = {
    # Basic Information Modules (assessment_v2)
    "demographics": ModuleConfig(
        name="demographics",
        class_path="app.agents.assessment.assessment_v2.modules.basic_info.demographics.create_demographics_module",
        enabled=True,
        priority=1,
        auto_start=True,
        description="Collect patient demographic information including age, gender, education, occupation, and background",
        estimated_duration=300,  # 5 minutes
        dependencies=[],
        metadata={
            "category": "intake",
            "required": True,
            "skippable": False,
            "module_type": "assessment_v2"
        }
    ),

    "presenting_concern": ModuleConfig(
        name="presenting_concern",
        class_path="app.agents.assessment.assessment_v2.modules.basic_info.concern.create_concern_module",
        enabled=True,
        priority=2,
        auto_start=False,
        description="Collect and understand the patient's presenting concern and main reason for seeking help",
        estimated_duration=600,  # 10 minutes
        dependencies=[],
        metadata={
            "category": "intake",
            "required": True,
            "skippable": False,
            "module_type": "assessment_v2"
        }
    ),

    "risk_assessment": ModuleConfig(
        name="risk_assessment",
        class_path="app.agents.assessment.assessment_v2.modules.basic_info.risk_assessment.create_risk_assessment_module",
        enabled=True,
        priority=3,
        auto_start=False,
        description="Comprehensive risk assessment for mental health safety evaluation including suicide risk and self-harm assessment",
        estimated_duration=480,  # 8 minutes
        dependencies=["presenting_concern"],
        metadata={
            "category": "safety",
            "required": True,
            "skippable": False,
            "module_type": "assessment_v2"
        }
    ),

    "scid_screening": ModuleConfig(
        name="scid_screening",
        class_path="app.agents.assessment.assessment_v2.modules.screening.scid_screening.SCIDScreeningModule",
        enabled=True,
        priority=4,
        auto_start=False,
        description="Targeted SCID-5-SC screening questions based on assessment data to identify additional mental health concerns",
        estimated_duration=300,  # 5 minutes
        dependencies=["presenting_concern", "risk_assessment"],
        metadata={
            "category": "screening",
            "required": False,
            "skippable": True,
            "module_type": "assessment_v2"
        }
    ),

    "scid_cv_diagnostic": ModuleConfig(
        name="scid_cv_diagnostic",
        class_path="app.agents.assessment.assessment_v2.deployer.scid_cv_deployer.SCID_CV_ModuleDeployer",
        enabled=True,
        priority=5,
        auto_start=False,
        description="Comprehensive SCID-CV diagnostic module deployment - intelligently selected based on assessment data",
        estimated_duration=1200,  # 20 minutes (variable based on selected module)
        dependencies=["presenting_concern", "risk_assessment", "scid_screening"],
        metadata={
            "category": "diagnostic",
            "required": False,
            "skippable": False,
            "dynamic": True,
            "module_type": "assessment_v2"
        }
    ),
    
    # Agent-based Diagnostic Modules (assessment_v2)
    # NOTE: SRA is NOT a module - it's a continuous background service
    # SRA processes all responses in real-time throughout the workflow
    
    "da_diagnostic_analysis": ModuleConfig(
        name="da_diagnostic_analysis",
        class_path="app.agents.assessment.assessment_v2.agents.da.da_module.DiagnosticAnalysisModule",
        enabled=True,
        priority=6,  # Runs after all diagnostic modules
        auto_start=False,
        description="Diagnostic Analysis Agent - Analyzes all assessment data and maps to DSM-5 criteria. Runs after ALL diagnostic modules complete.",
        estimated_duration=600,  # 10 minutes
        dependencies=["scid_cv_diagnostic"],  # Depends on all diagnostic modules completing
        # NOTE: DA will access ALL module results and symptom database from SRA service
        metadata={
            "category": "diagnostic",
            "required": False,
            "skippable": False,  # Once started, should complete
            "agent_type": "internal",
            "module_type": "assessment_v2",
            "runs_after": "all_diagnostic_modules",  # Runs after ALL diagnostic modules
            "uses_sra_data": True  # Uses symptom database from SRA service
        }
    ),
    
    # Treatment Planning Agent (assessment_v2)
    "tpa_treatment_planning": ModuleConfig(
        name="tpa_treatment_planning",
        class_path="app.agents.assessment.assessment_v2.agents.tpa.tpa_module.TreatmentPlanningModule",
        enabled=True,
        priority=7,  # Runs after DA completes
        auto_start=False,
        description="Treatment Planning Agent - Generate personalized evidence-based treatment plan using all assessment data and DA results",
        estimated_duration=900,  # 15 minutes
        dependencies=["da_diagnostic_analysis"],  # Depends on DA completing
        # NOTE: TPA uses ALL information including DA results, symptom database, and all module results
        metadata={
            "category": "treatment",
            "required": False,
            "skippable": False,  # Once started, should complete
            "agent_type": "internal",
            "module_type": "assessment_v2",
            "runs_after": "da_diagnostic_analysis",  # Runs after DA completes
            "uses_all_data": True,  # Uses all assessment data
            "uses_sra_data": True,  # Uses symptom database from SRA service
            "uses_da_results": True  # Uses DA diagnostic results
        }
    ),
}


# ============================================================================
# ASSESSMENT FLOW CONFIGURATION
# ============================================================================

ASSESSMENT_FLOW = {
    # Default sequence of modules - ENFORCED ORDER
    # NOTE: SRA is NOT in this sequence - it's a continuous background service
    # SRA processes all responses throughout the workflow
    "default_sequence": [
        "demographics",           # 1. Demographics (basic info)
        "presenting_concern",     # 2. Main mental health concerns
        "risk_assessment",        # 3. Safety evaluation
        "scid_screening",         # 4. Targeted SCID-5-SC screening
        "scid_cv_diagnostic",     # 5. Comprehensive SCID-CV diagnostic assessment (may include multiple modules)
        "da_diagnostic_analysis", # 6. Diagnostic analysis with DSM-5 (runs after ALL diagnostic modules)
        "tpa_treatment_planning", # 7. Treatment plan generation (runs after DA)
    ],
    
    # Background services (not in module flow)
    "background_services": {
        "sra": {
            "enabled": True,
            "description": "Continuous Symptom Recognition and Analysis service - processes all responses in real-time",
            "runs_throughout": True,  # Runs throughout entire workflow
            "no_user_interaction": True  # Works silently in background
        }
    },
    
    # Flow control settings
    "allow_skip": False,          # Allow users to skip modules
    "allow_back": True,            # Allow users to go back to previous modules
    "save_on_each_step": True,     # Save state after each message
    "auto_transition": True,       # Automatically transition when module completes
    
    # Conditional flows (future feature)
    "conditional_flows": {
        # Example: Based on demographics, choose different clinical paths
        # "high_risk": ["demographics", "crisis_assessment", "safety_planning"],
        # "low_risk": ["demographics", "clinical_history", "treatment_planning"],
    },
    
    # Module-specific overrides
    "module_overrides": {
        # Example: Override settings for specific modules
        # "demographics": {
        #     "max_retry_attempts": 3,
        #     "timeout": 600,
        # }
    }
}


# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

DATABASE_CONFIG = {
    # Main assessment database
    "assessment_db": "assessment_sessions.db",
    
    # Checkpoint database for state recovery
    "checkpoint_db": "assessment_checkpoints.db",
    
    # Database connection settings
    "timeout": 30.0,
    "check_same_thread": False,
    
    # Backup and retention settings
    "enable_backups": True,
    "backup_interval": 3600,  # seconds
    "retention_days": 90,
    
    # Performance settings
    "connection_pool_size": 5,
    "enable_wal_mode": True,  # Write-Ahead Logging for better concurrency
}


# ============================================================================
# MODERATOR CONFIGURATION
# ============================================================================

MODERATOR_CONFIG = {
    # Session management
    "session_timeout": 3600,  # 1 hour of inactivity
    "max_sessions_per_user": 5,
    "allow_resume": True,
    
    # Error handling
    "max_retry_attempts": 3,
    "retry_delay": 1.0,  # seconds
    "error_recovery_strategy": "graceful",  # "graceful", "strict", "skip"
    
    # State management
    "checkpoint_interval": 60,  # Save checkpoint every 60 seconds
    "enable_state_compression": False,
    
    # Logging
    "log_level": "INFO",
    "log_conversations": True,
    "log_state_changes": True,
    
    # Performance
    "enable_caching": True,
    "cache_ttl": 300,  # seconds
}


# ============================================================================
# RESPONSE TEMPLATES
# ============================================================================

RESPONSE_TEMPLATES = {
    "welcome": {
        "en": "Hello! Welcome to your assessment. I'll guide you through a series of questions to better understand your needs. This should take about {estimated_time} minutes. Let's get started!",
    },
    
    "module_transition": {
        "en": "Great! Now let's move on to the next section.",
    },
    
    "completion": {
        "en": "Thank you for completing the assessment! All your information has been saved securely.",
    },
    
    "error_generic": {
        "en": "I'm sorry, I encountered an issue. Let's try that again.",
    },
    
    "error_timeout": {
        "en": "This is taking longer than expected. Would you like to continue or take a break?",
    },
    
    "session_resumed": {
        "en": "Welcome back! Let's continue where we left off.",
    },
    
    "session_expired": {
        "en": "Your session has expired. Would you like to start a new assessment?",
    },
    
    # Presenting Concern Module Templates
    "presenting_concern_intro": {
        "en": "Now I'd like to understand what brings you here today. Could you tell me about your main concern or what you're hoping to get help with?",
    },
    "presenting_concern_complete": {
        "en": "Thank you for sharing about your concern. I have a good understanding now.",
    },
    "presenting_concern_error": {
        "en": "I had trouble processing that. Could you rephrase your response?",
    },
    
    # Risk Assessment Module Templates
    "risk_assessment_intro": {
        "en": "I now need to ask some important questions about your safety and wellbeing to ensure you get the appropriate care and support.",
    },
    "risk_assessment_complete": {
        "en": "Risk assessment completed. The results will help your care team provide appropriate support.",
    },
    "risk_assessment_error": {
        "en": "I had trouble processing that. Could you please try again?",
    },
    "risk_assessment_critical": {
        "en": "🚨 CRITICAL RISK LEVEL DETECTED - Immediate safety measures are required.",
    },
    "risk_assessment_high": {
        "en": "⚠️ HIGH RISK LEVEL DETECTED - Urgent evaluation recommended.",
    },
    "risk_assessment_moderate": {
        "en": "⚡ MODERATE RISK LEVEL DETECTED - Regular monitoring recommended.",
    },
    "risk_assessment_low": {
        "en": "✅ LOW RISK LEVEL - Continue with routine care.",
    },
}


# ============================================================================
# VALIDATION RULES
# ============================================================================

VALIDATION_RULES = {
    # Message validation
    "min_message_length": 1,
    "max_message_length": 2000,
    
    # Session validation
    "require_user_id": True,
    "require_session_id": True,
    
    # Module validation
    "validate_module_sequence": True,
    "enforce_dependencies": True,
}


# ============================================================================
# FEATURE FLAGS
# ============================================================================

FEATURE_FLAGS = {
    "enable_progress_tracking": True,
    "enable_analytics": True,
    "enable_module_recommendations": False,  # AI-suggested next module
    "enable_adaptive_flows": False,  # Dynamic flow based on responses
    "enable_multi_language": False,
    "enable_voice_input": False,
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_module_config(module_name: str) -> ModuleConfig:
    """
    Get configuration for a specific module.
    
    Args:
        module_name: Name of the module
    
    Returns:
        ModuleConfig object
    
    Raises:
        KeyError: If module not found in registry
    """
    if module_name not in MODULE_REGISTRY:
        raise KeyError(f"Module '{module_name}' not found in registry")
    return MODULE_REGISTRY[module_name]


def get_enabled_modules() -> List[str]:
    """
    Get list of enabled module names.
    
    Returns:
        List of module names that are enabled
    """
    return [
        name for name, config in MODULE_REGISTRY.items()
        if config.enabled
    ]


def get_module_sequence() -> List[str]:
    """
    Get the default assessment flow sequence.
    
    Returns:
        List of module names in order
    """
    return ASSESSMENT_FLOW["default_sequence"]


def get_starting_module() -> str:
    """
    Get the first module in the assessment flow.
    
    Returns:
        Name of the starting module
    """
    sequence = get_module_sequence()
    if not sequence:
        raise ValueError("No modules configured in assessment flow")
    return sequence[0]


def validate_module_dependencies(module_name: str, completed_modules: List[str]) -> tuple[bool, str]:
    """
    Check if a module's dependencies are satisfied.
    
    Args:
        module_name: Name of the module to validate
        completed_modules: List of modules already completed
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        config = get_module_config(module_name)
        
        for dependency in config.dependencies:
            if dependency not in completed_modules:
                return False, f"Module '{module_name}' requires '{dependency}' to be completed first"
        
        return True, ""
    
    except KeyError as e:
        return False, str(e)


def get_next_module(current_module: str) -> str:
    """
    Get the next module in the sequence.
    
    Args:
        current_module: Current module name
    
    Returns:
        Next module name or None if at end
    """
    sequence = get_module_sequence()
    
    try:
        current_index = sequence.index(current_module)
        if current_index < len(sequence) - 1:
            return sequence[current_index + 1]
    except ValueError:
        pass
    
    return None


def validate_module_order(module_sequence: List[str]) -> bool:
    """
    Validate that the module sequence follows the required order for enabled modules.

    Args:
        module_sequence: List of module names to validate

    Returns:
        True if order is valid, False otherwise
    """
    # Get all enabled modules and their dependencies
    enabled_modules = {name: config for name, config in MODULE_REGISTRY.items() if config.enabled}

    # Check if all enabled modules are in the sequence
    for module_name in enabled_modules:
        if module_name not in module_sequence:
            logger.error(f"Enabled module '{module_name}' missing from sequence")
            return False

    # Check dependency ordering
    for module_name, config in enabled_modules.items():
        if not config.dependencies:
            continue

        module_index = module_sequence.index(module_name)

        for dependency in config.dependencies:
            if dependency not in enabled_modules:
                # Skip disabled dependencies
                continue

            if dependency not in module_sequence:
                logger.error(f"Dependency '{dependency}' for module '{module_name}' not found in sequence")
                return False

            dependency_index = module_sequence.index(dependency)
            if dependency_index >= module_index:
                logger.error(f"Module '{module_name}' appears before its dependency '{dependency}'")
                return False

    return True


def get_module_flow_info() -> Dict[str, Any]:
    """
    Get comprehensive flow information for the assessment system.
    
    Returns:
        Dictionary containing flow configuration and validation
    """
    sequence = get_module_sequence()
    is_valid = validate_module_order(sequence)
    
    return {
        "sequence": sequence,
        "is_valid_order": is_valid,
        "total_modules": len(sequence),
        "required_modules": ["demographics", "presenting_concern", "risk_assessment"],
        "flow_type": "sequential",
        "enforcement": "strict"
    }


def estimate_total_duration() -> int:
    """
    Estimate total duration of all modules in the flow.
    
    Returns:
        Estimated duration in seconds
    """
    total = 0
    for module_name in get_module_sequence():
        config = get_module_config(module_name)
        total += config.estimated_duration
    return total


# ============================================================================
# EXPORT
# ============================================================================

__all__ = [
    'MODULE_REGISTRY',
    'ASSESSMENT_FLOW',
    'DATABASE_CONFIG',
    'MODERATOR_CONFIG',
    'RESPONSE_TEMPLATES',
    'VALIDATION_RULES',
    'FEATURE_FLAGS',
    'get_module_config',
    'get_enabled_modules',
    'get_module_sequence',
    'get_starting_module',
    'validate_module_dependencies',
    'get_next_module',
    'estimate_total_duration',
]

