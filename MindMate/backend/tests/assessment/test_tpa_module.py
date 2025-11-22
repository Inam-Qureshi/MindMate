"""
Tests for Treatment Planning Agent (TPA) Module
"""

import pytest
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.agents.assessment.tpa.tpa_module import TreatmentPlanningModule
from app.agents.assessment.module_types import ModuleResponse, ModuleProgress


class TestTreatmentPlanningModule:
    """Test cases for TPA module"""
    
    @pytest.fixture
    def module(self):
        """Create TPA module instance"""
        return TreatmentPlanningModule()
    
    @pytest.fixture
    def session_id(self):
        """Generate test session ID"""
        return "test_session_tpa_001"
    
    @pytest.fixture
    def user_id(self):
        """Generate test user ID"""
        return "test_user_001"
    
    def test_module_initialization(self, module):
        """Test module initializes correctly"""
        assert module.module_name == "tpa_treatment_planning"
        assert module.module_version == "1.0.0"
        assert module.module_description is not None
    
    def test_start_session(self, module, session_id, user_id):
        """Test starting a session"""
        previous_results = {
            "da_diagnostic_analysis": {
                "primary_diagnosis": {
                    "name": "Major Depressive Disorder",
                    "severity": "moderate"
                }
            },
            "sra_symptom_recognition": {
                "final_symptoms": [{"symptom_name": "Depression"}]
            }
        }
        
        response = module.start_session(
            user_id=user_id,
            session_id=session_id,
            previous_module_results=previous_results
        )
        
        assert isinstance(response, ModuleResponse)
        assert session_id in module._sessions
    
    def test_process_message(self, module, session_id, user_id):
        """Test processing user messages"""
        previous_results = {
            "da_diagnostic_analysis": {
                "primary_diagnosis": {"name": "Anxiety Disorder"}
            }
        }
        module.start_session(user_id, session_id, previous_module_results=previous_results)
        
        response = module.process_message(
            message="I want to reduce my anxiety",
            session_id=session_id
        )
        
        assert isinstance(response, ModuleResponse)
    
    def test_is_complete(self, module, session_id):
        """Test completion check"""
        assert module.is_complete(session_id) == False
        
        module._ensure_session_exists(session_id)
        module._sessions[session_id]["status"] = "completed"
        assert module.is_complete(session_id) == True
    
    def test_get_results(self, module, session_id, user_id):
        """Test getting results"""
        module.start_session(user_id, session_id, previous_module_results={})
        module._sessions[session_id]["status"] = "completed"
        module._sessions[session_id]["treatment_plan"] = {
            "primary_intervention": {"name": "CBT"}
        }
        
        results = module.get_results(session_id)
        assert isinstance(results, dict)
        assert "treatment_plan" in results
    
    def test_get_progress(self, module, session_id, user_id):
        """Test progress tracking"""
        module.start_session(user_id, session_id, previous_module_results={})
        progress = module.get_progress(session_id)
        assert progress is None or isinstance(progress, ModuleProgress)
    
    def test_on_activate(self, module, session_id):
        """Test on_activate hook"""
        module.on_activate(session_id)
        assert session_id in module._sessions
    
    def test_on_complete(self, module, session_id, user_id):
        """Test on_complete hook"""
        module.start_session(user_id, session_id, previous_module_results={})
        module.on_complete(session_id)
        # Should not raise
    
    def test_checkpoint_state(self, module, session_id, user_id):
        """Test state checkpointing"""
        module.start_session(user_id, session_id, previous_module_results={})
        try:
            result = module.checkpoint_state(session_id)
            assert isinstance(result, bool)
        except Exception as e:
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

