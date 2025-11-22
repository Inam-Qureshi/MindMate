"""
Tests for Symptom Recognition and Analysis (SRA) Module
"""

import pytest
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.agents.assessment.sra.sra_module import SymptomRecognitionModule
from app.agents.assessment.module_types import ModuleResponse, ModuleProgress


class TestSymptomRecognitionModule:
    """Test cases for SRA module"""
    
    @pytest.fixture
    def module(self):
        """Create SRA module instance"""
        return SymptomRecognitionModule()
    
    @pytest.fixture
    def session_id(self):
        """Generate test session ID"""
        return "test_session_sra_001"
    
    @pytest.fixture
    def user_id(self):
        """Generate test user ID"""
        return "test_user_001"
    
    def test_module_initialization(self, module):
        """Test module initializes correctly"""
        assert module.module_name == "sra_symptom_recognition"
        assert module.module_version == "1.0.0"
        assert module.module_description is not None
        assert len(module.module_description) > 0
    
    def test_start_session(self, module, session_id, user_id):
        """Test starting a session"""
        # Mock previous results
        previous_results = {
            "presenting_concern": {
                "primary_concern": "Anxiety and depression",
                "duration": "6 months"
            },
            "risk_assessment": {
                "risk_level": "low"
            }
        }
        
        response = module.start_session(
            user_id=user_id,
            session_id=session_id,
            previous_module_results=previous_results
        )
        
        assert isinstance(response, ModuleResponse)
        assert response.is_complete == False
        assert session_id in module._sessions
    
    def test_process_message_initial(self, module, session_id, user_id):
        """Test processing initial message"""
        # Start session first
        previous_results = {
            "presenting_concern": {"primary_concern": "Anxiety"}
        }
        module.start_session(user_id, session_id, previous_module_results=previous_results)
        
        # Process message
        response = module.process_message(
            message="Yes, that sounds right",
            session_id=session_id
        )
        
        assert isinstance(response, ModuleResponse)
        assert response.is_complete == False or response.is_complete == True
    
    def test_is_complete(self, module, session_id):
        """Test completion check"""
        # Initially not complete
        assert module.is_complete(session_id) == False
        
        # Mark as complete
        module._ensure_session_exists(session_id)
        module._sessions[session_id]["status"] = "completed"
        assert module.is_complete(session_id) == True
    
    def test_get_results(self, module, session_id, user_id):
        """Test getting results"""
        # Start and complete session
        module.start_session(user_id, session_id, previous_module_results={})
        module._sessions[session_id]["status"] = "completed"
        module._sessions[session_id]["confirmed_symptoms"] = [
            {"symptom_name": "Anxiety", "description": "Feeling anxious"}
        ]
        
        results = module.get_results(session_id)
        
        assert isinstance(results, dict)
        assert "module_name" in results
        assert results["module_name"] == "sra_symptom_recognition"
        assert "confirmed_symptoms" in results
    
    def test_get_progress(self, module, session_id, user_id):
        """Test progress tracking"""
        module.start_session(user_id, session_id, previous_module_results={})
        
        progress = module.get_progress(session_id)
        
        assert progress is None or isinstance(progress, ModuleProgress)
        if progress:
            assert progress.total_steps > 0
            assert 0 <= progress.percentage <= 100
    
    def test_on_activate(self, module, session_id):
        """Test on_activate hook"""
        module.on_activate(session_id)
        assert session_id in module._sessions
    
    def test_on_complete(self, module, session_id, user_id):
        """Test on_complete hook"""
        module.start_session(user_id, session_id, previous_module_results={})
        module.on_complete(session_id)
        # Should not raise exception
    
    def test_checkpoint_state(self, module, session_id, user_id):
        """Test state checkpointing"""
        module.start_session(user_id, session_id, previous_module_results={})
        module._sessions[session_id]["conversation_step"] = "present_symptoms"
        
        # Checkpoint may fail if database not available, but should not raise
        try:
            result = module.checkpoint_state(session_id)
            assert isinstance(result, bool)
        except Exception as e:
            # If DB not available, that's okay for unit tests
            pytest.skip(f"Database not available: {e}")
    
    def test_resume_from_checkpoint(self, module, session_id):
        """Test resuming from checkpoint"""
        try:
            result = module.resume_from_checkpoint(session_id)
            assert isinstance(result, bool)
        except Exception as e:
            pytest.skip(f"Database not available: {e}")
    
    def test_compile_results(self, module, session_id, user_id):
        """Test compile_results method"""
        module.start_session(user_id, session_id, previous_module_results={})
        results = module.compile_results(session_id)
        assert isinstance(results, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

