"""
Database management for the assessment moderator - PostgreSQL Integration
Migrated from assessment/database.py
"""

import json
import logging
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from contextlib import contextmanager
from functools import wraps

# Initialize logger first
logger = logging.getLogger(__name__)

# Transaction management utilities
@contextmanager
def db_transaction(db_session: Session):
    """Database transaction context manager for atomic operations"""
    try:
        yield db_session
        db_session.commit()
    except Exception as e:
        db_session.rollback()
        logger.error(f"Database transaction failed: {e}", exc_info=True)
        raise

def transactional(func: Callable) -> Callable:
    """Decorator for transactional database operations"""
    @wraps(func)
    def wrapper(self, *args, **kwargs):
        db_session = self._get_db_session()
        if not db_session:
            logger.warning("Database not available - cannot perform transactional operation")
            return False

        try:
            with db_transaction(db_session):
                return func(self, db_session=db_session, *args, **kwargs)
        except Exception as e:
            logger.error(f"Transactional operation failed: {e}", exc_info=True)
            raise
    return wrapper

# Update imports to use assessment_v2 types
try:
    from .types import SessionState
except ImportError:
    from app.agents.assessment.assessment_v2.types import SessionState

try:
    from .config import DATABASE_CONFIG
except ImportError:
    try:
        from app.agents.assessment.assessment_v2.config import DATABASE_CONFIG
    except ImportError:
        # Fallback to default config
        DATABASE_CONFIG = {
            "timeout": 30.0,
            "check_same_thread": False,
            "enable_backups": True,
            "backup_interval": 3600,
            "retention_days": 90,
            "connection_pool_size": 5,
            "enable_wal_mode": True,
        }

# Try to import database models - handle gracefully if not available
try:
    from app.db.session import SessionLocal
    from app.models.assessment import (
        AssessmentSession as AssessmentSessionModel,
        AssessmentModuleState as AssessmentModuleStateModel,
        AssessmentModuleResult as AssessmentModuleResultModel,
        AssessmentConversation as AssessmentConversationModel,
        AssessmentModuleTransition as AssessmentModuleTransitionModel,
        AssessmentDemographics as AssessmentDemographicsModel,
        AssessmentModuleData as AssessmentModuleDataModel,
        AssessmentConversationEnhanced as AssessmentConversationEnhancedModel
    )
    from app.models.patient import Patient
    DATABASE_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Database models not available: {e}. Running in test mode.")
    DATABASE_AVAILABLE = False
    SessionLocal = None
    AssessmentSessionModel = None
    AssessmentModuleStateModel = None
    AssessmentModuleResultModel = None
    AssessmentConversationModel = None
    AssessmentModuleTransitionModel = None
    AssessmentDemographicsModel = None
    AssessmentModuleDataModel = None
    AssessmentConversationEnhancedModel = None
    Patient = None


class ModeratorDatabase:
    """Database for managing assessment sessions and module states using PostgreSQL"""

    def __init__(self, db_path: Optional[str] = None):
        """Initialize PostgreSQL database connection"""
        self.db_path = db_path  # Store for compatibility, but not used with PostgreSQL
        self.database_available = DATABASE_AVAILABLE
        
        if DATABASE_AVAILABLE:
            logger.debug("ModeratorDatabase initialized with PostgreSQL")
        else:
            logger.debug("ModeratorDatabase initialized in test mode (no database)")

        # In-memory cache for performance (backed by PostgreSQL)
        self._session_cache: Dict[str, SessionState] = {}
        self._cache_ttl = 300  # 5 minutes cache TTL
    
    def _get_db_session(self) -> Session:
        """Get a database session"""
        if not DATABASE_AVAILABLE:
            logger.warning("Database not available - running in test mode")
            return None
        return SessionLocal()
    
    def get_patient_id_from_session(self, session_id: str, db_session: Optional[Session] = None) -> Optional[Any]:
        """
        Unified helper to get patient_id from a session.
        
        This function extracts patient_id from the session, handling all edge cases
        and validation. Use this instead of manually fetching patient_id.
        
        Args:
            session_id: Session identifier (string)
            db_session: Optional database session (will create one if not provided)
            
        Returns:
            patient_id as UUID object, or None if not found or error
            
        Raises:
            ValueError: If session_id is invalid
        """
        if not session_id or not isinstance(session_id, str):
            raise ValueError(f"Invalid session_id: {session_id}")
        
        close_db = False
        try:
            # Use provided session or create new one
            if db_session is None:
                db_session = self._get_db_session()
                close_db = True
                if not db_session:
                    logger.error("Cannot get database session")
                    return None
            
            # Get session model
            session_model = db_session.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.session_id == session_id
            ).first()
            
            if not session_model:
                logger.error(f"Session not found: {session_id}")
                return None
            
            # Extract patient_id
            patient_id = session_model.patient_id
            
            if patient_id is None:
                logger.error(f"Session {session_id} has no patient_id")
                return None
            
            # Validate UUID format
            from uuid import UUID
            if isinstance(patient_id, str):
                try:
                    patient_id = UUID(patient_id)
                except ValueError:
                    logger.error(f"Invalid patient_id format in session {session_id}: {patient_id}")
                    return None
            
            logger.debug(f"Successfully extracted patient_id {patient_id} from session {session_id}")
            return patient_id
            
        except Exception as e:
            logger.error(f"Error getting patient_id from session {session_id}: {e}", exc_info=True)
            return None
        finally:
            if close_db and db_session:
                db_session.close()

    def get_patient_by_user_id(self, user_id: str) -> Optional[Any]:
        """
        Get patient by user ID (email or UUID)

        Args:
            user_id: User identifier (email or UUID)

        Returns:
            Patient object or None if not found
        """
        if not DATABASE_AVAILABLE:
            logger.warning(f"get_patient_by_user_id called in test mode for {user_id}")
            return None
            
        try:
            db = self._get_db_session()
            if not db:
                return None

            # Try to find by email first
            patient = db.query(Patient).filter(Patient.email == user_id).first()

            if not patient:
                # Try by ID if user_id looks like a UUID
                try:
                    from uuid import UUID
                    UUID(user_id)  # Validate UUID format
                    patient = db.query(Patient).filter(Patient.id == user_id).first()
                except ValueError:
                    pass  # Not a valid UUID

            db.close()
            return patient

        except Exception as e:
            logger.error(f"Error getting patient by user_id {user_id}: {e}")
            if 'db' in locals():
                db.close()
            return None
    
    # ========================================================================
    # SESSION MANAGEMENT
    # ========================================================================
    
    @transactional
    def create_session(self, session_state: SessionState, patient_id: str, db_session: Session = None) -> bool:
        """
        Atomically create a new assessment session.

        Args:
            session_state: SessionState object
            patient_id: Patient UUID from the main system (string or UUID)
            db_session: Database session (provided by transactional decorator)

        Returns:
            True if successful, False otherwise
        """
        # Resolve patient identifier to UUID (supports email fallback)
        from uuid import UUID

        def _to_uuid(value) -> Optional[UUID]:
            """Attempt to coerce a value into a UUID."""
            if not value:
                return None
            try:
                return UUID(str(value))
            except (ValueError, TypeError):
                return None

        resolved_patient_id: Optional[UUID] = _to_uuid(patient_id)

        # Collect candidate identifiers for resolution (email, metadata, user_id)
        if resolved_patient_id is None and DATABASE_AVAILABLE and Patient:
            candidate_identifiers: List[str] = []

            if isinstance(patient_id, str):
                candidate_identifiers.append(patient_id.strip())

            if session_state and session_state.metadata:
                meta_patient = session_state.metadata.get("patient_id")
                if meta_patient and meta_patient not in candidate_identifiers:
                    candidate_identifiers.append(str(meta_patient).strip())

            if session_state and session_state.user_id:
                user_identifier = str(session_state.user_id).strip()
                if user_identifier not in candidate_identifiers:
                    candidate_identifiers.append(user_identifier)

            for identifier in candidate_identifiers:
                if not identifier:
                    continue

                candidate_uuid = _to_uuid(identifier)
                patient_obj = None

                try:
                    if candidate_uuid:
                        patient_obj = db_session.query(Patient).filter(Patient.id == candidate_uuid).first()
                    else:
                        patient_obj = db_session.query(Patient).filter(Patient.email == identifier).first()

                    if not patient_obj:
                        patient_obj = self.get_patient_by_user_id(identifier)
                except Exception as lookup_error:
                    logger.error(f"Error resolving patient identifier '{identifier}': {lookup_error}")
                    continue

                if patient_obj and getattr(patient_obj, "id", None):
                    resolved_patient_id = _to_uuid(patient_obj.id)
                    if resolved_patient_id:
                        logger.debug(
                            f"Resolved patient identifier '{identifier}' to UUID {resolved_patient_id}"
                        )
                        break

        if resolved_patient_id is None:
            logger.error(f"Invalid patient_id format: {patient_id}")
            return False

        patient_id = resolved_patient_id

        # Ensure session metadata carries canonical patient id for future writes
        if session_state:
            if session_state.metadata is None:
                session_state.metadata = {}
            session_state.metadata["patient_id"] = str(patient_id)

        # Check if session already exists (handle race conditions)
        existing = db_session.query(AssessmentSessionModel).filter(
            AssessmentSessionModel.session_id == session_state.session_id
        ).first()

        if existing:
            logger.debug(f"Session {session_state.session_id} already exists in database")
            # Update cache and return success
            self._session_cache[session_state.session_id] = session_state
            return True

        # Create session model atomically
        session_model = AssessmentSessionModel(
            session_id=session_state.session_id,
            patient_id=patient_id,
            user_id=session_state.user_id,
            current_module=session_state.current_module,
            module_history=session_state.module_history,
            started_at=session_state.started_at,
            updated_at=session_state.updated_at,
            is_complete=session_state.is_complete,
            metadata=session_state.metadata
        )

        db_session.add(session_model)

        # Update cache
        self._session_cache[session_state.session_id] = session_state

        logger.info(f"Created session {session_state.session_id} for patient {patient_id}")
        return True

    def get_session(self, session_id: str) -> Optional[SessionState]:
        """
        Get session state from database.

        Args:
            session_id: Session identifier

        Returns:
            SessionState object or None if not found
        """
        # Check cache first
        if session_id in self._session_cache:
            return self._session_cache[session_id]

        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot get session")
                return None

            # Get session model
            session_model = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.session_id == session_id
            ).first()

            if not session_model:
                logger.debug(f"Session not found: {session_id}")
                db.close()
                return None

            # Convert to SessionState
            session_state = SessionState(
                session_id=session_model.session_id,
                user_id=session_model.user_id,
                current_module=session_model.current_module,
                module_history=session_model.module_history or [],
                module_states={},  # Load from AssessmentModuleState
                module_results={},  # Load from AssessmentModuleResult
                started_at=session_model.started_at,
                updated_at=session_model.updated_at,
                completed_at=session_model.completed_at,
                is_complete=session_model.is_complete,
                metadata=session_model.metadata or {}
            )

            # Load module states
            module_states = db.query(AssessmentModuleStateModel).filter(
                AssessmentModuleStateModel.session_id == session_id
            ).all()

            for state in module_states:
                session_state.module_states[state.module_name] = state.state_data

            # Load module results - handle missing parsing_method column gracefully
            try:
                module_results = db.query(AssessmentModuleResultModel).filter(
                    AssessmentModuleResultModel.session_id == session_model.id
                ).all()

                for result in module_results:
                    # Access result_data safely (may be results_data or result_data depending on model)
                    result_data = getattr(result, 'results_data', None) or getattr(result, 'result_data', None)
                    if result_data:
                        session_state.module_results[result.module_name] = result_data
            except Exception as e:
                # If there's an error (e.g., missing column), log and continue
                logger.warning(f"Could not load module results (may have schema mismatch): {e}")
                # Try to load without the problematic column by using raw SQL or skipping
                try:
                    # Try alternative query that doesn't select parsing_method
                    from sqlalchemy import text
                    query_text = text("""
                        SELECT module_name, results_data 
                        FROM assessment_module_results 
                        WHERE session_id = :session_id
                    """)
                    raw_results = db.execute(query_text, {"session_id": str(session_model.id)}).fetchall()
                    for row in raw_results:
                        session_state.module_results[row[0]] = row[1]
                except Exception as e2:
                    logger.debug(f"Could not load module results with alternative method: {e2}")

            db.close()

            # Update cache
            self._session_cache[session_id] = session_state

            return session_state

        except Exception as e:
            logger.error(f"Error getting session: {e}", exc_info=True)
            if 'db' in locals():
                db.close()
            return None

    @transactional
    def update_session(self, session_state: SessionState, db_session: Session = None) -> bool:
        """
        Atomically update session state in database with optimistic locking.

        Args:
            session_state: SessionState object
            db_session: Database session (provided by transactional decorator)

        Returns:
            True if successful, False otherwise

        Raises:
            ConcurrentModificationError: If version conflict detected
        """
        # Get session model with version check
        session_model = db_session.query(AssessmentSessionModel).filter(
            AssessmentSessionModel.session_id == session_state.session_id
        ).first()

        if not session_model:
            # Session doesn't exist - try to create it
            logger.debug(f"Session not found in database, attempting to create: {session_state.session_id}")

            # Try to get patient_id from metadata
            patient_id = None
            if session_state.metadata:
                patient_id = session_state.metadata.get("patient_id")
            if not patient_id:
                patient_id = session_state.user_id

            # Create session (will also be transactional)
            return self.create_session(session_state, patient_id)

        # Optimistic locking: check if version matches
        if hasattr(session_model, 'version'):
            current_version = getattr(session_model, 'version', 0)
            if current_version != session_state.version:
                logger.warning(f"Version conflict for session {session_state.session_id}: expected {session_state.version}, got {current_version}")
                # Create custom exception for concurrent modification
                class ConcurrentModificationError(Exception):
                    pass
                raise ConcurrentModificationError(f"Session {session_state.session_id} was modified by another request")

        # Update session model atomically
        session_model.current_module = session_state.current_module
        session_model.module_history = session_state.module_history
        session_model.updated_at = datetime.now()
        session_model.completed_at = session_state.completed_at
        session_model.is_complete = session_state.is_complete
        session_model.metadata = session_state.metadata

        # Increment version for optimistic locking
        if hasattr(session_model, 'version'):
            session_model.version = session_state.version + 1
            session_state.version = session_model.version

        # Update cache
        self._session_cache[session_state.session_id] = session_state

        logger.debug(f"Updated session {session_state.session_id} (version {session_state.version})")
        return True

    def save_module_state(self, session_id: str, module_name: str, state: Dict[str, Any]) -> bool:
        """
        Save module state to database.

        Args:
            session_id: Session identifier
            module_name: Module name
            state: State data

        Returns:
            True if successful, False otherwise
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot save module state")
                return False

            # Get or create module state
            module_state = db.query(AssessmentModuleStateModel).filter(
                AssessmentModuleStateModel.session_id == session_id,
                AssessmentModuleStateModel.module_name == module_name
            ).first()

            if module_state:
                module_state.state_data = state
                module_state.updated_at = datetime.now()
            else:
                module_state = AssessmentModuleStateModel(
                    session_id=session_id,
                    module_name=module_name,
                    state_data=state,
                    updated_at=datetime.now()
                )
                db.add(module_state)

            db.commit()
            db.close()

            logger.debug(f"Saved module state for {module_name} in session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error saving module state: {e}", exc_info=True)
            if 'db' in locals():
                db.rollback()
                db.close()
            return False

    @transactional
    def save_module_result(self, session_id: str, module_name: str, result: Dict[str, Any], db_session: Session = None) -> bool:
        """
        Atomically save module result to database.

        Args:
            session_id: Session identifier
            module_name: Module name
            result: Result data
            db_session: Database session (provided by transactional decorator)

        Returns:
            True if successful, False otherwise
        """
        # Get session model first to get the UUID
        session_model = db_session.query(AssessmentSessionModel).filter(
            AssessmentSessionModel.session_id == session_id
        ).first()

        if not session_model:
            logger.warning(f"Session not found: {session_id}")
            return False

        # Get patient_id from session_model (required for AssessmentModuleResult)
        patient_id = session_model.patient_id
        if not patient_id:
            logger.error(f"Session {session_id} has no patient_id - cannot save module result")
            return False

        # Get or create module result using session model ID
        module_result = db_session.query(AssessmentModuleResultModel).filter(
            AssessmentModuleResultModel.session_id == session_model.id,
            AssessmentModuleResultModel.module_name == module_name
        ).first()

        if module_result:
            module_result.results_data = result
            module_result.updated_at = datetime.now()
            # Ensure patient_id is set (in case it was missing before)
            if not module_result.patient_id:
                module_result.patient_id = patient_id
        else:
            module_result = AssessmentModuleResultModel(
                session_id=session_model.id,  # Use session model ID (UUID)
                patient_id=patient_id,  # Required field - get from session
                module_name=module_name,
                results_data=result,  # Field name is results_data, not result_data
                updated_at=datetime.now()
            )
            db_session.add(module_result)

        logger.debug(f"Saved module result for {module_name} in session {session_id}")
        return True

    def delete_session(self, session_id: str) -> bool:
        """
        Delete session from database.

        Args:
            session_id: Session identifier

        Returns:
            True if successful, False otherwise
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot delete session")
                return False

            # Get session model first
            session_model = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.session_id == session_id
            ).first()

            if not session_model:
                logger.warning(f"Session not found: {session_id}")
                db.close()
                return False

            # Manually delete related records to avoid cascade issues with missing columns
            # Delete module results (handle missing parsing_method column gracefully)
            try:
                from app.models.assessment import AssessmentModuleResult
                db.query(AssessmentModuleResult).filter(
                    AssessmentModuleResult.session_id == session_model.id
                ).delete()
            except Exception as e:
                logger.warning(f"Could not delete module results (may have missing columns): {e}")
                # Continue with deletion anyway

            # Delete module states
            try:
                from app.models.assessment import AssessmentModuleState
                db.query(AssessmentModuleState).filter(
                    AssessmentModuleState.session_id == session_model.id
                ).delete()
            except Exception as e:
                logger.warning(f"Could not delete module states: {e}")

            # Delete conversations
            try:
                from app.models.assessment import AssessmentConversation
                db.query(AssessmentConversation).filter(
                    AssessmentConversation.session_id == session_model.id
                ).delete()
            except Exception as e:
                logger.warning(f"Could not delete conversations: {e}")

            # Delete module data
            try:
                from app.models.assessment import AssessmentModuleData
                db.query(AssessmentModuleData).filter(
                    AssessmentModuleData.session_id == session_model.id
                ).delete()
            except Exception as e:
                logger.warning(f"Could not delete module data: {e}")

            # Now delete the session itself
            db.delete(session_model)
            db.commit()
            db.close()

            # Remove from cache
            if session_id in self._session_cache:
                del self._session_cache[session_id]

            logger.info(f"Deleted session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting session: {e}", exc_info=True)
            if 'db' in locals():
                db.rollback()
                db.close()
            return False

    def list_sessions(self, user_id: Optional[str] = None) -> List[SessionState]:
        """
        List all sessions, optionally filtered by user_id.

        Args:
            user_id: Optional user identifier

        Returns:
            List of SessionState objects
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot list sessions")
                return []

            # Query sessions
            query = db.query(AssessmentSessionModel)
            if user_id:
                query = query.filter(AssessmentSessionModel.user_id == user_id)

            session_models = query.all()

            # Convert to SessionState objects
            sessions = []
            for session_model in session_models:
                session_state = SessionState(
                    session_id=session_model.session_id,
                    user_id=session_model.user_id,
                    current_module=session_model.current_module,
                    module_history=session_model.module_history or [],
                    module_states={},
                    module_results={},
                    started_at=session_model.started_at,
                    updated_at=session_model.updated_at,
                    completed_at=session_model.completed_at,
                    is_complete=session_model.is_complete,
                    metadata=session_model.metadata or {}
                )
                sessions.append(session_state)

            db.close()
            return sessions

        except Exception as e:
            logger.error(f"Error listing sessions: {e}", exc_info=True)
            if 'db' in locals():
                db.close()
            return []

    def cleanup_old_sessions(self, days: int = 90) -> int:
        """
        Clean up old sessions older than specified days.

        Args:
            days: Number of days to keep

        Returns:
            Number of sessions deleted
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot cleanup sessions")
                return 0

            cutoff_date = datetime.now() - timedelta(days=days)

            # Delete old sessions
            deleted_count = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.started_at < cutoff_date
            ).delete()

            db.commit()
            db.close()

            logger.info(f"Cleaned up {deleted_count} old sessions")
            return deleted_count

        except Exception as e:
            logger.error(f"Error cleaning up sessions: {e}", exc_info=True)
            if 'db' in locals():
                db.rollback()
                db.close()
            return 0

    def store_conversation_message(
        self,
        session_id: str,
        patient_id: str,
        role: str,
        message: str,
        module_name: Optional[str] = None,
        message_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Store a conversation message in the database.
        
        Args:
            session_id: Session identifier
            patient_id: Patient UUID (string or UUID)
            role: Message role ('user', 'assistant', 'system')
            message: Message content
            module_name: Optional module name that was active
            message_type: Optional message type (for backward compatibility, stored in metadata)
            metadata: Optional additional metadata
            
        Returns:
            True if successful, False otherwise
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot store conversation message")
                return False
            
            # Determine patient_id (allow caller to omit and pull from session)
            patient_id_value = patient_id

            if not patient_id_value:
                patient_id_value = getattr(session_model, "patient_id", None)

            if not patient_id_value:
                # Fallback to unified helper (ensures consistent logging/validation)
                patient_id_value = self.get_patient_id_from_session(session_id, db_session=db)

            if not patient_id_value:
                logger.error(
                    f"Cannot store module data for session {session_id} / module {module_name}: patient_id missing"
                )
                db.close()
                return False

            # Ensure patient_id is UUID format
            from uuid import UUID
            if isinstance(patient_id_value, str):
                try:
                    patient_id_uuid = UUID(patient_id_value)
                except ValueError:
                    logger.error(f"Invalid patient_id format: {patient_id_value}")
                    db.close()
                    return False
            else:
                patient_id_uuid = patient_id_value
            
            # Get session model to get the UUID
            session_model = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.session_id == session_id
            ).first()
            
            if not session_model:
                logger.error(f"Session not found: {session_id}")
                db.close()
                return False
            
            # Prepare metadata
            message_metadata = metadata or {}
            if message_type:
                message_metadata["message_type"] = message_type
            
            # Create conversation record
            conversation = AssessmentConversationModel(
                session_id=session_model.id,  # Use UUID, not session_id string
                patient_id=patient_id_uuid,
                module_name=module_name,
                role=role,
                message=message,
                message_metadata=message_metadata,
                timestamp=datetime.now()
            )
            
            db.add(conversation)
            db.commit()
            db.close()
            
            logger.debug(f"Stored conversation message for session {session_id}, role: {role}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing conversation message: {e}", exc_info=True)
            if 'db' in locals():
                db.rollback()
                db.close()
            return False

    def get_conversation_history(self, session_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get conversation history for a session.
        
        Args:
            session_id: Session identifier
            limit: Optional limit on number of messages to return
            
        Returns:
            List of conversation message dictionaries
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot get conversation history")
                return []
            
            # Get session model to get the UUID
            session_model = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.session_id == session_id
            ).first()
            
            if not session_model:
                logger.debug(f"Session not found: {session_id}")
                db.close()
                return []
            
            # Get conversations
            query = db.query(AssessmentConversationModel).filter(
                AssessmentConversationModel.session_id == session_model.id
            ).order_by(AssessmentConversationModel.timestamp.asc())
            
            # Apply limit if provided
            if limit:
                query = query.limit(limit)
            
            conversations = query.all()
            
            # Convert to list of dicts
            history = []
            for conv in conversations:
                message_dict = {
                    "id": str(conv.id),
                    "role": conv.role,
                    "message": conv.message,
                    "module_name": conv.module_name,
                    "timestamp": conv.timestamp.isoformat() if conv.timestamp else None,
                    "metadata": conv.message_metadata or {}
                }
                # Add message_type from metadata for backward compatibility
                if conv.message_metadata and "message_type" in conv.message_metadata:
                    message_dict["message_type"] = conv.message_metadata["message_type"]
                history.append(message_dict)
            
            db.close()
            return history
            
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}", exc_info=True)
            if 'db' in locals():
                db.close()
            return []

    def get_user_sessions_summary(self, patient_id: str) -> List[Dict[str, Any]]:
        """
        Get user sessions in summary format for the frontend.
        
        Args:
            patient_id: Patient UUID (string or UUID)
        
        Returns:
            List of session summary dictionaries
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot get user sessions summary")
                return []
            
            # Ensure patient_id is UUID format
            from uuid import UUID
            if isinstance(patient_id, str):
                try:
                    patient_id_uuid = UUID(patient_id)
                except ValueError:
                    logger.error(f"Invalid patient_id format: {patient_id}")
                    db.close()
                    return []
            else:
                patient_id_uuid = patient_id
            
            # Get sessions for this patient from both AssessmentSessionModel and saved sessions
            sessions = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.patient_id == patient_id_uuid
            ).order_by(AssessmentSessionModel.updated_at.desc()).all()
            
            # Also get saved sessions from AssessmentModuleDataModel
            saved_sessions = db.query(AssessmentModuleDataModel).filter(
                AssessmentModuleDataModel.patient_id == patient_id_uuid,
                AssessmentModuleDataModel.data_type == "session_save"
            ).order_by(AssessmentModuleDataModel.created_at.desc()).all()
            
            session_summaries = []
            
            # Process regular sessions
            for session_model in sessions:
                # Skip conversation queries for now due to UUID mismatch
                # We'll use basic session data
                conversation_count = 0
                conversation_preview = []
                
                # Generate a sequential title for the session (oldest first)
                # Get all sessions for this patient to determine the correct number
                all_sessions = db.query(AssessmentSessionModel).filter(
                    AssessmentSessionModel.patient_id == session_model.patient_id
                ).order_by(AssessmentSessionModel.started_at.asc()).all()
                
                # Find the position of this session in the ordered list
                session_number = 1
                for i, sess in enumerate(all_sessions):
                    if sess.session_id == session_model.session_id:
                        session_number = i + 1
                        break
                
                session_title = f"Session {session_number:02d}"
                
                session_summary = {
                    "id": session_model.session_id,  # Frontend expects 'id' field
                    "session_id": session_model.session_id,  # Keep for compatibility
                    "title": session_title,  # Add title for frontend
                    "patient_id": str(session_model.patient_id),
                    "user_id": session_model.user_id,
                    "created_at": session_model.started_at.isoformat() if session_model.started_at else None,
                    "completed_at": session_model.updated_at.isoformat() if session_model.updated_at else None,
                    "current_module": session_model.current_module,
                    "is_complete": session_model.is_complete,
                    "total_messages": conversation_count,
                    "conversation_preview": conversation_preview,
                    "module_history": session_model.module_history or []
                }
                session_summaries.append(session_summary)
            
            # Process saved sessions
            for saved_session in saved_sessions:
                session_data = saved_session.data_content
                if isinstance(session_data, dict):
                    # Use the data from the saved session instead of querying conversation table
                    # This avoids the UUID mismatch issue
                    conversation_count = session_data.get("total_messages", 0)
                    conversation_preview = session_data.get("conversation_preview", [])
                    
                    # Generate a sequential title for the saved session (oldest first)
                    # Get all sessions for this patient to determine the correct number
                    all_sessions = db.query(AssessmentSessionModel).filter(
                        AssessmentSessionModel.patient_id == saved_session.patient_id
                    ).order_by(AssessmentSessionModel.started_at.asc()).all()
                    
                    # Find the position of this session in the ordered list
                    session_number = 1
                    for i, sess in enumerate(all_sessions):
                        if sess.session_id == saved_session.session_id:
                            session_number = i + 1
                            break
                    
                    saved_session_title = f"Session {session_number:02d}"
                    
                    session_summary = {
                        "id": saved_session.session_id,  # Frontend expects 'id' field
                        "session_id": saved_session.session_id,  # Keep for compatibility
                        "title": saved_session_title,  # Add title for frontend
                        "patient_id": str(saved_session.patient_id),
                        "user_id": session_data.get("user_id"),
                        "created_at": session_data.get("created_at"),
                        "completed_at": session_data.get("completed_at"),
                        "current_module": session_data.get("current_module"),
                        "is_complete": session_data.get("is_complete", False),
                        "total_messages": conversation_count,
                        "conversation_preview": conversation_preview,
                        "module_history": session_data.get("module_history", [])
                    }
                    session_summaries.append(session_summary)
            
            # Sort all sessions by creation date (latest first)
            session_summaries.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            db.close()
            return session_summaries
            
        except Exception as e:
            logger.error(f"Failed to get user sessions summary: {e}", exc_info=True)
            if 'db' in locals():
                db.close()
            return []

    def delete_session(self, session_id: str, patient_id: Optional[str] = None) -> bool:
        """
        Delete session from database with optional ownership validation.
        
        Args:
            session_id: Session identifier
            patient_id: Optional patient ID for ownership validation
        
        Returns:
            True if successful, False otherwise
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot delete session")
                return False

            # Get session model
            session_model = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.session_id == session_id
            ).first()

            if not session_model:
                logger.warning(f"Session not found: {session_id}")
                db.close()
                return False
            
            # Validate ownership if patient_id provided
            if patient_id:
                from uuid import UUID
                if isinstance(patient_id, str):
                    try:
                        patient_id_uuid = UUID(patient_id)
                    except ValueError:
                        logger.error(f"Invalid patient_id format: {patient_id}")
                        db.close()
                        return False
                else:
                    patient_id_uuid = patient_id
                
                if session_model.patient_id != patient_id_uuid:
                    logger.warning(f"Session {session_id} does not belong to patient {patient_id}")
                    db.close()
                    return False

            # Delete session (cascade will delete related records)
            db.delete(session_model)
            db.commit()

            db.close()

            # Remove from cache
            if session_id in self._session_cache:
                del self._session_cache[session_id]

            logger.info(f"Deleted session {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting session: {e}", exc_info=True)
            if 'db' in locals():
                db.rollback()
                db.close()
            return False

    def store_module_data(
        self,
        session_id: str,
        patient_id: str,
        module_name: str,
        data_type: str,
        data_content: Dict[str, Any],
        data_summary: Optional[str] = None,
        module_version: Optional[str] = None,
        is_validated: bool = False
    ) -> bool:
        """
        Store module-specific data.
        
        Args:
            session_id: Session identifier
            patient_id: Patient UUID (string or UUID)
            module_name: Name of the module
            data_type: Type of data ('demographics', 'mood', 'clinical', 'session_save', etc.)
            data_content: Actual data content as dictionary
            data_summary: Human-readable summary
            module_version: Version of the module
            is_validated: Whether the data has been validated
        
        Returns:
            True if successful, False otherwise
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot store module data")
                return False
            
            # Validate required parameters
            if not session_id or not module_name or data_content is None:
                logger.error(f"Missing required parameters: session_id={session_id}, module_name={module_name}, data_content={data_content is not None}")
                return False
            
            # Get session model
            session_model = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.session_id == session_id
            ).first()
            
            if not session_model:
                logger.error(f"Session not found: {session_id}")
                db.close()
                return False
            
            # Extract patient_id from session if not provided
            if patient_id is None:
                patient_id = session_model.patient_id
                if patient_id is None:
                    logger.error(f"Session {session_id} has no patient_id and patient_id was not provided")
                    db.close()
                    return False
                logger.debug(f"Extracted patient_id {patient_id} from session {session_id}")
            
            # Ensure patient_id is UUID format
            from uuid import UUID
            if isinstance(patient_id, str):
                try:
                    patient_id_uuid = UUID(patient_id)
                except ValueError:
                    logger.error(f"Invalid patient_id format: {patient_id}")
                    db.close()
                    return False
            else:
                patient_id_uuid = patient_id
            
            # Create module data record
            module_data = AssessmentModuleDataModel(
                session_id=session_model.id,  # Use UUID, not session_id string
                patient_id=patient_id_uuid,
                module_name=module_name,
                module_version=module_version,
                data_type=data_type,
                data_content=data_content,
                data_summary=data_summary,
                is_validated=is_validated
            )
            
            db.add(module_data)
            db.commit()
            db.close()
            
            logger.info(f"Stored module data for {module_name} in session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store module data: {e}", exc_info=True)
            if 'db' in locals():
                db.rollback()
                db.close()
            return False

    def get_module_data(
        self,
        session_id: str,
        module_name: Optional[str] = None,
        data_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get module-specific data for a session.
        
        Args:
            session_id: Session identifier
            module_name: Optional module name filter
            data_type: Optional data type filter
        
        Returns:
            List of module data records as dictionaries
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot get module data")
                return []
            
            # Get session model
            session_model = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.session_id == session_id
            ).first()
            
            if not session_model:
                logger.debug(f"Session not found: {session_id}")
                db.close()
                return []
            
            # Build query
            query = db.query(AssessmentModuleDataModel).filter(
                AssessmentModuleDataModel.session_id == session_model.id
            )
            
            if module_name:
                query = query.filter(AssessmentModuleDataModel.module_name == module_name)
            
            if data_type:
                query = query.filter(AssessmentModuleDataModel.data_type == data_type)
            
            # Get data records - use created_at if available, otherwise fallback
            try:
                data_records = query.order_by(AssessmentModuleDataModel.created_at.asc()).all()
            except Exception:
                # Fallback if created_at doesn't exist
                data_records = query.all()
            
            # Convert to dictionary format
            data_list = []
            for record in data_records:
                data_dict = {
                    "id": str(record.id),
                    "module_name": record.module_name,
                    "module_version": getattr(record, 'module_version', None),
                    "data_type": record.data_type,
                    "data_content": record.data_content,
                    "data_summary": getattr(record, 'data_summary', None),
                    "is_validated": getattr(record, 'is_validated', False)
                }
                # Add timestamps if available
                if hasattr(record, 'created_at') and record.created_at:
                    data_dict["created_at"] = record.created_at.isoformat()
                if hasattr(record, 'collected_at') and record.collected_at:
                    data_dict["collected_at"] = record.collected_at.isoformat()
                # Add validation_notes if available
                if hasattr(record, 'validation_notes'):
                    data_dict["validation_notes"] = record.validation_notes
                data_list.append(data_dict)
            
            db.close()
            return data_list
            
        except Exception as e:
            logger.error(f"Error getting module data: {e}", exc_info=True)
            if 'db' in locals():
                db.close()
            return []
    
    def get_module_results(self, session_id: str, module_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get module results for a session.
        
        Args:
            session_id: Session identifier
            module_name: Optional module name filter (if None, returns first result)
        
        Returns:
            Module result data as dictionary, or None if not found
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot get module results")
                return None
            
            # Get session model first to get the UUID
            session_model = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.session_id == session_id
            ).first()
            
            if not session_model:
                logger.debug(f"Session not found: {session_id}")
                db.close()
                return None
            
            # Query module results using session model ID
            query = db.query(AssessmentModuleResultModel).filter(
                AssessmentModuleResultModel.session_id == session_model.id
            )
            
            if module_name:
                query = query.filter(AssessmentModuleResultModel.module_name == module_name)
            
            module_result = query.first()
            
            if not module_result:
                db.close()
                return None
            
            # Extract result data
            result_data = module_result.results_data if hasattr(module_result, 'results_data') else {}
            
            db.close()
            return result_data
            
        except Exception as e:
            logger.error(f"Error getting module results: {e}", exc_info=True)
            if 'db' in locals():
                db.close()
            return None
    
    def get_all_module_results(self, session_id: str) -> Dict[str, Any]:
        """
        Get all module results for a session.
        
        Args:
            session_id: Session identifier
        
        Returns:
            Dictionary mapping module names to their results
        """
        try:
            db = self._get_db_session()
            if not db:
                logger.warning("Database not available - cannot get all module results")
                return {}
            
            # Get session model first to get the UUID
            session_model = db.query(AssessmentSessionModel).filter(
                AssessmentSessionModel.session_id == session_id
            ).first()
            
            if not session_model:
                logger.debug(f"Session not found: {session_id}")
                db.close()
                return {}
            
            # Query all module results using session model ID
            module_results = db.query(AssessmentModuleResultModel).filter(
                AssessmentModuleResultModel.session_id == session_model.id
            ).all()
            
            # Build dictionary mapping module names to results
            results_dict = {}
            for module_result in module_results:
                module_name = module_result.module_name
                result_data = module_result.results_data if hasattr(module_result, 'results_data') else {}
                results_dict[module_name] = result_data
            
            db.close()
            return results_dict
            
        except Exception as e:
            logger.error(f"Error getting all module results: {e}", exc_info=True)
            if 'db' in locals():
                db.close()
            return {}


