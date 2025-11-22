"""
Response Context Builder
Builds comprehensive context for LLM response parsing using question metadata, user response, and conversation history
"""

from typing import Dict, List, Any, Optional
from ..base_types import SCIDQuestion, SCIDModule


class ResponseContextBuilder:
    """Builds comprehensive context for LLM response parsing"""
    
    @staticmethod
    def build_context(
        question: SCIDQuestion,
        user_response: str,
        conversation_history: List[Dict[str, str]],
        dsm_criteria_context: Optional[Dict[str, Any]] = None,
        module: Optional[SCIDModule] = None
    ) -> Dict[str, Any]:
        """
        Build comprehensive context for LLM parsing.
        
        Args:
            question: The SCID question being answered
            user_response: User's response text
            conversation_history: Previous conversation messages
            dsm_criteria_context: DSM criteria context (optional)
            module: Module context (optional)
        
        Returns:
            Comprehensive context dictionary
        """
        from .question_metadata_extractor import QuestionMetadataExtractor
        
        # Extract question metadata
        question_metadata = QuestionMetadataExtractor.extract_question_metadata(question, module)
        
        # Build conversation context
        conversation_context = ResponseContextBuilder._build_conversation_context(conversation_history)
        
        # Build DSM context
        dsm_context = ResponseContextBuilder._build_dsm_context(
            question, dsm_criteria_context, module
        )
        
        # Combine all context
        context = {
            "question_metadata": question_metadata,
            "user_response": user_response,
            "conversation_context": conversation_context,
            "dsm_context": dsm_context,
        }
        
        return context
    
    @staticmethod
    def _build_conversation_context(conversation_history: List[Dict[str, str]], max_messages: int = 5) -> Dict[str, Any]:
        """Build conversation context from history"""
        if not conversation_history:
            return {"has_history": False, "messages": []}
        
        # Get last N messages
        recent_messages = conversation_history[-max_messages:] if len(conversation_history) > max_messages else conversation_history
        
        messages = []
        for msg in recent_messages:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            if content:
                messages.append({
                    "role": role,
                    "content": content[:200]  # Limit length
                })
        
        return {
            "has_history": len(messages) > 0,
            "message_count": len(messages),
            "messages": messages
        }
    
    @staticmethod
    def _build_dsm_context(
        question: SCIDQuestion,
        dsm_criteria_context: Optional[Dict[str, Any]],
        module: Optional[SCIDModule]
    ) -> Dict[str, Any]:
        """Build DSM criteria context"""
        context = {
            "has_dsm_context": False,
            "criterion_id": question.dsm_criterion_id if question.dsm_criterion_id else None,
            "criteria_required": question.dsm_criteria_required,
        }
        
        # Add module-level DSM context
        if module and module.dsm_criteria:
            context["module_dsm_criteria"] = module.dsm_criteria
            context["dsm_criteria_type"] = module.dsm_criteria_type
            context["minimum_criteria_count"] = module.minimum_criteria_count
            context["duration_requirement"] = module.duration_requirement
        
        # Add question-specific DSM context
        if dsm_criteria_context:
            context["has_dsm_context"] = True
            context["dsm_criteria_context"] = dsm_criteria_context
        
        return context
    
    @staticmethod
    def format_context_for_prompt(context: Dict[str, Any]) -> str:
        """
        Format context into a readable string for LLM prompts.
        
        Args:
            context: Context dictionary
        
        Returns:
            Formatted string for prompt
        """
        from .question_metadata_extractor import QuestionMetadataExtractor
        
        lines = []
        
        # Question Metadata
        question_metadata = context.get("question_metadata", {})
        metadata_text = QuestionMetadataExtractor.format_metadata_for_prompt(question_metadata)
        lines.append(metadata_text)
        
        # User Response
        lines.append("=== USER RESPONSE ===")
        lines.append(f'"{context.get("user_response", "N/A")}"')
        lines.append("")
        
        # Conversation Context
        conv_context = context.get("conversation_context", {})
        if conv_context.get("has_history"):
            lines.append("=== CONVERSATION CONTEXT ===")
            lines.append(f"Recent Messages ({conv_context.get('message_count', 0)}):")
            for msg in conv_context.get("messages", []):
                role = msg.get("role", "unknown")
                content = msg.get("content", "")
                lines.append(f"  {role.upper()}: {content}")
            lines.append("")
        
        # DSM Context
        dsm_context = context.get("dsm_context", {})
        if dsm_context.get("has_dsm_context") or dsm_context.get("criterion_id"):
            lines.append("=== DSM CRITERIA CONTEXT ===")
            if dsm_context.get("criterion_id"):
                lines.append(f"Criterion ID: {dsm_context['criterion_id']}")
            if dsm_context.get("module_dsm_criteria"):
                lines.append(f"Module DSM Criteria Type: {dsm_context.get('dsm_criteria_type', 'Unknown')}")
            if dsm_context.get("minimum_criteria_count"):
                lines.append(f"Minimum Criteria Needed: {dsm_context['minimum_criteria_count']}")
            if dsm_context.get("duration_requirement"):
                lines.append(f"Duration Requirement: {dsm_context['duration_requirement']}")
            if dsm_context.get("dsm_criteria_context"):
                lines.append(f"Additional Context: {dsm_context['dsm_criteria_context']}")
            lines.append("")
        
        return "\n".join(lines)

