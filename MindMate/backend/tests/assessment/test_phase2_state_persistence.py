"""
Phase 2 Task 2.5: Tests for State Persistence in Agent Modules

Tests verify that all agent modules can checkpoint and resume state correctly.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.agents.assessment.sra.sra_module import SymptomRecognitionModule
from app.agents.assessment.da.da_module import DiagnosticAnalysisModule
from app.agents.assessment.tpa.tpa_module import TreatmentPlanningModule


class TestStateCheckpointing:
    """Test state checkpointing functionality"""
    
    @pytest.fixture(params=[
        (SymptomRecognitionModule, "sra"),
        (DiagnosticAnalysisModule, "da"),
        (TreatmentPlanningModule, "tpa")
    ])
    def module_setup(self, request):
        """Create module with mocked dependencies"""
        module_class, module_prefix = request.param
        
        with patch(f'app.agents.assessment.{module_prefix}.{module_prefix}_module.ModeratorDatabase') as mock_db_class, \
             patch(f'app.agents.assessment.{module_prefix}.{module_prefix}_module.LLMWrapper'):
            mock_db = MagicMock()
            mock_db.save_module_state = MagicMock(return_value=True)
            mock_db_class.return_value = mock_db
            
            module = module_class()
            module.db = mock_db
            
            yield module, mock_db
    
    @pytest.fixture
    def session_id(self):
        """Test session ID"""
        return "test_session_checkpoint"
    
    def test_checkpoint_state_with_valid_session(self, module_setup, session_id):
        """Test checkpointing state when session exists"""
        module, mock_db = module_setup
        
        # Setup session state
        module._sessions[session_id] = {
            "status": "active",
            "conversation_step": "present_symptoms",
            "data": "test_data"
        }
        
        result = module.checkpoint_state(session_id)
        
        assert result is True
        mock_db.save_module_state.assert_called_once()
        
        # Verify call arguments
        call_args = mock_db.save_module_state.call_args
        assert call_args[1]['session_id'] == session_id
        assert call_args[1]['module_name'] == module.module_name
        assert 'state_data' in call_args[1]
        assert 'checkpoint_metadata' in call_args[1]
    
    def test_checkpoint_state_with_no_session(self, module_setup, session_id):
        """Test checkpointing when session doesn't exist"""
        module, mock_db = module_setup
        
        result = module.checkpoint_state(session_id)
        
        assert result is False
        mock_db.save_module_state.assert_not_called()
    
    def test_checkpoint_state_includes_metadata(self, module_setup, session_id):
        """Test that checkpoint includes proper metadata"""
        module, mock_db = module_setup
        
        module._sessions[session_id] = {
            "status": "reviewing",
            "conversation_step": "present_symptoms"
        }
        
        module.checkpoint_state(session_id)
        
        call_args = mock_db.save_module_state.call_args
        metadata = call_args[1]['checkpoint_metadata']
        
        assert 'conversation_step' in metadata
        assert 'status' in metadata
        assert 'checkpointed_at' in metadata
    
    def test_checkpoint_state_database_error(self, module_setup, session_id):
        """Test checkpointing handles database errors gracefully"""
        module, mock_db = module_setup
        
        module._sessions[session_id] = {"status": "active"}
        mock_db.save_module_state = MagicMock(side_effect=Exception("DB error"))
        
        result = module.checkpoint_state(session_id)
        
        assert result is False


class TestStateResume:
    """Test state resume functionality"""
    
    @pytest.fixture(params=[
        (SymptomRecognitionModule, "sra"),
        (DiagnosticAnalysisModule, "da"),
        (TreatmentPlanningModule, "tpa")
    ])
    def module_setup(self, request):
        """Create module with mocked dependencies"""
        module_class, module_prefix = request.param
        
        with patch(f'app.agents.assessment.{module_prefix}.{module_prefix}_module.ModeratorDatabase') as mock_db_class, \
             patch(f'app.agents.assessment.{module_prefix}.{module_prefix}_module.LLMWrapper'):
            mock_db = MagicMock()
            mock_db_class.return_value = mock_db
            
            module = module_class()
            module.db = mock_db
            
            yield module, mock_db
    
    @pytest.fixture
    def session_id(self):
        """Test session ID"""
        return "test_session_resume"
    
    def test_resume_from_checkpoint_success(self, module_setup, session_id):
        """Test successful resume from checkpoint"""
        module, mock_db = module_setup
        
        saved_state = {
            "state_data": {
                "status": "active",
                "conversation_step": "present_symptoms",
                "data": "restored_data"
            },
            "checkpoint_metadata": {
                "timestamp": datetime.now().isoformat()
            }
        }
        
        mock_db.get_module_state = MagicMock(return_value=saved_state)
        
        result = module.resume_from_checkpoint(session_id)
        
        assert result is True
        assert session_id in module._sessions
        assert module._sessions[session_id]["status"] == "active"
        assert module._sessions[session_id]["conversation_step"] == "present_symptoms"
    
    def test_resume_from_checkpoint_no_checkpoint(self, module_setup, session_id):
        """Test resume when no checkpoint exists"""
        module, mock_db = module_setup
        
        mock_db.get_module_state = MagicMock(return_value=None)
        
        result = module.resume_from_checkpoint(session_id)
        
        assert result is False
        assert session_id not in module._sessions
    
    def test_resume_from_checkpoint_empty_state(self, module_setup, session_id):
        """Test resume with empty state data"""
        module, mock_db = module_setup
        
        saved_state = {
            "state_data": {},
            "checkpoint_metadata": {}
        }
        
        mock_db.get_module_state = MagicMock(return_value=saved_state)
        
        result = module.resume_from_checkpoint(session_id)
        
        assert result is True
        assert session_id in module._sessions
        assert module._sessions[session_id] == {}
    
    def test_resume_from_checkpoint_database_error(self, module_setup, session_id):
        """Test resume handles database errors gracefully"""
        module, mock_db = module_setup
        
        mock_db.get_module_state = MagicMock(side_effect=Exception("DB error"))
        
        result = module.resume_from_checkpoint(session_id)
        
        assert result is False


class TestStatePersistenceWorkflow:
    """Test complete state persistence workflow"""
    
    @pytest.fixture
    def module(self):
        """Create SRA module with mocked dependencies"""
        with patch('app.agents.assessment.sra.sra_module.ModeratorDatabase') as mock_db_class, \
             patch('app.agents.assessment.sra.sra_module.LLMWrapper'):
            mock_db = MagicMock()
            mock_db.save_module_state = MagicMock(return_value=True)
            mock_db_class.return_value = mock_db
            
            module = SymptomRecognitionModule()
            module.db = mock_db
            
            return module, mock_db
    
    @pytest.fixture
    def session_id(self):
        """Test session ID"""
        return "test_workflow_session"
    
    def test_checkpoint_and_resume_workflow(self, module, session_id):
        """Test complete checkpoint and resume workflow"""
        module, mock_db = module
        
        # Setup initial state
        initial_state = {
            "status": "active",
            "conversation_step": "present_symptoms",
            "extracted_symptoms": ["symptom1", "symptom2"],
            "confirmed_symptoms": ["symptom1"]
        }
        module._sessions[session_id] = initial_state.copy()
        
        # Checkpoint state
        checkpoint_result = module.checkpoint_state(session_id)
        assert checkpoint_result is True
        
        # Simulate state retrieval
        saved_state = {
            "state_data": initial_state,
            "checkpoint_metadata": {
                "conversation_step": "present_symptoms",
                "status": "active",
                "checkpointed_at": datetime.now().isoformat()
            }
        }
        mock_db.get_module_state = MagicMock(return_value=saved_state)
        
        # Clear in-memory state
        module._sessions.clear()
        
        # Resume from checkpoint
        resume_result = module.resume_from_checkpoint(session_id)
        assert resume_result is True
        
        # Verify state restored
        assert session_id in module._sessions
        restored_state = module._sessions[session_id]
        assert restored_state["status"] == initial_state["status"]
        assert restored_state["conversation_step"] == initial_state["conversation_step"]
        assert restored_state["extracted_symptoms"] == initial_state["extracted_symptoms"]
    
    def test_multiple_checkpoints(self, module, session_id):
        """Test multiple checkpoints preserve latest state"""
        module, mock_db = module
        
        # First checkpoint
        state1 = {"status": "active", "step": 1}
        module._sessions[session_id] = state1.copy()
        module.checkpoint_state(session_id)
        
        # Update state
        state2 = {"status": "active", "step": 2}
        module._sessions[session_id] = state2.copy()
        module.checkpoint_state(session_id)
        
        # Verify latest state was saved
        assert mock_db.save_module_state.call_count == 2
        last_call = mock_db.save_module_state.call_args_list[-1]
        assert last_call[1]['state_data']['step'] == 2

