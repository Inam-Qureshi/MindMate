"""
Question templates for SCID-CV V2
Reusable question templates for common question types
"""

from typing import List, Optional, Dict, Any
from ..base_types import SCIDQuestion, ResponseType
from .option_sets import get_standard_options, STANDARD_OPTIONS


def create_yes_no_question(
    question_id: str,
    sequence_number: int,
    simple_text: str,
    help_text: str = "",
    examples: List[str] = None,
    clinical_text: str = "",
    dsm_criterion_id: str = "",
    priority: int = 3,
    dsm_criteria_required: bool = False,
    skip_logic: Dict[str, str] = None,
    follow_up_questions: List[str] = None
) -> SCIDQuestion:
    """
    Create a Yes/No question with standard options.
    
    Args:
        question_id: Question ID (e.g., "MDD_01")
        sequence_number: Sequence number (1, 2, 3, ...)
        simple_text: User-facing question text
        help_text: Help text for user
        examples: List of examples
        clinical_text: Clinical version (backend only)
        dsm_criterion_id: DSM criterion ID
        priority: Priority level (1=Critical, 2=High, 3=Medium, 4=Low)
        dsm_criteria_required: Is this required for diagnosis?
        skip_logic: Skip logic dict (response -> next_question_id)
        follow_up_questions: List of follow-up question IDs
    
    Returns:
        SCIDQuestion instance
    """
    return SCIDQuestion(
        id=question_id,
        sequence_number=sequence_number,
        simple_text=simple_text,
        help_text=help_text,
        examples=examples or [],
        clinical_text=clinical_text,
        dsm_criterion_id=dsm_criterion_id,
        response_type=ResponseType.YES_NO,
        options=get_standard_options("yes_no_sometimes"),
        priority=priority,
        dsm_criteria_required=dsm_criteria_required,
        skip_logic=skip_logic or {},
        follow_up_questions=follow_up_questions or []
    )


def create_mcq_question(
    question_id: str,
    sequence_number: int,
    simple_text: str,
    option_set_name: str = None,
    help_text: str = "",
    examples: List[str] = None,
    clinical_text: str = "",
    dsm_criterion_id: str = "",
    priority: int = 3,
    dsm_criteria_required: bool = False,
    skip_logic: Dict[str, str] = None,
    follow_up_questions: List[str] = None,
    custom_options: List[str] = None,
    required: bool = True  # Default to required unless explicitly set to False
) -> SCIDQuestion:
    """
    Create a multiple choice question with standard options.
    
    Args:
        question_id: Question ID (e.g., "MDD_03")
        sequence_number: Sequence number (1, 2, 3, ...)
        simple_text: User-facing question text
        option_set_name: Name of standard option set (e.g., "frequency")
        help_text: Help text for user
        examples: List of examples
        clinical_text: Clinical version (backend only)
        dsm_criterion_id: DSM criterion ID
        priority: Priority level (1=Critical, 2=High, 3=Medium, 4=Low)
        dsm_criteria_required: Is this required for diagnosis?
        skip_logic: Skip logic dict (response -> next_question_id)
        follow_up_questions: List of follow-up question IDs
        custom_options: Custom options (must be exactly 4 if provided)
    
    Returns:
        SCIDQuestion instance
    """
    if custom_options:
        if len(custom_options) != 4:
            raise ValueError(f"Custom options must have exactly 4 options, got {len(custom_options)}")
        options = custom_options
    else:
        if not option_set_name:
            raise ValueError("Either option_set_name or custom_options must be provided")
        options = get_standard_options(option_set_name)
    
    return SCIDQuestion(
        id=question_id,
        sequence_number=sequence_number,
        simple_text=simple_text,
        help_text=help_text,
        examples=examples or [],
        clinical_text=clinical_text,
        dsm_criterion_id=dsm_criterion_id,
        response_type=ResponseType.MULTIPLE_CHOICE,
        options=options,
        priority=priority,
        dsm_criteria_required=dsm_criteria_required,
        skip_logic=skip_logic or {},
        follow_up_questions=follow_up_questions or [],
        required=required
    )


def create_scale_question(
    question_id: str,
    sequence_number: int,
    simple_text: str,
    scale_range: tuple = (1, 10),
    scale_labels: List[str] = None,
    help_text: str = "",
    examples: List[str] = None,
    clinical_text: str = "",
    dsm_criterion_id: str = "",
    priority: int = 3,
    dsm_criteria_required: bool = False
) -> SCIDQuestion:
    """
    Create a scale question.
    
    Args:
        question_id: Question ID (e.g., "MDD_05")
        sequence_number: Sequence number (1, 2, 3, ...)
        simple_text: User-facing question text
        scale_range: Scale range (min, max)
        scale_labels: Scale labels (optional)
        help_text: Help text for user
        examples: List of examples
        clinical_text: Clinical version (backend only)
        dsm_criterion_id: DSM criterion ID
        priority: Priority level (1=Critical, 2=High, 3=Medium, 4=Low)
        dsm_criteria_required: Is this required for diagnosis?
    
    Returns:
        SCIDQuestion instance
    """
    return SCIDQuestion(
        id=question_id,
        sequence_number=sequence_number,
        simple_text=simple_text,
        help_text=help_text,
        examples=examples or [],
        clinical_text=clinical_text,
        dsm_criterion_id=dsm_criterion_id,
        response_type=ResponseType.SCALE,
        scale_range=scale_range,
        scale_labels=scale_labels or [],
        priority=priority,
        dsm_criteria_required=dsm_criteria_required
    )

