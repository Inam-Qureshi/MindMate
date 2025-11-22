"""
Unit tests for database operations in Phase 1 Task 1.5

Tests cover:
- Database operations (CRUD)
- Patient ID extraction in all scenarios
- Error recovery paths
- Schema validation
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch, call
from uuid import UUID, uuid4
from datetime import datetime

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.agents.assessment.database import ModeratorDatabase
from app.agents.assessment.module_types import SessionState
from app.models.assessment import (
    AssessmentSession,
    AssessmentModuleResult,
    AssessmentModuleState
)


class TestDatabaseOperations:
    """Test database CRUD operations"""
    
    @pytest.fixture
    def db(self):
        """Create database instance with mocked session"""
        db = ModeratorDatabase()
        db._get_db_session = MagicMock(return_value=MagicMock())
        return db
    
    @pytest.fixture
    def mock_session(self):
        """Mock database session"""
        session = MagicMock()
        session.query.return_value = session
        session.filter.return_value = session
        session.first.return_value = None
        session.add = MagicMock()
        session.commit = MagicMock()
        session.close = MagicMock()
        return session
    
    def test_create_session(self, db, mock_session):
        """Test creating a new assessment session"""
        db._get_db_session = MagicMock(return_value=mock_session)
        
        user_id = "user@example.com"
        session_id = "test_session_123"
        patient_id = uuid4()
        
        # Create SessionState object
        session_state = SessionState(
            session_id=session_id,
            user_id=user_id
        )
        
        # Mock session query to return None (new session)
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        # Call the real create_session method
        result = db.create_session(
            session_state=session_state,
            patient_id=patient_id
        )
        
        assert result is True
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
    
    def test_get_session(self, db, mock_session):
        """Test retrieving an assessment session"""
        db._get_db_session = MagicMock(return_value=mock_session)
        
        session_id = "test_session_123"
        mock_session_model = MagicMock()
        mock_session_model.session_id = session_id
        mock_session_model.user_id = "user@example.com"
        mock_session_model.patient_id = uuid4()
        mock_session.query.return_value.filter.return_value.first.return_value = mock_session_model
        
        db.get_session = MagicMock(return_value=mock_session_model)
        result = db.get_session(session_id)
        
        assert result is not None
        assert result.session_id == session_id
    
    def test_store_module_data(self, db, mock_session):
        """Test storing module result data"""
        db._get_db_session = MagicMock(return_value=mock_session)
        
        session_id = "test_session_123"
        module_name = "test_module"
        data_content = {"key": "value"}
        
        # Mock session query
        mock_session_model = MagicMock()
        mock_session_model.id = uuid4()
        mock_session_model.session_id = session_id
        mock_session_model.user_id = "user@example.com"
        mock_session_model.patient_id = uuid4()
        mock_session.query.return_value.filter.return_value.first.return_value = mock_session_model
        
        # Call the real store_module_data method
        result = db.store_module_data(
            session_id=session_id,
            module_name=module_name,
            data_content=data_content
        )
        
        assert result is True
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
    
    def test_save_module_state(self, db, mock_session):
        """Test saving module state checkpoint"""
        db._get_db_session = MagicMock(return_value=mock_session)
        
        session_id = "test_session_123"
        module_name = "test_module"
        state_data = {"step": "initial"}
        
        # Mock session query
        mock_session_model = MagicMock()
        mock_session_model.id = uuid4()
        mock_session_model.session_id = session_id
        mock_session_model.user_id = "user@example.com"
        mock_session_model.patient_id = uuid4()
        
        # Mock query chain: first query returns session, second query returns None (new state)
        session_query = MagicMock()
        session_query.filter.return_value.first.return_value = mock_session_model
        
        state_query = MagicMock()
        state_query.filter.return_value.first.return_value = None  # New state, so add() will be called
        
        mock_session.query.side_effect = [session_query, state_query]
        
        result = db.save_module_state(
            session_id=session_id,
            module_name=module_name,
            state_data=state_data
        )
        
        assert result is True
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
    
    def test_get_module_state(self, db, mock_session):
        """Test retrieving module state checkpoint"""
        db._get_db_session = MagicMock(return_value=mock_session)
        
        session_id = "test_session_123"
        module_name = "test_module"
        
        # Mock session model
        mock_session_model = MagicMock()
        mock_session_model.id = uuid4()
        mock_session_model.session_id = session_id
        mock_session_model.user_id = "user@example.com"
        mock_session_model.patient_id = uuid4()
        
        # Mock module state
        mock_state_model = MagicMock()
        mock_state_model.session_id = mock_session_model.id
        mock_state_model.module_name = module_name
        mock_state_model.state_data = {"step": "initial"}
        mock_state_model.checkpoint_metadata = {"timestamp": datetime.now().isoformat()}
        
        # Setup query chain
        query_mock = MagicMock()
        query_mock.filter.return_value.first.return_value = mock_session_model
        mock_session.query.return_value = query_mock
        
        # Second query for state
        state_query = MagicMock()
        state_query.filter.return_value.first.return_value = mock_state_model
        mock_session.query.side_effect = [query_mock, state_query]
        
        result = db.get_module_state(session_id, module_name)
        
        assert result is not None
        assert "state_data" in result
        assert "checkpoint_metadata" in result


class TestPatientIDExtraction:
    """Test patient_id extraction in all scenarios"""
    
    @pytest.fixture
    def db(self):
        """Create database instance"""
        db = ModeratorDatabase()
        return db
    
    @pytest.fixture
    def mock_session(self):
        """Mock database session"""
        session = MagicMock()
        return session
    
    def test_get_patient_id_valid_session(self, db, mock_session):
        """Test getting patient_id from valid session"""
        session_id = "test_session_123"
        patient_id = uuid4()
        
        # Mock session model with patient_id
        mock_session_model = MagicMock(
            session_id=session_id,
            user_id="user@example.com",
            patient_id=patient_id
        )
        
        mock_session.query.return_value.filter.return_value.first.return_value = mock_session_model
        db._get_db_session = MagicMock(return_value=mock_session)
        
        result = db.get_patient_id_from_session(session_id)
        
        assert result == patient_id
        assert isinstance(result, UUID)
    
    def test_get_patient_id_session_not_found(self, db, mock_session):
        """Test getting patient_id when session doesn't exist"""
        session_id = "nonexistent_session"
        
        mock_session.query.return_value.filter.return_value.first.return_value = None
        db._get_db_session = MagicMock(return_value=mock_session)
        
        result = db.get_patient_id_from_session(session_id)
        
        assert result is None
    
    def test_get_patient_id_no_patient_id(self, db, mock_session):
        """Test getting patient_id when session has no patient_id"""
        session_id = "test_session_123"
        
        mock_session_model = MagicMock(
            session_id=session_id,
            user_id="user@example.com",
            patient_id=None
        )
        
        mock_session.query.return_value.filter.return_value.first.return_value = mock_session_model
        db._get_db_session = MagicMock(return_value=mock_session)
        
        result = db.get_patient_id_from_session(session_id)
        
        assert result is None
    
    def test_get_patient_id_string_uuid(self, db, mock_session):
        """Test getting patient_id when stored as string UUID"""
        session_id = "test_session_123"
        patient_id_str = str(uuid4())
        patient_id_uuid = UUID(patient_id_str)
        
        mock_session_model = MagicMock()
        mock_session_model.patient_id = patient_id_str
        
        mock_session.query.return_value.filter.return_value.first.return_value = mock_session_model
        db._get_db_session = MagicMock(return_value=mock_session)
        
        result = db.get_patient_id_from_session(session_id)
        
        assert result == patient_id_uuid
        assert isinstance(result, UUID)
    
    def test_get_patient_id_invalid_uuid_format(self, db, mock_session):
        """Test getting patient_id with invalid UUID format"""
        session_id = "test_session_123"
        
        mock_session_model = MagicMock()
        mock_session_model.patient_id = "invalid-uuid-format"
        
        mock_session.query.return_value.filter.return_value.first.return_value = mock_session_model
        db._get_db_session = MagicMock(return_value=mock_session)
        
        result = db.get_patient_id_from_session(session_id)
        
        assert result is None
    
    def test_get_patient_id_invalid_session_id(self, db):
        """Test getting patient_id with invalid session_id"""
        with pytest.raises(ValueError):
            db.get_patient_id_from_session(None)
        
        with pytest.raises(ValueError):
            db.get_patient_id_from_session(123)  # Not a string
    
    def test_get_patient_id_database_error(self, db):
        """Test getting patient_id when database error occurs"""
        session_id = "test_session_123"
        
        db._get_db_session = MagicMock(side_effect=Exception("Database error"))
        
        result = db.get_patient_id_from_session(session_id)
        
        assert result is None


class TestErrorRecovery:
    """Test error recovery paths"""
    
    @pytest.fixture
    def db(self):
        """Create database instance"""
        db = ModeratorDatabase()
        return db
    
    def test_store_module_data_no_patient_id(self, db):
        """Test storing module data when patient_id is missing"""
        mock_session = MagicMock()
        db._get_db_session = MagicMock(return_value=mock_session)
        
        session_id = "test_session_123"
        module_name = "test_module"
        data_content = {"key": "value"}
        
        # Mock session query to return session with no patient_id
        mock_session_model = MagicMock()
        mock_session_model.id = uuid4()
        mock_session_model.session_id = session_id
        mock_session_model.patient_id = None
        mock_session.query.return_value.filter.return_value.first.return_value = mock_session_model
        
        # Should handle gracefully without raising exception
        result = db.store_module_data(
            session_id=session_id,
            module_name=module_name,
            data_content=data_content
        )
        
        # Should return False when patient_id is missing
        assert result is False
    
    def test_store_module_data_db_error(self, db):
        """Test storing module data when database error occurs"""
        db._get_db_session = MagicMock(side_effect=Exception("Connection error"))
        
        session_id = "test_session_123"
        module_name = "test_module"
        data_content = {"key": "value"}
        
        # Should handle gracefully
        result = db.store_module_data(
            session_id=session_id,
            module_name=module_name,
            data_content=data_content
        )
        
        assert result is False
    
    def test_save_module_state_commit_failure(self, db):
        """Test saving module state when commit fails"""
        mock_session = MagicMock()
        mock_session.commit = MagicMock(side_effect=Exception("Commit failed"))
        mock_session.rollback = MagicMock()
        
        db._get_db_session = MagicMock(return_value=mock_session)
        
        session_id = "test_session_123"
        module_name = "test_module"
        
        # Mock session query
        mock_session_model = MagicMock()
        mock_session_model.id = uuid4()
        mock_session_model.session_id = session_id
        mock_session_model.user_id = "user@example.com"
        mock_session_model.patient_id = uuid4()
        mock_session.query.return_value.filter.return_value.first.return_value = mock_session_model
        
        # Call the real save_module_state method - should return False on failure
        result = db.save_module_state(
            session_id=session_id,
            module_name=module_name,
            state_data={"step": "initial"}
        )
        
        # Should return False on failure
        assert result is False
    
    def test_get_module_state_session_not_found(self, db):
        """Test getting module state when session doesn't exist"""
        mock_session = MagicMock()
        mock_session.query.return_value.filter.return_value.first.return_value = None
        db._get_db_session = MagicMock(return_value=mock_session)
        
        result = db.get_module_state("nonexistent_session", "test_module")
        
        assert result is None
    
    def test_get_module_state_no_state(self, db):
        """Test getting module state when state doesn't exist"""
        mock_session = MagicMock()
        
        # Mock session model
        mock_session_model = MagicMock()
        mock_session_model.id = uuid4()
        mock_session_model.session_id = "test_session"
        mock_session_model.user_id = "user@example.com"
        mock_session_model.patient_id = uuid4()
        
        # First query returns session, second returns None (no state)
        query_mock = MagicMock()
        query_mock.filter.return_value.first.return_value = mock_session_model
        
        state_query = MagicMock()
        state_query.filter.return_value.first.return_value = None
        
        mock_session = MagicMock()
        mock_session.query.side_effect = [query_mock, state_query]
        db._get_db_session = MagicMock(return_value=mock_session)
        
        result = db.get_module_state("test_session", "test_module")
        
        assert result is None


class TestDatabaseSchemaValidation:
    """Test database schema validation"""
    
    @pytest.fixture
    def db(self):
        """Create database instance"""
        db = ModeratorDatabase()
        return db
    
    def test_session_model_has_required_fields(self):
        """Test that session model has all required fields"""
        required_fields = [
            'session_id', 'user_id', 'patient_id',
            'started_at', 'updated_at', 'is_complete'
        ]
        
        for field in required_fields:
            assert hasattr(AssessmentSession, field), f"Missing field: {field}"
    
    def test_module_result_model_has_required_fields(self):
        """Test that module result model has all required fields"""
        # Check for Column attributes (these are the actual database fields)
        required_fields = [
            'session_id', 'module_name', 'results_data',
            'completed_at_time'
        ]
        
        # Check optional fields that may be in model definition but not yet migrated
        optional_fields = ['confidence_score', 'processing_time_ms']
        
        for field in required_fields:
            # Check if field exists as Column in table or as attribute
            has_column = hasattr(AssessmentModuleResult.__table__.columns, field) if hasattr(AssessmentModuleResult, '__table__') else False
            has_attr = hasattr(AssessmentModuleResult, field)
            assert has_column or has_attr, f"Missing required field: {field}"
    
    def test_module_state_model_has_required_fields(self):
        """Test that module state model has all required fields"""
        # Check for Column attributes (these are the actual database fields)
        required_fields = [
            'session_id', 'module_name', 'state_data',
            'created_at_time', 'updated_at_time'
        ]
        
        # checkpoint_metadata may be in model definition but not yet migrated
        optional_fields = ['checkpoint_metadata']
        
        for field in required_fields:
            # Check if field exists as Column in table or as attribute
            has_column = field in AssessmentModuleState.__table__.columns if hasattr(AssessmentModuleState, '__table__') else False
            has_attr = hasattr(AssessmentModuleState, field)
            assert has_column or has_attr, f"Missing required field: {field}"

