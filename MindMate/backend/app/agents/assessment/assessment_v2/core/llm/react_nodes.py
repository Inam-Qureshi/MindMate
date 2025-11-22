"""
ReAct Agentic Nodes for Assessment Data Extraction
==================================================

Implements the Observe → Reason → Action pattern for intelligent
data extraction with confidence scoring and fallback strategies.
"""

import logging
import time
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod

try:
    from .enhanced_llm import (
        EnhancedLLMWrapper, ConfidenceResult, Observation,
        Reasoning, ExtractionPlan
    )
except ImportError:
    try:
        from ...enhanced_llm import (
            EnhancedLLMWrapper, ConfidenceResult, Observation,
            Reasoning, ExtractionPlan
        )
    except ImportError:
        # Fallback for old location
        from app.agents.assessment.enhanced_llm import (
            EnhancedLLMWrapper, ConfidenceResult, Observation,
            Reasoning, ExtractionPlan
        )

try:
    from ...types import ModuleResponse
except ImportError:
    try:
        from app.agents.assessment.assessment_v2.types import ModuleResponse
    except ImportError:
        # Fallback for old location
        from app.agents.assessment.module_types import ModuleResponse

logger = logging.getLogger(__name__)


class ReActNode(ABC):
    """Abstract base class for ReAct nodes"""

    def __init__(self, llm_wrapper: Optional[EnhancedLLMWrapper] = None):
        self.llm_wrapper = llm_wrapper or EnhancedLLMWrapper()
        self.node_name = self.__class__.__name__

    @abstractmethod
    def process(self, *args, **kwargs) -> Any:
        """Process input and return result"""
        pass

    def _log_processing(self, input_data: Any, result: Any, processing_time: float):
        """Log node processing for debugging"""
        logger.debug(f"{self.node_name} processed in {processing_time:.2f}s")


class ObserveNode(ReActNode):
    """
    Observation Node: Analyzes user input and context

    Gathers and analyzes:
    - User input text and patterns
    - Field schema and constraints
    - Conversation history and context
    - User profile and preferences
    - Previous extraction attempts
    """

    def process(
        self,
        user_input: str,
        field_name: str,
        field_schema: Dict[str, Any],
        conversation_context: Optional[List[Dict[str, str]]] = None,
        user_profile: Optional[Dict[str, Any]] = None,
        previous_attempts: Optional[List[Dict[str, Any]]] = None,
        **kwargs
    ) -> Observation:
        """
        Create enhanced observation from input data

        Args:
            user_input: Raw user input text
            field_name: Name of field being extracted
            field_schema: Schema definition for the field
            conversation_context: Recent conversation history
            user_profile: User profile and preferences
            previous_attempts: Previous extraction attempts

        Returns:
            Enhanced Observation object
        """
        start_time = time.time()

        try:
            # Create base observation
            observation = Observation(
                user_input=user_input.strip(),
                field_name=field_name,
                field_schema=field_schema.copy(),
                conversation_context=conversation_context or [],
                user_profile=user_profile or {},
                previous_attempts=previous_attempts or []
            )

            # Enhance observation with LLM wrapper's analysis
            enhanced_observation = self.llm_wrapper._enhance_observation(observation)

            processing_time = time.time() - start_time
            self._log_processing(observation, enhanced_observation, processing_time)

            return enhanced_observation

        except Exception as e:
            logger.error(f"ObserveNode processing failed: {e}", exc_info=True)
            # Return basic observation on failure
            return Observation(
                user_input=user_input.strip(),
                field_name=field_name,
                field_schema=field_schema,
                conversation_context=conversation_context or [],
                user_profile=user_profile or {},
                previous_attempts=previous_attempts or []
            )


class ReasonNode(ReActNode):
    """
    Reasoning Node: Determines extraction strategy

    Analyzes observation data to determine:
    - Optimal extraction method (rule-based vs LLM)
    - Confidence predictions
    - Fallback strategies
    - Risk assessments
    """

    def process(self, observation: Observation, **kwargs) -> Reasoning:
        """
        Apply strategic reasoning to determine extraction approach

        Args:
            observation: Enhanced observation from ObserveNode

        Returns:
            Reasoning object with strategy and rationale
        """
        start_time = time.time()

        try:
            # Use LLM wrapper's strategic reasoning
            reasoning = self.llm_wrapper._strategic_reasoning(observation)

            processing_time = time.time() - start_time
            self._log_processing(observation, reasoning, processing_time)

            return reasoning

        except Exception as e:
            logger.error(f"ReasonNode processing failed: {e}", exc_info=True)
            # Return safe fallback reasoning
            return Reasoning(
                strategy="rule_based",
                confidence_prediction=0.5,
                reasoning_text=f"Fallback due to reasoning error: {str(e)}",
                fallback_strategies=["llm_fallback", "clarify"],
                risk_assessment={"error": str(e)}
            )


class PlanNode(ReActNode):
    """
    Planning Node: Creates detailed extraction plan

    Develops comprehensive extraction strategy including:
    - Primary and fallback methods
    - Validation rules
    - Confidence thresholds
    - Timeout settings
    """

    def process(self, reasoning: Reasoning, observation: Observation, **kwargs) -> ExtractionPlan:
        """
        Create detailed extraction plan based on reasoning

        Args:
            reasoning: Strategic reasoning from ReasonNode
            observation: Enhanced observation from ObserveNode

        Returns:
            Detailed ExtractionPlan
        """
        start_time = time.time()

        try:
            # Use LLM wrapper's plan creation
            plan = self.llm_wrapper._create_extraction_plan(reasoning, observation)

            processing_time = time.time() - start_time
            self._log_processing({"reasoning": reasoning, "observation": observation}, plan, processing_time)

            return plan

        except Exception as e:
            logger.error(f"PlanNode processing failed: {e}", exc_info=True)
            # Return minimal safe plan
            return ExtractionPlan(
                primary_method="rule_based",
                fallback_methods=["clarify"],
                validation_rules=[],
                confidence_thresholds={"rule_based": 0.6},
                timeout_settings={"rule_based": 0.1, "clarify": 0.0}
            )


class ActionNode(ReActNode):
    """
    Action Node: Executes extraction plan

    Carries out the extraction using the planned strategy:
    - Executes primary method
    - Applies fallback strategies as needed
    - Handles timeouts and errors gracefully
    """

    def process(self, plan: ExtractionPlan, observation: Observation, **kwargs) -> ConfidenceResult:
        """
        Execute extraction plan and return results

        Args:
            plan: Detailed extraction plan from PlanNode
            observation: Enhanced observation from ObserveNode

        Returns:
            ConfidenceResult with extracted data
        """
        start_time = time.time()

        try:
            # Execute plan using LLM wrapper
            result = self.llm_wrapper._execute_plan(plan, observation)

            processing_time = time.time() - start_time
            result.processing_time = processing_time

            self._log_processing({"plan": plan, "observation": observation}, result, processing_time)

            return result

        except Exception as e:
            logger.error(f"ActionNode processing failed: {e}", exc_info=True)
            processing_time = time.time() - start_time

            # Return error result
            return ConfidenceResult(
                data={},
                confidence=0.0,
                reasoning=f"Action execution failed: {str(e)}",
                method="error",
                processing_time=processing_time,
                validation_errors=[str(e)]
            )


class ValidateNode(ReActNode):
    """
    Validation Node: Validates and enhances extraction results

    Performs final validation and enhancement:
    - Cross-validates extracted data
    - Applies business rules and constraints
    - Enhances confidence scores
    - Prepares data for storage
    """

    def process(self, result: ConfidenceResult, observation: Observation, **kwargs) -> ConfidenceResult:
        """
        Validate and enhance extraction results

        Args:
            result: Raw extraction result from ActionNode
            observation: Original observation for validation context

        Returns:
            Validated and enhanced ConfidenceResult
        """
        start_time = time.time()

        try:
            # Use LLM wrapper's validation
            validated_result = self.llm_wrapper._validate_result(result, observation)

            # Add validation metadata
            validated_result.metadata.update({
                "validation_performed": True,
                "validation_timestamp": time.time(),
                "field_validated": observation.field_name,
                "schema_compliance": len(validated_result.validation_errors) == 0
            })

            processing_time = time.time() - start_time
            validated_result.processing_time += processing_time

            self._log_processing({"result": result, "observation": observation}, validated_result, processing_time)

            return validated_result

        except Exception as e:
            logger.error(f"ValidateNode processing failed: {e}", exc_info=True)
            # Return result with validation error noted
            result.validation_errors.append(f"Validation failed: {str(e)}")
            result.metadata["validation_error"] = str(e)
            return result


class LearnNode(ReActNode):
    """
    Learning Node: Learns from successes and failures

    Analyzes extraction outcomes to improve future performance:
    - Updates success metrics
    - Refines strategies for specific fields
    - Learns from user interaction patterns
    - Improves confidence models
    """

    def process(self, validated_result: ConfidenceResult, observation: Observation, **kwargs) -> Dict[str, Any]:
        """
        Learn from extraction outcomes

        Args:
            validated_result: Final validated result
            observation: Original observation context

        Returns:
            Learning insights and updates
        """
        start_time = time.time()

        try:
            # Analyze success/failure patterns
            learning_insights = {
                "field": observation.field_name,
                "method": validated_result.method,
                "success": validated_result.is_valid(),
                "confidence": validated_result.confidence,
                "processing_time": validated_result.processing_time,
                "errors": validated_result.validation_errors,
                "timestamp": time.time()
            }

            # Store learning data (would integrate with learning database)
            self._store_learning_data(learning_insights, observation)

            # Generate improvement suggestions
            improvements = self._generate_improvements(learning_insights, observation)

            learning_result = {
                "insights": learning_insights,
                "improvements": improvements,
                "learning_applied": True
            }

            processing_time = time.time() - start_time
            self._log_processing({"result": validated_result, "observation": observation}, learning_result, processing_time)

            return learning_result

        except Exception as e:
            logger.error(f"LearnNode processing failed: {e}", exc_info=True)
            return {
                "insights": {"error": str(e)},
                "improvements": [],
                "learning_applied": False
            }

    def _store_learning_data(self, insights: Dict, observation: Observation):
        """Store learning data for future improvements"""
        # Placeholder for learning database integration
        # Would store patterns, success rates, user preferences, etc.
        pass

    def _generate_improvements(self, insights: Dict, observation: Observation) -> List[str]:
        """Generate improvement suggestions based on learning"""
        improvements = []

        if insights.get("success") and insights.get("confidence", 0) < 0.7:
            improvements.append(f"Increase confidence threshold for {insights['field']} field")

        if insights.get("processing_time", 0) > 5.0:
            improvements.append(f"Optimize processing time for {insights['method']} method")

        if insights.get("errors"):
            improvements.append(f"Address validation errors: {', '.join(insights['errors'][:2])}")

        return improvements


class ReActOrchestrator:
    """
    Orchestrates the complete ReAct pipeline for data extraction

    Manages the flow: Observe → Reason → Plan → Action → Validate → Learn
    """

    def __init__(self, llm_wrapper: Optional[EnhancedLLMWrapper] = None):
        """Initialize ReAct orchestrator with all nodes"""
        self.llm_wrapper = llm_wrapper or EnhancedLLMWrapper()

        # Initialize nodes
        self.observe_node = ObserveNode(self.llm_wrapper)
        self.reason_node = ReasonNode(self.llm_wrapper)
        self.plan_node = PlanNode(self.llm_wrapper)
        self.action_node = ActionNode(self.llm_wrapper)
        self.validate_node = ValidateNode(self.llm_wrapper)
        self.learn_node = LearnNode(self.llm_wrapper)

        # Performance tracking
        self.total_extractions = 0
        self.successful_extractions = 0
        self.total_processing_time = 0.0

        logger.info("ReActOrchestrator initialized with all nodes")

    def extract_data(
        self,
        user_input: str,
        field_name: str,
        field_schema: Dict[str, Any],
        conversation_context: Optional[List[Dict[str, str]]] = None,
        user_profile: Optional[Dict[str, Any]] = None,
        previous_attempts: Optional[List[Dict[str, Any]]] = None,
        **kwargs
    ) -> ConfidenceResult:
        """
        Execute complete ReAct pipeline for data extraction

        Args:
            user_input: Raw user input text
            field_name: Name of field to extract
            field_schema: Schema definition for the field
            conversation_context: Recent conversation history
            user_profile: User profile and preferences
            previous_attempts: Previous extraction attempts

        Returns:
            ConfidenceResult with extracted data and metadata
        """
        start_time = time.time()
        self.total_extractions += 1

        try:
            # Step 1: Observe
            logger.debug(f"ReAct Step 1: Observing input for field '{field_name}'")
            observation = self.observe_node.process(
                user_input=user_input,
                field_name=field_name,
                field_schema=field_schema,
                conversation_context=conversation_context,
                user_profile=user_profile,
                previous_attempts=previous_attempts,
                **kwargs
            )

            # Step 2: Reason
            logger.debug(f"ReAct Step 2: Reasoning about extraction strategy")
            reasoning = self.reason_node.process(observation, **kwargs)

            # Step 3: Plan
            logger.debug(f"ReAct Step 3: Creating extraction plan")
            plan = self.plan_node.process(reasoning, observation, **kwargs)

            # Step 4: Action
            logger.debug(f"ReAct Step 4: Executing extraction plan")
            result = self.action_node.process(plan, observation, **kwargs)

            # Step 5: Validate
            logger.debug(f"ReAct Step 5: Validating extraction results")
            validated_result = self.validate_node.process(result, observation, **kwargs)

            # Step 6: Learn
            logger.debug(f"ReAct Step 6: Learning from extraction outcomes")
            learning = self.learn_node.process(validated_result, observation, **kwargs)

            # Add ReAct metadata
            validated_result.metadata.update({
                "react_pipeline": True,
                "pipeline_steps": ["observe", "reason", "plan", "action", "validate", "learn"],
                "reasoning": reasoning.to_dict(),
                "plan": plan.to_dict(),
                "learning_insights": learning.get("insights", {}),
                "improvements": learning.get("improvements", [])
            })

            # Update performance stats
            total_time = time.time() - start_time
            self.total_processing_time += total_time

            if validated_result.is_valid():
                self.successful_extractions += 1

            validated_result.processing_time = total_time

            logger.info(f"ReAct pipeline completed for field '{field_name}' in {total_time:.2f}s "
                       f"with confidence {validated_result.confidence:.2f}")

            return validated_result

        except Exception as e:
            logger.error(f"ReAct pipeline failed: {e}", exc_info=True)
            total_time = time.time() - start_time

            return ConfidenceResult(
                data={},
                confidence=0.0,
                reasoning=f"ReAct pipeline failed: {str(e)}",
                method="error",
                processing_time=total_time,
                validation_errors=[str(e)],
                metadata={"pipeline_failed": True, "error_step": "unknown"}
            )

    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics for the ReAct orchestrator"""
        success_rate = self.successful_extractions / max(1, self.total_extractions)
        avg_time = self.total_processing_time / max(1, self.total_extractions)

        return {
            "total_extractions": self.total_extractions,
            "successful_extractions": self.successful_extractions,
            "success_rate": success_rate,
            "average_processing_time": avg_time,
            "total_processing_time": self.total_processing_time
        }

    def reset_stats(self):
        """Reset performance statistics"""
        self.total_extractions = 0
        self.successful_extractions = 0
        self.total_processing_time = 0.0
