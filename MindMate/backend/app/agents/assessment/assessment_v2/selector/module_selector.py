"""
SCID-CV Module Selector for Assessment System

Uses collected assessment data (demographics, presenting concerns, risk assessment, 
and SCID-SC screening responses) to intelligently select which SCID-CV diagnostic 
module(s) should be deployed for in-depth evaluation.

Implements a ReAct (Reasoning + Acting) approach:
- Step 1 (Reasoning): Analyze all collected data to understand patient profile
- Step 2 (Action): Select the most appropriate SCID-CV module(s) for deployment
"""

import json
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

try:
    # Try assessment_v2/core/llm first (preferred location)
    from ..core.llm.llm_client import get_llm
except ImportError:
    try:
        # Fallback to old location
        from app.agents.assessment.llm import get_llm
    except ImportError:
        try:
            # Fallback to pima location
            from app.agents.pima.llm import get_llm
        except ImportError:
            get_llm = None

try:
    from app.agents.assessment.scid.scid_cv.base_types import SCIDModule
    from app.agents.assessment.scid.scid_cv import MODULE_REGISTRY as CV_MODULE_REGISTRY
except ImportError:
    SCIDModule = None
    CV_MODULE_REGISTRY = {}

logger = logging.getLogger(__name__)


@dataclass
class AssessmentDataCollection:
    """Complete collection of assessment data"""
    demographics: Dict[str, Any]
    presenting_concern: Dict[str, Any]
    scid_sc_responses: Dict[str, Any]
    session_metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    def to_summary_text(self) -> str:
        """Convert to human-readable summary for LLM reasoning"""
        summary_parts = []
        
        # Demographics summary
        demo = self.demographics
        age = demo.get('age', 'unknown age')
        gender = demo.get('gender', 'unknown gender')
        occupation = demo.get('occupation', 'unspecified occupation')
        
        summary_parts.append(f"Patient Profile: A {age} year old {gender} who works as {occupation}.")
        
        # Presenting concern summary
        concern = self.presenting_concern
        if concern.get('main_concerns'):
            concerns_list = ', '.join(concern.get('main_concerns', []))
            summary_parts.append(f"Presenting Concerns: {concerns_list}.")
        
        if concern.get('symptom_description'):
            summary_parts.append(f"Symptoms: {concern.get('symptom_description')}.")
        
        if concern.get('duration'):
            summary_parts.append(f"Duration: {concern.get('duration')}.")
        
        if concern.get('severity'):
            summary_parts.append(f"Severity Level: {concern.get('severity')}.")
        
        # Risk assessment summary (removed)
        risk_level = "not_assessed"  # Risk assessment removed

        # SCID-SC screening responses summary
        scid_sc = self.scid_sc_responses
        if scid_sc.get('positive_screens'):
            positive_items = ', '.join(scid_sc.get('positive_screens', []))
            summary_parts.append(f"SCID-SC Positive Screens: {positive_items}.")
        
        if scid_sc.get('responses'):
            response_summary = []
            for item_id, response in scid_sc.get('responses', {}).items():
                if response.get('answer') in ['yes', 'often', 'always', 'severe']:
                    response_summary.append(f"{item_id} ({response.get('answer')})")
            if response_summary:
                summary_parts.append(f"Notable Screening Responses: {', '.join(response_summary)}.")
        
        return " ".join(summary_parts)


@dataclass
class ReasoningStep:
    """Single reasoning step in the ReAct process"""
    step_number: int
    step_type: str  # 'observation', 'reasoning', 'action'
    content: str
    confidence: float = 1.0
    timestamp: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()


@dataclass
class ModuleSelection:
    """Selected SCID-CV module with reasoning"""
    module_id: str
    module_name: str
    relevance_score: float  # 0-1
    reasoning: str
    priority: int  # 1=highest priority
    estimated_duration_mins: int
    key_indicators: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class SelectionResult:
    """Complete result of module selection process"""
    selected_modules: List[ModuleSelection]
    reasoning_steps: List[ReasoningStep]
    total_estimated_duration_mins: int
    confidence_score: float
    timestamp: str
    raw_llm_response: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'selected_modules': [m.to_dict() for m in self.selected_modules],
            'reasoning_steps': [asdict(r) for r in self.reasoning_steps],
            'total_estimated_duration_mins': self.total_estimated_duration_mins,
            'confidence_score': self.confidence_score,
            'timestamp': self.timestamp,
            'raw_llm_response': self.raw_llm_response
        }


class SCID_CV_ModuleSelector:
    """
    Intelligent SCID-CV module selector using ReAct reasoning approach.
    
    Analyzes all collected assessment data to determine which SCID-CV diagnostic
    module(s) should be deployed for comprehensive evaluation.
    """
    
    def __init__(self, use_llm: bool = True):
        """
        Initialize the module selector.
        
        Args:
            use_llm: Whether to use LLM for intelligent selection (recommended)
        """
        self.use_llm = use_llm
        self.llm = get_llm() if use_llm and get_llm else None
        
        # Load available SCID-CV modules
        self.available_modules = self._load_available_modules()
        
        logger.info(f"SCID-CV Module Selector initialized with {len(self.available_modules)} available modules")
    
    def _load_available_modules(self) -> Dict[str, Dict[str, Any]]:
        """Load metadata about available SCID-CV modules"""
        # Module metadata (name, description, typical indicators)
        # Using uppercase keys to match MODULE_REGISTRY in scid_cv/__init__.py
        modules_info = {
            "MDD": {
                "name": "Major Depressive Disorder",
                "description": "Comprehensive assessment of major depressive episodes",
                "duration_mins": 20,
                "keywords": ["depression", "sadness", "low mood", "anhedonia", "hopeless", "worthless", "suicidal"],
                "scid_sc_indicators": ["depression", "depressed_mood", "mood_disorder"]
            },
            "GAD": {
                "name": "Generalized Anxiety Disorder",
                "description": "Assessment of persistent and excessive worry",
                "duration_mins": 15,
                "keywords": ["anxiety", "worry", "nervous", "restless", "tense", "panic"],
                "scid_sc_indicators": ["anxiety", "worry", "anxious"]
            },
            "PANIC": {
                "name": "Panic Disorder",
                "description": "Assessment of panic attacks and panic disorder",
                "duration_mins": 15,
                "keywords": ["panic", "panic attack", "racing heart", "fear", "sudden anxiety"],
                "scid_sc_indicators": ["panic", "panic_attack", "sudden_fear"]
            },
            "PTSD": {
                "name": "Post-Traumatic Stress Disorder",
                "description": "Assessment of trauma-related symptoms",
                "duration_mins": 25,
                "keywords": ["trauma", "ptsd", "flashbacks", "nightmares", "avoidance", "traumatic event"],
                "scid_sc_indicators": ["trauma", "ptsd", "traumatic"]
            },
            "OCD": {
                "name": "Obsessive-Compulsive Disorder",
                "description": "Assessment of obsessions and compulsions",
                "duration_mins": 20,
                "keywords": ["obsession", "compulsion", "intrusive thoughts", "repetitive behavior", "checking", "washing"],
                "scid_sc_indicators": ["ocd", "obsessive", "compulsive"]
            },
            "SOCIAL_ANXIETY": {
                "name": "Social Anxiety Disorder",
                "description": "Assessment of social anxiety and avoidance",
                "duration_mins": 15,
                "keywords": ["social anxiety", "fear of judgment", "embarrassment", "social situations", "performance anxiety"],
                "scid_sc_indicators": ["social_anxiety", "social_phobia"]
            },
            "BIPOLAR": {
                "name": "Bipolar Disorder",
                "description": "Assessment of manic and hypomanic episodes",
                "duration_mins": 25,
                "keywords": ["bipolar", "mania", "manic", "mood swings", "elevated mood", "irritable"],
                "scid_sc_indicators": ["bipolar", "mania", "manic"]
            },
            "PSYCHOTIC": {
                "name": "Psychotic Disorders",
                "description": "Assessment of psychotic symptoms",
                "duration_mins": 30,
                "keywords": ["psychosis", "hallucinations", "delusions", "hearing voices", "paranoia"],
                "scid_sc_indicators": ["psychotic", "hallucination", "delusion"]
            },
            "EATING_DISORDERS": {
                "name": "Eating Disorders",
                "description": "Assessment of eating disorder symptoms",
                "duration_mins": 20,
                "keywords": ["eating disorder", "anorexia", "bulimia", "binge eating", "weight", "body image"],
                "scid_sc_indicators": ["eating_disorder", "anorexia", "bulimia"]
            },
            "SUBSTANCE_USE": {
                "name": "Substance Use Disorder",
                "description": "Assessment of substance use and dependence",
                "duration_mins": 20,
                "keywords": ["substance", "drug", "alcohol", "addiction", "dependence", "withdrawal"],
                "scid_sc_indicators": ["substance", "alcohol", "drug_use"]
            },
            "ADHD": {
                "name": "ADHD",
                "description": "Assessment of attention-deficit/hyperactivity disorder",
                "duration_mins": 20,
                "keywords": ["adhd", "attention", "concentration", "hyperactive", "impulsive", "focus"],
                "scid_sc_indicators": ["adhd", "attention_deficit"]
            }
        }
        
        return modules_info
    
    def select_modules(
        self,
        assessment_data: AssessmentDataCollection,
        max_modules: int = 3
    ) -> SelectionResult:
        """
        Select appropriate SCID-CV modules based on assessment data using hybrid ReAct reasoning.
        
        Uses hybrid approach: Combines LLM reasoning with enhanced rule-based selection
        for improved accuracy and reliability.
        
        Args:
            assessment_data: Complete collection of assessment data
            max_modules: Maximum number of modules to select
        
        Returns:
            SelectionResult with selected modules and reasoning
        """
        logger.info("Starting SCID-CV module selection process (hybrid approach)")
        
        # ReAct Step 1: Observation - Gather and understand the data
        observation_step = self._create_observation(assessment_data)
        
        # HYBRID SELECTION APPROACH
        llm_result = None
        rule_result = None
        
        # Step 1: Try LLM reasoning
        if self.use_llm and self.llm:
            try:
                llm_result = self._llm_reasoning(assessment_data, observation_step)
                logger.info("LLM reasoning completed")
            except Exception as e:
                logger.warning(f"LLM reasoning failed: {e}, will use rule-based")
                llm_result = None
        
        # Step 2: Always get rule-based selection (for hybrid scoring)
        rule_result = self._enhanced_rule_based_selection(assessment_data, max_modules)
        logger.info(f"Rule-based selection completed: {len(rule_result.get('modules', []))} modules")
        
        # Step 3: Hybrid merge - combine both methods
        if llm_result and rule_result:
            # Both available - merge results
            reasoning_result = self._hybrid_merge_module_selections(llm_result, rule_result)
            logger.info("Using hybrid selection (LLM + Rule-based)")
        elif llm_result:
            # Only LLM available
            reasoning_result = llm_result
            logger.info("Using LLM-only selection")
        elif rule_result:
            # Only rule-based available
            reasoning_result = rule_result
            logger.info("Using rule-based-only selection")
        else:
            # Fallback to basic rule-based
            logger.warning("Both methods failed, using basic rule-based")
            reasoning_result = self._rule_based_selection(assessment_data)
        
        # ReAct Step 3: Action - Format and return selection
        selection_result = self._format_selection_result(
            reasoning_result,
            assessment_data,
            max_modules
        )
        
        logger.info(f"Final selection: {len(selection_result.selected_modules)} SCID-CV modules")
        
        return selection_result
    
    def _create_observation(self, assessment_data: AssessmentDataCollection) -> ReasoningStep:
        """Create observation step from assessment data"""
        summary = assessment_data.to_summary_text()
        
        return ReasoningStep(
            step_number=1,
            step_type="observation",
            content=f"Patient Data Summary: {summary}",
            confidence=1.0
        )
    
    def _llm_reasoning(
        self,
        assessment_data: AssessmentDataCollection,
        observation: ReasoningStep
    ) -> Dict[str, Any]:
        """Use LLM to perform reasoning and module selection"""
        
        # Create prompt for LLM reasoning
        prompt = self._create_selection_prompt(assessment_data)
        
        try:
            # Call LLM for reasoning - check available methods
            llm_result = None
            if hasattr(self.llm, 'generate_response'):
                # LLMWrapper interface
                llm_result = self.llm.generate_response(prompt)
            elif hasattr(self.llm, 'generate'):
                # Alternative interface
                llm_result = self.llm.generate(prompt, temperature=0.3, max_tokens=2000)
            elif hasattr(self.llm, 'complete'):
                # Another alternative
                llm_result = self.llm.complete(prompt)
            else:
                raise ValueError(f"LLM client does not have a recognized interface (generate_response/generate/complete)")
            
            # Extract content from LLMResponse object if needed
            if hasattr(llm_result, 'content'):
                response = llm_result.content
            elif hasattr(llm_result, 'text'):
                response = llm_result.text
            elif isinstance(llm_result, str):
                response = llm_result
            else:
                response = str(llm_result)
            
            # Parse LLM response
            parsed_result = self._parse_llm_response(response)
            parsed_result['raw_llm_response'] = response
            
            return parsed_result
        
        except Exception as e:
            logger.error(f"LLM reasoning failed: {e}", exc_info=True)
            # Fallback to rule-based
            logger.info("Falling back to rule-based selection")
            return self._enhanced_rule_based_selection(assessment_data, max_modules)
    
    def _create_selection_prompt(self, assessment_data: AssessmentDataCollection) -> str:
        """Create detailed prompt for LLM module selection"""
        
        summary = assessment_data.to_summary_text()
        
        # List available modules
        modules_list = []
        for module_id, info in self.available_modules.items():
            modules_list.append(
                f"- {module_id}: {info['name']} - {info['description']} "
                f"(Duration: {info['duration_mins']} mins)"
            )
        modules_text = "\n".join(modules_list)
        
        prompt = f"""You are a clinical psychologist tasked with selecting the most appropriate SCID-CV diagnostic modules for a patient based on their assessment data.

PATIENT ASSESSMENT DATA:
{summary}

AVAILABLE SCID-CV MODULES:
{modules_text}

YOUR TASK:
Using a ReAct (Reasoning + Action) approach, analyze the patient data and select up to 3 SCID-CV modules that are most relevant for comprehensive evaluation.

STEP 1 - REASONING:
Analyze the patient's presenting concerns, symptoms, risk factors, and screening responses. Consider:
1. What are the primary symptoms and concerns?
2. Which diagnostic categories match these symptoms?
3. Are there comorbidity risks to consider?
4. What did the SCID-SC screening indicate?

STEP 2 - ACTION:
Based on your reasoning, select 1-3 SCID-CV modules in priority order.

RESPONSE FORMAT (JSON):
{{
    "reasoning": "Your detailed clinical reasoning here (2-3 sentences)",
    "modules": [
        {{
            "module_id": "module_id",
            "relevance_score": 0.95,
            "priority": 1,
            "key_indicators": ["indicator1", "indicator2", "indicator3"],
            "reasoning": "Why this module is relevant"
        }}
    ],
    "confidence": 0.9
}}

IMPORTANT:
- Prioritize modules that match the presenting concerns and screening results
- Consider clinical significance and severity
- Limit to 3 modules maximum
- Provide clear, clinically-sound reasoning

Your response (JSON only):"""
        
        return prompt
    
    def _parse_llm_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM JSON response"""
        try:
            # Extract content if response is an LLMResponse object
            if hasattr(response, 'content'):
                response_text = response.content
            elif hasattr(response, 'text'):
                response_text = response.text
            elif isinstance(response, str):
                response_text = response
            else:
                response_text = str(response)
            
            # Try to extract JSON from response
            response_text = response_text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])
            
            result = json.loads(response_text)
            return result
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.error(f"Response was: {str(response)[:500]}")
            # Return default structure
            return {
                "reasoning": "Error parsing LLM response",
                "modules": [],
                "confidence": 0.5
            }
    
    def _rule_based_selection(self, assessment_data: AssessmentDataCollection) -> Dict[str, Any]:
        """Legacy rule-based selection - kept for backward compatibility."""
        return self._enhanced_rule_based_selection(assessment_data)
    
    def _enhanced_rule_based_selection(self, assessment_data: AssessmentDataCollection, max_modules: int = 3) -> Dict[str, Any]:
        """
        Enhanced rule-based module selection with weighted scoring.
        
        Improvements:
        - Weighted keyword matching
        - SCID-SC response weighting
        - Severity and risk factor consideration
        - Context-aware scoring
        """
        logger.info("Using enhanced rule-based module selection")
        
        selected = []
        summary_lower = assessment_data.to_summary_text().lower()
        
        # Keyword weights (higher = more important)
        keyword_weights = {
            "suicide": 10.0, "suicidal": 10.0, "kill": 9.0,
            "depression": 8.0, "depressed": 8.0, "sad": 7.0,
            "panic": 8.5, "panic attack": 9.0, "anxiety": 7.5, "anxious": 7.5,
            "trauma": 8.5, "ptsd": 9.0, "flashback": 8.0,
            "mania": 8.0, "manic": 8.5, "bipolar": 8.0,
            "obsession": 7.5, "compulsion": 7.5, "ocd": 8.0,
            "substance": 7.0, "alcohol": 7.0, "drug": 7.0,
            "psychosis": 9.0, "hallucination": 9.0, "delusion": 9.0
        }
        
        # Score each module
        scores = {}
        for module_id, info in self.available_modules.items():
            score = 0.0
            matched_keywords = []
            
            # Score based on keywords (weighted)
            for keyword in info['keywords']:
                keyword_lower = keyword.lower()
                if keyword_lower in summary_lower:
                    weight = keyword_weights.get(keyword_lower, 1.0)
                    score += weight
                    matched_keywords.append(keyword)
            
            # SCID-SC indicators (weighted higher)
            scid_sc_positive = assessment_data.scid_sc_responses.get('positive_screens', [])
            scid_sc_responses = assessment_data.scid_sc_responses.get('responses', {})
            
            for indicator in info['scid_sc_indicators']:
                # Check positive screens
                if any(indicator.lower() in screen.lower() for screen in scid_sc_positive):
                    score += 3.0  # Higher weight for SCID-SC matches
                    matched_keywords.append(f"scid_sc:{indicator}")
                
                # Check responses for positive answers
                for item_id, response in scid_sc_responses.items():
                    if indicator.lower() in item_id.lower():
                        if response.get('is_yes') or response.get('normalized') in ['yes', 'often', 'always']:
                            score += 2.5
                            matched_keywords.append(f"scid_sc_response:{indicator}")
            
            # Severity weighting
            severity = assessment_data.presenting_concern.get('severity', '').lower()
            if severity == "severe":
                score *= 1.3
            elif severity == "moderate":
                score *= 1.1
            
            # Risk factor weighting
            risk_level = "not_assessed"
            if risk_level == "high":
                score *= 1.4
            elif risk_level == "moderate":
                score *= 1.1
            
            # Suicide/risk priority boost
            if False:  # Risk assessment removed - no suicide risk data
                if module_id == "MDD":  # MDD often associated with suicide risk
                    score *= 1.5
            
            if score > 0:
                scores[module_id] = {
                    'score': score,
                    'keywords': matched_keywords,
                    'info': info
                }
        
        # Sort by score and select top modules
        sorted_modules = sorted(scores.items(), key=lambda x: x[1]['score'], reverse=True)
        
        for i, (module_id, data) in enumerate(sorted_modules[:max_modules * 2]):  # Get more for diversity
            info = data['info']
            normalized_score = min(1.0, data['score'] / 20.0)  # Normalize to 0-1
            
            selected.append({
                'module_id': module_id,
                'relevance_score': normalized_score,
                'priority': i + 1,
                'key_indicators': data['keywords'][:5],  # Top 5 indicators
                'reasoning': f"Enhanced rule-based: matched {len(data['keywords'])} indicators with weighted scoring"
            })
        
        return {
            'reasoning': f"Enhanced rule-based selection matched {len(selected)} modules based on weighted keyword and SCID-SC indicator matching",
            'modules': selected,
            'confidence': 0.75
        }
    
    def _hybrid_merge_module_selections(
        self,
        llm_result: Dict[str, Any],
        rule_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Merge LLM and rule-based module selections using hybrid scoring.
        
        Strategy:
        1. Modules selected by both methods get highest scores
        2. LLM modules get moderate boost
        3. Rule-based modules get base scores
        4. Combine and re-rank
        """
        llm_modules = {m['module_id']: m for m in llm_result.get('modules', [])}
        rule_modules = {m['module_id']: m for m in rule_result.get('modules', [])}
        
        # Find modules selected by both
        both_selected = set(llm_modules.keys()) & set(rule_modules.keys())
        
        merged_modules = []
        
        # Process modules selected by both (highest priority)
        for module_id in both_selected:
            llm_mod = llm_modules[module_id]
            rule_mod = rule_modules[module_id]
            
            # Hybrid score: average + bonus for agreement
            hybrid_score = (llm_mod['relevance_score'] + rule_mod['relevance_score']) / 2.0
            hybrid_score = min(1.0, hybrid_score * 1.15)  # 15% bonus
            
            # Combine indicators
            combined_indicators = list(set(llm_mod.get('key_indicators', []) + rule_mod.get('key_indicators', [])))
            
            merged_modules.append({
                'module_id': module_id,
                'relevance_score': hybrid_score,
                'priority': len(merged_modules) + 1,
                'key_indicators': combined_indicators[:5],
                'reasoning': f"Hybrid selection (LLM + Rule-based): {llm_mod.get('reasoning', '')[:100]}"
            })
        
        # Process LLM-only modules
        llm_only = set(llm_modules.keys()) - both_selected
        for module_id in llm_only:
            mod = llm_modules[module_id]
            mod['relevance_score'] = min(1.0, mod['relevance_score'] * 1.05)  # 5% boost
            mod['reasoning'] = f"LLM selection: {mod.get('reasoning', '')[:100]}"
            merged_modules.append(mod)
        
        # Process rule-based-only modules
        rule_only = set(rule_modules.keys()) - both_selected
        for module_id in rule_only:
            merged_modules.append(rule_modules[module_id])
        
        # Sort by score
        merged_modules.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # Update priorities
        for i, mod in enumerate(merged_modules):
            mod['priority'] = i + 1
        
        return {
            'reasoning': f"Hybrid selection: {len(both_selected)} modules selected by both methods, {len(llm_only)} LLM-only, {len(rule_only)} rule-based-only",
            'modules': merged_modules,
            'confidence': (llm_result.get('confidence', 0.8) + rule_result.get('confidence', 0.75)) / 2.0
        }
    
    def _format_selection_result(
        self,
        reasoning_result: Dict[str, Any],
        assessment_data: AssessmentDataCollection,
        max_modules: int
    ) -> SelectionResult:
        """Format the final selection result"""
        
        # Create reasoning step
        reasoning_step = ReasoningStep(
            step_number=2,
            step_type="reasoning",
            content=reasoning_result.get('reasoning', 'Module selection completed'),
            confidence=reasoning_result.get('confidence', 0.8)
        )
        
        # Create module selections
        selected_modules = []
        total_duration = 0
        
        for module_data in reasoning_result.get('modules', [])[:max_modules]:
            module_id = module_data['module_id']
            if module_id not in self.available_modules:
                continue
            
            info = self.available_modules[module_id]
            
            selection = ModuleSelection(
                module_id=module_id,
                module_name=info['name'],
                relevance_score=module_data.get('relevance_score', 0.8),
                reasoning=module_data.get('reasoning', ''),
                priority=module_data.get('priority', 1),
                estimated_duration_mins=info['duration_mins'],
                key_indicators=module_data.get('key_indicators', [])
            )
            
            selected_modules.append(selection)
            total_duration += info['duration_mins']
        
        # Create action step
        action_step = ReasoningStep(
            step_number=3,
            step_type="action",
            content=f"Selected {len(selected_modules)} modules: {', '.join([m.module_name for m in selected_modules])}",
            confidence=reasoning_result.get('confidence', 0.8)
        )
        
        return SelectionResult(
            selected_modules=selected_modules,
            reasoning_steps=[
                self._create_observation(assessment_data),
                reasoning_step,
                action_step
            ],
            total_estimated_duration_mins=total_duration,
            confidence_score=reasoning_result.get('confidence', 0.8),
            timestamp=datetime.now().isoformat(),
            raw_llm_response=reasoning_result.get('raw_llm_response')
        )


def select_scid_cv_modules_for_session(
    session_data: Dict[str, Any],
    max_modules: int = 3
) -> SelectionResult:
    """
    Convenience function to select SCID-CV modules from session data.
    
    Args:
        session_data: Dictionary containing all assessment data
        max_modules: Maximum number of modules to select
    
    Returns:
        SelectionResult with selected modules and reasoning
    """
    # Extract data from session
    assessment_data = AssessmentDataCollection(
        demographics=session_data.get('demographics', {}),
        presenting_concern=session_data.get('presenting_concern', {}),
        scid_sc_responses=session_data.get('scid_screening', {}),
        session_metadata=session_data.get('metadata', {})
    )
    
    # Create selector and select modules
    selector = SCID_CV_ModuleSelector(use_llm=True)
    return selector.select_modules(assessment_data, max_modules)

