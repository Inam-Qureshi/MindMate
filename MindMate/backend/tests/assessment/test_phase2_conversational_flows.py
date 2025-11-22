"""
Phase 2 Task 2.4: Tests for Conversational Agent Interfaces

Tests verify that all agent modules implement proper conversational flows
for patient interaction and review.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.agents.assessment.sra.sra_module import SymptomRecognitionModule
from app.agents.assessment.da.da_module import DiagnosticAnalysisModule
from app.agents.assessment.tpa.tpa_module import TreatmentPlanningModule
from app.agents.assessment.module_types import ModuleResponse


class TestSRAConversationalFlow:
    """Test SRA conversational symptom review flow"""
    
    @pytest.fixture
    def module(self):
        """Create SRA module with mocked dependencies"""
        with patch('app.agents.assessment.sra.sra_module.ModeratorDatabase') as mock_db_class, \
             patch('app.agents.assessment.sra.sra_module.LLMWrapper') as mock_llm_class:
            mock_db = MagicMock()
            mock_db.get_session_results_from_db = MagicMock(return_value={})
            mock_db_class.return_value = mock_db
            
            mock_llm = MagicMock()
            mock_response = MagicMock()
            mock_response.success = True
            mock_response.content = '[{"symptom_name": "Anxiety", "description": "Persistent anxiety"}]'
            mock_llm.generate_response.return_value = mock_response
            mock_llm_class.return_value = mock_llm
            
            module = SymptomRecognitionModule()
            module.db = mock_db
            module.llm = mock_llm
            
            return module
    
    @pytest.fixture
    def session_id(self):
        return "test_sra_session"
    
    @pytest.fixture
    def user_id(self):
        return "test_user"
    
    def test_sra_start_presents_symptoms(self, module, session_id, user_id):
        """Test SRA starts by presenting symptoms"""
        # Mock previous results
        previous_results = {
            "presenting_concern": {"primary_concern": "Anxiety"}
        }
        
        response = module.start_session(user_id, session_id, previous_module_results=previous_results)
        
        assert isinstance(response, ModuleResponse)
        assert "symptoms" in response.message.lower() or "analyzing" in response.message.lower()
        assert response.requires_input is True
    
    def test_sra_symptom_confirmation_flow(self, module, session_id, user_id):
        """Test SRA symptom confirmation conversation"""
        # Start session
        module._sessions[session_id] = {
            "user_id": user_id,
            "status": "reviewing",
            "conversation_step": "present_symptoms",
            "extracted_symptoms": [
                {"symptom_name": "Anxiety", "description": "Persistent anxiety"}
            ],
            "confirmed_symptoms": [],
            "rejected_symptoms": []
        }
        
        # User confirms
        response = module.process_message("yes, that's correct", session_id)
        
        assert isinstance(response, ModuleResponse)
        assert "additional" in response.message.lower() or "add" in response.message.lower()
    
    def test_sra_additional_symptoms_flow(self, module, session_id):
        """Test SRA asking about additional symptoms"""
        module._sessions[session_id] = {
            "status": "reviewing",
            "conversation_step": "ask_additional",
            "extracted_symptoms": [{"symptom_name": "Anxiety"}],
            "confirmed_symptoms": [{"symptom_name": "Anxiety"}],
            "patient_additions": []
        }
        
        # User adds symptoms
        response = module.process_message("I also have trouble sleeping", session_id)
        
        assert isinstance(response, ModuleResponse)
        assert response.requires_input is True
    
    def test_sra_final_confirmation_flow(self, module, session_id):
        """Test SRA final summary confirmation"""
        module._sessions[session_id] = {
            "status": "reviewing",
            "conversation_step": "review_summary",
            "extracted_symptoms": [{"symptom_name": "Anxiety"}],
            "confirmed_symptoms": [{"symptom_name": "Anxiety"}]
        }
        
        # User confirms final summary
        response = module.process_message("yes, that looks right", session_id)
        
        assert isinstance(response, ModuleResponse)
        # Should complete or ask for confirmation
        assert response.is_complete is True or response.requires_input is True


class TestDAConversationalFlow:
    """Test DA conversational diagnostic review flow"""
    
    @pytest.fixture
    def module(self):
        """Create DA module with mocked dependencies"""
        with patch('app.agents.assessment.da.da_module.ModeratorDatabase') as mock_db_class, \
             patch('app.agents.assessment.da.da_module.LLMWrapper') as mock_llm_class:
            mock_db = MagicMock()
            mock_db.get_session_results_from_db = MagicMock(return_value={})
            mock_db_class.return_value = mock_db
            
            mock_llm = MagicMock()
            mock_response = MagicMock()
            mock_response.success = True
            mock_response.content = '{"primary_diagnosis": {"name": "Major Depressive Disorder"}, "confidence": 0.8}'
            mock_llm.generate_response.return_value = mock_response
            mock_llm_class.return_value = mock_llm
            
            module = DiagnosticAnalysisModule()
            module.db = mock_db
            module.llm = mock_llm
            
            return module
    
    @pytest.fixture
    def session_id(self):
        return "test_da_session"
    
    @pytest.fixture
    def user_id(self):
        return "test_user"
    
    def test_da_presents_diagnosis(self, module, session_id, user_id):
        """Test DA presents diagnosis with reasoning"""
        previous_results = {
            "sra_symptom_recognition": {
                "final_symptoms": [{"symptom_name": "Depression"}]
            }
        }
        
        response = module.start_session(user_id, session_id, previous_module_results=previous_results)
        
        assert isinstance(response, ModuleResponse)
        assert "diagnosis" in response.message.lower() or "analysis" in response.message.lower()
        assert response.requires_input is True
    
    def test_da_handles_questions(self, module, session_id):
        """Test DA handles patient questions about diagnosis"""
        module._sessions[session_id] = {
            "status": "presenting",
            "conversation_step": "present_diagnosis",
            "primary_diagnosis": {"name": "Major Depressive Disorder"},
            "reasoning": "Based on symptoms",
            "questions_answered": []
        }
        
        # Mock LLM for explanation
        module.llm.generate_response = MagicMock(return_value=MagicMock(
            success=True,
            content="This diagnosis means..."
        ))
        
        response = module.process_message("Can you explain more about this diagnosis?", session_id)
        
        assert isinstance(response, ModuleResponse)
        assert response.requires_input is True
    
    def test_da_presents_differentials(self, module, session_id):
        """Test DA presents differential diagnoses"""
        module._sessions[session_id] = {
            "status": "presenting",
            "conversation_step": "present_diagnosis",
            "primary_diagnosis": {"name": "Major Depressive Disorder"},
            "differential_diagnoses": [
                {"name": "Bipolar Disorder", "reason": "Similar symptoms"}
            ]
        }
        
        response = module.process_message("What other possibilities did you consider?", session_id)
        
        assert isinstance(response, ModuleResponse)
        assert response.requires_input is True
    
    def test_da_final_confirmation(self, module, session_id):
        """Test DA final diagnosis confirmation"""
        module._sessions[session_id] = {
            "status": "presenting",
            "conversation_step": "review_final",
            "primary_diagnosis": {"name": "Major Depressive Disorder"},
            "confidence_score": 0.8
        }
        
        response = module.process_message("yes, that makes sense", session_id)
        
        assert isinstance(response, ModuleResponse)
        # Should complete or confirm
        assert response.is_complete is True or "final" in response.message.lower()


class TestTPAConversationalFlow:
    """Test TPA conversational treatment planning flow"""
    
    @pytest.fixture
    def module(self):
        """Create TPA module with mocked dependencies"""
        with patch('app.agents.assessment.tpa.tpa_module.ModeratorDatabase') as mock_db_class, \
             patch('app.agents.assessment.tpa.tpa_module.LLMWrapper') as mock_llm_class:
            mock_db = MagicMock()
            mock_db.get_session_results_from_db = MagicMock(return_value={})
            mock_db_class.return_value = mock_db
            
            mock_llm = MagicMock()
            mock_response = MagicMock()
            mock_response.success = True
            mock_response.content = '{"primary_intervention": {"name": "CBT"}, "reasoning": "Evidence-based"}'
            mock_llm.generate_response.return_value = mock_response
            mock_llm_class.return_value = mock_llm
            
            module = TreatmentPlanningModule()
            module.db = mock_db
            module.llm = mock_llm
            
            return module
    
    @pytest.fixture
    def session_id(self):
        return "test_tpa_session"
    
    @pytest.fixture
    def user_id(self):
        return "test_user"
    
    def test_tpa_presents_treatment_plan(self, module, session_id, user_id):
        """Test TPA presents initial treatment plan"""
        previous_results = {
            "da_diagnostic_analysis": {
                "primary_diagnosis": {"name": "Major Depressive Disorder"}
            }
        }
        
        response = module.start_session(user_id, session_id, previous_module_results=previous_results)
        
        assert isinstance(response, ModuleResponse)
        assert "treatment" in response.message.lower() or "plan" in response.message.lower()
        assert response.requires_input is True
    
    def test_tpa_goal_setting(self, module, session_id):
        """Test TPA goal setting interaction"""
        module._sessions[session_id] = {
            "status": "presenting",
            "conversation_step": "present_treatment",
            "treatment_plan": {
                "primary_intervention": {"name": "CBT"}
            },
            "patient_goals": []
        }
        
        # Mock goal extraction - TPA has _extract_goals method
        # Need to mock LLM for goal extraction
        module.llm = MagicMock()
        mock_llm_response = MagicMock()
        mock_llm_response.success = True
        mock_llm_response.content = '["reduce anxiety", "sleep better"]'
        module.llm.generate_response.return_value = mock_llm_response
        
        response = module.process_message("I want to reduce my anxiety and sleep better", session_id)
        
        assert isinstance(response, ModuleResponse)
        assert response.requires_input is True
    
    def test_tpa_plan_adjustment(self, module, session_id):
        """Test TPA adjusts plan based on goals"""
        module._sessions[session_id] = {
            "status": "adjusting",
            "conversation_step": "adjusting_plan",
            "treatment_plan": {
                "primary_intervention": {"name": "CBT"}
            },
            "patient_goals": ["reduce anxiety"]
        }
        
        # Mock LLM for plan adjustment
        module.llm.generate_response = MagicMock(return_value=MagicMock(
            success=True,
            content='{"primary_intervention": {"name": "CBT for Anxiety"}}'
        ))
        
        response = module.process_message("continue", session_id)
        
        assert isinstance(response, ModuleResponse)
        # Should present adjusted plan
        assert response.requires_input is True
    
    def test_tpa_final_plan_confirmation(self, module, session_id):
        """Test TPA final plan confirmation"""
        module._sessions[session_id] = {
            "status": "presenting",
            "conversation_step": "review_final",
            "treatment_plan": {
                "primary_intervention": {"name": "CBT"}
            },
            "patient_goals": ["reduce anxiety"]
        }
        
        response = module.process_message("yes, this plan looks good", session_id)
        
        assert isinstance(response, ModuleResponse)
        # Should complete
        assert response.is_complete is True or "perfect" in response.message.lower()


class TestConversationalFlowErrors:
    """Test error handling in conversational flows"""
    
    @pytest.fixture
    def module(self):
        """Create SRA module"""
        with patch('app.agents.assessment.sra.sra_module.ModeratorDatabase'), \
             patch('app.agents.assessment.sra.sra_module.LLMWrapper'):
            return SymptomRecognitionModule()
    
    def test_handles_unclear_input(self, module):
        """Test handling of unclear user input"""
        session_id = "test_session"
        module._sessions[session_id] = {
            "status": "reviewing",
            "conversation_step": "present_symptoms",
            "extracted_symptoms": [{"symptom_name": "Anxiety"}]
        }
        
        response = module.process_message("maybe", session_id)
        
        assert isinstance(response, ModuleResponse)
        assert response.requires_input is True
        # The module may respond with clarification or continue the conversation
        # Check that it's a valid response (not an error)
        assert response.error is None
    
    def test_handles_session_not_found(self, module):
        """Test handling when session doesn't exist"""
        session_id = "nonexistent_session"
        
        response = module.process_message("test message", session_id, user_id="test_user")
        
        assert isinstance(response, ModuleResponse)
        # Should start new session or handle gracefully

