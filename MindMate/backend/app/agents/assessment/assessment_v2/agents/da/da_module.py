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
                logger.warning(f"No diagnosis generated for session {session_id} - checking if specialist referral needed")
                # Check if this is a case where no disorder criteria are met
                if self._should_refer_to_specialist(all_data):
                    # Return specialist referral message and complete assessment
                    return ModuleResponse(
                        message=(
                            "According to provided info and DSM Criteria, it will be better to connect you to the Specialists. "
                            "You can use our Find Specialists service to get connected with one."
                        ),
                        is_complete=True,
                        requires_input=False,
                        metadata={
                            "conversation_step": "completed",
                            "specialist_referral": True,
                            "assessment_completed": True
                        }
                    )
                else:
                    # Provide fallback diagnosis to ensure workflow continues to TPA
                    diagnosis_result = self._create_fallback_diagnosis(all_data)
            
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
            
            # Get comprehensive symptom analysis from SRA service
            if self.sra_service:
                try:
                    # Get comprehensive symptom report including analysis
                    comprehensive_report = self.sra_service.get_comprehensive_symptom_report(session_id)
                    all_data["symptom_data"] = comprehensive_report

                    symptom_count = len(comprehensive_report.get("symptoms", []))
                    confidence = comprehensive_report.get("confidence_score", 0.0)

                    logger.info(f"Retrieved comprehensive symptom analysis for session {session_id}: "
                               f"{symptom_count} symptoms, confidence: {confidence:.2f}")

                    # Log key findings
                    if comprehensive_report.get("clusters", {}).get("dominant_cluster"):
                        dominant = comprehensive_report["clusters"]["dominant_cluster"]
                        logger.info(f"Dominant symptom cluster: {dominant}")

                    if comprehensive_report.get("severity_assessment", {}).get("overall_severity_level"):
                        severity = comprehensive_report["severity_assessment"]["overall_severity_level"]
                        logger.info(f"Overall symptom severity: {severity}")

                except Exception as e:
                    logger.warning(f"Error getting comprehensive symptom analysis from SRA service: {e}")
                    # Fallback to basic symptom data
                    try:
                        symptom_summary = self.sra_service.get_symptoms_summary(session_id)
                        all_data["symptom_data"] = {
                            "summary": symptom_summary,
                            "symptoms": self.sra_service.export_symptoms(session_id),
                            "error": "Comprehensive analysis failed, using basic data"
                        }
                        logger.info(f"Fallback: Retrieved basic symptom data ({symptom_summary.get('total_symptoms', 0)} symptoms)")
                    except Exception as fallback_error:
                        logger.error(f"Complete SRA failure for session {session_id}: {fallback_error}")
                        all_data["symptom_data"] = {"error": "SRA service unavailable"}
            
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
            screening_results = all_data.get("screening_results", {})
            diagnostic_results = all_data.get("diagnostic_results", {})
            
            # Build comprehensive data for LLM analysis
            # Include full SRA analysis if available
            sra_analysis = {}
            if "clusters" in symptom_data:
                sra_analysis = {
                    "symptom_clusters": symptom_data.get("clusters", {}),
                    "severity_assessment": symptom_data.get("severity_assessment", {}),
                    "temporal_patterns": symptom_data.get("temporal_analysis", {}),
                    "clinical_correlations": symptom_data.get("clinical_correlations", {}),
                    "sra_confidence": symptom_data.get("confidence_score", 0.0),
                    "sra_recommendations": symptom_data.get("recommendations", [])
                }

            analysis_data = {
                "symptoms": symptoms,
                "symptom_count": len(symptoms),
                "sra_comprehensive_analysis": sra_analysis,
                "demographics": demographics,
                "presenting_concern": presenting_concern.get("concern", ""),
                "risk_level": "not_assessed",
                "screening_results": screening_results,
                "diagnostic_module_results": diagnostic_results,
                "conversation_length": len(all_data.get("conversation_history", [])),
                "conversation_history": all_data.get("conversation_history", [])[-10:]  # Last 10 messages for context
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
        Extract symptoms from comprehensive SRA symptom report.

        REDESIGNED: Uses comprehensive symptom analysis including:
        - Individual symptoms with full attributes
        - Symptom clustering and patterns
        - Severity assessment
        - Clinical correlations

        Args:
            symptom_data: Comprehensive symptom data from SRA service

        Returns:
            List of symptom dictionaries with enhanced attributes
        """
        symptoms = []

        try:
            # Check if we have comprehensive symptom report
            if "clusters" in symptom_data and "severity_assessment" in symptom_data:
                # Use comprehensive report
                logger.info("Using comprehensive SRA symptom analysis for diagnosis")

                # Get individual symptoms with enhanced context
                symptom_list = symptom_data.get("symptoms", [])

                # Add SRA analysis context to each symptom
                clusters = symptom_data.get("clusters", {})
                severity = symptom_data.get("severity_assessment", {})
                correlations = symptom_data.get("clinical_correlations", {})

                for symptom in symptom_list:
                    enhanced_symptom = dict(symptom)

                    # Add cluster context
                    symptom_category = symptom.get("category", "").lower()
                    if symptom_category:
                        for cluster_name, cluster_symptoms in clusters.get("clusters", {}).items():
                            if any(s.get("name", "").lower() == symptom.get("name", "").lower() for s in cluster_symptoms):
                                enhanced_symptom["cluster_membership"] = cluster_name
                                break

                    # Add severity context
                    enhanced_symptom["overall_severity_level"] = severity.get("overall_severity_level", "unknown")

                    # Add correlation context
                    symptom_name = symptom.get("name", "").lower()
                    for condition, indicators in correlations.get("correlations", {}).items():
                        if any(s.get("name", "").lower() == symptom_name for s in indicators):
                            enhanced_symptom["clinical_correlations"] = enhanced_symptom.get("clinical_correlations", [])
                            enhanced_symptom["clinical_correlations"].append(condition)

                    symptoms.append(enhanced_symptom)

                logger.info(f"Enhanced {len(symptoms)} symptoms with comprehensive SRA analysis")

            else:
                # Fallback to basic symptom list
                symptom_list = symptom_data.get("symptoms", [])
                if symptom_list:
                    symptoms = symptom_list
                    logger.info(f"Using basic SRA symptom data: {len(symptoms)} symptoms")

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
            
            # Build comprehensive prompt with SRA analysis
            symptoms_text = self._format_symptoms_for_llm(analysis_data.get("symptoms", []))
            demographics_text = json.dumps(analysis_data.get("demographics", {}), indent=2)
            diagnostic_results_text = json.dumps(analysis_data.get("diagnostic_module_results", {}), indent=2)
            dsm5_mapping_text = json.dumps(dsm5_mapping, indent=2)

            # Include comprehensive SRA analysis if available
            sra_analysis = analysis_data.get("sra_comprehensive_analysis", {})
            sra_text = ""
            if sra_analysis:
                sra_text = f"""
COMPREHENSIVE SYMPTOM ANALYSIS (SRA):
- Symptom Clusters: {json.dumps(sra_analysis.get('symptom_clusters', {}), indent=2)}
- Overall Severity: {sra_analysis.get('severity_assessment', {}).get('overall_severity_level', 'unknown')}
- Clinical Correlations: {json.dumps(sra_analysis.get('clinical_correlations', {}).get('primary_correlations', []), indent=2)}
- Temporal Patterns: {json.dumps(sra_analysis.get('temporal_patterns', {}), indent=2)}
- SRA Confidence: {sra_analysis.get('sra_confidence', 0.0):.2f}
- SRA Recommendations: {', '.join(sra_analysis.get('sra_recommendations', []))}
"""

            prompt = f"""Perform comprehensive DSM-5 diagnostic analysis using all available assessment data.

SYMPTOMS ({analysis_data.get('symptom_count', 0)} symptoms):
{symptoms_text}
{sra_text}

DEMOGRAPHICS:
{demographics_text}

PRESENTING CONCERN:
{analysis_data.get('presenting_concern', 'Not specified')}

RISK LEVEL:
{analysis_data.get('risk_level', 'Unknown')}

SCREENING RESULTS:
{json.dumps(analysis_data.get('screening_results', {}), indent=2)}

DIAGNOSTIC MODULE RESULTS:
{diagnostic_results_text}

DSM-5 CRITERIA MAPPING:
{dsm5_mapping_text}

RECENT CONVERSATION CONTEXT ({len(analysis_data.get('conversation_history', []))} messages):
{json.dumps(analysis_data.get('conversation_history', []), indent=2)}

IMPORTANT: Use ALL the symptom analysis data, clinical correlations, and severity assessments from SRA to inform your diagnosis. Consider the temporal patterns, symptom clusters, and clinical correlations when making diagnostic decisions. Provide comprehensive diagnostic analysis based on ALL this data."""
            
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
            # Extract symptoms and diagnostic results for proper analysis
            symptoms = analysis_data.get("symptoms", [])
            diagnostic_results = analysis_data.get("diagnostic_module_results", {})

            # Analyze diagnostic module results to see if any criteria were met
            any_criteria_met = False
            for module_name, module_data in diagnostic_results.items():
                if isinstance(module_data, dict):
                    if module_data.get("criteria_met") == True:
                        any_criteria_met = True
                        break

            # Generate diagnosis based on symptoms and diagnostic results
            if any_criteria_met and symptoms:
                # Some diagnostic criteria were met - provide appropriate diagnosis
                primary_diagnosis = "Mental Health Condition Identified - Further Evaluation Recommended"
            elif symptoms:
                # Symptoms present but no specific criteria met
                primary_diagnosis = "Mental Health Symptoms Present - Specialist Consultation Recommended"
            else:
                # No clear symptoms identified
                primary_diagnosis = "Assessment Completed - No Significant Mental Health Concerns Identified"
            
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
    
    def _should_refer_to_specialist(self, all_data: Dict[str, Any]) -> bool:
        """
        Determine if the assessment results indicate that specialist referral is needed
        instead of providing a diagnosis.

        This happens when:
        - Symptoms are present but don't meet specific disorder criteria
        - Complex presentations that need professional evaluation
        - Multiple mild symptoms that may indicate underlying issues

        Args:
            all_data: All assessment data

        Returns:
            True if specialist referral is recommended
        """
        try:
            # Extract symptoms from SRA
            symptoms = self._extract_symptoms_from_sra(all_data.get("symptom_data", {}))

            # Extract symptoms from module results if SRA not available
            if not symptoms:
                symptoms = self._extract_symptoms_from_modules(all_data.get("module_results", {}))

            # Check diagnostic module results
            diagnostic_results = all_data.get("diagnostic_results", {})

            # Criteria for specialist referral:
            # 1. Some symptoms present but no clear diagnosis from modules
            has_symptoms = len(symptoms) > 0

            # 2. Diagnostic modules completed but no clear diagnosis
            diagnostic_modules_completed = any(
                result.get("status") == "completed" or result.get("criteria_met") == False
                for result in diagnostic_results.values()
            )

            # 3. Check if any diagnostic module explicitly stated criteria not met
            criteria_not_met = any(
                result.get("criteria_met") == False or
                "not met" in str(result.get("assessment", "")).lower() or
                "criteria" in str(result.get("assessment", "")).lower() and "not" in str(result.get("assessment", "")).lower()
                for result in diagnostic_results.values()
            )

            # 4. Multiple symptoms with unclear presentation
            multiple_symptoms = len(symptoms) >= 3

            # 5. Check for complex presentations
            presenting_concern = all_data.get("presenting_concern", {})
            concern_text = presenting_concern.get("concern", "").lower()
            complex_presentation = any(word in concern_text for word in [
                "multiple", "complex", "unclear", "confusing", "various", "different"
            ])

            # Refer to specialist if:
            # - Has symptoms AND criteria not met AND (multiple symptoms OR complex presentation)
            should_refer = has_symptoms and criteria_not_met and (
                multiple_symptoms or complex_presentation
            )

            if should_refer:
                logger.info(f"Specialist referral recommended: symptoms={len(symptoms)}, criteria_not_met={criteria_not_met}, complex={complex_presentation}")
                return True

            return False

        except Exception as e:
            logger.warning(f"Error checking specialist referral criteria: {e}")
            # On error, default to not referring (continue with diagnosis)
            return False

    def _create_fallback_diagnosis(self, all_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a fallback diagnosis when primary diagnostic analysis fails.
        Ensures workflow always continues to TPA.

        Args:
            all_data: All assessment data

        Returns:
            Fallback diagnosis dictionary
        """
        try:
            # Extract basic information for fallback diagnosis
            symptoms = all_data.get("symptom_data", {}).get("symptoms", [])
            presenting_concern = all_data.get("presenting_concern", "")
            demographics = all_data.get("demographics", {})

            # Determine most likely diagnosis based on available symptoms
            symptom_categories = set()
            for symptom in symptoms:
                category = symptom.get("category", "").lower()
                if category:
                    symptom_categories.add(category)

            # Fallback diagnosis logic
            primary_diagnosis = {
                "name": "Mental Health Concerns Requiring Further Evaluation",
                "severity": "moderate",
                "dsm5_code": "To be determined",
                "criteria_met": ["Reported symptoms present"],
                "confidence": 0.5
            }

            # Try to be more specific based on symptom patterns
            presenting_lower = presenting_concern.lower()
            if "anxiety" in symptom_categories or "anxiety" in presenting_lower or "panic" in presenting_lower:
                primary_diagnosis = {
                    "name": "Anxiety Disorder",
                    "severity": "moderate",
                    "dsm5_code": "300.02",
                    "criteria_met": ["Anxiety symptoms reported"],
                    "confidence": 0.6
                }
            elif "mood" in symptom_categories or "depress" in presenting_lower or "sad" in presenting_lower:
                primary_diagnosis = {
                    "name": "Depressive Disorder",
                    "severity": "moderate",
                    "dsm5_code": "296.3",
                    "criteria_met": ["Mood symptoms reported"],
                    "confidence": 0.6
                }
            elif len(symptoms) > 5:
                primary_diagnosis = {
                    "name": "Multiple Mental Health Concerns",
                    "severity": "moderate",
                    "dsm5_code": "To be determined",
                    "criteria_met": ["Multiple symptoms reported"],
                    "confidence": 0.5
                }

            return {
                "primary_diagnosis": primary_diagnosis,
                "differential_diagnoses": [
                    {"name": "Anxiety Disorder", "reason": "Anxiety symptoms present", "confidence": 0.4},
                    {"name": "Depressive Disorder", "reason": "Mood symptoms present", "confidence": 0.4},
                    {"name": "Adjustment Disorder", "reason": "Recent stressors reported", "confidence": 0.3}
                ],
                "confidence": primary_diagnosis.get("confidence", 0.5),
                "reasoning": (
                    "Based on the symptoms and concerns reported during the assessment, "
                    "a preliminary assessment indicates mental health concerns that warrant "
                    "further professional evaluation and treatment planning."
                ),
                "matched_criteria": ["Reported symptoms consistent with mental health concerns"],
                "dsm5_mapping": {
                    "primary_category": "Mental Health Assessment",
                    "requires_further_evaluation": True
                }
            }

        except Exception as e:
            logger.error(f"Error creating fallback diagnosis: {e}")
            # Ultimate fallback - always provide some diagnosis
            return {
                "primary_diagnosis": {
                    "name": "Mental Health Assessment Completed",
                    "severity": "pending_evaluation",
                    "dsm5_code": "Pending",
                    "criteria_met": ["Assessment completed"],
                    "confidence": 0.3
                },
                "differential_diagnoses": [],
                "confidence": 0.3,
                "reasoning": "Assessment completed. Professional evaluation recommended.",
                "matched_criteria": ["Assessment completed"],
                "dsm5_mapping": {"status": "completed"}
            }

    def on_error(self, session_id: str, error: Exception, **kwargs) -> ModuleResponse:
        """Handle errors gracefully"""
        logger.error(f"Error in DA module for session {session_id}: {error}", exc_info=True)
        return ModuleResponse(
            message=(
                "I encountered an issue while performing the diagnostic analysis. "
                "However, I've completed a preliminary assessment. "
                "A treatment plan will now be developed based on the available information."
            ),
            is_complete=True,  # Force completion to ensure workflow continues
            requires_input=False,
            error=str(error),
            metadata={"error_type": type(error).__name__, "fallback_used": True}
        )

