"""
Assessment Moderator V2 - Orchestrates module lifecycle and message routing
Uses assessment_v2 structure with continuous SRA service integration
NOTE: SRA is a continuous background service, not a module in the flow
"""

import logging
import importlib
from typing import Dict, Any, Optional, List
from datetime import datetime 
import uuid

# Import assessment_v2 components
try:
    from .base_module import BaseAssessmentModule
except ImportError:
    from app.agents.assessment.assessment_v2.base_module import BaseAssessmentModule

try:
    from .types import (
        ModuleResponse, SessionState, ModuleProgress,
        ModuleStatus, ErrorResponse, RecoveryAction
    )
except ImportError:
    from app.agents.assessment.assessment_v2.types import (
        ModuleResponse, SessionState, ModuleProgress,
        ModuleStatus, ErrorResponse, RecoveryAction
    )

try:
    from .config import (
        MODULE_REGISTRY, get_module_config, get_starting_module,
        get_next_module, MODERATOR_CONFIG, RESPONSE_TEMPLATES,
        validate_module_dependencies, validate_module_order,
        get_module_sequence, get_module_flow_info, estimate_total_duration
    )
except ImportError:
    from app.agents.assessment.assessment_v2.config import (
        MODULE_REGISTRY, get_module_config, get_starting_module,
        get_next_module, MODERATOR_CONFIG, RESPONSE_TEMPLATES,
        validate_module_dependencies, validate_module_order,
        get_module_sequence, get_module_flow_info, estimate_total_duration
    )

try:
    from .database import ModeratorDatabase
except ImportError:
    from app.agents.assessment.assessment_v2.database import ModeratorDatabase

from app.core.logging_config import get_logger
logger = get_logger(__name__)

# Import adapter for SCID modules
try:
    from .adapters.base_module_adapter import SCIDModuleAdapter
    from .base_types import SCIDModule
    ADAPTER_AVAILABLE = True
except ImportError:
    SCIDModuleAdapter = None
    SCIDModule = None
    ADAPTER_AVAILABLE = False
    logger.warning("SCIDModuleAdapter not available - SCID modules may not work")

# Import SRA service for integration (optional - modules using response_processor will automatically use SRA)
try:
    from .core.sra_service import get_sra_service
    SRA_AVAILABLE = True
except ImportError:
    SRA_AVAILABLE = False
    get_sra_service = None
    logger.warning("SRA service not available - symptom extraction will be limited")


class AssessmentModerator:
    """
    Orchestrates the assessment flow by managing module lifecycle,
    routing messages, and handling state transitions.
    
    V2 UPDATES:
    - Uses assessment_v2 modules and configuration
    - SRA is a continuous background service (not a module in flow)
    - DA runs after ALL diagnostic modules complete
    - TPA runs after DA completes
    - All responses are automatically processed through SRA service
    
    The moderator is responsible for:
    - Loading and registering assessment modules from assessment_v2
    - Managing session state
    - Routing user messages to the appropriate module
    - Handling module transitions
    - Error recovery and graceful degradation
    - State persistence and recovery
    
    Example:
        moderator = AssessmentModerator()
        
        # Start a new assessment
        greeting = moderator.start_assessment(user_id="123", session_id="abc")
        
        # Process user messages (SRA processes responses automatically)
        response = moderator.process_message(
            user_id="123",
            session_id="abc",
            message="I'm 25 years old"
        )
    """
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize the moderator.
        
        Args:
            db_path: Path to database file. If None, uses config default.
        """
        self.modules: Dict[str, BaseAssessmentModule] = {}
        self.sessions: Dict[str, SessionState] = {}  # In-memory cache
        
        # Initialize database (with error handling)
        try:
            self.db = ModeratorDatabase()
        except Exception as e:
            logger.error(f"Failed to initialize ModeratorDatabase: {e}", exc_info=True)
            self.db = None
            logger.warning("Database unavailable - session persistence will be limited")
        
        # Load configuration
        try:
            self.config = MODERATOR_CONFIG
        except Exception as e:
            logger.error(f"Failed to load moderator config: {e}", exc_info=True)
            self.config = {}
        
        # Initialize SRA service (optional - modules using response_processor will use it automatically)
        if SRA_AVAILABLE:
            try:
                self.sra_service = get_sra_service()
                logger.info("SRA service available - symptom extraction enabled")
            except Exception as e:
                logger.warning(f"Could not initialize SRA service: {e}")
                self.sra_service = None
        else:
            self.sra_service = None
        
        # Cache module flow configuration for progress snapshots
        try:
            self.module_sequence = get_module_sequence()
        except Exception as e:
            logger.warning(f"Could not load module sequence: {e}")
            self.module_sequence = []
        
        try:
            self.flow_info = get_module_flow_info()
        except Exception as e:
            logger.debug(f"Could not load module flow info: {e}")
            self.flow_info = {
                "sequence": self.module_sequence,
                "is_valid_order": True,
                "total_modules": len(self.module_sequence),
                "required_modules": [],
                "flow_type": "sequential",
                "enforcement": "strict"
            }
        
        try:
            self.total_estimated_duration = estimate_total_duration()
        except Exception as e:
            logger.debug(f"Could not estimate total duration: {e}")
            self.total_estimated_duration = 0
        
        self.background_services = {
            "sra": {
                "enabled": bool(self.sra_service),
                "description": "Continuous Symptom Recognition and Analysis service - processes all responses in real-time"
            }
        }
        
        # Register all enabled modules
        try:
            self._register_modules()
        except Exception as e:
            logger.error(f"Error during module registration: {e}", exc_info=True)
            # Continue even if module registration fails - at least DA and TPA might work
        
        # Validate module order (non-critical)
        try:
            self._validate_module_order()
        except Exception as e:
            logger.warning(f"Could not validate module order: {e}")
        
        if len(self.modules) == 0:
            logger.warning("⚠️ No modules were successfully loaded - assessment system may not function properly")
            # Don't fail initialization - allow degraded mode
        else:
            logger.info(f"✅ AssessmentModerator V2 initialized | Modules: {len(self.modules)} | SRA: {self.sra_service is not None}")
            # Log loaded module names for debugging
            module_names = list(self.modules.keys())[:5]  # First 5 modules
            logger.debug(f"   Loaded modules: {', '.join(module_names)}{'...' if len(self.modules) > 5 else ''}")
    
    # ========================================================================
    # MODULE REGISTRATION
    # ========================================================================
    
    def _register_modules(self):
        """Load and register all enabled modules from the registry"""
        for module_name, module_config in MODULE_REGISTRY.items():
            if not module_config.enabled:
                logger.debug(f"Skipping disabled module: {module_name}")
                continue
            
            try:
                # Load module from class_path
                module_instance = self._load_module(module_config.class_path)
                
                if module_instance:
                    self.modules[module_name] = module_instance
                    logger.debug(f"Registered module: {module_name} v{getattr(module_instance, 'module_version', '1.0.0')}")
                else:
                    logger.warning(f"Failed to load module: {module_name}")
                    
            except Exception as e:
                logger.error(f"Error registering module {module_name}: {e}", exc_info=True)
                # Continue with other modules even if one fails
    
    def _load_module(self, class_path: str) -> Optional[BaseAssessmentModule]:
        """
        Dynamically load a module from its class path.
        
        Args:
            class_path: Full path to module class or factory function
                       e.g., "app.agents.assessment.assessment_v2.modules.basic_info.demographics.create_demographics_module"
        
        Returns:
            Module instance or None if loading fails
        """
        try:
            # Split the path into module path and class/function name
            parts = class_path.rsplit('.', 1)
            if len(parts) != 2:
                logger.error(f"Invalid class_path format: {class_path}")
                return None
            
            module_path, class_or_func_name = parts
            
            # Import the module
            module = importlib.import_module(module_path)
            
            # Get the class or factory function
            class_or_func = getattr(module, class_or_func_name, None)
            if class_or_func is None:
                logger.error(f"Class/function '{class_or_func_name}' not found in {module_path}")
                return None
            
            # If it's a callable (factory function), call it to get instance
            if callable(class_or_func):
                instance = class_or_func()
                
                # Check if it's already a BaseAssessmentModule
                if isinstance(instance, BaseAssessmentModule):
                    return instance
                
                # If it's a SCIDModule, wrap it in adapter
                if ADAPTER_AVAILABLE and SCIDModule and isinstance(instance, SCIDModule):
                    logger.debug(f"Wrapping SCIDModule {instance.id} in SCIDModuleAdapter")
                    return SCIDModuleAdapter(instance)
                
                # If it's neither, log error
                logger.error(f"Module from {class_path} returned {type(instance).__name__}, expected BaseAssessmentModule or SCIDModule")
                return None
            else:
                logger.error(f"'{class_or_func_name}' in {module_path} is not callable")
                return None
                
        except ImportError as e:
            logger.error(f"Failed to import module from {class_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error loading module from {class_path}: {e}", exc_info=True)
            return None
    
    def _validate_module_order(self):
        """Validate that modules are registered in the correct order"""
        try:
            # Use the validation function from config
            sequence = get_module_sequence()
            is_valid = validate_module_order(sequence)
            
            if not is_valid:
                logger.warning("Module order validation failed - some modules may not work correctly")
            else:
                logger.debug("Module order validation passed")
        except Exception as e:
            logger.warning(f"Could not validate module order: {e}")
    
    # ========================================================================
    # CORE MODERATOR METHODS
    # ========================================================================
    
    def start_assessment(self, user_id: str, session_id: str) -> str:
        """
        Start a new assessment session.
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            
        Returns:
            Greeting message string
        """
        try:
            # Check if we have any modules loaded
            if len(self.modules) == 0:
                logger.warning(f"No modules available for session {session_id} - using fallback greeting")
                # Create a minimal session state
                session_state = SessionState(
                    session_id=session_id,
                    user_id=user_id,
                    current_module=None,
                    metadata={"patient_id": user_id, "degraded_mode": True}
                )
                self.sessions[session_id] = session_state
                return "Welcome! I'm ready to help you with your assessment. However, some assessment modules are currently unavailable. Please contact support if you need assistance."
            
            # Get starting module
            try:
                starting_module_name = get_starting_module()
            except Exception as e:
                logger.warning(f"Could not get starting module: {e} - using first available module")
                # Use first available module as fallback
                starting_module_name = list(self.modules.keys())[0] if self.modules else None
            
            if not starting_module_name:
                return "Welcome! Let's begin your assessment."
            
            # Create session state
            session_state = SessionState(
                session_id=session_id,
                user_id=user_id,
                current_module=starting_module_name,
                metadata={
                    "patient_id": user_id,
                    "module_sequence": self.module_sequence,
                    "flow_info": self.flow_info,
                    "background_services": self.background_services,
                    "total_estimated_duration": self.total_estimated_duration,
                    "module_timeline": self._initialize_module_timeline(starting_module_name),
                }
            )
            
            self.sessions[session_id] = session_state
            
            # Persist session to database if available
            if hasattr(self, 'db') and self.db:
                try:
                    def _coerce_uuid(value: Optional[Any]) -> Optional[str]:
                        if not value:
                            return None
                        from uuid import UUID
                        try:
                            return str(UUID(str(value)))
                        except (ValueError, TypeError):
                            return None

                    canonical_patient_id: Optional[str] = None
                    candidate_identifiers: List[str] = []

                    if session_state.metadata and session_state.metadata.get("patient_id"):
                        candidate_identifiers.append(str(session_state.metadata["patient_id"]).strip())

                    if user_id:
                        candidate_identifiers.append(str(user_id).strip())

                    for candidate in candidate_identifiers:
                        if not candidate:
                            continue

                        candidate_uuid = _coerce_uuid(candidate)
                        if candidate_uuid:
                            canonical_patient_id = candidate_uuid
                            break

                        if hasattr(self.db, "get_patient_by_user_id"):
                            try:
                                patient_obj = self.db.get_patient_by_user_id(candidate)
                                if patient_obj and getattr(patient_obj, "id", None):
                                    candidate_uuid = _coerce_uuid(getattr(patient_obj, "id"))
                                    if candidate_uuid:
                                        canonical_patient_id = candidate_uuid
                                        break
                            except Exception as lookup_error:
                                logger.debug(f"Could not resolve patient identifier '{candidate}': {lookup_error}")

                    if canonical_patient_id:
                        if session_state.metadata is None:
                            session_state.metadata = {}
                        session_state.metadata["patient_id"] = canonical_patient_id

                        existing_session = self.db.get_session(session_id)
                        if not existing_session:
                            success = self.db.create_session(session_state, canonical_patient_id)
                            if success:
                                logger.debug(f"Session {session_id} persisted to database")
                            else:
                                logger.warning(f"Failed to persist session {session_id} to database")
                        else:
                            logger.debug(f"Session {session_id} already exists in database")
                    else:
                        logger.debug(
                            f"Skipping immediate persistence for session {session_id}: "
                            f"patient UUID could not be resolved yet."
                        )
                except Exception as e:
                    logger.warning(f"Could not persist session to database: {e}")
                    # Continue even if database persistence fails
            
            # Start the first module
            if starting_module_name in self.modules:
                module = self.modules[starting_module_name]
                try:
                    self._mark_module_started(session_state, starting_module_name)
                    response = module.start_session(user_id=user_id, session_id=session_id)
                    return response.message if hasattr(response, 'message') else str(response)
                except Exception as e:
                    logger.error(f"Error starting module {starting_module_name}: {e}", exc_info=True)
                    return f"Welcome! Let's begin your assessment. I'm ready to help you."
            else:
                logger.warning(f"Starting module '{starting_module_name}' not found in loaded modules")
                return "Welcome! Let's begin your assessment."
                
        except Exception as e:
            logger.error(f"Error starting assessment: {e}", exc_info=True)
            # Create minimal session state even on error
            try:
                session_state = SessionState(
                    session_id=session_id,
                    user_id=user_id,
                    current_module=None,
                    metadata={"patient_id": user_id, "error": str(e)}
                )
                self.sessions[session_id] = session_state
            except:
                pass
            return "Welcome! Let's begin your assessment."
    
    def process_message(self, user_id: str, session_id: str, message: str) -> str:
        """
        Process a user message in the assessment session.
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            message: User message
            
        Returns:
            Response message string
        """
        try:
            # Get session state
            session_state = self.get_session_state(session_id)
            if not session_state:
                # Don't create session implicitly - require explicit /start call
                logger.warning(f"Session {session_id} not found - user must start assessment first")
                return "Session not found. Please start a new assessment session first."
            
            # Get current module
            current_module_name = session_state.current_module
            if not current_module_name or current_module_name not in self.modules:
                logger.error(f"Invalid current module: {current_module_name}")
                return "I'm sorry, there was an error. Please try starting a new assessment."
            
            # Process message through current module
            module = self.modules[current_module_name]
            response = module.process_message(message=message, session_id=session_id, user_id=user_id)
            
            # Update session state
            session_state.updated_at = datetime.now()
            
            # Persist session update to database
            if hasattr(self, 'db') and self.db:
                try:
                    self.db.update_session(session_state)
                except Exception as e:
                    error_msg = str(e)
                    if "ConcurrentModificationError" in error_msg or "was modified by another request" in error_msg:
                        logger.warning(f"Concurrent modification detected for session {session_state.session_id}: {e}")
                        return "Another request is processing this session. Please wait and try again."
                    else:
                        logger.error(f"CRITICAL: Failed to persist session update for {session_state.session_id}: {e}", exc_info=True)
                        # Continue processing but session state may be inconsistent
                        # TODO: Consider notifying user about persistence issues
            
            # Check if module is complete
            # Priority: response.is_complete (from ModuleResponse) takes precedence
            # Then check module.is_complete() as fallback
            module_complete = response.is_complete
            if not module_complete:
                try:
                    module_complete = module.is_complete(session_id)
                except Exception as e:
                    logger.error(f"Failed to check module completion for {current_module_name}: {e}", exc_info=True)
                    module_complete = False  # Default to incomplete on error
            
            if module_complete:
                # Store and persist module results BEFORE transitioning
                module_results = None
                try:
                    if hasattr(module, 'get_results'):
                        module_results = module.get_results(session_id)
                        if module_results:
                            if not session_state.module_results:
                                session_state.module_results = {}
                            session_state.module_results[current_module_name] = module_results

                            # Persist module results to database immediately
                            if hasattr(self, 'db') and self.db:
                                try:
                                    self.db.save_module_result(session_id, current_module_name, module_results)
                                    logger.debug(f"Persisted results for module {current_module_name}")
                                except Exception as persist_error:
                                    logger.warning(f"Failed to persist module results for {current_module_name}: {persist_error}")
                                    # Continue with transition even if persistence fails - assessment should work without database
                                    logger.info(f"Continuing assessment despite persistence failure for {current_module_name}")
                except Exception as e:
                    logger.error(f"Failed to get/store module results for {current_module_name}: {e}", exc_info=True)
                    # Continue with transition but without results

                self._mark_module_completed(session_state, current_module_name)
                if current_module_name not in session_state.module_history:
                    session_state.module_history.append(current_module_name)
                
                # Determine next module with special handling for DA/TPA
                next_module = self._determine_next_module(current_module_name, session_state)
                
                if next_module and next_module in self.modules:
                    # Validate prerequisites before starting the module
                    if not self._validate_module_prerequisites(next_module, session_state):
                        logger.warning(f"Prerequisites not met for module {next_module} in session {session_id}")
                        return f"Cannot proceed to {next_module} until all required assessments are complete. Please complete the remaining diagnostic modules first."

                    session_state.current_module = next_module
                    self._mark_module_started(session_state, next_module)

                    # Create smooth transition message
                    transition_message = self._create_transition_message(current_module_name, next_module)

                    # Start next module (this will trigger selector activation for SCID modules)
                    next_module_instance = self.modules[next_module]
                    
                    # Pass previous module results for selector context
                    previous_results = session_state.module_results if hasattr(session_state, 'module_results') else {}
                    next_response = next_module_instance.start_session(
                        user_id=user_id, 
                        session_id=session_id,
                        previous_module_results=previous_results
                    )
                    
                    # Combine transition message with next module greeting
                    # For SCID modules, the greeting already includes context, so we can be more concise
                    if next_module in ["scid_screening", "scid_cv_diagnostic"]:
                        # SCID modules have their own intro, so transition message is sufficient
                        combined_message = f"{transition_message}\n\n{next_response.message}"
                    else:
                        combined_message = f"{transition_message}\n\n{next_response.message}"
                    
                    # Persist module transition to database
                    if hasattr(self, 'db') and self.db:
                        try:
                            self.db.update_session(session_state)
                        except Exception as e:
                            logger.debug(f"Could not update session after module transition: {e}")
                    
                    return combined_message
                else:
                    # No next module - assessment complete
                    session_state.is_complete = True
                    session_state.completed_at = datetime.now()
                    self._mark_assessment_completed(session_state)
                    
                    # Persist completion to database
                    if hasattr(self, 'db') and self.db:
                        try:
                            self.db.update_session(session_state)
                        except Exception as e:
                            logger.debug(f"Could not update session after completion: {e}")
                    
                    return response.message + "\n\nYou have completed the assessment. Thank you!"
            
            return response.message
            
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            return "I'm sorry, I encountered an error processing your message. Please try again."
    
    def get_current_module(self, session_id: str) -> Optional[str]:
        """Get the current active module for a session"""
        session_state = self.get_session_state(session_id)
        return session_state.current_module if session_state else None
    
    def get_session_state(self, session_id: str) -> Optional[SessionState]:
        """Get session state for a session with database fallback"""
        # Check cache first
        session_state = self.sessions.get(session_id)
        if session_state:
            return session_state
        
        # Fallback to database
        if hasattr(self, 'db') and self.db:
            try:
                session_state = self.db.get_session(session_id)
                if session_state:
                    # Warm the cache
                    self.sessions[session_id] = session_state
                    return session_state
            except Exception as e:
                logger.error(f"Failed to load session from database: {e}")
        
        return None
    
    def get_session_progress(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get progress information for a session"""
        session_state = self.get_session_state(session_id)
        if not session_state:
            return None
        return self._build_progress_snapshot(session_state)
    
    def cleanup_session(self, session_id: str) -> None:
        """Clean up a session from memory"""
        if session_id in self.sessions:
            del self.sessions[session_id]

    def get_session_analytics(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed analytics for a session"""
        session_state = self.get_session_state(session_id)
        if not session_state:
            return None
        
        progress = self.get_session_progress(session_id)
        return {
            "session_id": session_id,
            "user_id": session_state.user_id,
            "current_module": session_state.current_module,
            "module_history": session_state.module_history,
            "progress": progress,
            "started_at": session_state.started_at.isoformat() if session_state.started_at else None,
            "updated_at": session_state.updated_at.isoformat() if session_state.updated_at else None,
            "is_complete": session_state.is_complete
        }

    def get_enhanced_progress(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get enhanced progress information for a session"""
        session_state = self.get_session_state(session_id)
        if not session_state:
            return None
        progress = self._build_progress_snapshot(session_state)
        if progress:
            progress["started_at"] = session_state.started_at.isoformat() if session_state.started_at else None
        return progress

    def collect_comprehensive_assessment_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Collect all assessment data for a session"""
        session_state = self.get_session_state(session_id)
        if not session_state:
            return None
        
        # Get module data from database
        module_data = []
        if hasattr(self, 'db') and self.db:
            try:
                module_data = self.db.get_module_data(session_id)
            except Exception as e:
                logger.warning(f"Could not get module data: {e}")
        
        return {
            "session_id": session_id,
            "patient_id": session_state.metadata.get("patient_id") if session_state.metadata else None,
            "module_results": session_state.module_results,
            "module_data": module_data,
            "module_history": session_state.module_history,
            "current_module": session_state.current_module,
            "is_complete": session_state.is_complete,
            "started_at": session_state.started_at.isoformat() if session_state.started_at else None,
            "completed_at": session_state.completed_at.isoformat() if session_state.completed_at else None
        }

    def generate_comprehensive_report(self, session_id: str) -> Optional[str]:
        """Generate a comprehensive natural language report from assessment data"""
        data = self.collect_comprehensive_assessment_data(session_id)
        if not data:
            return None
        
        # Build a simple report from available data
        report_parts = []
        
        if data.get("module_history"):
            report_parts.append(f"Assessment completed {len(data['module_history'])} modules: {', '.join(data['module_history'])}")
        
        if data.get("module_results"):
            report_parts.append(f"Collected data from {len(data['module_results'])} modules")
        
        if data.get("is_complete"):
            report_parts.append("Assessment is complete")
        else:
            report_parts.append(f"Assessment in progress - current module: {data.get('current_module', 'unknown')}")
        
        return ". ".join(report_parts) if report_parts else "Assessment data available"

    def switch_module(self, session_id: str, module_name: str, user_id: str) -> bool:
        """Switch to a different module in the current session"""
        session_state = self.get_session_state(session_id)
        if not session_state:
            return False
        
        if module_name not in self.modules:
            logger.error(f"Module {module_name} not found")
            return False
        
        # Update session state
        if session_state.current_module:
            session_state.module_history.append(session_state.current_module)
        session_state.current_module = module_name
        session_state.updated_at = datetime.now()
        
        # Start the new module
        try:
            module = self.modules[module_name]
            module.start_session(user_id=user_id, session_id=session_id)
            return True
        except Exception as e:
            logger.error(f"Error switching to module {module_name}: {e}")
            return False

    # ========================================================================
    # PROGRESS & TIMELINE HELPERS
    # ========================================================================

    def _initialize_module_timeline(self, starting_module: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
        """Create initial module timeline structure."""
        timeline: Dict[str, Dict[str, Any]] = {}
        now_iso = datetime.now().isoformat()

        sequence = self.module_sequence or []
        for module_name in sequence:
            timeline[module_name] = {
                "status": ModuleStatus.PENDING.value,
                "started_at": None,
                "completed_at": None,
            }

        if starting_module:
            if starting_module not in timeline:
                timeline[starting_module] = {
                    "status": ModuleStatus.PENDING.value,
                    "started_at": None,
                    "completed_at": None,
                }
            timeline[starting_module]["status"] = ModuleStatus.IN_PROGRESS.value
            timeline[starting_module]["started_at"] = now_iso

        return timeline

    def _get_module_timeline(self, session_state: SessionState) -> Dict[str, Dict[str, Any]]:
        """Retrieve or initialize module timeline for a session."""
        metadata = session_state.metadata or {}
        timeline = metadata.get("module_timeline")
        if not timeline:
            timeline = self._initialize_module_timeline(session_state.current_module)
            metadata["module_timeline"] = timeline
            session_state.metadata = metadata
        return timeline

    def _mark_module_started(self, session_state: SessionState, module_name: Optional[str]) -> None:
        """Mark a module as started in the session timeline."""
        if not module_name:
            return

        timeline = self._get_module_timeline(session_state)
        entry = timeline.setdefault(
            module_name,
            {
                "status": ModuleStatus.PENDING.value,
                "started_at": None,
                "completed_at": None,
            },
        )

        if entry.get("status") != ModuleStatus.COMPLETED.value:
            entry["status"] = ModuleStatus.IN_PROGRESS.value
            entry.setdefault("started_at", datetime.now().isoformat())
            entry["started_at"] = entry["started_at"] or datetime.now().isoformat()
            entry["last_updated"] = datetime.now().isoformat()
        session_state.metadata["module_timeline"] = timeline

    def _mark_module_completed(self, session_state: SessionState, module_name: Optional[str]) -> None:
        """Mark a module as completed in the session timeline."""
        if not module_name:
            return

        timeline = self._get_module_timeline(session_state)
        entry = timeline.setdefault(
            module_name,
            {
                "status": ModuleStatus.PENDING.value,
                "started_at": None,
                "completed_at": None,
            },
        )

        if entry.get("status") != ModuleStatus.COMPLETED.value:
            entry["status"] = ModuleStatus.COMPLETED.value
            entry["completed_at"] = datetime.now().isoformat()
            entry.setdefault("started_at", entry["completed_at"])
            entry["last_updated"] = entry["completed_at"]
        session_state.metadata["module_timeline"] = timeline

    def _mark_assessment_completed(self, session_state: SessionState) -> None:
        """Mark entire assessment as completed."""
        timeline = self._get_module_timeline(session_state)
        completion_time = datetime.now().isoformat()
        for module_name, entry in timeline.items():
            if entry.get("status") != ModuleStatus.COMPLETED.value:
                if not entry.get("started_at"):
                    entry["started_at"] = completion_time
                entry["status"] = ModuleStatus.COMPLETED.value
                entry["completed_at"] = completion_time
                entry["last_updated"] = completion_time
        session_state.metadata["module_timeline"] = timeline

    def _build_progress_snapshot(self, session_state: SessionState) -> Dict[str, Any]:
        """Build a detailed progress snapshot for the given session."""
        timeline = self._get_module_timeline(session_state)
        sequence = self.module_sequence or list(timeline.keys())
        total_modules = len(sequence) if sequence else len(timeline)

        completed_modules = [
            module for module, entry in timeline.items()
            if entry.get("status") == ModuleStatus.COMPLETED.value
        ]

        in_progress_modules = [
            module for module, entry in timeline.items()
            if entry.get("status") == ModuleStatus.IN_PROGRESS.value
        ]

        pending_modules = [
            module for module, entry in timeline.items()
            if entry.get("status") == ModuleStatus.PENDING.value
        ]

        if session_state.is_complete:
            overall_percentage = 100.0
        elif total_modules > 0:
            overall_percentage = (len(completed_modules) / total_modules) * 100.0
        else:
            overall_percentage = 0.0

        module_status_details = []
        for module in sequence:
            entry = timeline.get(module, {
                "status": ModuleStatus.PENDING.value,
                "started_at": None,
                "completed_at": None,
            })
            module_status_details.append({
                "module": module,
                "status": entry.get("status", ModuleStatus.PENDING.value),
                "started_at": entry.get("started_at"),
                "completed_at": entry.get("completed_at"),
            })

        # Include timeline entries that are not part of the known sequence (fallback)
        for module, entry in timeline.items():
            if module not in sequence:
                module_status_details.append({
                    "module": module,
                    "status": entry.get("status", ModuleStatus.PENDING.value),
                    "started_at": entry.get("started_at"),
                    "completed_at": entry.get("completed_at"),
                })

        next_module = None
        if not session_state.is_complete:
            if session_state.current_module:
                next_module = session_state.current_module
            elif pending_modules:
                next_module = pending_modules[0]

        snapshot = {
            "session_id": session_state.session_id,
            "overall_percentage": round(overall_percentage, 2),
            "current_module": session_state.current_module,
            "module_sequence": sequence,
            "module_status": module_status_details,
            "completed_modules": completed_modules,
            "in_progress_modules": in_progress_modules,
            "pending_modules": pending_modules,
            "module_history": session_state.module_history,
            "total_modules": total_modules,
            "is_complete": session_state.is_complete or overall_percentage >= 100.0,
            "started_at": session_state.started_at.isoformat() if session_state.started_at else None,
            "updated_at": session_state.updated_at.isoformat() if session_state.updated_at else None,
            "completed_at": session_state.completed_at.isoformat() if session_state.completed_at else None,
            "next_module": next_module,
            "total_estimated_duration": self.total_estimated_duration,
            "background_services": self.background_services,
            "flow_info": session_state.metadata.get("flow_info") if session_state.metadata else self.flow_info,
        }

        if session_state.metadata:
            snapshot["module_timeline"] = session_state.metadata.get("module_timeline", timeline)

        return snapshot

    def _determine_next_module(self, current_module: str, session_state: SessionState) -> Optional[str]:
        """
        Determine the next module to transition to, with special handling for DA/TPA.
        
        This method:
        1. Checks if all diagnostic modules are complete before transitioning to DA
        2. Checks if DA is complete before transitioning to TPA
        3. Otherwise uses the standard sequence
        
        Args:
            current_module: Current module name
            session_state: Current session state
            
        Returns:
            Next module name or None if no next module
        """
        # Diagnostic modules that must complete before DA
        # This includes screening and all specific diagnostic modules
        diagnostic_modules = [
            "scid_screening", "scid_cv_diagnostic",
            "mdd", "bipolar", "gad", "panic", "ptsd", "ocd", "adhd",
            "social_anxiety", "agoraphobia", "specific_phobia",
            "adjustment_disorder", "alcohol_use", "substance_use", "eating_disorder"
        ]
        
        # If we're completing a diagnostic module, check if all are complete
        if current_module in diagnostic_modules:
            # Check if all diagnostic modules are complete
            all_diagnostic_complete = self._check_all_diagnostic_modules_complete(
                session_state, diagnostic_modules
            )
            
            if all_diagnostic_complete:
                # All diagnostic modules complete - transition to DA
                logger.info("All diagnostic modules complete - transitioning to DA")
                return "da_diagnostic_analysis"
            else:
                # Not all diagnostic modules complete - check if there's another diagnostic module
                # This shouldn't happen in normal flow, but handle gracefully
                next_in_sequence = get_next_module(current_module)
                if next_in_sequence in diagnostic_modules:
                    return next_in_sequence
                else:
                    # Skip to DA anyway if we're at the end of diagnostic modules
                    logger.warning(f"Not all diagnostic modules complete, but transitioning to DA from {current_module}")
                    return "da_diagnostic_analysis"
        
        # If we're completing DA, check if it's complete before transitioning to TPA
        if current_module == "da_diagnostic_analysis":
            # Check if DA is actually complete
            da_complete = self._check_module_complete("da_diagnostic_analysis", session_state)
            if da_complete:
                logger.info("DA complete - transitioning to TPA")
                return "tpa_treatment_planning"
            else:
                # DA not complete - this shouldn't happen, but log warning
                logger.warning("DA marked as complete but completion check failed")
                return "tpa_treatment_planning"  # Transition anyway
        
        # For all other modules, use standard sequence
        return get_next_module(current_module)
    
    def _check_all_diagnostic_modules_complete(
        self, 
        session_state: SessionState, 
        diagnostic_modules: List[str]
    ) -> bool:
        """
        Check if all diagnostic modules are complete.
        
        Args:
            session_state: Current session state
            diagnostic_modules: List of diagnostic module names
            
        Returns:
            True if all diagnostic modules are complete
        """
        # Check if modules are in history (completed) or have results
        completed_modules = set(session_state.module_history)
        modules_with_results = set(session_state.module_results.keys()) if session_state.module_results else set()
        
        for module_name in diagnostic_modules:
            # Module is complete if:
            # 1. It's in the history (explicitly completed), OR
            # 2. It has results stored, OR
            # 3. It's the current module and we're checking completion (handled by caller)
            if module_name not in completed_modules and module_name not in modules_with_results:
                # Check if module is actually complete by calling is_complete
                if module_name in self.modules:
                    try:
                        module = self.modules[module_name]
                        if hasattr(module, 'is_complete'):
                            # Get session_id from session_state
                            session_id = session_state.session_id
                            if not module.is_complete(session_id):
                                logger.debug(f"Diagnostic module {module_name} is not complete")
                                return False
                    except Exception as e:
                        logger.warning(f"Error checking completion for {module_name}: {e}")
                        # If we can't check, assume it's not complete to be safe
                        return False
        
        logger.debug(f"All diagnostic modules complete: {diagnostic_modules}")
        return True
    
    def _check_module_complete(self, module_name: str, session_state: SessionState) -> bool:
        """
        Check if a specific module is complete.
        
        Args:
            module_name: Module name to check
            session_state: Current session state
            
        Returns:
            True if module is complete
        """
        # Check if module is in history
        if module_name in session_state.module_history:
            return True
        
        # Check if module has results
        if session_state.module_results and module_name in session_state.module_results:
            return True
        
        # Check module's is_complete method
        if module_name in self.modules:
            try:
                module = self.modules[module_name]
                if hasattr(module, 'is_complete'):
                    session_id = session_state.session_id
                    return module.is_complete(session_id)
            except Exception as e:
                logger.warning(f"Error checking completion for {module_name}: {e}")
        
        return False

    def _validate_module_prerequisites(self, module_name: str, session_state: SessionState) -> bool:
        """
        Validate that all prerequisites are met before starting a module.

        Args:
            module_name: Module to validate prerequisites for
            session_state: Current session state

        Returns:
            True if prerequisites are met, False otherwise
        """
        if module_name == "da_diagnostic_analysis":
            # DA requires all diagnostic modules to be complete
            diagnostic_modules = [
                "scid_screening", "scid_cv_diagnostic",
                "mdd", "bipolar", "gad", "panic", "ptsd", "ocd", "adhd",
                "social_anxiety", "agoraphobia", "specific_phobia",
                "adjustment_disorder", "alcohol_use", "substance_use", "eating_disorder"
            ]
            return self._check_all_diagnostic_modules_complete(session_state, diagnostic_modules)

        elif module_name == "tpa_treatment_planning":
            # TPA requires DA to be complete
            return self._check_module_complete("da_diagnostic_analysis", session_state)

        # No prerequisites for other modules
        return True

    def _create_transition_message(self, from_module: str, to_module: str) -> str:
        """Create a smooth transition message between modules with context about selectors"""
        transitions = {
            ("demographics", "presenting_concern"): "Now, let's talk about what's bringing you here today.",
            ("presenting_concern", "risk_assessment"): "I'd like to ask you some important safety questions.",
            ("risk_assessment", "scid_screening"): (
                "Based on what you've shared, I'll ask you some targeted screening questions. "
                "These questions are specifically chosen based on your responses to help us better understand your situation."
            ),
            ("scid_screening", "scid_cv_diagnostic"): (
                "Now I'll ask you some more detailed questions to better understand your situation. "
                "Based on your screening responses, I'll focus on the areas that are most relevant to you."
            ),
            ("scid_cv_diagnostic", "da_diagnostic_analysis"): "Let me analyze all the information you've provided.",
            ("da_diagnostic_analysis", "tpa_treatment_planning"): "Based on our assessment, let's discuss treatment options."
        }
        
        transition_key = (from_module, to_module)
        if transition_key in transitions:
            return transitions[transition_key]
        
        # Default transition
        return "Let's continue with the next part of the assessment."

    def deploy_module(self, module_name: str, session_id: str, user_id: str, force: bool = False) -> bool:
        """Deploy a module for a session"""
        if module_name not in self.modules:
            logger.error(f"Module {module_name} not found")
            return False
        
        session_state = self.get_session_state(session_id)
        if not session_state:
            # Create new session
            self.start_assessment(user_id, session_id)
            session_state = self.get_session_state(session_id)
        
        if not session_state:
            return False
        
        # If module is already active and not forcing, return success
        if session_state.current_module == module_name and not force:
            return True
        
        # Switch to the module
        return self.switch_module(session_id, module_name, user_id)

