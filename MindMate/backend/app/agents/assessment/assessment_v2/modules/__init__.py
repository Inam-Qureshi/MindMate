"""
SCID-CV V2 Modules
Module registry and imports
"""

# Mood Disorders
from .mood_disorders import create_mdd_module, create_bipolar_module

# Anxiety Disorders
from .anxiety_disorders import (
    create_gad_module,
    create_panic_module,
    create_agoraphobia_module,
    create_social_anxiety_module,
    create_specific_phobia_module
)

# Trauma Disorders
from .trauma_disorders import create_ptsd_module, create_adjustment_module

# Other Disorders
from .other_disorders import (
    create_ocd_module,
    create_adhd_module,
    create_eating_disorders_module,
    create_alcohol_use_module,
    create_substance_use_module
)

# Basic Information Modules
from .basic_info import (
    create_demographics_module,
    create_concern_module,
    create_risk_assessment_module
)

# Module Registry
MODULE_REGISTRY = {
    # Basic Information
    "DEMOGRAPHICS": create_demographics_module,
    "CONCERN": create_concern_module,
    "RISK_ASSESSMENT": create_risk_assessment_module,
    # Mood Disorders
    "MDD": create_mdd_module,
    "BIPOLAR": create_bipolar_module,
    # Anxiety Disorders
    "GAD": create_gad_module,
    "PANIC": create_panic_module,
    "AGORAPHOBIA": create_agoraphobia_module,
    "SOCIAL_ANXIETY": create_social_anxiety_module,
    "SPECIFIC_PHOBIA": create_specific_phobia_module,
    # Trauma Disorders
    "PTSD": create_ptsd_module,
    "ADJUSTMENT": create_adjustment_module,
    # Other Disorders
    "OCD": create_ocd_module,
    "ADHD": create_adhd_module,
    "EATING_DISORDERS": create_eating_disorders_module,
    "ALCOHOL_USE": create_alcohol_use_module,
    "SUBSTANCE_USE": create_substance_use_module,
}


def get_module(module_id: str):
    """Get a module by ID"""
    if module_id not in MODULE_REGISTRY:
        raise ValueError(f"Module {module_id} not found in registry")
    return MODULE_REGISTRY[module_id]()


def get_all_modules():
    """Get all available modules"""
    return list(MODULE_REGISTRY.keys())


__all__ = [
    # Basic Information Module creators
    "create_demographics_module",
    "create_concern_module",
    "create_risk_assessment_module",
    # Mood Disorder Module creators
    "create_mdd_module",
    "create_bipolar_module",
    # Anxiety Disorder Module creators
    "create_gad_module",
    "create_panic_module",
    "create_agoraphobia_module",
    "create_social_anxiety_module",
    "create_specific_phobia_module",
    # Trauma Disorder Module creators
    "create_ptsd_module",
    "create_adjustment_module",
    # Other Disorder Module creators
    "create_ocd_module",
    "create_adhd_module",
    "create_eating_disorders_module",
    "create_alcohol_use_module",
    "create_substance_use_module",
    # Registry
    "MODULE_REGISTRY",
    "get_module",
    "get_all_modules",
]

