"""
Response extraction schemas for LLM-based parsing
Defines structured JSON schemas for different question types
"""

from typing import Dict, Any, List, Optional
from enum import Enum

class ResponseIntent(Enum):
    """Response intent classification"""
    YES = "yes"
    NO = "no"
    SOMETIMES = "sometimes"
    UNCERTAIN = "uncertain"
    AMBIGUOUS = "ambiguous"

class CertaintyLevel(Enum):
    """Certainty level for extracted response"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class IntentClarity(Enum):
    """Clarity of user intent"""
    CLEAR = "clear"
    AMBIGUOUS = "ambiguous"
    UNCERTAIN = "uncertain"


def get_yes_no_schema() -> Dict[str, Any]:
    """
    Get JSON schema for yes/no question responses.
    
    Returns:
        JSON schema dictionary for validation
    """
    return {
        "type": "object",
        "required": ["selected_option", "confidence", "validation"],
        "properties": {
            "selected_option": {
                "type": ["string", "null"],
                "enum": ["yes", "no", "sometimes", None],
                "description": "Extracted option: 'yes', 'no', 'sometimes', or null if ambiguous"
            },
            "confidence": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Confidence score for the extraction (0.0-1.0)"
            },
            "reasoning": {
                "type": "string",
                "description": "Brief explanation of how the option was extracted"
            },
            "extracted_fields": {
                "type": "object",
                "properties": {
                    "intent_clarity": {
                        "type": "string",
                        "enum": ["clear", "ambiguous", "uncertain"],
                        "description": "How clear is the user's intent"
                    },
                    "negation_detected": {
                        "type": "boolean",
                        "description": "Whether negation words were detected"
                    },
                    "contextual_qualifiers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Contextual phrases like 'but not recently', 'sometimes'"
                    },
                    "certainty_level": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "description": "Certainty level of the response"
                    },
                    "raw_sentiment": {
                        "type": "string",
                        "enum": ["positive", "negative", "neutral"],
                        "description": "Overall sentiment of the response"
                    }
                }
            },
            "validation": {
                "type": "object",
                "required": ["is_valid", "needs_clarification"],
                "properties": {
                    "is_valid": {
                        "type": "boolean",
                        "description": "Whether the response is valid and can be processed"
                    },
                    "needs_clarification": {
                        "type": "boolean",
                        "description": "Whether clarification is needed from the user"
                    },
                    "suggested_clarification": {
                        "type": ["string", "null"],
                        "description": "Suggested clarification question if needed"
                    }
                }
            },
            "dsm_criteria_mapping": {
                "type": "object",
                "additionalProperties": {
                    "type": "boolean"
                },
                "description": "Mapping of DSM criteria IDs to whether they are met"
            },
            "free_text_analysis": {
                "type": "object",
                "properties": {
                    "key_phrases": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Key phrases extracted from the response"
                    },
                    "sentiment": {
                        "type": "string",
                        "enum": ["positive", "negative", "neutral"],
                        "description": "Sentiment analysis"
                    }
                }
            }
        }
    }


def get_multiple_choice_schema() -> Dict[str, Any]:
    """Get JSON schema for multiple choice question responses"""
    return {
        "type": "object",
        "required": ["selected_option", "confidence", "validation"],
        "properties": {
            "selected_option": {
                "type": ["string", "null"],
                "description": "The selected option text, or null if unclear"
            },
            "confidence": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0
            },
            "reasoning": {
                "type": "string",
                "description": "Why this option was selected"
            },
            "extracted_fields": {
                "type": "object",
                "properties": {
                    "closest_match": {
                        "type": ["string", "null"],
                        "description": "Closest matching option if exact match not found"
                    },
                    "match_confidence": {
                        "type": "number",
                        "minimum": 0.0,
                        "maximum": 1.0
                    },
                    "alternative_options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Other options that might match"
                    }
                }
            },
            "validation": {
                "type": "object",
                "required": ["is_valid", "needs_clarification"],
                "properties": {
                    "is_valid": {"type": "boolean"},
                    "needs_clarification": {"type": "boolean"},
                    "suggested_clarification": {"type": ["string", "null"]}
                }
            }
        }
    }


def get_scale_schema() -> Dict[str, Any]:
    """Get JSON schema for scale question responses"""
    return {
        "type": "object",
        "required": ["selected_option", "confidence", "validation"],
        "properties": {
            "selected_option": {
                "type": ["number", "null"],
                "description": "The numeric value selected"
            },
            "confidence": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0
            },
            "extracted_fields": {
                "type": "object",
                "properties": {
                    "extracted_value": {"type": ["number", "null"]},
                    "value_range": {
                        "type": "array",
                        "items": {"type": "number"},
                        "minItems": 2,
                        "maxItems": 2
                    }
                }
            },
            "validation": {
                "type": "object",
                "required": ["is_valid", "needs_clarification"],
                "properties": {
                    "is_valid": {"type": "boolean"},
                    "needs_clarification": {"type": "boolean"},
                    "suggested_clarification": {"type": ["string", "null"]}
                }
            }
        }
    }


def validate_response_schema(data: Dict[str, Any], schema: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate response data against schema.
    
    Args:
        data: Response data to validate
        schema: JSON schema to validate against
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # Simple validation - check required fields
        required_fields = schema.get("required", [])
        for field in required_fields:
            if field not in data:
                return False, f"Missing required field: {field}"
        
        # Validate field types
        properties = schema.get("properties", {})
        for field_name, field_schema in properties.items():
            if field_name in data:
                field_type = field_schema.get("type")
                value = data[field_name]
                
                # Handle null values
                if value is None:
                    if "null" not in (field_type if isinstance(field_type, list) else [field_type]):
                        return False, f"Field '{field_name}' cannot be null"
                    continue
                
                # Type validation
                if isinstance(field_type, list):
                    if not any(_validate_type(value, t) for t in field_type):
                        return False, f"Field '{field_name}' has invalid type"
                else:
                    if not _validate_type(value, field_type):
                        return False, f"Field '{field_name}' has invalid type"
                
                # Enum validation
                if "enum" in field_schema:
                    if value not in field_schema["enum"]:
                        return False, f"Field '{field_name}' value '{value}' not in allowed enum"
        
        return True, None
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"


def _validate_type(value: Any, expected_type: str) -> bool:
    """Validate value type"""
    if expected_type == "string":
        return isinstance(value, str)
    elif expected_type == "number":
        return isinstance(value, (int, float))
    elif expected_type == "integer":
        return isinstance(value, int)
    elif expected_type == "boolean":
        return isinstance(value, bool)
    elif expected_type == "array":
        return isinstance(value, list)
    elif expected_type == "object":
        return isinstance(value, dict)
    elif expected_type == "null":
        return value is None
    else:
        return True  # Unknown type, assume valid

