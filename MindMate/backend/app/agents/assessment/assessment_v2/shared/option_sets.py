"""
Standard option sets for SCID-CV V2
All MCQs must have exactly 4 options
"""

STANDARD_OPTIONS = {
    "yes_no_sometimes": [
        "Yes",
        "No",
        "Sometimes",
        "Not sure"
    ],
    "frequency": [
        "Daily or almost daily",
        "Several times a week",
        "Once or twice a week",
        "Rarely or never"
    ],
    "severity": [
        "Mild - noticeable but manageable",
        "Moderate - affects daily life",
        "Severe - significantly impacts life",
        "Extreme - unable to function normally"
    ],
    "duration": [
        "Less than 1 week",
        "1-2 weeks",
        "2-4 weeks",
        "More than 4 weeks"
    ],
    "impact": [
        "No impact on daily life",
        "Minor impact on daily life",
        "Moderate impact on daily life",
        "Severe impact on daily life"
    ],
    "sleep_problems": [
        "Difficulty falling asleep",
        "Difficulty staying asleep",
        "Waking up too early",
        "No sleep problems"
    ],
    "appetite_changes": [
        "Decreased appetite",
        "Increased appetite",
        "No significant change",
        "Not applicable"
    ],
    "energy_levels": [
        "Very low energy",
        "Low energy",
        "Moderate energy",
        "Normal energy"
    ],
    "concentration": [
        "Severe difficulty concentrating",
        "Moderate difficulty concentrating",
        "Mild difficulty concentrating",
        "No difficulty concentrating"
    ],
    "mood": [
        "Very sad or down",
        "Somewhat sad or down",
        "Neutral mood",
        "Positive mood"
    ]
}


def get_standard_options(option_set_name: str) -> list:
    """
    Get standard option set by name.
    
    Args:
        option_set_name: Name of option set (e.g., "yes_no_sometimes")
    
    Returns:
        List of 4 options
    """
    if option_set_name not in STANDARD_OPTIONS:
        raise ValueError(f"Unknown option set: {option_set_name}")
    
    return STANDARD_OPTIONS[option_set_name].copy()


def validate_options(options: list) -> bool:
    """
    Validate that options list has exactly 4 options.
    
    Args:
        options: List of options
    
    Returns:
        True if valid, raises ValueError if invalid
    """
    if len(options) != 4:
        raise ValueError(f"MCQ must have exactly 4 options, got {len(options)}")
    
    return True

