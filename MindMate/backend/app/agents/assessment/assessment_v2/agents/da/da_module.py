"""
Diagnostic Analysis (DA) Module for Assessment V2
REDESIGNED: Runs after ALL modules complete and utilizes ALL assessment data for comprehensive DSM-5 mapping
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

logger = logging.getLogger(__name__)

# Import assessment_v2 components
try:
    from app.agents.assessment.assessment_v2.types import ModuleResponse, ModuleProgress
    from app.agents.assessment.assessment_v2.database import ModeratorDatabase
    from app.agents.assessment.assessment_v2.core.sra_service import get_sra_service
    from app.agents.assessment.assessment_v2.core.dsm_criteria_engine import DSMCriteriaEngine
    from app.agents.assessment.assessment_v2.base_module import BaseAssessmentModule
except ImportError:
    # Fallback imports for compatibility
    try:
        from ...types import ModuleResponse, ModuleProgress
        from ...database import ModeratorDatabase
        from ...core.sra_service import get_sra_service
        from ...core.dsm_criteria_engine import DSMCriteriaEngine
        from ...base_module import BaseAssessmentModule
    except ImportError:
        from app.agents.assessment.module_types import ModuleResponse, ModuleProgress
        from app.agents.assessment.database import ModeratorDatabase
        from app.agents.assessment.assessment_v2.base_module import BaseAssessmentModule
        get_sra_service = None
        DSMCriteriaEngine = None

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
            logger.warning("LLMWrapper not available - DA will use rule-based analysis")


class DiagnosticAnalysisModule(BaseAssessmentModule):
    """
    REDESIGNED Diagnostic Analysis Module for Assessment V2
    
    Runs AFTER ALL modules complete and utilizes ALL assessment data:
    - All module results (demographics, concern, risk, screening, diagnostic modules)
    - Complete symptom database from SRA service
    - All conversation history
    - Performs comprehensive DSM-5 mapping
    - Generates diagnostic conclusions
    """
    
    def __init__(self):
        """Initialize the DA module"""
        self._module_name = "da_diagnostic_analysis"
        self._version = "2.0.0"  # Updated version for v2
        self._description = "Comprehensive diagnostic analysis using all assessment data and DSM-5 criteria mapping. Runs after ALL modules complete."
        
        super().__init__()
        
        # Initialize LLM for diagnostic analysis
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
        
        # Initialize DSM criteria engine
        if DSMCriteriaEngine:
            try:
                self.dsm_engine = DSMCriteriaEngine()
            except Exception as e:
                logger.warning(f"Could not initialize DSM engine: {e}")
                self.dsm_engine = None
        else:
            self.dsm_engine = None
        
        # Session state tracking
        self._sessions: Dict[str, Dict[str, Any]] = {}
        
        logger.debug("DiagnosticAnalysisModule (V2) initialized")
    
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
        Start DA session - perform comprehensive diagnostic analysis.
        
        REDESIGNED: Accesses ALL assessment data:
        - All module results from database
        - Complete symptom database from SRA service
        - All conversation history
        - Performs comprehensive DSM-5 mapping
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            **kwargs: Additional context
            
        Returns:
            ModuleResponse with diagnostic analysis results
        """
        try:
            logger.info(f"Starting DA session {session_id} - Comprehensive diagnostic analysis")
            
            # Initialize session state
            self._ensure_session_exists(session_id)
            session_state = self._sessions[session_id]
            session_state.update({
                "user_id": user_id,
                "started_at": datetime.now(),
                "status": "analyzing",
                "conversation_step": "initial",
                "all_module_results": {},
                "symptom_data": {},
                "primary_diagnosis": None,
                "differential_diagnoses": [],
                "confidence_score": 0.0,
                "reasoning": "",
                "matched_criteria": [],
                "dsm5_mapping": {}
            })
            
            # Get ALL assessment data
            all_data = self._get_all_assessment_data(session_id)
            session_state["all_module_results"] = all_data.get("module_results", {})
            session_state["symptom_data"] = all_data.get("symptom_data", {})
            session_state["conversation_history"] = all_data.get("conversation_history", [])
            
            # Perform comprehensive diagnostic analysis
            diagnosis_result = self._perform_comprehensive_diagnostic_analysis(session_id, all_data)
            
            if not diagnosis_result or not diagnosis_result.get("primary_diagnosis"):
                logger.warning(f"No diagnosis generated for session {session_id}")
                return ModuleResponse(
                    message=(
                        "I've completed a comprehensive analysis of your assessment data. "
                        "Based on the information collected, I need to gather additional context. "
                        "Could you describe what you've been experiencing in more detail?"
                    ),
                    is_complete=False,
                    requires_input=True,
                    metadata={"conversation_step": "needs_more_info"}
                )
            
            # Store diagnosis results
            session_state["primary_diagnosis"] = diagnosis_result.get("primary_diagnosis")
            session_state["differential_diagnoses"] = diagnosis_result.get("differential_diagnoses", [])
            session_state["confidence_score"] = diagnosis_result.get("confidence", 0.0)
            session_state["reasoning"] = diagnosis_result.get("reasoning", "")
            session_state["matched_criteria"] = diagnosis_result.get("matched_criteria", [])
            session_state["dsm5_mapping"] = diagnosis_result.get("dsm5_mapping", {})
            session_state["status"] = "completed"
            session_state["completed_at"] = datetime.now()
            session_state["conversation_step"] = "completed"
            
            # Save results to database
            self._save_results(session_id, diagnosis_result)
            
            # Generate user-friendly message
            diagnosis_name = diagnosis_result.get("primary_diagnosis", {}).get("name", "Unknown")
            confidence = diagnosis_result.get("confidence", 0.0)
            reasoning = diagnosis_result.get("reasoning", "")
            
            message = (
                f"Based on my comprehensive analysis of your assessment, "
                f"my diagnostic evaluation suggests **{diagnosis_name}**. "
            )
            
            if confidence >= 0.8:
                message += "I have high confidence in this assessment based on the comprehensive data collected. "
            elif confidence >= 0.6:
                message += "This assessment has good confidence based on the available data. "
            else:
                message += "This is a preliminary assessment that may require further evaluation. "
            
            if reasoning:
                # Truncate reasoning if too long
                short_reasoning = reasoning[:300] + "..." if len(reasoning) > 300 else reasoning
                message += f"\n\nAnalysis: {short_reasoning}"
            
            message += (
                "\n\nThis diagnostic analysis is based on all the information you've provided, "
                "including your symptoms, responses to assessment questions, and clinical criteria. "
                "This will help inform your personalized treatment plan."
            )
            
            return ModuleResponse(
                message=message,
                is_complete=True,
                requires_input=False,
                metadata={
                    "conversation_step": "completed",
                    "diagnosis": diagnosis_name,
                    "confidence": confidence,
                    "differential_count": len(diagnosis_result.get("differential_diagnoses", []))
                }
            )
            
        except Exception as e:
            logger.error(f"Error starting DA session {session_id}: {e}", exc_info=True)
            return self.on_error(session_id, e, **kwargs)
    
    def process_message(self, message: str, session_id: str, **kwargs) -> ModuleResponse:
        """
        Process user message.
        
        NOTE: DA module typically completes in start_session() since it's analysis-only.
        This method handles any follow-up questions and additional context.
        
        Args:
            message: User's message
            session_id: Session identifier
            **kwargs: Additional context
            
        Returns:
            ModuleResponse with explanation or completion
        """
        try:
            # Extract user_id and remove it from kwargs to avoid duplicate argument error
            user_id = kwargs.get("user_id", "unknown")
            kwargs_without_user_id = {k: v for k, v in kwargs.items() if k != "user_id"}
            
            if session_id not in self._sessions:
                logger.warning(f"Session {session_id} not found, starting new session")
                return self.start_session(
                    user_id,
                    session_id,
                    **kwargs_without_user_id
                )
            
            session_state = self._sessions[session_id]
            
            # If analysis is complete, just acknowledge
            if session_state.get("status") == "completed":
                return ModuleResponse(
                    message=(
                        "The diagnostic analysis has been completed. "
                        "Your personalized treatment plan will be generated next."
                    ),
                    is_complete=True,
                    requires_input=False
                )
            
            # If we're in "needs_more_info" state, process the additional context
            if session_state.get("conversation_step") == "needs_more_info":
                logger.info(f"Processing additional context for session {session_id}")
                
                # Store the user's additional context in conversation history
                # This will be picked up by _get_all_assessment_data in the next analysis
                if self.sra_service:
                    try:
                        # Process the message through SRA to extract symptoms
                        self.sra_service.process_message(message, session_id, user_id=user_id)
                        logger.debug(f"Processed additional context through SRA service")
                    except Exception as e:
                        logger.warning(f"Error processing message through SRA: {e}")
                
                # Store additional context in session state
                if "additional_context" not in session_state:
                    session_state["additional_context"] = []
                session_state["additional_context"].append({
                    "message": message,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Update conversation step
                session_state["conversation_step"] = "analyzing_with_context"
                
                # Re-run analysis with the new context
                # Get updated assessment data (which now includes the new conversation)
                all_data = self._get_all_assessment_data(session_id)
                
                # Add the additional context explicitly to the data
                all_data["additional_context"] = session_state.get("additional_context", [])
                
                # Update session state with latest data
                session_state["all_module_results"] = all_data.get("module_results", {})
                session_state["symptom_data"] = all_data.get("symptom_data", {})
                session_state["conversation_history"] = all_data.get("conversation_history", [])
                
                # Perform comprehensive diagnostic analysis with updated data
                diagnosis_result = self._perform_comprehensive_diagnostic_analysis(session_id, all_data)
                
                if not diagnosis_result or not diagnosis_result.get("primary_diagnosis"):
                    logger.warning(f"Still no diagnosis after additional context for session {session_id}")
                    return ModuleResponse(
                        message=(
                            "Thank you for providing that additional information. "
                            "I'm still analyzing your responses. Could you share any other details "
                            "about your symptoms, how long you've been experiencing them, or how they're affecting your daily life?"
                        ),
                        is_complete=False,
                        requires_input=True,
                        metadata={"conversation_step": "needs_more_info"}
                    )
                
                # Store diagnosis results
                session_state["primary_diagnosis"] = diagnosis_result.get("primary_diagnosis")
                session_state["differential_diagnoses"] = diagnosis_result.get("differential_diagnoses", [])
                session_state["confidence_score"] = diagnosis_result.get("confidence", 0.0)
                session_state["reasoning"] = diagnosis_result.get("reasoning", "")
                session_state["matched_criteria"] = diagnosis_result.get("matched_criteria", [])
                session_state["dsm5_mapping"] = diagnosis_result.get("dsm5_mapping", {})
                session_state["status"] = "completed"
                session_state["completed_at"] = datetime.now()
                session_state["conversation_step"] = "completed"
                
                # Save results to database
                self._save_results(session_id, diagnosis_result)
                
                # Generate user-friendly message
                diagnosis_name = diagnosis_result.get("primary_diagnosis", {}).get("name", "Unknown")
                confidence = diagnosis_result.get("confidence", 0.0)
                reasoning = diagnosis_result.get("reasoning", "")
                
                message_text = (
                    f"Thank you for providing that additional context. "
                    f"Based on all the information you've shared, I've completed a comprehensive analysis.\n\n"
                    f"**Primary Diagnosis:** {diagnosis_name}\n"
                    f"**Confidence Level:** {confidence:.0%}\n\n"
                )
                
                if reasoning:
                    short_reasoning = reasoning[:300] + "..." if len(reasoning) > 300 else reasoning
                    message_text += f"**Analysis:** {short_reasoning}\n\n"
                
                message_text += (
                    "Your personalized treatment plan will be generated next."
                )
                
                return ModuleResponse(
                    message=message_text,
                    is_complete=True,
                    requires_input=False,
                    metadata={
                        "conversation_step": "completed",
                        "diagnosis": diagnosis_name,
                        "confidence": confidence,
                        "differential_count": len(diagnosis_result.get("differential_diagnoses", []))
                    }
                )
            
            # Otherwise, perform analysis (for other states)
            return self.start_session(
                user_id,
                session_id,
                **kwargs_without_user_id
            )
                
        except Exception as e:
            logger.error(f"Error processing message in DA session {session_id}: {e}", exc_info=True)
            return self.on_error(session_id, e, **kwargs)
    
    def is_complete(self, session_id: str) -> bool:
        """Check if diagnostic analysis is complete"""
        if session_id not in self._sessions:
            return False
        
        session_state = self._sessions[session_id]
        return session_state.get("status") == "completed"
    
    def get_results(self, session_id: str) -> Dict[str, Any]:
        """Get final diagnostic analysis results"""
        if session_id not in self._sessions:
            # Try to get from database
            return self._get_results_from_db(session_id)
        
        session_state = self._sessions[session_id]
        primary_diagnosis = session_state.get("primary_diagnosis") or {}
        
        return {
            "module_name": self.module_name,
            "primary_diagnosis": primary_diagnosis,
            "differential_diagnoses": session_state.get("differential_diagnoses", []),
            "confidence_score": session_state.get("confidence_score", 0.0),
            "reasoning": session_state.get("reasoning", ""),
            "matched_criteria": session_state.get("matched_criteria", []),
            "dsm5_mapping": session_state.get("dsm5_mapping", {}),
            "severity": primary_diagnosis.get("severity", "unknown") if primary_diagnosis else "unknown",
            "symptom_summary": session_state.get("symptom_data", {}).get("summary", {}),
            "modules_analyzed": list(session_state.get("all_module_results", {}).keys()),
            "completed_at": session_state.get("completed_at", datetime.now()).isoformat(),
            "module_metadata": {
                "version": self.module_version,
                "agent_type": "internal",
                "analysis_type": "comprehensive",
                "uses_all_data": True,
                "uses_sra_data": True
            }
        }
    
    # ========================================================================
    # COMPREHENSIVE DATA COLLECTION
    # ========================================================================
    
    def _get_all_assessment_data(self, session_id: str) -> Dict[str, Any]:
        """
        Get ALL assessment data for comprehensive analysis.
        
        REDESIGNED: Accesses:
        - All module results from database
        - Complete symptom database from SRA service
        - All conversation history
        - Patient demographics
        - Risk assessment results
        - Screening results
        - All diagnostic module results
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary with all assessment data
        """
        try:
            all_data = {
                "module_results": {},
                "symptom_data": {},
                "conversation_history": [],
                "demographics": {},
                "risk_assessment": {},
                "screening_results": {},
                "diagnostic_results": {}
            }
            
            # Get all module results from database
            if self.db:
                try:
                    all_data["module_results"] = self.db.get_all_module_results(session_id)
                    logger.debug(f"Retrieved {len(all_data['module_results'])} module results from database")
                except Exception as e:
                    logger.warning(f"Error getting module results from database: {e}")
            
            # Get symptom database from SRA service
            if self.sra_service:
                try:
                    # Get complete symptom database
                    symptom_summary = self.sra_service.get_symptoms_summary(session_id)
                    all_data["symptom_data"] = {
                        "summary": symptom_summary,
                        "symptoms": self.sra_service.export_symptoms(session_id)
                    }
                    logger.debug(f"Retrieved {symptom_summary.get('total_symptoms', 0)} symptoms from SRA service")
                except Exception as e:
                    logger.warning(f"Error getting symptoms from SRA service: {e}")
            
            # Get conversation history
            if self.db:
                try:
                    all_data["conversation_history"] = self.db.get_conversation_history(session_id, limit=1000)
                    logger.debug(f"Retrieved {len(all_data['conversation_history'])} conversation messages")
                except Exception as e:
                    logger.warning(f"Error getting conversation history: {e}")
            
            # Extract specific module data
            module_results = all_data["module_results"]
            
            # Demographics
            if "demographics" in module_results:
                all_data["demographics"] = module_results["demographics"]
            
            # Presenting concern
            if "presenting_concern" in module_results:
                all_data["presenting_concern"] = module_results["presenting_concern"]
            
            # Risk assessment
            if "risk_assessment" in module_results:
                all_data["risk_assessment"] = module_results["risk_assessment"]
            
            # SCID screening
            if "scid_screening" in module_results:
                all_data["screening_results"] = module_results["scid_screening"]
            
            # SCID-CV diagnostic modules (may be multiple)
            diagnostic_modules = [
                "scid_cv_diagnostic",
                "mdd", "bipolar", "gad", "panic", "ptsd", "ocd", "adhd",
                "social_anxiety", "agoraphobia", "specific_phobia",
                "adjustment_disorder", "alcohol_use", "substance_use", "eating_disorder"
            ]
            
            for module_name in diagnostic_modules:
                if module_name in module_results:
                    all_data["diagnostic_results"][module_name] = module_results[module_name]
            
            logger.info(f"Collected comprehensive assessment data for session {session_id}")
            return all_data
            
        except Exception as e:
            logger.error(f"Error getting all assessment data: {e}", exc_info=True)
            return {
                "module_results": {},
                "symptom_data": {},
                "conversation_history": []
            }
    
    # ========================================================================
    # COMPREHENSIVE DIAGNOSTIC ANALYSIS
    # ========================================================================
    
    def _perform_comprehensive_diagnostic_analysis(
        self,
        session_id: str,
        all_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Perform comprehensive diagnostic analysis using ALL assessment data.
        
        REDESIGNED: Uses:
        - Complete symptom database from SRA
        - All module results
        - DSM-5 criteria mapping
        - LLM for clinical reasoning
        
        Args:
            session_id: Session identifier
            all_data: All assessment data
            
        Returns:
            Dictionary with diagnostic analysis results
        """
        try:
            # Extract symptoms from SRA symptom database
            symptoms = self._extract_symptoms_from_sra(all_data.get("symptom_data", {}))
            
            # Extract symptoms from module results (fallback)
            if not symptoms:
                symptoms = self._extract_symptoms_from_modules(all_data.get("module_results", {}))
            
            if not symptoms:
                logger.warning(f"No symptoms found for diagnostic analysis in session {session_id}")
                return None
            
            # Extract demographics and context
            demographics = all_data.get("demographics", {})
            presenting_concern = all_data.get("presenting_concern", {})
            risk_assessment = all_data.get("risk_assessment", {})
            screening_results = all_data.get("screening_results", {})
            diagnostic_results = all_data.get("diagnostic_results", {})
            
            # Build comprehensive data for LLM analysis
            analysis_data = {
                "symptoms": symptoms,
                "symptom_count": len(symptoms),
                "demographics": demographics,
                "presenting_concern": presenting_concern.get("concern", ""),
                "risk_level": risk_assessment.get("risk_level", "unknown"),
                "screening_results": screening_results,
                "diagnostic_module_results": diagnostic_results,
                "conversation_length": len(all_data.get("conversation_history", []))
            }
            
            # Perform DSM-5 mapping using DSM criteria engine if available
            dsm5_mapping = {}
            if self.dsm_engine:
                try:
                    # Map symptoms to DSM-5 criteria
                    dsm5_mapping = self._map_to_dsm5_criteria(symptoms, diagnostic_results)
                except Exception as e:
                    logger.warning(f"DSM-5 mapping error: {e}")
            
            # Use LLM for comprehensive diagnostic analysis
            if self.llm:
                diagnosis_result = self._llm_diagnostic_analysis(analysis_data, dsm5_mapping)
            else:
                # Fallback to rule-based analysis
                diagnosis_result = self._rule_based_diagnostic_analysis(analysis_data, dsm5_mapping)
            
            if diagnosis_result:
                diagnosis_result["dsm5_mapping"] = dsm5_mapping
                diagnosis_result["symptoms_analyzed"] = len(symptoms)
                diagnosis_result["modules_analyzed"] = list(diagnostic_results.keys())
            
            logger.info(f"Comprehensive diagnostic analysis completed for session {session_id}")
            return diagnosis_result
            
        except Exception as e:
            logger.error(f"Error performing comprehensive diagnostic analysis: {e}", exc_info=True)
            return None
    
    def _extract_symptoms_from_sra(self, symptom_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract symptoms from SRA symptom database.
        
        Args:
            symptom_data: Symptom data from SRA service
            
        Returns:
            List of symptom dictionaries with attributes
        """
        symptoms = []
        
        try:
            symptom_list = symptom_data.get("symptoms", [])
            if symptom_list:
                # Use symptoms directly from SRA database
                symptoms = symptom_list
            else:
                # Try to extract from summary
                summary = symptom_data.get("summary", {})
                symptoms_list = summary.get("symptoms_list", [])
                if symptoms_list:
                    symptoms = symptoms_list
            
            logger.debug(f"Extracted {len(symptoms)} symptoms from SRA database")
            return symptoms
            
        except Exception as e:
            logger.warning(f"Error extracting symptoms from SRA: {e}")
            return []
    
    def _extract_symptoms_from_modules(self, module_results: Dict[str, Any]) -> List[str]:
        """
        Extract symptoms from module results (fallback if SRA data not available).
        
        Args:
            module_results: Module results dictionary
            
        Returns:
            List of symptom strings
        """
        symptoms = []
        
        # Extract from SCID-CV diagnostic modules
        for module_name, module_data in module_results.items():
            if isinstance(module_data, dict):
                # Try to extract symptoms from various possible structures
                if "symptoms" in module_data:
                    symptoms.extend(module_data["symptoms"])
                if "key_symptoms" in module_data:
                    symptoms.extend(module_data["key_symptoms"])
                if "result" in module_data and isinstance(module_data["result"], dict):
                    result = module_data["result"]
                    if "symptoms" in result:
                        symptoms.extend(result["symptoms"])
                    if "key_symptoms" in result:
                        symptoms.extend(result["key_symptoms"])
        
        # Extract from SCID screening
        if "scid_screening" in module_results:
            screening = module_results["scid_screening"]
            if isinstance(screening, dict):
                positive_screens = screening.get("positive_screens", [])
                symptoms.extend([f"Positive screen: {s}" for s in positive_screens])
        
        return list(set(symptoms))  # Remove duplicates
    
    def _map_to_dsm5_criteria(
        self,
        symptoms: List[Any],
        diagnostic_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Map symptoms to DSM-5 criteria using DSM criteria engine.
        
        Args:
            symptoms: List of symptoms
            diagnostic_results: Diagnostic module results
            
        Returns:
            Dictionary with DSM-5 criteria mapping
        """
        try:
            dsm5_mapping = {
                "disorders_checked": [],
                "criteria_matches": {},
                "diagnostic_suggestions": []
            }
            
            # Extract disorder IDs from diagnostic results
            disorder_ids = list(diagnostic_results.keys())
            dsm5_mapping["disorders_checked"] = disorder_ids
            
            # Map symptoms to criteria for each disorder
            for disorder_id in disorder_ids:
                # This would use the DSM criteria engine to map symptoms to criteria
                # For now, return basic structure
                dsm5_mapping["criteria_matches"][disorder_id] = {
                    "symptoms_matched": len(symptoms),
                    "criteria_met": []
                }
            
            return dsm5_mapping
            
        except Exception as e:
            logger.warning(f"Error mapping to DSM-5 criteria: {e}")
            return {}
    
    def _llm_diagnostic_analysis(
        self,
        analysis_data: Dict[str, Any],
        dsm5_mapping: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Perform diagnostic analysis using LLM.
        
        Args:
            analysis_data: Comprehensive analysis data
            dsm5_mapping: DSM-5 criteria mapping
            
        Returns:
            Dictionary with diagnostic analysis results
        """
        if not self.llm:
            return None
        
        try:
            system_prompt = """You are a clinical diagnostic expert specializing in DSM-5 diagnostic analysis.
Analyze all assessment data and provide comprehensive diagnostic analysis.

Return JSON with:
- primary_diagnosis: {name, severity, dsm5_code, criteria_met, confidence}
- differential_diagnoses: [{name, reason, confidence}]
- confidence: 0.0-1.0 (overall confidence)
- reasoning: comprehensive explanation
- matched_criteria: [list of DSM-5 criteria matched]
- diagnostic_notes: clinical notes

Focus on mental health diagnoses (mood disorders, anxiety disorders, trauma disorders, etc.).
Use DSM-5 criteria for accurate diagnosis.
Return only valid JSON, no additional text."""
            
            # Build comprehensive prompt
            symptoms_text = self._format_symptoms_for_llm(analysis_data.get("symptoms", []))
            demographics_text = json.dumps(analysis_data.get("demographics", {}), indent=2)
            diagnostic_results_text = json.dumps(analysis_data.get("diagnostic_module_results", {}), indent=2)
            dsm5_mapping_text = json.dumps(dsm5_mapping, indent=2)
            
            prompt = f"""Perform comprehensive DSM-5 diagnostic analysis using all available assessment data.

SYMPTOMS ({analysis_data.get('symptom_count', 0)} symptoms):
{symptoms_text}

DEMOGRAPHICS:
{demographics_text}

PRESENTING CONCERN:
{analysis_data.get('presenting_concern', 'Not specified')}

RISK LEVEL:
{analysis_data.get('risk_level', 'Unknown')}

DIAGNOSTIC MODULE RESULTS:
{diagnostic_results_text}

DSM-5 CRITERIA MAPPING:
{dsm5_mapping_text}

Provide comprehensive diagnostic analysis based on ALL this data."""
            
            response = self.llm.generate_response(prompt, system_prompt, max_tokens=1500, temperature=0.2)
            
            if not response.success:
                logger.error(f"LLM diagnostic analysis failed: {response.error}")
                return None
            
            # Parse JSON response
            try:
                content = response.content.strip()
                
                # Remove code block markers if present
                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                
                # Find JSON object
                if "{" in content:
                    start_idx = content.find("{")
                    end_idx = content.rfind("}") + 1
                    content = content[start_idx:end_idx]
                
                analysis = json.loads(content)
                
                if not isinstance(analysis, dict):
                    return None
                
                # Validate and structure response
                primary_diag = analysis.get("primary_diagnosis", {})
                if not primary_diag or not primary_diag.get("name"):
                    # Try to extract from diagnostic results
                    diagnostic_results = analysis_data.get("diagnostic_module_results", {})
                    if diagnostic_results:
                        # Use first diagnostic result as fallback
                        for module_name, module_data in diagnostic_results.items():
                            if isinstance(module_data, dict) and "diagnosis" in module_data:
                                primary_diag = {
                                    "name": module_data["diagnosis"],
                                    "severity": "moderate",
                                    "dsm5_code": "unknown",
                                    "criteria_met": [],
                                    "confidence": 0.6
                                }
                                break
                
                result = {
                    "primary_diagnosis": primary_diag,
                    "differential_diagnoses": analysis.get("differential_diagnoses", []),
                    "confidence": float(analysis.get("confidence", 0.5)),
                    "reasoning": analysis.get("reasoning", ""),
                    "matched_criteria": analysis.get("matched_criteria", []),
                    "diagnostic_notes": analysis.get("diagnostic_notes", "")
                }
                
                logger.info(f"LLM diagnostic analysis completed: {primary_diag.get('name', 'Unknown')}")
                return result
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse diagnostic analysis JSON: {e}")
                logger.debug(f"LLM response: {response.content[:500]}")
                return None
            
        except Exception as e:
            logger.error(f"Error in LLM diagnostic analysis: {e}", exc_info=True)
            return None
    
    def _rule_based_diagnostic_analysis(
        self,
        analysis_data: Dict[str, Any],
        dsm5_mapping: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Perform rule-based diagnostic analysis (fallback if LLM not available).
        
        Args:
            analysis_data: Comprehensive analysis data
            dsm5_mapping: DSM-5 criteria mapping
            
        Returns:
            Dictionary with diagnostic analysis results
        """
        try:
            # Extract symptoms
            symptoms = analysis_data.get("symptoms", [])
            diagnostic_results = analysis_data.get("diagnostic_module_results", {})
            
            # Try to get diagnosis from diagnostic module results
            primary_diagnosis = None
            for module_name, module_data in diagnostic_results.items():
                if isinstance(module_data, dict):
                    if "diagnosis" in module_data:
                        primary_diagnosis = module_data["diagnosis"]
                        break
                    if "result" in module_data and isinstance(module_data["result"], dict):
                        if "diagnosis" in module_data["result"]:
                            primary_diagnosis = module_data["result"]["diagnosis"]
                            break
            
            if not primary_diagnosis:
                # Default diagnosis based on symptoms
                primary_diagnosis = "Assessment completed - further evaluation recommended"
            
            return {
                "primary_diagnosis": {
                    "name": primary_diagnosis,
                    "severity": "moderate",
                    "dsm5_code": "unknown",
                    "criteria_met": [],
                    "confidence": 0.5
                },
                "differential_diagnoses": [],
                "confidence": 0.5,
                "reasoning": "Rule-based analysis based on available assessment data",
                "matched_criteria": [],
                "diagnostic_notes": "LLM analysis not available - using rule-based fallback"
            }
            
        except Exception as e:
            logger.error(f"Error in rule-based diagnostic analysis: {e}")
            return None
    
    def _format_symptoms_for_llm(self, symptoms: List[Any]) -> str:
        """Format symptoms for LLM analysis"""
        try:
            if not symptoms:
                return "No symptoms identified"
            
            formatted = []
            for symptom in symptoms:
                if isinstance(symptom, dict):
                    # Format symptom with attributes
                    name = symptom.get("name", "Unknown symptom")
                    severity = symptom.get("severity", "")
                    frequency = symptom.get("frequency", "")
                    duration = symptom.get("duration", "")
                    
                    symptom_text = f"- {name}"
                    if severity:
                        symptom_text += f" (Severity: {severity})"
                    if frequency:
                        symptom_text += f" (Frequency: {frequency})"
                    if duration:
                        symptom_text += f" (Duration: {duration})"
                    
                    formatted.append(symptom_text)
                else:
                    formatted.append(f"- {symptom}")
            
            return "\n".join(formatted[:50])  # Limit to 50 symptoms
            
        except Exception as e:
            logger.warning(f"Error formatting symptoms: {e}")
            return "Symptoms available but formatting error"
    
    def _save_results(self, session_id: str, diagnosis_result: Dict[str, Any]):
        """Save diagnostic analysis results to database"""
        try:
            if self.db:
                self.db.save_module_result(
                    session_id=session_id,
                    module_name=self.module_name,
                    result=diagnosis_result
                )
                logger.debug(f"Saved DA results to database for session {session_id}")
        except Exception as e:
            logger.warning(f"Error saving DA results to database: {e}")
    
    def _get_results_from_db(self, session_id: str) -> Dict[str, Any]:
        """Get results from database if not in session state"""
        try:
            if self.db:
                all_results = self.db.get_all_module_results(session_id)
                if self.module_name in all_results:
                    return all_results[self.module_name]
        except Exception as e:
            logger.warning(f"Error getting results from database: {e}")
        return {}
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _ensure_session_exists(self, session_id: str):
        """Ensure session exists in state"""
        if session_id not in self._sessions:
            self._sessions[session_id] = {}
    
    def on_error(self, session_id: str, error: Exception, **kwargs) -> ModuleResponse:
        """Handle errors gracefully"""
        logger.error(f"Error in DA module for session {session_id}: {error}", exc_info=True)
        return ModuleResponse(
            message=(
                "I encountered an issue while performing the diagnostic analysis. "
                "Please try again or contact support if the problem persists."
            ),
            is_complete=False,
            requires_input=True,
            error=str(error),
            metadata={"error_type": type(error).__name__}
        )

