"""
Treatment Planning Agent (TPA) Module for Assessment V2
REDESIGNED: Runs after DA completes and utilizes ALL information for comprehensive treatment planning
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import re

logger = logging.getLogger(__name__)

# Import assessment_v2 components
try:
    from app.agents.assessment.assessment_v2.types import ModuleResponse, ModuleProgress
    from app.agents.assessment.assessment_v2.database import ModeratorDatabase
    from app.agents.assessment.assessment_v2.core.sra_service import get_sra_service
    from app.agents.assessment.assessment_v2.base_module import BaseAssessmentModule
except ImportError:
    # Fallback imports for compatibility
    try:
        from ...types import ModuleResponse, ModuleProgress
        from ...database import ModeratorDatabase
        from ...core.sra_service import get_sra_service
        from ...base_module import BaseAssessmentModule
    except ImportError:
        from app.agents.assessment.module_types import ModuleResponse, ModuleProgress
        from app.agents.assessment.database import ModeratorDatabase
        from app.agents.assessment.assessment_v2.base_module import BaseAssessmentModule
        get_sra_service = None

# Import LLM client
try:
    from app.agents.assessment.assessment_v2.core.llm.llm_client import LLMWrapper
except ImportError:
    try:
        from app.agents.assessment.llm import LLMWrapper
    except ImportError:
        try:
            from ...core.llm.llm_client import LLMWrapper
        except ImportError:
            LLMWrapper = None
            logger.warning("LLMWrapper not available - TPA will use rule-based planning")


class TreatmentPlanningModule(BaseAssessmentModule):
    """
    REDESIGNED Treatment Planning Agent Module for Assessment V2
    
    Runs AFTER DA completes and utilizes ALL information:
    - DA diagnostic results
    - Complete symptom database from SRA service
    - All assessment module results
    - Patient demographics and context
    - Risk assessment results
    - Creates comprehensive, personalized treatment plan
    """
    
    def __init__(self):
        """Initialize the TPA module"""
        self._module_name = "tpa_treatment_planning"
        self._version = "2.0.0"  # Updated version for v2
        self._description = "Comprehensive treatment planning using all assessment data, DA results, and symptom database. Runs after DA completes."
        
        super().__init__()
        
        # Initialize LLM for treatment planning
        if LLMWrapper:
            try:
                self.llm = LLMWrapper()
            except Exception as e:
                logger.warning(f"Could not initialize LLM: {e}")
                self.llm = None
        else:
            self.llm = None
        
        # Initialize database for session data access
        try:
            self.db = ModeratorDatabase()
        except Exception as e:
            logger.warning(f"Could not initialize database: {e}")
            self.db = None
        
        # Initialize SRA service for symptom database access
        if get_sra_service:
            try:
                self.sra_service = get_sra_service()
            except Exception as e:
                logger.warning(f"Could not initialize SRA service: {e}")
                self.sra_service = None
        else:
            self.sra_service = None
        
        # Session state tracking
        self._sessions: Dict[str, Dict[str, Any]] = {}
        
        logger.debug("TreatmentPlanningModule (V2) initialized")
    
    # ========================================================================
    # REQUIRED PROPERTIES
    # ========================================================================
    
    @property
    def module_name(self) -> str:
        """Module identifier"""
        return self._module_name
    
    @property
    def module_version(self) -> str:
        """Module version"""
        return self._version
    
    @property
    def module_description(self) -> str:
        """Module description"""
        return self._description
    
    # ========================================================================
    # REQUIRED METHODS - Module Lifecycle
    # ========================================================================
    
    def start_session(self, user_id: str, session_id: str, **kwargs) -> ModuleResponse:
        """
        Start TPA session - generate comprehensive treatment plan.
        
        REDESIGNED: Utilizes ALL information:
        - DA diagnostic results
        - Complete symptom database from SRA service
        - All assessment module results
        - Patient demographics and context
        - Risk assessment results
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            **kwargs: Additional context
            
        Returns:
            ModuleResponse with treatment plan results
        """
        try:
            logger.info(f"Starting TPA session {session_id} - Comprehensive treatment planning")
            
            # Initialize session state
            self._ensure_session_exists(session_id)
            session_state = self._sessions[session_id]
            session_state.update({
                "user_id": user_id,
                "started_at": datetime.now(),
                "status": "planning",
                "conversation_step": "initial",
                "da_results": {},
                "all_module_results": {},
                "symptom_data": {},
                "treatment_plan": None,
                "reasoning": "",
                "evidence_sources": []
            })
            
            # Get ALL information for treatment planning
            all_data = self._get_all_treatment_planning_data(session_id)
            session_state["da_results"] = all_data.get("da_results", {})
            session_state["all_module_results"] = all_data.get("module_results", {})
            session_state["symptom_data"] = all_data.get("symptom_data", {})
            session_state["demographics"] = all_data.get("demographics", {})
            
            # Generate comprehensive treatment plan
            treatment_plan = self._generate_comprehensive_treatment_plan(session_id, all_data)
            
            if not treatment_plan:
                logger.warning(f"No treatment plan generated for session {session_id} - providing fallback plan")
                # Always provide a treatment plan to ensure workflow completion
                treatment_plan = self._create_fallback_treatment_plan(all_data)
            
            # Store treatment plan
            session_state["treatment_plan"] = treatment_plan
            session_state["reasoning"] = treatment_plan.get("reasoning", "")
            session_state["evidence_sources"] = treatment_plan.get("evidence_sources", [])
            session_state["status"] = "completed"
            session_state["completed_at"] = datetime.now()
            session_state["conversation_step"] = "completed"
            
            # Save results to database
            self._save_results(session_id, treatment_plan)
            
            # Generate user-friendly message
            primary_intervention = treatment_plan.get("primary_intervention", {})
            intervention_name = primary_intervention.get("name", "Personalized Treatment Plan")
            reasoning = treatment_plan.get("reasoning", "")
            
            message = (
                f"Based on your comprehensive assessment and diagnostic analysis, "
                f"I've created a personalized treatment plan for you.\n\n"
                f"**Primary Treatment Recommendation:** {intervention_name}\n\n"
            )
            
            if reasoning:
                # Truncate reasoning if too long
                short_reasoning = reasoning[:400] + "..." if len(reasoning) > 400 else reasoning
                message += f"**Why this treatment:** {short_reasoning}\n\n"
            
            # Add complementary strategies
            complementary = treatment_plan.get("complementary_strategies", [])
            if complementary:
                comp_names = [c.get("name", "") for c in complementary[:3]]
                message += f"**Supporting Strategies:** {', '.join(comp_names)}\n\n"
            
            # Add expected outcomes
            outcomes = treatment_plan.get("expected_outcomes", [])
            if outcomes:
                outcome_text = ", ".join(outcomes[:3])
                message += f"**Expected Outcomes:** {outcome_text}\n\n"
            
            message += (
                "This treatment plan is personalized based on:\n"
                "- Your diagnostic assessment\n"
                "- Your symptoms and experiences\n"
                "- Evidence-based clinical guidelines\n"
                "- Your individual needs and circumstances\n\n"
                "A clinician will review this plan with you and help you get started."
            )
            
            return ModuleResponse(
                message=message,
                is_complete=True,
                requires_input=False,  # TPA does NOT ask questions - direct plan delivery
                metadata={
                    "conversation_step": "completed",
                    "intervention": intervention_name,
                    "has_complementary": len(complementary) > 0,
                    "outcome_count": len(outcomes),
                    "tpa_no_questions": True  # Flag indicating TPA doesn't ask questions
                }
            )
            
        except Exception as e:
            logger.error(f"Error starting TPA session {session_id}: {e}", exc_info=True)
            return self.on_error(session_id, e, **kwargs)
    
    def process_message(self, message: str, session_id: str, **kwargs) -> ModuleResponse:
        """
        Process user message.
        
        NOTE: TPA module typically completes in start_session() since it's analysis-only.
        This method handles any follow-up questions.
        
        Args:
            message: User's message
            session_id: Session identifier
            **kwargs: Additional context
            
        Returns:
            ModuleResponse with explanation or completion
        """
        try:
            if session_id not in self._sessions:
                logger.warning(f"Session {session_id} not found, starting new session")
                return self.start_session(
                    kwargs.get("user_id", "unknown"),
                    session_id,
                    **kwargs
                )
            
            session_state = self._sessions[session_id]
            
            # If planning is complete, just acknowledge
            if session_state.get("status") == "completed":
                return ModuleResponse(
                    message=(
                        "Your treatment plan has been generated and is ready for review. "
                        "A clinician will discuss this plan with you in detail."
                    ),
                    is_complete=True,
                    requires_input=False
                )
            
            # Otherwise, generate plan
            # Extract user_id from kwargs to avoid passing it twice
            user_id = kwargs.pop("user_id", "unknown")
            return self.start_session(
                user_id,
                session_id,
                **kwargs
            )
                
        except Exception as e:
            logger.error(f"Error processing message in TPA session {session_id}: {e}", exc_info=True)
            return self.on_error(session_id, e, **kwargs)
    
    def is_complete(self, session_id: str) -> bool:
        """Check if treatment planning is complete"""
        if session_id not in self._sessions:
            return False
        
        session_state = self._sessions[session_id]
        return session_state.get("status") == "completed"
    
    def get_results(self, session_id: str) -> Dict[str, Any]:
        """Get final treatment plan results"""
        if session_id not in self._sessions:
            # Try to get from database
            return self._get_results_from_db(session_id)
        
        session_state = self._sessions[session_id]
        treatment_plan = session_state.get("treatment_plan") or {}
        
        return {
            "module_name": self.module_name,
            "treatment_plan": treatment_plan,
            "primary_intervention": treatment_plan.get("primary_intervention", {}) if treatment_plan else {},
            "complementary_strategies": treatment_plan.get("complementary_strategies", []) if treatment_plan else [],
            "follow_up_schedule": treatment_plan.get("follow_up_schedule", {}) if treatment_plan else {},
            "expected_outcomes": treatment_plan.get("expected_outcomes", []) if treatment_plan else [],
            "reasoning": session_state.get("reasoning", ""),
            "evidence_sources": session_state.get("evidence_sources", []),
            "risk_level": treatment_plan.get("risk_level", "moderate") if treatment_plan else "moderate",
            "uses_da_results": bool(session_state.get("da_results")),
            "uses_sra_data": bool(session_state.get("symptom_data")),
            "completed_at": session_state.get("completed_at", datetime.now()).isoformat(),
            "module_metadata": {
                "version": self.module_version,
                "agent_type": "internal",
                "planning_type": "comprehensive",
                "uses_all_data": True,
                "uses_da_data": True,
                "uses_sra_data": True
            }
        }
    
    # ========================================================================
    # COMPREHENSIVE DATA COLLECTION
    # ========================================================================
    
    def _get_all_treatment_planning_data(self, session_id: str) -> Dict[str, Any]:
        """
        Get ALL information for comprehensive treatment planning.
        
        REDESIGNED: Accesses:
        - DA diagnostic results (required)
        - Complete symptom database from SRA service
        - All module results from database
        - Patient demographics
        - Risk assessment results
        - Conversation history (if needed)
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary with all treatment planning data
        """
        all_data = {
            "da_results": {},
            "module_results": {},
            "symptom_data": {},
            "demographics": {},
            "risk_assessment": {},
            "conversation_history": []
        }
        
        try:
            # 1. Get DA results (REQUIRED - TPA runs after DA)
            if self.db:
                da_results = self.db.get_module_results(session_id, "da_diagnostic_analysis")
                if da_results:
                    all_data["da_results"] = da_results
                    logger.debug(f"Retrieved DA results for session {session_id}")
                else:
                    logger.warning(f"No DA results found for session {session_id} - TPA requires DA to run first")
            
            # 2. Get complete symptom database from SRA service
            if self.sra_service:
                try:
                    symptom_summary = self.sra_service.get_symptoms_summary(session_id)
                    if symptom_summary:
                        all_data["symptom_data"] = symptom_summary
                        logger.debug(f"Retrieved symptom data from SRA for session {session_id}")
                except Exception as e:
                    logger.warning(f"Could not get symptom data from SRA: {e}")
            
            # 3. Get all module results from database
            if self.db:
                try:
                    all_module_results = self.db.get_all_module_results(session_id)
                    if all_module_results:
                        all_data["module_results"] = all_module_results
                        logger.debug(f"Retrieved {len(all_module_results)} module results for session {session_id}")
                except Exception as e:
                    logger.warning(f"Could not get all module results: {e}")
            
            # 4. Extract demographics
            if "demographics" in all_data["module_results"]:
                all_data["demographics"] = all_data["module_results"]["demographics"]
            
            # 5. Extract risk assessment
            if "risk_assessment" in all_data["module_results"]:
                all_data["risk_assessment"] = all_data["module_results"]["risk_assessment"]
            
            # 6. Get conversation history (if available)
            if self.db:
                try:
                    history = self.db.get_conversation_history(session_id)
                    if history:
                        all_data["conversation_history"] = history
                except Exception as e:
                    logger.debug(f"Could not get conversation history: {e}")
            
            logger.info(f"Collected all treatment planning data for session {session_id}")
            return all_data
            
        except Exception as e:
            logger.error(f"Error getting all treatment planning data: {e}", exc_info=True)
            return all_data
    
    # ========================================================================
    # TREATMENT PLAN GENERATION
    # ========================================================================
    
    def _generate_comprehensive_treatment_plan(
        self,
        session_id: str,
        all_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Generate comprehensive treatment plan using ALL information.
        
        REDESIGNED: Uses:
        - DA diagnostic results
        - Complete symptom database from SRA
        - All assessment module results
        - Patient demographics and context
        - Risk assessment results
        
        Args:
            session_id: Session identifier
            all_data: All treatment planning data
            
        Returns:
            Dictionary with comprehensive treatment plan
        """
        try:
            # Extract key information
            da_results = all_data.get("da_results", {})
            symptom_data = all_data.get("symptom_data", {})
            demographics = all_data.get("demographics", {})
            risk_assessment = all_data.get("risk_assessment", {})
            
            # Get symptoms from SRA symptom database first (needed for diagnosis inference)
            # Pass session_id if available for direct SRA access
            if not symptom_data and self.sra_service:
                try:
                    # Try to get symptom data directly from SRA service
                    session_id_for_sra = all_data.get("session_id", session_id)
                    symptom_summary = self.sra_service.get_symptoms_summary(session_id_for_sra)
                    if symptom_summary:
                        symptom_data = symptom_summary
                except Exception as e:
                    logger.debug(f"Could not get symptom data directly from SRA: {e}")
            
            symptoms = self._extract_symptoms_from_sra(symptom_data)
            
            # Get diagnosis from DA (preferred, but not required)
            diagnosis = self._extract_diagnosis_from_da(da_results)
            if not diagnosis:
                # Fallback: create diagnosis from symptoms if available
                logger.info("No diagnosis available from DA - generating plan from symptoms and assessment data")
                diagnosis = self._infer_diagnosis_from_symptoms(symptoms, symptom_data, demographics)
                if not diagnosis:
                    # Last resort: generic diagnosis
                    diagnosis = {
                        "name": "Mental Health Condition",
                        "severity": "moderate",
                        "confidence": 0.5
                    }
            
            # Get severity and other context
            severity = diagnosis.get("severity", "moderate")
            confidence = da_results.get("confidence_score", 0.0)
            
            # Get risk level
            risk_level = risk_assessment.get("risk_level", "moderate") if risk_assessment else "moderate"
            red_flags = self._extract_red_flags(risk_assessment)
            
            # Use LLM for comprehensive treatment plan generation
            if not self.llm:
                logger.warning("LLM not available - using rule-based treatment plan")
                return self._generate_rule_based_plan(diagnosis, symptoms, demographics, risk_level)
            
            system_prompt = """You are a treatment planning expert. Create evidence-based treatment plans following clinical guidelines.

Use evidence-based treatment recommendations from:
- NICE (National Institute for Health and Care Excellence) guidelines
- APA (American Psychological Association) treatment guidelines
- Cochrane Reviews for treatment efficacy
- Clinical practice guidelines for mental health disorders

Return JSON with:
- primary_intervention: {name, type, description, rationale, duration_weeks, evidence_level, frequency}
- complementary_strategies: [{name, type, description, evidence_level}]
- follow_up_schedule: {frequency, duration_months, intervals}
- expected_outcomes: [list of specific, measurable outcomes]
- reasoning: detailed explanation including evidence base and personalization
- risk_level: low/moderate/high (based on patient risk)
- evidence_sources: [list of guideline sources used]
- medication_recommendations: [{name, type, indication, evidence_level}] (if applicable)
- therapy_recommendations: [{name, type, description, evidence_level}]
- lifestyle_recommendations: [{name, description, rationale}]

Evidence levels: 'strong' (multiple RCTs), 'moderate' (single RCT or strong observational), 'limited' (case studies or expert opinion)

Personalize the plan based on:
- Specific diagnosis and severity
- Individual symptoms and their patterns
- Patient demographics and context
- Risk level and safety concerns
- Evidence-based best practices"""
            
            prompt = f"""Create a comprehensive, personalized, evidence-based treatment plan:

**Diagnosis:** {diagnosis.get('name', 'Unknown')}
**Severity:** {severity}
**Confidence:** {confidence:.2f}
**Symptoms:** {', '.join(symptoms[:15]) if symptoms else 'Various symptoms reported'}
**Demographics:** Age: {demographics.get('age', 'Unknown')}, Gender: {demographics.get('gender', 'Unknown')}
**Risk Level:** {risk_level}
**Red Flags:** {', '.join(red_flags) if red_flags else 'None identified'}

**Symptom Details:**
{json.dumps(symptom_data.get('symptoms', [])[:10], indent=2) if symptom_data.get('symptoms') else 'No detailed symptom data'}

Provide an evidence-based, personalized treatment plan following clinical guidelines (NICE, APA, Cochrane). 
Specify the evidence level for each intervention.
Consider the specific diagnosis, severity, symptoms, and patient context.
Include medication recommendations only if clinically indicated.
Include therapy recommendations based on evidence.
Include lifestyle recommendations that support treatment."""
            
            # Call LLM
            response = self.llm.generate_response(prompt, system_prompt)
            
            if not response.success:
                logger.error(f"LLM failed to generate treatment plan: {response.error}")
                return self._generate_rule_based_plan(diagnosis, symptoms, demographics, risk_level)
            
            # Parse JSON response
            try:
                # Validate response content exists and is not empty
                if not hasattr(response, 'content') or response.content is None:
                    logger.debug("LLM response has no content attribute, using rule-based plan")
                    return self._generate_rule_based_plan(diagnosis, symptoms, demographics, risk_level)
                
                # Clean and validate content
                content = str(response.content).strip() if response.content else ""
                if not content:
                    logger.debug("LLM returned empty response content, using rule-based plan")
                    return self._generate_rule_based_plan(diagnosis, symptoms, demographics, risk_level)
                
                # Clean JSON content (remove code block markers if present)
                if content.startswith("```json"):
                    content = content[7:]
                elif content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
                
                # Validate content is not empty after cleaning
                if not content:
                    logger.debug("LLM response content is empty after cleaning, using rule-based plan")
                    return self._generate_rule_based_plan(diagnosis, symptoms, demographics, risk_level)
                
                # Improved JSON extraction: find the largest valid JSON object
                json_content = self._extract_json_from_text(content)
                
                if not json_content:
                    logger.debug("No valid JSON object found in LLM response, using rule-based plan")
                    return self._generate_rule_based_plan(diagnosis, symptoms, demographics, risk_level)
                
                # Parse JSON
                try:
                    plan = json.loads(json_content)
                except json.JSONDecodeError as parse_error:
                    logger.debug(f"JSON parsing failed: {parse_error}, using rule-based plan")
                    logger.debug(f"Content preview: {json_content[:200]}")
                    return self._generate_rule_based_plan(diagnosis, symptoms, demographics, risk_level)
                
                if not isinstance(plan, dict):
                    logger.warning("LLM response is not a dictionary, using rule-based plan")
                    return self._generate_rule_based_plan(diagnosis, symptoms, demographics, risk_level)
                
                # Validate and structure response
                result = {
                    "primary_intervention": plan.get("primary_intervention", {
                        "name": "Personalized Treatment Plan",
                        "type": "psychotherapy",
                        "description": "Evidence-based treatment approach",
                        "rationale": "Based on comprehensive assessment and evidence-based guidelines",
                        "duration_weeks": 12,
                        "frequency": "weekly",
                        "evidence_level": "moderate"
                    }),
                    "complementary_strategies": plan.get("complementary_strategies", []),
                    "follow_up_schedule": plan.get("follow_up_schedule", {
                        "frequency": "weekly",
                        "duration_months": 3,
                        "intervals": ["Week 1", "Week 2", "Week 4", "Week 8", "Week 12"]
                    }),
                    "expected_outcomes": plan.get("expected_outcomes", []),
                    "reasoning": plan.get("reasoning", ""),
                    "risk_level": plan.get("risk_level", risk_level),
                    "evidence_sources": plan.get("evidence_sources", ["Clinical practice guidelines"]),
                    "medication_recommendations": plan.get("medication_recommendations", []),
                    "therapy_recommendations": plan.get("therapy_recommendations", []),
                    "lifestyle_recommendations": plan.get("lifestyle_recommendations", [])
                }
                
                # Ensure evidence level is set
                if "evidence_level" not in result["primary_intervention"]:
                    result["primary_intervention"]["evidence_level"] = "moderate"
                
                logger.info(f"Treatment plan generated: {result['primary_intervention'].get('name')}")
                return result
                
            except (json.JSONDecodeError, ValueError, AttributeError) as e:
                # Only log as error if content exists but parsing failed
                # If content was empty, we already logged a warning above
                if hasattr(response, 'content') and response.content and str(response.content).strip():
                    logger.error(f"Failed to parse treatment plan JSON: {e}")
                    logger.debug(f"LLM response content: {response.content[:500] if len(str(response.content)) > 500 else response.content}")
                else:
                    logger.warning(f"JSON parsing failed due to empty/invalid content: {e}")
                return self._generate_rule_based_plan(diagnosis, symptoms, demographics, risk_level)
            
        except Exception as e:
            logger.error(f"Error generating treatment plan: {e}", exc_info=True)
            return None
    
    def _generate_rule_based_plan(
        self,
        diagnosis: Dict[str, Any],
        symptoms: List[str],
        demographics: Dict[str, Any],
        risk_level: str
    ) -> Dict[str, Any]:
        """Generate rule-based treatment plan as fallback"""
        diagnosis_name = diagnosis.get("name", "Mental Health Condition")
        severity = diagnosis.get("severity", "moderate")
        
        # Basic rule-based recommendations
        primary_intervention = {
            "name": f"Evidence-Based Treatment for {diagnosis_name}",
            "type": "psychotherapy",
            "description": "Personalized treatment approach based on assessment",
            "rationale": f"Based on diagnosis of {diagnosis_name} with {severity} severity",
            "duration_weeks": 12,
            "frequency": "weekly",
            "evidence_level": "moderate"
        }
        
        complementary_strategies = [
            {
                "name": "Psychoeducation",
                "type": "education",
                "description": "Education about condition and treatment",
                "evidence_level": "moderate"
            },
            {
                "name": "Lifestyle Modifications",
                "type": "lifestyle",
                "description": "Sleep, exercise, and stress management",
                "evidence_level": "moderate"
            }
        ]
        
        return {
            "primary_intervention": primary_intervention,
            "complementary_strategies": complementary_strategies,
            "follow_up_schedule": {
                "frequency": "weekly",
                "duration_months": 3,
                "intervals": ["Week 1", "Week 2", "Week 4", "Week 8", "Week 12"]
            },
            "expected_outcomes": [
                "Reduction in symptom severity",
                "Improved daily functioning",
                "Better coping strategies"
            ],
            "reasoning": f"Treatment plan based on diagnosis of {diagnosis_name}",
            "risk_level": risk_level,
            "evidence_sources": ["Clinical practice guidelines"],
            "medication_recommendations": [],
            "therapy_recommendations": [],
            "lifestyle_recommendations": []
        }
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _extract_diagnosis_from_da(self, da_results: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract diagnosis from DA results"""
        if not da_results:
            return None
        
        primary_diagnosis = da_results.get("primary_diagnosis", {})
        if primary_diagnosis:
            return primary_diagnosis
        
        # Fallback: try to extract from results structure
        if isinstance(da_results, dict):
            diagnosis_name = da_results.get("diagnosis")
            if diagnosis_name:
                return {"name": diagnosis_name, "severity": "moderate"}
        
        return None
    
    def _extract_symptoms_from_sra(self, symptom_data: Dict[str, Any]) -> List[str]:
        """Extract symptoms from SRA symptom database"""
        symptoms = []
        
        if not symptom_data:
            return symptoms
        
        # Extract from symptoms_list (from get_symptoms_summary)
        symptom_list = symptom_data.get("symptoms_list", [])
        if isinstance(symptom_list, list):
            for symptom in symptom_list:
                if isinstance(symptom, dict):
                    name = symptom.get("name", "")
                    if name:
                        symptoms.append(name)
                elif isinstance(symptom, str):
                    symptoms.append(symptom)
        
        # Extract from symptom list (alternative structure)
        symptom_list_alt = symptom_data.get("symptoms", [])
        if isinstance(symptom_list_alt, list):
            for symptom in symptom_list_alt:
                if isinstance(symptom, dict):
                    name = symptom.get("name", "")
                    if name:
                        symptoms.append(name)
                elif isinstance(symptom, str):
                    symptoms.append(symptom)
        
        # Extract from summary
        summary = symptom_data.get("summary", {})
        if isinstance(summary, dict):
            symptom_names = summary.get("symptom_names", [])
            if isinstance(symptom_names, list):
                symptoms.extend(symptom_names)
        
        # Also try to get symptoms directly from SRA service if available
        if not symptoms and self.sra_service:
            try:
                exported = self.sra_service.export_symptoms(symptom_data.get("session_id", ""))
                if exported:
                    for symptom in exported:
                        if isinstance(symptom, dict):
                            name = symptom.get("name", "")
                            if name:
                                symptoms.append(name)
            except Exception as e:
                logger.debug(f"Could not export symptoms from SRA: {e}")
        
        return list(set(symptoms))[:15]  # Remove duplicates and limit
    
    def _extract_red_flags(self, risk_assessment: Dict[str, Any]) -> List[str]:
        """Extract red flags and safety concerns"""
        red_flags = []
        
        if not risk_assessment:
            return red_flags
        
        if risk_assessment.get("suicide_ideation"):
            red_flags.append("Suicidal ideation")
        if risk_assessment.get("self_harm_risk"):
            red_flags.append("Self-harm risk")
        if risk_assessment.get("risk_level", "").lower() in ["high", "critical"]:
            red_flags.append("High risk level")
        
        return red_flags
    
    def _infer_diagnosis_from_symptoms(
        self,
        symptoms: List[str],
        symptom_data: Dict[str, Any],
        demographics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Infer diagnosis from symptoms when DA results are not available"""
        if not symptoms:
            return None
        
        # Analyze symptom patterns to infer likely diagnosis
        symptom_categories = {}
        if symptom_data and isinstance(symptom_data, dict):
            symptom_list = symptom_data.get("symptoms_list", [])
            if isinstance(symptom_list, list):
                for symptom in symptom_list:
                    if isinstance(symptom, dict):
                        category = symptom.get("category", "")
                        if category:
                            symptom_categories[category] = symptom_categories.get(category, 0) + 1
        
        # Map symptom categories to likely diagnoses
        diagnosis_map = {
            "mood": "Depressive Disorder",
            "anxiety": "Anxiety Disorder",
            "panic": "Panic Disorder",
            "ocd": "Obsessive-Compulsive Disorder",
            "trauma": "Post-Traumatic Stress Disorder",
            "adhd": "Attention-Deficit/Hyperactivity Disorder"
        }
        
        # Find most common category
        if symptom_categories:
            most_common = max(symptom_categories.items(), key=lambda x: x[1])
            diagnosis_name = diagnosis_map.get(most_common[0], "Mental Health Condition")
            
            # Determine severity based on symptom count
            total_symptoms = len(symptoms)
            if total_symptoms >= 10:
                severity = "severe"
            elif total_symptoms >= 5:
                severity = "moderate"
            else:
                severity = "mild"
            
            return {
                "name": diagnosis_name,
                "severity": severity,
                "confidence": 0.6,  # Lower confidence when inferred
                "inferred": True,
                "based_on": f"{most_common[0]} symptoms"
            }
        
        # Fallback: generic diagnosis
        return {
            "name": "Mental Health Condition",
            "severity": "moderate",
            "confidence": 0.5,
            "inferred": True,
            "based_on": "symptom patterns"
        }
    
    def _save_results(self, session_id: str, treatment_plan: Dict[str, Any]) -> bool:
        """Save treatment plan results to database"""
        try:
            if self.db:
                results = self.get_results(session_id)
                return self.db.save_module_result(
                    session_id=session_id,
                    module_name=self.module_name,
                    result=results
                )
            return False
        except Exception as e:
            logger.error(f"Error saving TPA results: {e}")
            return False
    
    def _get_results_from_db(self, session_id: str) -> Dict[str, Any]:
        """Get results from database if not in memory"""
        try:
            if self.db:
                results = self.db.get_module_results(session_id, self.module_name)
                if results:
                    return results
            return {}
        except Exception as e:
            logger.error(f"Error getting TPA results from DB: {e}")
            return {}
    
    def get_progress(self, session_id: str) -> Optional[ModuleProgress]:
        """Get progress through treatment planning"""
        if session_id not in self._sessions:
            return None
        
        session_state = self._sessions[session_id]
        status = session_state.get("status", "initial")
        
        steps = {
            "initial": 0,
            "planning": 1,
            "generating": 2,
            "completed": 3
        }
        
        current = steps.get(status, 0)
        total = 3
        
        return ModuleProgress(
            total_steps=total,
            completed_steps=current,
            current_step=status,
            percentage=(current / total) * 100
        )
    
    # ========================================================================
    # OPTIONAL METHODS - State Persistence
    # ========================================================================
    
    def on_activate(self, session_id: str, **kwargs) -> None:
        """Called when module becomes active"""
        logger.info(f"TPA module activated for session {session_id}")
        self._ensure_session_exists(session_id)
    
    def on_complete(self, session_id: str, **kwargs) -> None:
        """Called when module completes"""
        logger.info(f"TPA module completed for session {session_id}")
        # Results are saved in start_session
    
    def checkpoint_state(self, session_id: str) -> bool:
        """Save module state to database for resume capability"""
        try:
            if session_id not in self._sessions:
                return False
            
            session_state = self._sessions[session_id]
            return self.db.save_module_state(
                session_id=session_id,
                module_name=self.module_name,
                state_data=session_state,
                checkpoint_metadata={
                    "status": session_state.get("status"),
                    "checkpointed_at": datetime.now().isoformat()
                }
            ) if self.db else False
        except Exception as e:
            logger.error(f"Failed to checkpoint TPA state for session {session_id}: {e}")
            return False
    
    def resume_from_checkpoint(self, session_id: str) -> bool:
        """Restore module state from database checkpoint"""
        try:
            if self.db:
                state_data = self.db.get_module_state(session_id, self.module_name)
                if not state_data:
                    return False
                
                self._sessions[session_id] = state_data.get("state_data", {})
                logger.info(f"TPA module resumed from checkpoint for session {session_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to resume TPA from checkpoint for session {session_id}: {e}")
            return False
    
    def compile_results(self, session_id: str) -> Dict[str, Any]:
        """Compile final results - same as get_results for consistency"""
        return self.get_results(session_id)
    
    def on_error(self, session_id: str, error: Exception, **kwargs) -> ModuleResponse:
        """Handle errors in the TPA module with user-friendly messages"""
        logger.error(f"Error in TPA module for session {session_id}: {error}", exc_info=True)
        
        return ModuleResponse(
            message=(
                "I encountered an issue while creating your treatment plan. "
                "Please try again or contact support if the issue persists."
            ),
            is_complete=False,
            requires_input=False,
            error=str(error),
            metadata={"error_type": type(error).__name__, "module": self.module_name}
        )
    
    def _extract_json_from_text(self, text: str) -> Optional[str]:
        """
        Extract JSON object from text, handling various formats.
        
        Tries multiple strategies:
        1. Direct JSON if text starts with {
        2. Find first { and last } and extract
        3. Find all { } pairs and extract the largest valid JSON
        4. Try to fix common JSON issues (trailing commas, etc.)
        
        Args:
            text: Text that may contain JSON
            
        Returns:
            Extracted JSON string or None if not found
        """
        if not text:
            return None
        
        # Strategy 1: If text starts with {, try to find matching }
        if text.startswith("{"):
            # Count braces to find the end of the JSON object
            brace_count = 0
            in_string = False
            escape_next = False
            
            for i, char in enumerate(text):
                if escape_next:
                    escape_next = False
                    continue
                
                if char == '\\':
                    escape_next = True
                    continue
                
                if char == '"' and not escape_next:
                    in_string = not in_string
                    continue
                
                if not in_string:
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            # Found complete JSON object
                            json_str = text[:i + 1]
                            try:
                                # Validate it's actually JSON
                                json.loads(json_str)
                                return json_str
                            except json.JSONDecodeError:
                                pass
            
            # If we didn't find a complete object, try the whole text up to last }
            if brace_count > 0:
                last_brace = text.rfind("}")
                if last_brace != -1:
                    json_str = text[:last_brace + 1]
                    try:
                        json.loads(json_str)
                        return json_str
                    except json.JSONDecodeError:
                        pass
        
        # Strategy 2: Find first { and try to extract JSON from there
        first_brace = text.find("{")
        if first_brace != -1:
            # Try to extract JSON starting from first brace
            potential_json = text[first_brace:]
            
            # Count braces to find the end
            brace_count = 0
            in_string = False
            escape_next = False
            
            for i, char in enumerate(potential_json):
                if escape_next:
                    escape_next = False
                    continue
                
                if char == '\\':
                    escape_next = True
                    continue
                
                if char == '"' and not escape_next:
                    in_string = not in_string
                    continue
                
                if not in_string:
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_str = potential_json[:i + 1]
                            try:
                                json.loads(json_str)
                                return json_str
                            except json.JSONDecodeError:
                                pass
            
            # If we didn't find complete JSON, try up to last }
            if brace_count > 0:
                last_brace = potential_json.rfind("}")
                if last_brace != -1:
                    json_str = potential_json[:last_brace + 1]
                    try:
                        json.loads(json_str)
                        return json_str
                    except json.JSONDecodeError:
                        pass
        
        # Strategy 3: Try to fix common JSON issues and parse
        # Remove common non-JSON prefixes/suffixes
        cleaned = text.strip()
        
        # Remove markdown code blocks if still present
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            if len(lines) > 1:
                cleaned = "\n".join(lines[1:])
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        
        # Try to find JSON boundaries
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = cleaned[start_idx:end_idx + 1]
            try:
                json.loads(json_str)
                return json_str
            except json.JSONDecodeError:
                # Try to fix common issues
                # Remove trailing commas before }
                import re
                json_str = re.sub(r',\s*}', '}', json_str)
                json_str = re.sub(r',\s*]', ']', json_str)
                try:
                    json.loads(json_str)
                    return json_str
                except json.JSONDecodeError:
                    pass
        
        return None
    
    def _create_fallback_treatment_plan(self, all_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a fallback treatment plan when primary planning fails.
        Ensures workflow always completes successfully.

        Args:
            all_data: All assessment data

        Returns:
            Fallback treatment plan dictionary
        """
        try:
            # Extract basic information
            diagnosis = all_data.get("da_results", {}).get("primary_diagnosis", {})
            symptoms = all_data.get("symptom_data", {}).get("symptoms", [])
            demographics = all_data.get("demographics", {})

            diagnosis_name = diagnosis.get("name", "Mental Health Concerns")
            severity = diagnosis.get("severity", "moderate")

            # Create evidence-based fallback plan
            primary_intervention = {
                "name": "Professional Mental Health Consultation",
                "type": "consultation",
                "description": "Consult with a licensed mental health professional for comprehensive evaluation and personalized treatment planning",
                "duration_weeks": 1,
                "frequency": "As needed",
                "rationale": "Professional evaluation is essential for accurate diagnosis and appropriate treatment recommendations"
            }

            complementary_strategies = [
                {
                    "name": "Self-Care and Lifestyle Support",
                    "type": "lifestyle",
                    "description": "Maintain healthy sleep, nutrition, and exercise routines",
                    "evidence_level": "Strong"
                },
                {
                    "name": "Stress Management Techniques",
                    "type": "psychoeducation",
                    "description": "Practice relaxation techniques and stress reduction methods",
                    "evidence_level": "Moderate"
                },
                {
                    "name": "Support Network",
                    "type": "social_support",
                    "description": "Connect with trusted friends, family, or support groups",
                    "evidence_level": "Moderate"
                }
            ]

            expected_outcomes = [
                "Comprehensive professional assessment completed",
                "Personalized treatment plan developed",
                "Appropriate therapeutic interventions initiated",
                "Regular progress monitoring established"
            ]

            return {
                "primary_intervention": primary_intervention,
                "complementary_strategies": complementary_strategies,
                "expected_outcomes": expected_outcomes,
                "timeline": "Immediate professional consultation recommended",
                "monitoring_plan": "Regular follow-up with mental health professional",
                "reasoning": (
                    f"Based on the assessment results indicating {diagnosis_name} "
                    "of {severity} severity, immediate professional consultation is recommended "
                    "for comprehensive evaluation and treatment planning."
                ),
                "evidence_sources": [
                    "Clinical assessment completed",
                    "Reported symptoms documented",
                    "Professional consultation recommended"
                ],
                "risk_level": "moderate",
                "urgency": "routine",
                "fallback_plan": True
            }

        except Exception as e:
            logger.error(f"Error creating fallback treatment plan: {e}")
            # Ultimate fallback - always provide some plan
            return {
                "primary_intervention": {
                    "name": "Mental Health Professional Consultation",
                    "type": "consultation",
                    "description": "Consult with a mental health professional for evaluation and treatment",
                    "duration_weeks": 1,
                    "frequency": "As needed"
                },
                "complementary_strategies": [
                    {
                        "name": "Self-Care Support",
                        "type": "lifestyle",
                        "description": "Maintain healthy routines and seek support"
                    }
                ],
                "expected_outcomes": [
                    "Professional assessment completed",
                    "Treatment plan developed"
                ],
                "reasoning": "Assessment completed. Professional consultation recommended.",
                "evidence_sources": ["Assessment completed"],
                "fallback_plan": True
            }

    def _ensure_session_exists(self, session_id: str) -> None:
        """Ensure session state exists"""
        if session_id not in self._sessions:
            self._sessions[session_id] = {}

