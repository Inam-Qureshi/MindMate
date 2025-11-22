"""
Question Metadata Extractor
Extracts all available metadata from SCIDQuestion for comprehensive LLM prompts
"""

from typing import Dict, Any, Optional
from ..base_types import SCIDQuestion, SCIDModule, ResponseType


class QuestionMetadataExtractor:
    """Extracts comprehensive metadata from SCIDQuestion for LLM prompts"""
    
    @staticmethod
    def extract_question_metadata(question: SCIDQuestion, module: Optional[SCIDModule] = None) -> Dict[str, Any]:
        """
        Extract all available metadata from a SCIDQuestion.
        
        Args:
            question: The SCID question to extract metadata from
            module: Optional module context (for module-level metadata)
        
        Returns:
            Dictionary containing all question metadata
        """
        metadata = {
            # Basic Identification
            "question_id": question.id,
            "sequence_number": question.sequence_number,
            
            # Question Text (User-Facing)
            "simple_text": question.simple_text,
            "help_text": question.help_text if question.help_text else None,
            "examples": question.examples if question.examples else [],
            
            # Clinical Context (Backend Only - helps LLM understand clinical intent)
            "clinical_text": question.clinical_text if question.clinical_text else None,
            "dsm_criterion_id": question.dsm_criterion_id if question.dsm_criterion_id else None,
            "symptom_category": question.symptom_category if question.symptom_category else None,
            
            # Response Type & Options
            "response_type": question.response_type.value,
            "options": question.options if question.options else [],
            "scale_range": question.scale_range if question.response_type == ResponseType.SCALE else None,
            "scale_labels": question.scale_labels if question.scale_labels else [],
            
            # Routing & Logic Hints (helps LLM understand expected responses)
            "priority": question.priority,
            "skip_logic": question.skip_logic if question.skip_logic else {},
            "follow_up_questions": question.follow_up_questions if question.follow_up_questions else [],
            "conditional_logic": question.conditional_logic if question.conditional_logic else {},
            
            # DSM Criteria Context
            "dsm_criteria_required": question.dsm_criteria_required,
            "dsm_criteria_optional": question.dsm_criteria_optional,
            "criteria_weight": question.criteria_weight,
            
            # Validation & Requirements
            "required": question.required,
            "accepts_free_text": question.accepts_free_text,
            "free_text_prompt": question.free_text_prompt if question.accepts_free_text else None,
            "validation_rules": question.validation_rules if question.validation_rules else {},
            
            # Time Estimates
            "estimated_time_seconds": question.estimated_time_seconds,
        }
        
        # Add module-level context if available
        if module:
            metadata["module_context"] = {
                "module_id": module.id,
                "module_name": module.name,
                "module_description": module.description,
                "module_category": module.category,
                "dsm_criteria_type": module.dsm_criteria_type,
                "duration_requirement": module.duration_requirement if module.duration_requirement else None,
            }
        
        # Remove None values to keep metadata clean
        metadata = {k: v for k, v in metadata.items() if v is not None and v != [] and v != {}}
        
        return metadata
    
    @staticmethod
    def format_metadata_for_prompt(metadata: Dict[str, Any]) -> str:
        """
        Format metadata into a readable string for LLM prompts.
        
        Args:
            metadata: Question metadata dictionary
        
        Returns:
            Formatted string for prompt
        """
        lines = []
        
        # Module Context (if available)
        if "module_context" in metadata:
            module_ctx = metadata["module_context"]
            lines.append("=== MODULE CONTEXT ===")
            lines.append(f"Module: {module_ctx.get('module_name', 'Unknown')} ({module_ctx.get('module_id', 'Unknown')})")
            if module_ctx.get("module_description"):
                lines.append(f"Description: {module_ctx['module_description']}")
            if module_ctx.get("module_category"):
                lines.append(f"Category: {module_ctx['module_category']}")
            if module_ctx.get("duration_requirement"):
                lines.append(f"Duration Requirement: {module_ctx['duration_requirement']}")
            lines.append("")
        
        # Question Identification
        lines.append("=== QUESTION IDENTIFICATION ===")
        lines.append(f"Question ID: {metadata.get('question_id', 'Unknown')}")
        lines.append(f"Sequence: {metadata.get('sequence_number', 'Unknown')}")
        lines.append(f"Priority: {metadata.get('priority', 'Unknown')} (1=Critical, 2=High, 3=Medium, 4=Low)")
        lines.append("")
        
        # Question Text
        lines.append("=== QUESTION TEXT ===")
        lines.append(f"Main Question: {metadata.get('simple_text', 'N/A')}")
        if metadata.get("help_text"):
            lines.append(f"Help Text: {metadata['help_text']}")
        if metadata.get("clinical_text"):
            lines.append(f"Clinical Context: {metadata['clinical_text']}")
        lines.append("")
        
        # Examples
        if metadata.get("examples"):
            lines.append("=== EXAMPLE RESPONSES ===")
            for i, example in enumerate(metadata["examples"], 1):
                lines.append(f"  {i}. {example}")
            lines.append("")
        
        # Response Type & Options
        lines.append("=== RESPONSE TYPE & OPTIONS ===")
        lines.append(f"Response Type: {metadata.get('response_type', 'Unknown')}")
        
        if metadata.get("options"):
            lines.append("Available Options:")
            for i, option in enumerate(metadata["options"], 1):
                lines.append(f"  {i}. {option}")
        elif metadata.get("scale_range"):
            lines.append(f"Scale Range: {metadata['scale_range'][0]} to {metadata['scale_range'][1]}")
            if metadata.get("scale_labels"):
                lines.append(f"Scale Labels: {', '.join(metadata['scale_labels'])}")
        
        lines.append("")
        
        # DSM Criteria Context
        if metadata.get("dsm_criterion_id"):
            lines.append("=== DSM CRITERIA CONTEXT ===")
            lines.append(f"DSM Criterion ID: {metadata['dsm_criterion_id']}")
            lines.append(f"Required for Diagnosis: {metadata.get('dsm_criteria_required', False)}")
            lines.append(f"Optional/Supporting: {metadata.get('dsm_criteria_optional', True)}")
            if metadata.get("symptom_category"):
                lines.append(f"Symptom Category: {metadata['symptom_category']}")
            lines.append("")
        
        # Routing Logic Hints
        if metadata.get("skip_logic") or metadata.get("follow_up_questions"):
            lines.append("=== ROUTING LOGIC HINTS ===")
            if metadata.get("skip_logic"):
                lines.append("Skip Logic:")
                for response, next_q in metadata["skip_logic"].items():
                    lines.append(f"  If response is '{response}' → skip to {next_q}")
            if metadata.get("follow_up_questions"):
                lines.append(f"Follow-up Questions: {', '.join(metadata['follow_up_questions'])}")
            lines.append("")
        
        # Validation Rules
        if metadata.get("validation_rules"):
            lines.append("=== VALIDATION RULES ===")
            for rule, value in metadata["validation_rules"].items():
                lines.append(f"  {rule}: {value}")
            lines.append("")
        
        return "\n".join(lines)

