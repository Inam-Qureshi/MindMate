"""
SCID-SC Items Selector

Uses collected assessment data to intelligently select the most relevant SCID-5-SC
screening items for further assessment. Uses LLM reasoning to match patient
data with appropriate screening questions.
"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

try:
    # Try assessment/scid first (copied location)
    from app.agents.assessment.scid.scid_sc import SCID_SC_Bank, SCIDItem
except ImportError:
    try:
        # Fallback to original pima location
        from app.agents.pima.scid.scid_sc import SCID_SC_Bank, SCIDItem
    except ImportError:
        SCID_SC_Bank = None
        SCIDItem = None

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

logger = logging.getLogger(__name__)


@dataclass
class AssessmentDataSummary:
    """
    Structured summary of assessment data as a typed dataclass.
    
    This allows code to use attribute access (assessment_data.demographics) 
    instead of dictionary access (assessment_data['demographics']).
    
    Attributes:
        demographics: Demographic information dict
        presenting_concern: Presenting concern data dict
        risk_assessment: Risk assessment results dict
        session_metadata: Session metadata dict
    """
    demographics: Dict[str, Any]
    presenting_concern: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    session_metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary if needed"""
        from dataclasses import asdict
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AssessmentDataSummary':
        """Create from dictionary"""
        return cls(
            demographics=data.get('demographics', {}),
            presenting_concern=data.get('presenting_concern', {}),
            risk_assessment=data.get('risk_assessment', {}),
            session_metadata=data.get('session_metadata', {})
        )


@dataclass
class SCIDItemSelection:
    """Selected SCID item with reasoning"""
    item_id: str
    item_text: str
    category: str
    severity: str
    relevance_score: float
    reasoning: str


class SCID_SC_ItemsSelector:
    """
    Intelligent selector for SCID-5-SC screening items based on assessment data.

    Uses LLM reasoning to analyze collected patient data and select the most
    relevant screening questions from the SCID-5-SC bank.
    """

    def __init__(self):
        if SCID_SC_Bank:
            try:
                self.scid_bank = SCID_SC_Bank()
                logger.info(f"SCID bank loaded successfully: {len(self.scid_bank.sc_items)} items, {len(self.scid_bank.modules)} modules")
            except Exception as e:
                logger.error(f"Failed to initialize SCID bank: {e}")
                self.scid_bank = None
        else:
            logger.error("⚠️ SCID bank not available - SCID_SC_Bank class not found")
            self.scid_bank = None
        
        self.llm_client = None

        # Initialize LLM client
        if get_llm:
            try:
                self.llm_client = get_llm()
            except Exception as e:
                logger.warning(f"LLM client not available: {e}")

        if self.scid_bank:
            logger.info("SCID-SC Items Selector initialized successfully")
        else:
            logger.warning("⚠️ SCID-SC Items Selector initialized without SCID bank - item selection will fail")

    def create_assessment_data_summary(self, session_id: str) -> AssessmentDataSummary:
        """
        Create a comprehensive JSON object of all assessment data collected so far.

        Args:
            session_id: Assessment session identifier

        Returns:
            AssessmentDataSummary with all collected data
        """
        try:
            from ..database import ModeratorDatabase
            db = ModeratorDatabase()

            # Get session data
            session_state = db.get_session(session_id)
            session_metadata_raw = session_state.metadata if session_state else {}

            # Clean session_metadata to remove non-serializable objects (like SQLAlchemy MetaData)
            session_metadata = {}
            if session_metadata_raw:
                for key, value in session_metadata_raw.items():
                    # Skip SQLAlchemy MetaData objects and other non-serializable types
                    if isinstance(value, (str, int, float, bool, type(None))):
                        session_metadata[key] = value
                    elif isinstance(value, (list, tuple)):
                        # Recursively clean lists
                        cleaned_list = []
                        for item in value:
                            if isinstance(item, (str, int, float, bool, type(None))):
                                cleaned_list.append(item)
                            elif isinstance(item, dict):
                                cleaned_list.append({k: v for k, v in item.items() 
                                                   if isinstance(v, (str, int, float, bool, type(None), list, dict))})
                        session_metadata[key] = cleaned_list
                    elif isinstance(value, dict):
                        # Recursively clean dicts
                        session_metadata[key] = {k: v for k, v in value.items() 
                                               if isinstance(v, (str, int, float, bool, type(None), list, dict))}
                    else:
                        # Try to convert to string for other types
                        try:
                            session_metadata[key] = str(value)
                        except Exception:
                            # Skip if can't convert
                            logger.debug(f"Skipping non-serializable metadata key: {key}")

            # Initialize empty data structures
            demographics_data = {}
            concern_data = {}
            risk_data = {}

            # Get demographics data
            if session_state and session_state.module_results.get("demographics"):
                demographics_data = session_state.module_results["demographics"]

            # Get presenting concern data
            if session_state and session_state.module_results.get("presenting_concern"):
                concern_data = session_state.module_results["presenting_concern"]

            # Get risk assessment data
            if session_state and session_state.module_results.get("risk_assessment"):
                risk_data = session_state.module_results["risk_assessment"]

            # Also check module data for additional information
            module_data = db.get_module_data(session_id)
            for data_record in module_data:
                data_type = data_record.get("data_type", "")
                content = data_record.get("data_content", {})

                if data_type == "demographics":
                    demographics_data.update(content)
                elif data_type in ["concern", "presenting_concern"]:
                    concern_data.update(content)
                elif data_type in ["risk", "risk_assessment"]:
                    risk_data.update(content)

            return AssessmentDataSummary(
                demographics=demographics_data,
                presenting_concern=concern_data,
                risk_assessment=risk_data,
                session_metadata=session_metadata
            )

        except Exception as e:
            logger.error(f"Error creating assessment data summary: {e}")
            # Return empty summary on error
            return AssessmentDataSummary(
                demographics={},
                presenting_concern={},
                risk_assessment={},
                session_metadata={}
            )

    def create_patient_summary_prompt(self, data: AssessmentDataSummary) -> str:
        """
        Create a natural language summary of the patient's assessment data.

        Args:
            data: AssessmentDataSummary object

        Returns:
            Formatted patient summary prompt
        """
        try:
            demo = data.demographics
            concern = data.presenting_concern
            risk = data.risk_assessment

            # Build patient description
            parts = []

            # Demographics - Build the core prompt: "a ___ years old male/female is facing ___"
            if demo.get("age"):
                gender = demo.get("gender", "").lower()
                if gender == "male":
                    gender_desc = "male"
                elif gender == "female":
                    gender_desc = "female"
                else:
                    gender_desc = "person"

                # Core format: "a ___ years old male/female"
                core_desc = f"a {demo.get('age')} years old {gender_desc}"
                parts.append(core_desc)

            if demo.get("education_level"):
                parts.append(f"with {demo.get('education_level')} education")

            if demo.get("occupation"):
                parts.append(f"working as {demo.get('occupation')}")

            if demo.get("marital_status"):
                parts.append(f"who is {demo.get('marital_status')}")

            # Presenting concern - This is the key part: "is facing ___"
            main_concerns = []
            
            # Get primary concern
            if concern.get("primary_concern"):
                main_concerns.append(concern.get("primary_concern"))
            elif concern.get("main_concerns"):
                # Handle list of concerns
                if isinstance(concern.get("main_concerns"), list):
                    main_concerns.extend(concern.get("main_concerns")[:3])  # Limit to 3
                else:
                    main_concerns.append(str(concern.get("main_concerns")))
            
            # If we have concerns, add the "is facing" part
            if main_concerns:
                concerns_text = ", ".join(main_concerns[:2])  # Join first 2 concerns
                parts.append(f"is facing {concerns_text}")

            # Add additional context
            if concern.get("severity_assessment"):
                severity = concern.get("severity_assessment", "").lower()
                if severity in ["mild", "moderate", "severe"]:
                    parts.append(f"rated as {severity} severity")
            elif concern.get("severity"):
                severity = concern.get("severity", "").lower()
                if severity in ["mild", "moderate", "severe"]:
                    parts.append(f"rated as {severity} severity")

            if concern.get("frequency_pattern"):
                parts.append(f"occurring {concern.get('frequency_pattern')}")

            if concern.get("functional_impact"):
                parts.append(f"with functional impact on {concern.get('functional_impact')}")

            # Risk assessment
            if risk.get("suicide_ideation") or risk.get("past_attempts"):
                parts.append("with history of suicidal thoughts or attempts")

            if risk.get("self_harm_history"):
                parts.append("with self-harm history")

            # Combine into coherent summary
            if parts:
                summary = " ".join(parts)
                # Capitalize first letter
                summary = summary[0].upper() + summary[1:]
                return summary + "."
            else:
                return "A patient seeking mental health assessment."

        except Exception as e:
            logger.error(f"Error creating patient summary prompt: {e}")
            return "A patient seeking mental health assessment."

    def select_scid_items(self, session_id: str, max_items: int = 5) -> List[SCIDItemSelection]:
        """
        Select the most relevant SCID-SC items based on collected assessment data.
        
        Uses hybrid approach: Combines LLM reasoning with rule-based selection for
        improved accuracy and reliability.

        Args:
            session_id: Assessment session identifier
            max_items: Maximum number of items to select (default: 5)

        Returns:
            List of selected SCID items with relevance scores and reasoning
        """
        try:
            # Get assessment data
            data_summary = self.create_assessment_data_summary(session_id)
            patient_summary = self.create_patient_summary_prompt(data_summary)

            logger.info(f"Patient summary: {patient_summary}")

            # If no SCID bank available, return empty list
            if not self.scid_bank:
                logger.warning("SCID bank not available")
                return []

            # HYBRID SELECTION APPROACH
            llm_items = []
            rule_items = []
            
            # Step 1: Try LLM selection
            if self.llm_client:
                try:
                    prompt = self._create_selection_prompt(patient_summary, data_summary, max_items)
                    llm_result = self.llm_client.generate_response(prompt)
                    
                    # Extract content from LLMResponse object if needed
                    if hasattr(llm_result, 'content'):
                        llm_response = llm_result.content
                    elif hasattr(llm_result, 'text'):
                        llm_response = llm_result.text
                    elif isinstance(llm_result, str):
                        llm_response = llm_result
                    else:
                        llm_response = str(llm_result)

                    # Parse and validate LLM response
                    llm_items = self._parse_llm_response(llm_response, max_items)
                    llm_items = self._validate_items(llm_items)
                    
                    logger.info(f"LLM selected {len(llm_items)} items")
                except Exception as e:
                    logger.warning(f"LLM selection failed: {e}, falling back to rule-based")
                    llm_items = []
            
            # Step 2: Always get rule-based selections (for hybrid scoring)
            rule_items = self._enhanced_rule_based_selection(data_summary, max_items)
            logger.info(f"Rule-based selected {len(rule_items)} items")
            
            # Step 3: Hybrid merge - combine and score both methods
            if llm_items and rule_items:
                # Both methods available - merge and re-score
                selected_items = self._hybrid_merge_selections(llm_items, rule_items, max_items)
                logger.info(f"Hybrid selection: {len(selected_items)} items")
            elif llm_items:
                # Only LLM available
                selected_items = llm_items
                logger.info("Using LLM-only selection")
            elif rule_items:
                # Only rule-based available
                selected_items = rule_items
                logger.info("Using rule-based-only selection")
            else:
                # No items selected
                logger.warning("No items selected by either method")
                selected_items = []
            
            # Step 4: Ensure category diversity
            selected_items = self._ensure_category_diversity(selected_items, max_items)
            
            # Step 5: Final ranking by relevance score
            selected_items = sorted(selected_items, key=lambda x: x.relevance_score, reverse=True)[:max_items]

            logger.info(f"Final selection: {len(selected_items)} SCID-SC items")
            return selected_items

        except Exception as e:
            logger.error(f"Error selecting SCID items: {e}", exc_info=True)
            # Final fallback to basic rule-based
            try:
                data_summary = self.create_assessment_data_summary(session_id)
                return self._enhanced_rule_based_selection(data_summary, max_items)
            except:
                return []

    def _create_selection_prompt(self, patient_summary: str, data: AssessmentDataSummary, max_items: int) -> str:
        """Create the LLM prompt for SCID item selection."""

        # Create comprehensive JSON object of all data for the LLM
        # Clean session_metadata to ensure it's JSON serializable
        cleaned_metadata = {}
        if data.session_metadata:
            for key, value in data.session_metadata.items():
                # Only include serializable types
                if isinstance(value, (str, int, float, bool, type(None))):
                    cleaned_metadata[key] = value
                elif isinstance(value, (list, tuple)):
                    cleaned_metadata[key] = [v for v in value if isinstance(v, (str, int, float, bool, type(None)))]
                elif isinstance(value, dict):
                    cleaned_metadata[key] = {k: v for k, v in value.items() 
                                           if isinstance(v, (str, int, float, bool, type(None), list, dict))}
                else:
                    # Try to convert to string
                    try:
                        cleaned_metadata[key] = str(value)
                    except Exception:
                        pass  # Skip if can't convert
        
        full_data_json = {
            "patient_summary": patient_summary,
            "demographics": data.demographics,
            "presenting_concern": data.presenting_concern,
            "risk_assessment": data.risk_assessment,
            "session_metadata": cleaned_metadata
        }

        prompt = f"""You are a clinical psychologist analyzing patient assessment data to select the most relevant SCID-5-SC (Structured Clinical Interview for DSM-5 - Screening) questions.

PATIENT ASSESSMENT DATA SUMMARY:
{patient_summary}

COMPLETE ASSESSMENT DATA (JSON):
{json.dumps(full_data_json, indent=2, default=str)}

AVAILABLE SCID-5-SC ITEM CATEGORIES:
- Mood disorders (depression, mania, bipolar)
- Anxiety disorders (panic, GAD, phobias, OCD)
- Psychotic disorders (hallucinations, delusions)
- Substance use disorders
- Eating disorders
- Trauma-related disorders (PTSD)
- Personality disorders

YOUR TASK:
Using clinical reasoning, analyze the patient's demographics, presenting concerns, and risk factors. Based on this comprehensive data:
1. Identify which mental health areas need further screening
2. Select the {max_items} MOST RELEVANT SCID-5-SC screening items
3. Prioritize items that:
   - Directly match reported symptoms
   - Could identify comorbid conditions
   - Address risk factors mentioned
   - Clarify the clinical picture

For each selected item, provide:
- item_id: The SCID-5-SC item identifier (e.g., "MDD_01", "PAN_01")
- reasoning: Clinical reasoning why this item is relevant (2-3 sentences)
- relevance_score: Numerical score from 1-10 (10 = most relevant)

RESPONSE FORMAT (JSON only):
{{
  "reasoning": "Your overall clinical reasoning for item selection (2-3 sentences)",
  "selected_items": [
    {{
      "item_id": "MDD_01",
      "reasoning": "Patient reports feeling sad and down for 3 months, making depression screening crucial",
      "relevance_score": 9.5
    }},
    {{
      "item_id": "GAD_01",
      "reasoning": "Anxiety symptoms mentioned alongside depression suggest need for GAD screening",
      "relevance_score": 8.0
    }}
  ]
}}

IMPORTANT:
- Return maximum {max_items} items
- Use actual SCID-5-SC item IDs from the available bank
- Base selections on the complete assessment data provided
- Provide clear, clinically-sound reasoning

Your JSON response:"""

        return prompt

    def _rule_based_selection(self, data: AssessmentDataSummary, max_items: int) -> List[SCIDItemSelection]:
        """Legacy rule-based selection - kept for backward compatibility."""
        return self._enhanced_rule_based_selection(data, max_items)
    
    def _enhanced_rule_based_selection(self, data: AssessmentDataSummary, max_items: int) -> List[SCIDItemSelection]:
        """
        Enhanced rule-based selection with weighted scoring and context awareness.
        
        Improvements:
        - Weighted keyword matching
        - Severity-based scoring
        - Risk factor weighting
        - Context-aware item selection
        """
        if not self.scid_bank:
            return []
        
        # Prepare text for matching
        concern_text = json.dumps(data.presenting_concern).lower()
        risk_text = json.dumps(data.risk_assessment).lower()
        demo_text = json.dumps(data.demographics).lower()
        all_text = f"{concern_text} {risk_text} {demo_text}".lower()
        
        # Keyword weights (higher = more important)
        keyword_weights = {
            # High priority symptoms
            "suicide": 10.0, "kill": 10.0, "die": 9.0, "harm": 9.0,
            "depressed": 8.0, "depression": 8.0, "sad": 7.0, "hopeless": 8.0,
            "panic": 8.0, "panic attack": 8.5, "anxious": 7.5, "anxiety": 7.5,
            "trauma": 8.0, "ptsd": 8.5, "abuse": 8.0,
            # Medium priority
            "worry": 6.0, "fear": 6.5, "nervous": 6.0, "stress": 5.5,
            "tired": 5.0, "fatigue": 5.0, "down": 6.0,
            "alcohol": 7.0, "drug": 7.0, "substance": 7.0,
            # Lower priority but still relevant
            "sadness": 5.5, "mood": 5.0, "irritable": 5.5
        }
        
        # Score all items in the bank
        item_scores = {}
        
        for item_id, item in self.scid_bank.sc_items.items():
            score = 0.0
            matched_keywords = []
            
            # Score based on item keywords
            if hasattr(item, 'keywords') and item.keywords:
                for keyword in item.keywords:
                    keyword_lower = keyword.lower()
                    # Check if keyword appears in text
                    if keyword_lower in all_text:
                        weight = keyword_weights.get(keyword_lower, 3.0)
                        score += weight
                        matched_keywords.append(keyword)
            
            # Fallback: If no keywords match, try matching on item text itself
            if score == 0.0 and hasattr(item, 'text') and item.text:
                item_text_lower = item.text.lower()
                for keyword, weight in keyword_weights.items():
                    if keyword in item_text_lower or keyword in all_text:
                        score += weight * 0.5  # Lower weight for text matching
                        matched_keywords.append(keyword)
            
            # Fallback: If still no matches, check item category against common concerns
            if score == 0.0:
                item_category = getattr(item, 'category', '').lower()
                concern_text_lower = concern_text.lower()
                if item_category and any(word in concern_text_lower for word in [item_category]):
                    score = 2.0  # Base score for category match
                    matched_keywords.append(item_category)
            
            # Severity-based weighting
            severity = data.presenting_concern.get("severity", "").lower()
            if severity == "severe":
                score *= 1.5
            elif severity == "moderate":
                score *= 1.2
            elif severity == "mild":
                score *= 1.0
            
            # Risk factor weighting
            risk_level = data.risk_assessment.get("risk_level", "").lower()
            if risk_level == "high":
                score *= 1.4
            elif risk_level == "moderate":
                score *= 1.1
            
            # Suicide/self-harm priority boost
            if data.risk_assessment.get("suicide_ideation") or data.risk_assessment.get("past_attempts"):
                if "suicide" in item_id.lower() or "sui" in item_id.lower() or "self" in item_id.lower():
                    score *= 2.0  # Double score for risk items when risk is present
            
            # Store item if it has any score, or if it's a common/default item
            if score > 0:
                item_scores[item_id] = {
                    "score": score,
                    "item": item,
                    "matched_keywords": matched_keywords
                }
        
        # If no items scored, select default/common items as fallback
        if not item_scores and self.scid_bank.sc_items:
            logger.info("No items matched by keywords, selecting default common items")
            # Select first few items from common categories
            common_categories = ["mood", "depression", "anxiety", "risk"]
            default_items = []
            for item_id, item in self.scid_bank.sc_items.items():
                item_category = getattr(item, 'category', '').lower()
                if any(cat in item_category for cat in common_categories):
                    default_items.append((item_id, item))
                    if len(default_items) >= max_items:
                        break
            
            # If still no items, just take first max_items
            if not default_items:
                default_items = list(self.scid_bank.sc_items.items())[:max_items]
            
            for item_id, item in default_items:
                item_scores[item_id] = {
                    "score": 1.0,  # Base score for default items
                    "item": item,
                    "matched_keywords": ["default_selection"]
                }
        
        # Sort by score and create selections
        sorted_items = sorted(item_scores.items(), key=lambda x: x[1]["score"], reverse=True)
        selections = []
        
        for item_id, item_data in sorted_items[:max_items * 2]:  # Get more for diversity filtering
            item = item_data["item"]
            score = item_data["score"]
            matched = item_data["matched_keywords"]
            
            # Normalize score to 1-10 range
            normalized_score = min(10.0, max(1.0, score / 2.0))
            
            reasoning = f"Rule-based selection: matched keywords {', '.join(matched[:3])}"
            if severity:
                reasoning += f", severity: {severity}"
            if risk_level:
                reasoning += f", risk: {risk_level}"
            
            selections.append(SCIDItemSelection(
                item_id=item.id,
                item_text=item.text,
                category=item.category,
                severity=item.severity,
                relevance_score=normalized_score,
                reasoning=reasoning
            ))
        
        return selections

    def _parse_llm_response(self, llm_response: str, max_items: int) -> List[SCIDItemSelection]:
        """Parse LLM response and create SCIDItemSelection objects."""

        try:
            # Extract content if response is an LLMResponse object
            if hasattr(llm_response, 'content'):
                response_text = llm_response.content
            elif hasattr(llm_response, 'text'):
                response_text = llm_response.text
            elif isinstance(llm_response, str):
                response_text = llm_response
            else:
                response_text = str(llm_response)
            
            # Clean response - remove markdown code blocks if present
            response_text = response_text.strip()
            if response_text.startswith("```"):
                # Extract JSON from code block
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])
            
            # Try to parse as JSON
            parsed_response = json.loads(response_text)
            
            # Handle different response formats
            if isinstance(parsed_response, dict):
                # New format with "reasoning" and "selected_items"
                selected_items_data = parsed_response.get("selected_items", [])
            elif isinstance(parsed_response, list):
                # Old format - direct array
                selected_items_data = parsed_response
            else:
                logger.warning(f"Unexpected LLM response format: {type(parsed_response)}")
                selected_items_data = []

            selections = []
            if self.scid_bank:
                for item_data in selected_items_data[:max_items]:
                    item_id = item_data.get('item_id', '')
                    if item_id in self.scid_bank.sc_items:
                        item = self.scid_bank.sc_items[item_id]
                        selections.append(SCIDItemSelection(
                            item_id=item.id,
                            item_text=item.text,
                            category=item.category,
                            severity=item.severity,
                            relevance_score=float(item_data.get('relevance_score', 5.0)),
                            reasoning=item_data.get('reasoning', 'Selected by LLM based on assessment data')
                        ))
                    else:
                        logger.warning(f"SCID item {item_id} not found in bank")

            logger.info(f"Successfully parsed {len(selections)} items from LLM response")
            return selections

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing LLM JSON response: {e}")
            logger.debug(f"Response was: {llm_response[:500]}")
            # Return empty list - will fallback to rule-based in select_scid_items
            return []
        except Exception as e:
            logger.error(f"Error parsing LLM response: {e}")
            return []
    
    def _validate_items(self, items: List[SCIDItemSelection]) -> List[SCIDItemSelection]:
        """
        Validate that all item IDs exist in the SCID bank.
        
        Args:
            items: List of SCIDItemSelection objects
            
        Returns:
            List of validated items (invalid items removed)
        """
        if not self.scid_bank:
            return []
        
        validated = []
        for item in items:
            if item.item_id in self.scid_bank.sc_items:
                validated.append(item)
            else:
                logger.warning(f"Invalid item ID {item.item_id} - not in SCID bank")
        
        return validated
    
    def _hybrid_merge_selections(
        self, 
        llm_items: List[SCIDItemSelection], 
        rule_items: List[SCIDItemSelection],
        max_items: int
    ) -> List[SCIDItemSelection]:
        """
        Merge LLM and rule-based selections using hybrid scoring.
        
        Strategy:
        1. Items selected by both methods get highest scores
        2. LLM items get moderate boost
        3. Rule-based items get base scores
        4. Combine and re-rank
        """
        # Create lookup dictionaries
        llm_dict = {item.item_id: item for item in llm_items}
        rule_dict = {item.item_id: item for item in rule_items}
        
        # Find items selected by both methods
        both_selected = set(llm_dict.keys()) & set(rule_dict.keys())
        
        merged_items = []
        
        # Process items selected by both methods (highest priority)
        for item_id in both_selected:
            llm_item = llm_dict[item_id]
            rule_item = rule_dict[item_id]
            
            # Hybrid score: average of both + bonus for agreement
            hybrid_score = (llm_item.relevance_score + rule_item.relevance_score) / 2.0
            hybrid_score = min(10.0, hybrid_score * 1.2)  # 20% bonus for agreement
            
            merged_items.append(SCIDItemSelection(
                item_id=llm_item.item_id,
                item_text=llm_item.item_text,
                category=llm_item.category,
                severity=llm_item.severity,
                relevance_score=hybrid_score,
                reasoning=f"Hybrid selection (LLM + Rule-based): {llm_item.reasoning[:100]}"
            ))
        
        # Process LLM-only items
        llm_only = set(llm_dict.keys()) - both_selected
        for item_id in llm_only:
            item = llm_dict[item_id]
            # Slight boost for LLM selection
            item = SCIDItemSelection(
                item_id=item.item_id,
                item_text=item.item_text,
                category=item.category,
                severity=item.severity,
                relevance_score=min(10.0, item.relevance_score * 1.1),
                reasoning=f"LLM selection: {item.reasoning[:100]}"
            )
            merged_items.append(item)
        
        # Process rule-based-only items
        rule_only = set(rule_dict.keys()) - both_selected
        for item_id in rule_only:
            item = rule_dict[item_id]
            merged_items.append(item)
        
        # Sort by score
        merged_items.sort(key=lambda x: x.relevance_score, reverse=True)
        
        return merged_items
    
    def _ensure_category_diversity(
        self, 
        items: List[SCIDItemSelection], 
        max_items: int
    ) -> List[SCIDItemSelection]:
        """
        Ensure items are diverse across categories.
        
        Strategy:
        1. Group items by category
        2. Select top item from each category first
        3. Fill remaining slots with highest scores
        """
        if not items:
            return items
        
        # Group by category
        by_category = {}
        for item in items:
            category = item.category or "other"
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(item)
        
        # Select top item from each category
        diverse_items = []
        used_categories = set()
        
        # First pass: one item per category (highest score)
        for category, category_items in by_category.items():
            if len(diverse_items) >= max_items:
                break
            top_item = max(category_items, key=lambda x: x.relevance_score)
            diverse_items.append(top_item)
            used_categories.add(category)
        
        # Second pass: fill remaining slots with highest scores (any category)
        remaining = max_items - len(diverse_items)
        if remaining > 0:
            # Get all items not yet selected, sorted by score
            remaining_items = [
                item for item in items 
                if item not in diverse_items
            ]
            remaining_items.sort(key=lambda x: x.relevance_score, reverse=True)
            
            for item in remaining_items[:remaining]:
                diverse_items.append(item)
        
        return diverse_items[:max_items]


# Module for presenting selected SCID items to user
class SCID_SC_Presenter:
    """
    Module for presenting selected SCID-SC screening items to the user one by one.
    Collects responses and builds a screening profile.
    """

    def __init__(self):
        self.selected_items: List[SCIDItemSelection] = []
        self.responses: Dict[str, Any] = {}
        self.current_index = 0
        self.is_complete = False

    def initialize_with_items(self, selected_items: List[SCIDItemSelection]):
        """Initialize presenter with selected SCID items."""
        self.selected_items = selected_items
        self.current_index = 0
        self.is_complete = False
        logger.info(f"Initialized SCID presenter with {len(selected_items)} items")

    def get_next_question(self) -> Optional[Dict[str, Any]]:
        """Get the next SCID item to present to the user."""

        if self.current_index >= len(self.selected_items):
            self.is_complete = True
            return None

        item = self.selected_items[self.current_index]

        return {
            "question_id": item.item_id,
            "question": item.item_text,
            "category": item.category,
            "severity": item.severity,
            "item_number": self.current_index + 1,
            "total_items": len(self.selected_items),
            "relevance_score": item.relevance_score
        }

    def parse_response(self, raw_response: str) -> Dict[str, Any]:
        """
        Parse and normalize user response to SCID question.
        
        Args:
            raw_response: Raw user input
            
        Returns:
            Dict with parsed response data
        """
        response_lower = raw_response.lower().strip()
        
        # Initialize parsed data
        parsed = {
            "raw_response": raw_response,
            "normalized": None,
            "response_type": "text",
            "is_yes": None,
            "is_no": None,
            "confidence": 0.5
        }
        
        # Yes/No detection with comprehensive matching
        yes_patterns = [
            'yes', 'y', 'yeah', 'yep', 'yup', 'sure', 'definitely', 
            'absolutely', 'correct', 'right', 'true', 'affirmative',
            'i do', 'i have', 'i am', 'i was', 'i feel', 'i felt',
            'sometimes yes', 'occasionally yes', 'yes sometimes'
        ]
        
        no_patterns = [
            'no', 'n', 'nope', 'nah', 'not really', 'not at all',
            'never', 'none', 'nothing', 'false', 'negative',
            'i do not', 'i don\'t', "i don't", 'i haven\'t', "i haven't",
            'i am not', "i'm not", 'i was not', "i wasn't",
            'no i don\'t', "no i don't", 'no never', 'not really'
        ]
        
        # Check for yes
        for pattern in yes_patterns:
            if pattern in response_lower:
                parsed["is_yes"] = True
                parsed["is_no"] = False
                parsed["normalized"] = "yes"
                parsed["response_type"] = "yes_no"
                parsed["confidence"] = 0.9
                return parsed
        
        # Check for no
        for pattern in no_patterns:
            if pattern in response_lower:
                parsed["is_yes"] = False
                parsed["is_no"] = True
                parsed["normalized"] = "no"
                parsed["response_type"] = "yes_no"
                parsed["confidence"] = 0.9
                return parsed
        
        # Check for partial/no match patterns (e.g., "not really", "sort of")
        partial_no = ['not really', 'not exactly', 'sort of', 'kind of', 'a little', 'maybe', 'uncertain']
        for pattern in partial_no:
            if pattern in response_lower:
                parsed["confidence"] = 0.6
        
        # If contains detailed explanation, keep as text
        if len(raw_response.strip()) > 20:
            parsed["response_type"] = "detailed"
            parsed["normalized"] = raw_response.strip()
            parsed["confidence"] = 0.8
        else:
            # Short text response
            parsed["normalized"] = raw_response.strip()
            parsed["response_type"] = "text"
        
        return parsed
    
    def record_response(self, item_id: str, response: Any):
        """Record user response to an item with improved parsing."""

        # Parse response if it's a string
        if isinstance(response, str):
            parsed = self.parse_response(response)
        else:
            parsed = {
                "raw_response": str(response),
                "normalized": response,
                "response_type": "other",
                "confidence": 0.5
            }

        self.responses[item_id] = {
            "response": parsed["normalized"],
            "raw_response": parsed["raw_response"],
            "response_type": parsed["response_type"],
            "is_yes": parsed.get("is_yes"),
            "is_no": parsed.get("is_no"),
            "confidence": parsed["confidence"],
            "timestamp": datetime.now().isoformat(),
            "item_index": self.current_index
        }

        self.current_index += 1

        # Check if complete
        if self.current_index >= len(self.selected_items):
            self.is_complete = True

        logger.info(f"Recorded parsed response for {item_id}: {parsed['normalized']} (type: {parsed['response_type']}, confidence: {parsed['confidence']:.2f})")

    def get_screening_results(self) -> Dict[str, Any]:
        """Get complete screening results."""

        return {
            "selected_items": [asdict(item) for item in self.selected_items],
            "responses": self.responses,
            "completion_rate": len(self.responses) / len(self.selected_items) if self.selected_items else 0,
            "is_complete": self.is_complete,
            "total_items": len(self.selected_items),
            "responded_items": len(self.responses)
        }

    def get_progress(self) -> Dict[str, Any]:
        """Get current progress information."""

        return {
            "current_item": self.current_index + 1,
            "total_items": len(self.selected_items),
            "completed": self.is_complete,
            "progress_percentage": (self.current_index / len(self.selected_items) * 100) if self.selected_items else 0
        }


# Convenience functions
def select_scid_items_for_session(session_id: str, max_items: int = 5) -> List[SCIDItemSelection]:
    """Convenience function to select SCID items for a session."""
    selector = SCID_SC_ItemsSelector()
    return selector.select_scid_items(session_id, max_items)


def create_patient_data_summary(session_id: str) -> AssessmentDataSummary:
    """
    Convenience function to get patient data summary as AssessmentDataSummary object.
    
    This creates a comprehensive summary of all assessment data collected so far
    from demographics, presenting concern, and risk assessment modules.
    
    Args:
        session_id: Assessment session identifier
    
    Returns:
        AssessmentDataSummary object (dataclass) for attribute access
        This allows code to use: assessment_data.demographics instead of assessment_data['demographics']
        
    Raises:
        ValueError: If session_id is invalid
        TypeError: If returned object is not AssessmentDataSummary
    """
    if not session_id or not isinstance(session_id, str):
        raise ValueError(f"Invalid session_id: {session_id}")
    
    selector = SCID_SC_ItemsSelector()
    summary = selector.create_assessment_data_summary(session_id)
    
    # Type validation: Ensure we return a dataclass, not a dict
    if not isinstance(summary, AssessmentDataSummary):
        logger.error(f"create_assessment_data_summary returned {type(summary)}, expected AssessmentDataSummary")
        # Convert dict to dataclass if needed
        if isinstance(summary, dict):
            summary = AssessmentDataSummary.from_dict(summary)
        else:
            # Fallback to empty summary
            summary = AssessmentDataSummary(
                demographics={},
                presenting_concern={},
                risk_assessment={},
                session_metadata={}
            )
    
    # Return the dataclass directly - NEVER return a dict
    return summary


def get_assessment_data_as_json(session_id: str) -> str:
    """
    Get all assessment data as a JSON string.
    
    Args:
        session_id: Assessment session identifier
    
    Returns:
        JSON string representation of all assessment data
    """
    from dataclasses import asdict
    data = create_patient_data_summary(session_id)
    # Convert dataclass to dict for JSON serialization
    data_dict = asdict(data)
    return json.dumps(data_dict, indent=2)
