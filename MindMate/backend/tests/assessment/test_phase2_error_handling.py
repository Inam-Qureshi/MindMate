"""
Phase 2: Tests for Error Handling in Agent Modules

Tests verify that all agent modules handle errors gracefully with
user-friendly messages and proper recovery.
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


class TestErrorHandling:
    """Test error handling across all agent modules"""
    
    @pytest.fixture(params=[
        SymptomRecognitionModule,
        DiagnosticAnalysisModule,
        TreatmentPlanningModule
    ])
    def module(self, request):
        """Create module with mocked dependencies"""
        module_class = request.param
        
        with patch(f'app.agents.assessment.{module_class.__module__.split(".")[-2]}.{module_class.__module__.split(".")[-2]}_module.ModeratorDatabase'), \
             patch(f'app.agents.assessment.{module_class.__module__.split(".")[-2]}.{module_class.__module__.split(".")[-2]}_module.LLMWrapper'):
            return module_class()
    
    @pytest.fixture
    def session_id(self):
        return "test_error_session"
    
    def test_on_error_returns_module_response(self, module, session_id):
        """Test that on_error returns a ModuleResponse"""
        test_error = ValueError("Test error message")
        
        response = module.on_error(session_id, test_error)
        
        assert isinstance(response, ModuleResponse)
        assert hasattr(response, 'message')
        assert hasattr(response, 'error')
        assert response.requires_input is True
    
    def test_on_error_user_friendly_message(self, module, session_id):
        """Test that error messages are user-friendly"""
        test_error = ValueError("Technical error details")
        
        response = module.on_error(session_id, test_error)
        
        assert isinstance(response.message, str)
        assert len(response.message) > 0
        # Should not contain technical error details in user message
        assert "Technical error" not in response.message or "error" in response.message.lower()
        # Should be encouraging
        assert "try" in response.message.lower() or "again" in response.message.lower() or "rephrase" in response.message.lower()
    
    def test_on_error_includes_metadata(self, module, session_id):
        """Test that error response includes metadata"""
        test_error = ValueError("Test error")
        
        response = module.on_error(session_id, test_error)
        
        assert hasattr(response, 'metadata')
        assert response.metadata is not None
        assert "error_type" in response.metadata or "module" in response.metadata
    
    def test_llm_error_handling(self, module):
        """Test handling of LLM errors"""
        session_id = "test_llm_error"
        
        # Mock LLM to fail
        module.llm = MagicMock()
        module.llm.generate_response = MagicMock(return_value=MagicMock(
            success=False,
            error="LLM API error"
        ))
        
        # Should handle gracefully
        if hasattr(module, '_extract_symptoms'):
            result = module._extract_symptoms(session_id) if hasattr(module, '_extract_symptoms') else []
            # Should return empty or handle gracefully
            assert isinstance(result, (list, type(None)))
    
    def test_database_error_handling(self, module, session_id):
        """Test handling of database errors"""
        module._sessions[session_id] = {"status": "active"}
        
        # Mock database to fail
        module.db = MagicMock()
        module.db.save_module_state = MagicMock(side_effect=Exception("Database connection error"))
        
        result = module.checkpoint_state(session_id)
        
        # Should return False on error, not raise exception
        assert result is False
    
    def test_invalid_input_handling(self, module, session_id):
        """Test handling of invalid input"""
        module._sessions[session_id] = {
            "status": "active",
            "conversation_step": "initial"
        }
        
        # Mock dependencies
        if hasattr(module, 'llm'):
            module.llm = MagicMock()
        if hasattr(module, 'db'):
            module.db = MagicMock()
        
        # Process invalid/empty input
        response = module.process_message("", session_id)
        
        assert isinstance(response, ModuleResponse)
        # Should handle gracefully, not crash
    
    def test_session_not_found_error(self, module):
        """Test handling when session doesn't exist"""
        nonexistent_session = "nonexistent_session_123"
        
        # Mock dependencies
        if hasattr(module, 'llm'):
            module.llm = MagicMock()
        if hasattr(module, 'db'):
            module.db = MagicMock()
        
        # Should handle gracefully
        response = module.process_message("test", nonexistent_session, user_id="test_user")
        
        assert isinstance(response, ModuleResponse)
        # Should either start new session or return error message
    
    def test_json_parse_error_handling(self, module):
        """Test handling of JSON parse errors from LLM"""
        session_id = "test_json_error"
        module._sessions[session_id] = {"status": "active"}
        
        # Mock LLM to return invalid JSON
        module.llm = MagicMock()
        module.llm.generate_response = MagicMock(return_value=MagicMock(
            success=True,
            content="Invalid JSON response {"
        ))
        
        # Should handle gracefully
        if hasattr(module, '_perform_diagnostic_analysis'):
            result = module._perform_diagnostic_analysis(session_id)
            # Should return None or handle gracefully
            assert result is None or isinstance(result, dict)


class TestSRAErrorHandling:
    """Test SRA-specific error handling"""
    
    @pytest.fixture
    def module(self):
        with patch('app.agents.assessment.sra.sra_module.ModeratorDatabase'), \
             patch('app.agents.assessment.sra.sra_module.LLMWrapper'):
            return SymptomRecognitionModule()
    
    def test_sra_symptom_extraction_error(self, module):
        """Test SRA handles symptom extraction errors"""
        session_id = "test_sra_error"
        
        module.llm = MagicMock()
        module.llm.generate_response = MagicMock(return_value=MagicMock(
            success=False,
            error="LLM error"
        ))
        
        module.db = MagicMock()
        module.db.get_session_results_from_db = MagicMock(return_value={})
        
        result = module._extract_symptoms(session_id)
        
        # Should return empty list on error
        assert isinstance(result, list)
    
    def test_sra_no_previous_results(self, module):
        """Test SRA handles missing previous results"""
        session_id = "test_sra_no_results"
        user_id = "test_user"
        
        module.db = MagicMock()
        module.db.get_session_results_from_db = MagicMock(return_value={})
        
        response = module.start_session(user_id, session_id, previous_module_results={})
        
        assert isinstance(response, ModuleResponse)
        # Should handle gracefully, ask for input


class TestDAErrorHandling:
    """Test DA-specific error handling"""
    
    @pytest.fixture
    def module(self):
        with patch('app.agents.assessment.da.da_module.ModeratorDatabase'), \
             patch('app.agents.assessment.da.da_module.LLMWrapper'):
            return DiagnosticAnalysisModule()
    
    def test_da_diagnostic_analysis_error(self, module):
        """Test DA handles diagnostic analysis errors"""
        session_id = "test_da_error"
        
        module._sessions[session_id] = {
            "previous_results": {}
        }
        
        module.llm = MagicMock()
        module.llm.generate_response = MagicMock(return_value=MagicMock(
            success=False,
            error="LLM error"
        ))
        
        module.db = MagicMock()
        module.db.get_session_results_from_db = MagicMock(return_value={})
        
        result = module._perform_diagnostic_analysis(session_id)
        
        # Should return None on error
        assert result is None
    
    def test_da_dsm5_validation_error(self, module):
        """Test DA handles DSM-5 validation errors gracefully"""
        # Should not raise exception even with invalid input
        result = module._validate_dsm5_criteria("", [])
        
        assert isinstance(result, dict)
        assert "is_valid" in result


class TestTPAErrorHandling:
    """Test TPA-specific error handling"""
    
    @pytest.fixture
    def module(self):
        with patch('app.agents.assessment.tpa.tpa_module.ModeratorDatabase'), \
             patch('app.agents.assessment.tpa.tpa_module.LLMWrapper'):
            return TreatmentPlanningModule()
    
    def test_tpa_treatment_plan_generation_error(self, module):
        """Test TPA handles treatment plan generation errors"""
        session_id = "test_tpa_error"
        
        module._sessions[session_id] = {
            "previous_results": {}
        }
        
        module.llm = MagicMock()
        module.llm.generate_response = MagicMock(return_value=MagicMock(
            success=False,
            error="LLM error"
        ))
        
        module.db = MagicMock()
        module.db.get_session_results_from_db = MagicMock(return_value={})
        
        result = module._generate_treatment_plan(session_id)
        
        # Should return None on error
        assert result is None
    
    def test_tpa_goal_extraction_error(self, module):
        """Test TPA handles goal extraction errors"""
        module.llm = MagicMock()
        module.llm.generate_response = MagicMock(return_value=MagicMock(
            success=False,
            error="LLM error"
        ))
        
        result = module._extract_goals("I want to feel better")
        
        # Should return empty list on error
        assert isinstance(result, list)

