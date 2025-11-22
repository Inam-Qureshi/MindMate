"""
Integration tests for assessment modules working together
"""

import pytest
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.agents.assessment.sra.sra_module import SymptomRecognitionModule
from app.agents.assessment.da.da_module import DiagnosticAnalysisModule
from app.agents.assessment.tpa.tpa_module import TreatmentPlanningModule


class TestModuleIntegration:
    """Integration tests for modules working together"""
    
    @pytest.fixture
    def sra_module(self):
        return SymptomRecognitionModule()
    
    @pytest.fixture
    def da_module(self):
        return DiagnosticAnalysisModule()
    
    @pytest.fixture
    def tpa_module(self):
        return TreatmentPlanningModule()
    
    @pytest.fixture
    def session_id(self):
        return "test_integration_session_001"
    
    @pytest.fixture
    def user_id(self):
        return "test_user_integration_001"
    
    def test_sra_to_da_flow(self, sra_module, da_module, session_id, user_id):
        """Test SRA → DA data flow"""
        # Start SRA session
        sra_results_pre = {
            "presenting_concern": {"primary_concern": "Anxiety"},
            "risk_assessment": {"risk_level": "low"}
        }
        sra_response = sra_module.start_session(user_id, session_id, previous_module_results=sra_results_pre)
        assert sra_response is not None
        
        # Complete SRA (simulate)
        sra_module._sessions[session_id]["status"] = "completed"
        sra_module._sessions[session_id]["confirmed_symptoms"] = [
            {"symptom_name": "Anxiety", "description": "Persistent anxiety"}
        ]
        
        # Get SRA results
        sra_results = sra_module.get_results(session_id)
        
        # Start DA with SRA results
        da_previous = {"sra_symptom_recognition": sra_results}
        da_response = da_module.start_session(user_id, f"{session_id}_da", previous_module_results=da_previous)
        assert da_response is not None
        assert f"{session_id}_da" in da_module._sessions
    
    def test_da_to_tpa_flow(self, da_module, tpa_module, session_id, user_id):
        """Test DA → TPA data flow"""
        # Start DA session
        da_results_pre = {
            "sra_symptom_recognition": {
                "final_symptoms": [{"symptom_name": "Depression"}]
            }
        }
        da_response = da_module.start_session(user_id, session_id, previous_module_results=da_results_pre)
        
        # Complete DA (simulate)
        da_module._sessions[session_id]["status"] = "completed"
        da_module._sessions[session_id]["primary_diagnosis"] = {
            "name": "Major Depressive Disorder",
            "severity": "moderate"
        }
        
        # Get DA results
        da_results = da_module.get_results(session_id)
        
        # Start TPA with DA results
        tpa_previous = {"da_diagnostic_analysis": da_results}
        tpa_response = tpa_module.start_session(user_id, f"{session_id}_tpa", previous_module_results=tpa_previous)
        assert tpa_response is not None
        assert f"{session_id}_tpa" in tpa_module._sessions
    
    def test_full_workflow(self, sra_module, da_module, tpa_module, session_id, user_id):
        """Test complete workflow: SRA → DA → TPA"""
        # Step 1: SRA
        sra_pre = {
            "presenting_concern": {"primary_concern": "Anxiety and depression"},
            "risk_assessment": {"risk_level": "low"}
        }
        sra_module.start_session(user_id, f"{session_id}_sra", previous_module_results=sra_pre)
        sra_module._sessions[f"{session_id}_sra"]["status"] = "completed"
        sra_module._sessions[f"{session_id}_sra"]["confirmed_symptoms"] = [
            {"symptom_name": "Anxiety"},
            {"symptom_name": "Depression"}
        ]
        sra_results = sra_module.get_results(f"{session_id}_sra")
        
        # Step 2: DA
        da_pre = {"sra_symptom_recognition": sra_results}
        da_module.start_session(user_id, f"{session_id}_da", previous_module_results=da_pre)
        da_module._sessions[f"{session_id}_da"]["status"] = "completed"
        da_module._sessions[f"{session_id}_da"]["primary_diagnosis"] = {
            "name": "Major Depressive Disorder",
            "severity": "moderate"
        }
        da_results = da_module.get_results(f"{session_id}_da")
        
        # Step 3: TPA
        tpa_pre = {
            "da_diagnostic_analysis": da_results,
            "sra_symptom_recognition": sra_results
        }
        tpa_response = tpa_module.start_session(user_id, f"{session_id}_tpa", previous_module_results=tpa_pre)
        
        # Verify all modules completed
        assert sra_module.is_complete(f"{session_id}_sra")
        assert da_module.is_complete(f"{session_id}_da")
        assert tpa_response is not None
    
    def test_module_state_isolation(self, sra_module, da_module, session_id, user_id):
        """Test that modules maintain separate state"""
        sra_module.start_session(user_id, f"{session_id}_sra", previous_module_results={})
        da_module.start_session(user_id, f"{session_id}_da", previous_module_results={})
        
        # Verify separate sessions
        assert f"{session_id}_sra" in sra_module._sessions
        assert f"{session_id}_da" in da_module._sessions
        assert f"{session_id}_sra" not in da_module._sessions
        assert f"{session_id}_da" not in sra_module._sessions


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

