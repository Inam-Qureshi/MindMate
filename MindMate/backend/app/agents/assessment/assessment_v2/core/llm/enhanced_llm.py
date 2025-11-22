"""
Enhanced LLM Wrapper with Confidence Scoring and ReAct Support
==============================================================

Extends the basic LLMWrapper with:
- Confidence scoring for extraction results
- Structured output validation
- Context-aware processing
- ReAct agentic decision making
- Enhanced error handling and fallbacks
"""

import logging
import time
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, field
from datetime import datetime
import json

try:
    from .llm_client import LLMWrapper
except ImportError:
    try:
        from ...llm_client import LLMWrapper
    except ImportError:
        # Fallback for old location
        from app.agents.assessment.llm import LLMWrapper

try:
    from ...types import ModuleResponse
except ImportError:
    try:
        from app.agents.assessment.assessment_v2.types import ModuleResponse
    except ImportError:
        # Fallback for old location
        from app.agents.assessment.module_types import ModuleResponse

logger = logging.getLogger(__name__)


@dataclass
class ConfidenceResult:
    """Structured result with confidence scoring"""
    data: Dict[str, Any]
    confidence: float  # 0.0 to 1.0
    reasoning: str
    method: str  # 'rule_based', 'llm_primary', 'llm_fallback', 'hybrid'
    processing_time: float
    validation_errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_valid(self, threshold: float = 0.7) -> bool:
        """Check if result meets confidence threshold"""
        return self.confidence >= threshold and len(self.validation_errors) == 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "data": self.data,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "method": self.method,
            "processing_time": self.processing_time,
            "validation_errors": self.validation_errors,
            "metadata": self.metadata,
            "timestamp": datetime.now().isoformat()
        }


@dataclass
class Observation:
    """Observation data for ReAct processing"""
    user_input: str
    field_name: str
    field_schema: Dict[str, Any]
    conversation_context: List[Dict[str, str]] = field(default_factory=list)
    user_profile: Dict[str, Any] = field(default_factory=dict)
    previous_attempts: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "user_input": self.user_input,
            "field_name": self.field_name,
            "field_schema": self.field_schema,
            "conversation_context": self.conversation_context,
            "user_profile": self.user_profile,
            "previous_attempts": self.previous_attempts
        }


@dataclass
class Reasoning:
    """Reasoning data for ReAct processing"""
    strategy: str  # 'rule_based', 'llm_primary', 'llm_fallback', 'hybrid', 'clarify'
    confidence_prediction: float
    reasoning_text: str
    fallback_strategies: List[str] = field(default_factory=list)
    risk_assessment: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "strategy": self.strategy,
            "confidence_prediction": self.confidence_prediction,
            "reasoning_text": self.reasoning_text,
            "fallback_strategies": self.fallback_strategies,
            "risk_assessment": self.risk_assessment
        }


@dataclass
class ExtractionPlan:
    """Plan for data extraction"""
    primary_method: str
    fallback_methods: List[str]
    validation_rules: List[Dict[str, Any]]
    confidence_thresholds: Dict[str, float]
    timeout_settings: Dict[str, float]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "primary_method": self.primary_method,
            "fallback_methods": self.fallback_methods,
            "validation_rules": self.validation_rules,
            "confidence_thresholds": self.confidence_thresholds,
            "timeout_settings": self.timeout_settings
        }


class EnhancedLLMWrapper:
    """
    Enhanced LLM wrapper with confidence scoring and ReAct support.

    Provides intelligent data extraction with multiple fallback strategies,
    confidence scoring, and structured validation.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize enhanced LLM wrapper"""
        self.llm = LLMWrapper()
        self.config = config or self._get_default_config()

        # Performance tracking
        self.extraction_count = 0
        self.success_count = 0
        self.total_processing_time = 0.0

        logger.info("EnhancedLLMWrapper initialized")

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "confidence_threshold": 0.8,
            "llm_timeout": 5.0,  # seconds
            "max_retries": 2,
            "enable_validation": True,
            "enable_context_analysis": True,
            "fallback_priority": ["rule_based", "llm_primary", "llm_fallback", "clarify"]
        }

    def extract_with_react(
        self,
        observation: Observation,
        **kwargs
    ) -> ConfidenceResult:
        """
        Extract data using ReAct agentic approach.

        Follows: Observe → Reason → Plan → Action → Validate pattern
        """
        start_time = time.time()
        self.extraction_count += 1

        try:
            # Step 1: Enhanced Observation
            enhanced_observation = self._enhance_observation(observation)

            # Step 2: Strategic Reasoning
            reasoning = self._strategic_reasoning(enhanced_observation)

            # Step 3: Create Extraction Plan
            plan = self._create_extraction_plan(reasoning, enhanced_observation)

            # Step 4: Execute Plan with Fallbacks
            result = self._execute_plan(plan, enhanced_observation)

            # Step 5: Validate and Enhance Result
            validated_result = self._validate_result(result, enhanced_observation)

            # Update performance metrics
            processing_time = time.time() - start_time
            self.total_processing_time += processing_time

            if validated_result.is_valid(self.config["confidence_threshold"]):
                self.success_count += 1

            # Add processing metadata
            validated_result.processing_time = processing_time
            validated_result.metadata.update({
                "react_steps": ["observe", "reason", "plan", "action", "validate"],
                "observation_enhanced": True,
                "reasoning_applied": True,
                "plan_created": True,
                "validation_performed": True
            })

            return validated_result

        except Exception as e:
            logger.error(f"ReAct extraction failed: {e}", exc_info=True)
            processing_time = time.time() - start_time

            # Return failure result with error information
            return ConfidenceResult(
                data={},
                confidence=0.0,
                reasoning=f"Extraction failed: {str(e)}",
                method="error",
                processing_time=processing_time,
                validation_errors=[str(e)],
                metadata={"error_type": type(e).__name__}
            )

    def _enhance_observation(self, observation: Observation) -> Observation:
        """Enhance observation with additional context analysis"""
        try:
            # Analyze conversation patterns
            if observation.conversation_context:
                # Look for clarification patterns, user preferences, etc.
                conversation_patterns = self._analyze_conversation_patterns(
                    observation.conversation_context
                )
                observation.user_profile.update({
                    "conversation_patterns": conversation_patterns
                })

            # Analyze field-specific context
            field_context = self._analyze_field_context(
                observation.field_name,
                observation.field_schema
            )
            observation.field_schema.update({
                "context_analysis": field_context
            })

            # Analyze previous attempts for patterns
            if observation.previous_attempts:
                attempt_patterns = self._analyze_attempt_patterns(
                    observation.previous_attempts
                )
                observation.user_profile.update({
                    "attempt_patterns": attempt_patterns
                })

            return observation

        except Exception as e:
            logger.warning(f"Observation enhancement failed: {e}")
            return observation

    def _strategic_reasoning(self, observation: Observation) -> Reasoning:
        """Apply strategic reasoning to choose extraction approach"""
        try:
            field_name = observation.field_name
            user_input = observation.user_input

            # Analyze input complexity
            input_complexity = self._assess_input_complexity(user_input)

            # Check user history and preferences
            user_reliability = observation.user_profile.get("success_rate", 0.5)
            preferred_methods = observation.user_profile.get("preferred_methods", [])

            # Assess field difficulty
            field_difficulty = self._assess_field_difficulty(field_name, observation.field_schema)

            # Determine optimal strategy
            if input_complexity == "simple" and user_reliability > 0.8:
                strategy = "rule_based"
                confidence = 0.9
                reasoning = "Simple input with high user reliability - use rule-based parsing"
            elif field_difficulty == "low":
                strategy = "rule_based"
                confidence = 0.8
                reasoning = "Low difficulty field - rule-based parsing sufficient"
            elif input_complexity == "complex" or field_difficulty == "high":
                strategy = "llm_primary"
                confidence = 0.7
                reasoning = "Complex input/field requires LLM intelligence"
            else:
                strategy = "hybrid"
                confidence = 0.75
                reasoning = "Moderate complexity - use hybrid approach"

            # Define fallback strategies
            fallback_strategies = self._get_fallback_strategies(strategy)

            # Risk assessment
            risk_assessment = self._assess_extraction_risks(observation)

            return Reasoning(
                strategy=strategy,
                confidence_prediction=confidence,
                reasoning_text=reasoning,
                fallback_strategies=fallback_strategies,
                risk_assessment=risk_assessment
            )

        except Exception as e:
            logger.warning(f"Strategic reasoning failed: {e}")
            # Default to rule-based with fallbacks
            return Reasoning(
                strategy="rule_based",
                confidence_prediction=0.6,
                reasoning_text="Fallback to rule-based due to reasoning failure",
                fallback_strategies=["llm_fallback", "clarify"],
                risk_assessment={"reasoning_error": str(e)}
            )

    def _create_extraction_plan(self, reasoning: Reasoning, observation: Observation) -> ExtractionPlan:
        """Create detailed extraction plan based on reasoning"""
        try:
            primary_method = reasoning.strategy
            fallback_methods = reasoning.fallback_strategies

            # Define validation rules based on field and method
            validation_rules = self._get_validation_rules(
                observation.field_name,
                observation.field_schema,
                primary_method
            )

            # Set confidence thresholds
            confidence_thresholds = {
                "rule_based": 0.85,
                "llm_primary": self.config["confidence_threshold"],
                "llm_fallback": 0.7,
                "hybrid": 0.75
            }

            # Set timeout settings
            timeout_settings = {
                "rule_based": 0.1,  # Very fast
                "llm_primary": self.config["llm_timeout"],
                "llm_fallback": self.config["llm_timeout"] * 1.5,
                "hybrid": self.config["llm_timeout"] + 0.1
            }

            return ExtractionPlan(
                primary_method=primary_method,
                fallback_methods=fallback_methods,
                validation_rules=validation_rules,
                confidence_thresholds=confidence_thresholds,
                timeout_settings=timeout_settings
            )

        except Exception as e:
            logger.warning(f"Plan creation failed: {e}")
            # Return minimal plan
            return ExtractionPlan(
                primary_method="rule_based",
                fallback_methods=["llm_fallback"],
                validation_rules=[],
                confidence_thresholds={"rule_based": 0.7},
                timeout_settings={"rule_based": 0.1, "llm_fallback": 3.0}
            )

    def _execute_plan(self, plan: ExtractionPlan, observation: Observation) -> ConfidenceResult:
        """Execute extraction plan with fallbacks"""
        errors = []

        # Try primary method
        try:
            result = self._execute_method(
                plan.primary_method,
                observation,
                plan.timeout_settings.get(plan.primary_method, 5.0)
            )
            if result.is_valid(plan.confidence_thresholds.get(plan.primary_method, 0.7)):
                return result
            else:
                errors.append(f"Primary method {plan.primary_method} failed validation")
        except Exception as e:
            errors.append(f"Primary method {plan.primary_method} failed: {str(e)}")

        # Try fallback methods
        for fallback_method in plan.fallback_methods:
            try:
                timeout = plan.timeout_settings.get(fallback_method, 5.0)
                result = self._execute_method(fallback_method, observation, timeout)
                if result.is_valid(plan.confidence_thresholds.get(fallback_method, 0.6)):
                    result.metadata["used_fallback"] = True
                    result.metadata["fallback_from"] = plan.primary_method
                    return result
                else:
                    errors.append(f"Fallback method {fallback_method} failed validation")
            except Exception as e:
                errors.append(f"Fallback method {fallback_method} failed: {str(e)}")

        # All methods failed - return clarification request
        return ConfidenceResult(
            data={},
            confidence=0.0,
            reasoning="All extraction methods failed - clarification needed",
            method="clarify",
            processing_time=0.0,
            validation_errors=errors,
            metadata={
                "clarification_needed": True,
                "field": observation.field_name,
                "errors": errors
            }
        )

    def _execute_method(self, method: str, observation: Observation, timeout: float) -> ConfidenceResult:
        """Execute specific extraction method"""
        if method == "rule_based":
            return self._rule_based_extraction(observation)
        elif method == "llm_primary":
            return self._llm_primary_extraction(observation, timeout)
        elif method == "llm_fallback":
            return self._llm_fallback_extraction(observation, timeout)
        elif method == "hybrid":
            return self._hybrid_extraction(observation, timeout)
        else:
            raise ValueError(f"Unknown extraction method: {method}")

    def _rule_based_extraction(self, observation: Observation) -> ConfidenceResult:
        """Perform rule-based extraction (existing logic)"""
        start_time = time.time()

        try:
            # Import existing rule-based extraction
            try:
                from ...modules.basic_info.demographics.collector import _fallback_extraction
            except ImportError:
                try:
                    from app.agents.assessment.assessment_v2.modules.basic_info.demographics.collector import _fallback_extraction
                except ImportError:
                    # Old location removed - use simple fallback
                    logger.warning("Demographics collector not found, using simple extraction")
                    def _fallback_extraction(text, field_name):
                        return {"value": text, "confidence": 0.5}

            result = _fallback_extraction(observation.user_input, observation.field_name)

            # Calculate confidence based on result quality
            confidence = self._calculate_rule_based_confidence(result, observation)

            processing_time = time.time() - start_time

            return ConfidenceResult(
                data=result,
                confidence=confidence,
                reasoning="Rule-based pattern matching extraction",
                method="rule_based",
                processing_time=processing_time,
                metadata={"patterns_used": "regex_and_enum_matching"}
            )

        except Exception as e:
            processing_time = time.time() - start_time
            return ConfidenceResult(
                data={},
                confidence=0.0,
                reasoning=f"Rule-based extraction failed: {str(e)}",
                method="rule_based",
                processing_time=processing_time,
                validation_errors=[str(e)]
            )

    def _llm_primary_extraction(self, observation: Observation, timeout: float) -> ConfidenceResult:
        """Perform LLM-based extraction with full context"""
        start_time = time.time()

        try:
            # Create comprehensive prompt
            prompt = self._create_llm_extraction_prompt(observation)

            # Extract with LLM
            response = self.llm.generate_response(
                prompt=prompt,
                system_prompt=self._get_extraction_system_prompt(),
                temperature=0.1,  # Low temperature for consistency
                max_tokens=300,
                use_cache=True
            )

            processing_time = time.time() - start_time

            if response.success:
                # Parse LLM response
                extracted_data, confidence, reasoning = self._parse_llm_response(
                    response.content, observation.field_schema
                )

                return ConfidenceResult(
                    data=extracted_data,
                    confidence=confidence,
                    reasoning=reasoning,
                    method="llm_primary",
                    processing_time=processing_time,
                    metadata={
                        "llm_model": "qwen/qwen3-32b",
                        "tokens_used": response.tokens_used,
                        "cached": response.cached
                    }
                )
            else:
                return ConfidenceResult(
                    data={},
                    confidence=0.0,
                    reasoning=f"LLM extraction failed: {response.error}",
                    method="llm_primary",
                    processing_time=processing_time,
                    validation_errors=[response.error]
                )

        except Exception as e:
            processing_time = time.time() - start_time
            return ConfidenceResult(
                data={},
                confidence=0.0,
                reasoning=f"LLM primary extraction failed: {str(e)}",
                method="llm_primary",
                processing_time=processing_time,
                validation_errors=[str(e)]
            )

    def _llm_fallback_extraction(self, observation: Observation, timeout: float) -> ConfidenceResult:
        """Perform simplified LLM extraction as fallback"""
        start_time = time.time()

        try:
            # Simplified prompt for fallback
            prompt = f"""
Extract the {observation.field_name} from this text: "{observation.user_input}"

Return only a JSON object with a "value" field containing the extracted information.
If you cannot extract it with confidence, set value to null.

Text: {observation.user_input}
"""

            response = self.llm.generate_response(
                prompt=prompt,
                system_prompt="You are a data extraction assistant. Return only valid JSON.",
                temperature=0.0,  # Deterministic
                max_tokens=100,
                use_cache=True
            )

            processing_time = time.time() - start_time

            if response.success:
                try:
                    parsed = json.loads(response.content.strip())
                    value = parsed.get("value")

                    if value is not None:
                        confidence = 0.6  # Lower confidence for fallback
                        return ConfidenceResult(
                            data={"value": value},
                            confidence=confidence,
                            reasoning="Simplified LLM extraction as fallback",
                            method="llm_fallback",
                            processing_time=processing_time
                        )
                    else:
                        return ConfidenceResult(
                            data={},
                            confidence=0.0,
                            reasoning="LLM could not extract value",
                            method="llm_fallback",
                            processing_time=processing_time
                        )
                except json.JSONDecodeError:
                    return ConfidenceResult(
                        data={},
                        confidence=0.0,
                        reasoning="LLM response was not valid JSON",
                        method="llm_fallback",
                        processing_time=processing_time,
                        validation_errors=["Invalid JSON response"]
                    )
            else:
                return ConfidenceResult(
                    data={},
                    confidence=0.0,
                    reasoning=f"LLM fallback failed: {response.error}",
                    method="llm_fallback",
                    processing_time=processing_time,
                    validation_errors=[response.error]
                )

        except Exception as e:
            processing_time = time.time() - start_time
            return ConfidenceResult(
                data={},
                confidence=0.0,
                reasoning=f"LLM fallback extraction failed: {str(e)}",
                method="llm_fallback",
                processing_time=processing_time,
                validation_errors=[str(e)]
            )

    def _hybrid_extraction(self, observation: Observation, timeout: float) -> ConfidenceResult:
        """Perform hybrid extraction combining rule-based and LLM"""
        start_time = time.time()

        try:
            # First try rule-based
            rule_result = self._rule_based_extraction(observation)

            if rule_result.is_valid(0.8):  # High confidence
                processing_time = time.time() - start_time
                rule_result.processing_time = processing_time
                rule_result.method = "hybrid"
                rule_result.reasoning = "Hybrid: Rule-based with high confidence"
                return rule_result

            # If rule-based is uncertain, use LLM to validate/refine
            llm_result = self._llm_primary_extraction(observation, timeout)

            if llm_result.is_valid(0.6):
                # Combine results intelligently
                combined_data = self._combine_results(rule_result.data, llm_result.data)
                combined_confidence = max(rule_result.confidence, llm_result.confidence)

                processing_time = time.time() - start_time
                return ConfidenceResult(
                    data=combined_data,
                    confidence=combined_confidence,
                    reasoning="Hybrid: Combined rule-based and LLM results",
                    method="hybrid",
                    processing_time=processing_time,
                    metadata={
                        "rule_confidence": rule_result.confidence,
                        "llm_confidence": llm_result.confidence,
                        "combination_method": "max_confidence"
                    }
                )
            else:
                # Return rule-based result if LLM fails
                processing_time = time.time() - start_time
                rule_result.processing_time = processing_time
                rule_result.method = "hybrid"
                rule_result.reasoning = "Hybrid: Rule-based (LLM validation failed)"
                rule_result.confidence = min(rule_result.confidence, 0.7)  # Reduce confidence
                return rule_result

        except Exception as e:
            processing_time = time.time() - start_time
            return ConfidenceResult(
                data={},
                confidence=0.0,
                reasoning=f"Hybrid extraction failed: {str(e)}",
                method="hybrid",
                processing_time=processing_time,
                validation_errors=[str(e)]
            )

    def _validate_result(self, result: ConfidenceResult, observation: Observation) -> ConfidenceResult:
        """Validate and enhance extraction result"""
        try:
            validation_errors = []

            # Basic validation
            if not result.data and result.confidence > 0:
                validation_errors.append("No data extracted despite confidence score")
                result.confidence = 0.0

            # Schema validation
            if observation.field_schema.get("required") and not result.data.get("value"):
                validation_errors.append("Required field is empty")
                result.confidence *= 0.5

            # Enum validation
            if "enum" in observation.field_schema:
                extracted_value = result.data.get("value")
                if extracted_value and extracted_value not in observation.field_schema["enum"]:
                    validation_errors.append(f"Value '{extracted_value}' not in allowed enum values")
                    result.confidence *= 0.3

            # Type validation
            expected_type = observation.field_schema.get("type", "string")
            extracted_value = result.data.get("value")
            if extracted_value and not self._validate_type(extracted_value, expected_type):
                validation_errors.append(f"Value type mismatch: expected {expected_type}")
                result.confidence *= 0.5

            result.validation_errors.extend(validation_errors)

            # Adjust confidence based on validation
            if validation_errors:
                result.confidence = max(0.0, result.confidence - 0.2)

            return result

        except Exception as e:
            logger.warning(f"Result validation failed: {e}")
            result.validation_errors.append(f"Validation error: {str(e)}")
            result.confidence *= 0.8  # Slight penalty
            return result

    # Helper methods for analysis and validation
    def _analyze_conversation_patterns(self, context: List[Dict[str, str]]) -> Dict[str, Any]:
        """Analyze conversation patterns for user behavior insights"""
        # Implementation for conversation pattern analysis
        return {"patterns": "analyzed"}

    def _analyze_field_context(self, field_name: str, schema: Dict) -> Dict[str, Any]:
        """Analyze field-specific context"""
        return {"field_complexity": "medium"}

    def _analyze_attempt_patterns(self, attempts: List[Dict]) -> Dict[str, Any]:
        """Analyze previous attempt patterns"""
        return {"attempt_insights": "analyzed"}

    def _assess_input_complexity(self, user_input: str) -> str:
        """Assess complexity of user input"""
        length = len(user_input.strip())
        if length < 10:
            return "simple"
        elif length < 50:
            return "moderate"
        else:
            return "complex"

    def _assess_field_difficulty(self, field_name: str, schema: Dict) -> str:
        """Assess difficulty of field extraction"""
        if field_name in ["age", "gender"]:
            return "low"
        elif field_name in ["education_level", "occupation"]:
            return "medium"
        else:
            return "high"

    def _get_fallback_strategies(self, primary_strategy: str) -> List[str]:
        """Get fallback strategies for given primary strategy"""
        fallbacks = {
            "rule_based": ["llm_fallback", "clarify"],
            "llm_primary": ["rule_based", "llm_fallback"],
            "hybrid": ["rule_based", "clarify"]
        }
        return fallbacks.get(primary_strategy, ["clarify"])

    def _assess_extraction_risks(self, observation: Observation) -> Dict[str, Any]:
        """Assess risks associated with extraction"""
        risks = []

        if len(observation.user_input) > 200:
            risks.append("long_input")
        if observation.field_name in ["family_psychiatric_conditions"]:
            risks.append("sensitive_data")

        return {"identified_risks": risks, "risk_level": "low"}

    def _get_validation_rules(self, field_name: str, schema: Dict, method: str) -> List[Dict]:
        """Get validation rules for field and method"""
        rules = []

        if "enum" in schema:
            rules.append({
                "type": "enum_validation",
                "allowed_values": schema["enum"]
            })

        if schema.get("type") == "integer":
            rules.append({
                "type": "type_validation",
                "expected_type": "integer",
                "constraints": {"min": 0, "max": 150} if field_name == "age" else {}
            })

        return rules

    def _calculate_rule_based_confidence(self, result: Dict, observation: Observation) -> float:
        """Calculate confidence score for rule-based extraction"""
        if not result.get("value"):
            return 0.0

        confidence = 0.5  # Base confidence

        # Boost confidence for enum matches
        if observation.field_schema.get("enum"):
            if result["value"] in observation.field_schema["enum"]:
                confidence += 0.3

        # Boost confidence for type matches
        expected_type = observation.field_schema.get("type", "string")
        if self._validate_type(result["value"], expected_type):
            confidence += 0.2

        return min(1.0, confidence)

    def _create_llm_extraction_prompt(self, observation: Observation) -> str:
        """Create comprehensive LLM extraction prompt"""
        field_name = observation.field_name
        user_input = observation.user_input
        schema = observation.field_schema

        prompt = f"""
Extract the {field_name} from the user's response.

User's Response: "{user_input}"

Field Requirements:
- Name: {field_name}
"""

        if "enum" in schema:
            prompt += f"- Allowed Values: {', '.join(schema['enum'])}\n"

        if "type" in schema:
            prompt += f"- Type: {schema['type']}\n"

        if observation.user_profile:
            prompt += f"- User Context: {observation.user_profile}\n"

        prompt += """
Return a JSON object with:
- "value": the extracted value (use null if uncertain)
- "confidence": confidence score (0.0 to 1.0)
- "reasoning": brief explanation of extraction

Example for age field:
{"value": "25", "confidence": 0.9, "reasoning": "Direct age mention"}
"""

        return prompt

    def _get_extraction_system_prompt(self) -> str:
        """Get system prompt for LLM extraction"""
        return """You are an expert medical data extraction assistant.

Your task is to accurately extract specific information from user responses in a medical intake context.

Guidelines:
- Be precise and conservative
- Return null for uncertain extractions
- Consider medical context and sensitivity
- Validate against provided constraints
- Explain your reasoning briefly

Return only valid JSON."""

    def _parse_llm_response(self, response: str, schema: Dict) -> tuple:
        """Parse LLM response and extract data"""
        try:
            # Clean and parse JSON
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.endswith('```'):
                response = response[:-3]

            parsed = json.loads(response.strip())

            data = {"value": parsed.get("value")}
            confidence = float(parsed.get("confidence", 0.0))
            reasoning = parsed.get("reasoning", "LLM extraction")

            return data, confidence, reasoning

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.warning(f"Failed to parse LLM response: {e}")
            return {}, 0.0, f"Parsing failed: {str(e)}"

    def _combine_results(self, rule_data: Dict, llm_data: Dict) -> Dict:
        """Combine rule-based and LLM results intelligently"""
        if not rule_data and llm_data:
            return llm_data
        if rule_data and not llm_data:
            return rule_data

        # If both have values, prefer the one with higher confidence
        # For now, return LLM data if available
        return llm_data or rule_data

    def _validate_type(self, value: Any, expected_type: str) -> bool:
        """Validate value type"""
        try:
            if expected_type == "integer":
                int(value)
                return True
            elif expected_type == "string":
                return isinstance(value, str)
            elif expected_type == "boolean":
                return isinstance(value, bool) or value.lower() in ["yes", "no", "true", "false"]
            else:
                return True  # Unknown type, assume valid
        except:
            return False

    # Performance and monitoring methods
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        avg_time = self.total_processing_time / max(1, self.extraction_count)
        success_rate = self.success_count / max(1, self.extraction_count)

        return {
            "total_extractions": self.extraction_count,
            "successful_extractions": self.success_count,
            "success_rate": success_rate,
            "average_processing_time": avg_time,
            "total_processing_time": self.total_processing_time
        }

    def reset_stats(self):
        """Reset performance statistics"""
        self.extraction_count = 0
        self.success_count = 0
        self.total_processing_time = 0.0
