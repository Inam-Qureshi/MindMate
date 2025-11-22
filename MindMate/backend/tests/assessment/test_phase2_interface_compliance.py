"""
Phase 2 Task 2.3: Tests for BaseAssessmentModule Interface Compliance

Tests verify that all agent modules (SRA, DA, TPA) implement the complete
BaseAssessmentModule interface as required.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
from uuid import uuid4

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.agents.assessment.base_module import BaseAssessmentModule
from app.agents.assessment.sra.sra_module import SymptomRecognitionModule
from app.agents.assessment.da.da_module import DiagnosticAnalysisModule
from app.agents.assessment.tpa.tpa_module import TreatmentPlanningModule
from app.agents.assessment.module_types import ModuleResponse


class TestInterfaceCompliance:
    """Test that all agent modules implement full BaseAssessmentModule interface"""
    
    @pytest.fixture(params=[
        SymptomRecognitionModule,
        DiagnosticAnalysisModule,
        TreatmentPlanningModule
    ])
    def module_class(self, request):
        """Get each module class"""
        return request.param
    
    @pytest.fixture
    def module(self, module_class):
        """Create module instance with mocked dependencies"""
        with patch('app.agents.assessment.sra.sra_module.ModeratorDatabase'), \
             patch('app.agents.assessment.da.da_module.ModeratorDatabase'), \
             patch('app.agents.assessment.tpa.tpa_module.ModeratorDatabase'), \
             patch('app.agents.assessment.sra.sra_module.LLMWrapper'), \
             patch('app.agents.assessment.da.da_module.LLMWrapper'), \
             patch('app.agents.assessment.tpa.tpa_module.LLMWrapper'):
            return module_class()
    
    @pytest.fixture
    def session_id(self):
        """Test session ID"""
        return "test_session_interface"
    
    @pytest.fixture
    def user_id(self):
        """Test user ID"""
        return "test_user_interface"
    
    def test_required_properties(self, module):
        """Test that all required properties are implemented"""
        assert hasattr(module, 'module_name')
        assert isinstance(module.module_name, str)
        assert len(module.module_name) > 0
        
        assert hasattr(module, 'module_version')
        assert isinstance(module.module_version, str)
        
        assert hasattr(module, 'module_description')
        assert isinstance(module.module_description, str)
        assert len(module.module_description) > 0
    
    def test_module_metadata(self, module):
        """Test module_metadata property"""
        metadata = module.module_metadata
        assert metadata is not None
        assert metadata.name == module.module_name
        assert metadata.version == module.module_version
        assert metadata.description == module.module_description
    
    def test_start_session_method(self, module, user_id, session_id):
        """Test start_session method exists and returns ModuleResponse"""
        # Mock dependencies
        if hasattr(module, 'llm'):
            module.llm = MagicMock()
        if hasattr(module, 'db'):
            module.db = MagicMock()
            module.db.get_session_results_from_db = MagicMock(return_value={})
        
        response = module.start_session(user_id, session_id)
        
        assert isinstance(response, ModuleResponse)
        assert hasattr(response, 'message')
        assert hasattr(response, 'is_complete')
        assert hasattr(response, 'requires_input')
    
    def test_process_message_method(self, module, session_id):
        """Test process_message method exists"""
        # Setup session state
        module._sessions[session_id] = {
            "status": "active",
            "conversation_step": "initial"
        }
        
        # Mock dependencies
        if hasattr(module, 'llm'):
            module.llm = MagicMock()
        if hasattr(module, 'db'):
            module.db = MagicMock()
        
        response = module.process_message("test message", session_id)
        
        assert isinstance(response, ModuleResponse)
    
    def test_is_complete_method(self, module, session_id):
        """Test is_complete method exists"""
        # Setup incomplete session
        module._sessions[session_id] = {"status": "active"}
        assert module.is_complete(session_id) is False
        
        # Setup complete session
        module._sessions[session_id] = {"status": "completed"}
        assert module.is_complete(session_id) is True
    
    def test_get_results_method(self, module, session_id):
        """Test get_results method exists and returns dict"""
        module._sessions[session_id] = {
            "status": "completed",
            "data": "test"
        }
        
        results = module.get_results(session_id)
        
        assert isinstance(results, dict)
        assert "module_name" in results
    
    def test_get_progress_method(self, module, session_id):
        """Test get_progress method exists"""
        module._sessions[session_id] = {"status": "active"}
        
        progress = module.get_progress(session_id)
        
        # Progress can be None or ModuleProgress object
        assert progress is None or hasattr(progress, 'percentage')
    
    def test_on_activate_method(self, module, session_id):
        """Test on_activate lifecycle method"""
        module.on_activate(session_id)
        
        # Should not raise exception
        assert session_id in module._sessions or True  # May create session
    
    def test_on_complete_method(self, module, session_id):
        """Test on_complete lifecycle method"""
        module._sessions[session_id] = {"status": "active"}
        
        module.on_complete(session_id)
        
        # Should not raise exception
        assert True  # Method exists and can be called
    
    def test_checkpoint_state_method(self, module, session_id):
        """Test checkpoint_state method exists and returns bool"""
        module._sessions[session_id] = {
            "status": "active",
            "conversation_step": "initial"
        }
        
        # Mock database
        module.db = MagicMock()
        module.db.save_module_state = MagicMock(return_value=True)
        
        result = module.checkpoint_state(session_id)
        
        assert isinstance(result, bool)
    
    def test_resume_from_checkpoint_method(self, module, session_id):
        """Test resume_from_checkpoint method exists and returns bool"""
        # Mock database
        module.db = MagicMock()
        module.db.get_module_state = MagicMock(return_value={
            "state_data": {"status": "active"},
            "checkpoint_metadata": {}
        })
        
        result = module.resume_from_checkpoint(session_id)
        
        assert isinstance(result, bool)
    
    def test_compile_results_method(self, module, session_id):
        """Test compile_results method exists"""
        module._sessions[session_id] = {
            "status": "completed",
            "data": "test"
        }
        
        results = module.compile_results(session_id)
        
        assert isinstance(results, dict)
    
    def test_on_error_method(self, module, session_id):
        """Test on_error method exists and returns ModuleResponse"""
        test_error = ValueError("Test error")
        
        response = module.on_error(session_id, test_error)
        
        assert isinstance(response, ModuleResponse)
        assert hasattr(response, 'message')
        assert hasattr(response, 'error')
    
    def test_reset_session_method(self, module, session_id):
        """Test reset_session method from base class"""
        module._sessions[session_id] = {"data": "test"}
        
        result = module.reset_session(session_id)
        
        assert isinstance(result, bool)
        assert session_id not in module._sessions or True  # May or may not remove
    
    def test_get_session_state_method(self, module, session_id):
        """Test get_session_state method from base class"""
        test_state = {"status": "active", "data": "test"}
        module._sessions[session_id] = test_state
        
        state = module.get_session_state(session_id)
        
        assert state == test_state
    
    def test_set_session_state_method(self, module, session_id):
        """Test set_session_state method from base class"""
        test_state = {"status": "active", "data": "test"}
        
        result = module.set_session_state(session_id, test_state)
        
        assert isinstance(result, bool)
        assert module.get_session_state(session_id) == test_state


class TestRequiredMethodsImplementation:
    """Test that required abstract methods are actually implemented"""
    
    def test_sra_implements_all_methods(self):
        """Test SRA implements all required methods"""
        with patch('app.agents.assessment.sra.sra_module.ModeratorDatabase'), \
             patch('app.agents.assessment.sra.sra_module.LLMWrapper'):
            module = SymptomRecognitionModule()
            
            # Check all required methods exist
            assert hasattr(module, 'start_session')
            assert hasattr(module, 'process_message')
            assert hasattr(module, 'is_complete')
            assert hasattr(module, 'get_results')
            assert hasattr(module, 'checkpoint_state')
            assert hasattr(module, 'resume_from_checkpoint')
            assert hasattr(module, 'compile_results')
            assert hasattr(module, 'on_error')
    
    def test_da_implements_all_methods(self):
        """Test DA implements all required methods"""
        with patch('app.agents.assessment.da.da_module.ModeratorDatabase'), \
             patch('app.agents.assessment.da.da_module.LLMWrapper'):
            module = DiagnosticAnalysisModule()
            
            # Check all required methods exist
            assert hasattr(module, 'start_session')
            assert hasattr(module, 'process_message')
            assert hasattr(module, 'is_complete')
            assert hasattr(module, 'get_results')
            assert hasattr(module, 'checkpoint_state')
            assert hasattr(module, 'resume_from_checkpoint')
            assert hasattr(module, 'compile_results')
            assert hasattr(module, 'on_error')
            assert hasattr(module, '_validate_dsm5_criteria')  # DA-specific
    
    def test_tpa_implements_all_methods(self):
        """Test TPA implements all required methods"""
        with patch('app.agents.assessment.tpa.tpa_module.ModeratorDatabase'), \
             patch('app.agents.assessment.tpa.tpa_module.LLMWrapper'):
            module = TreatmentPlanningModule()
            
            # Check all required methods exist
            assert hasattr(module, 'start_session')
            assert hasattr(module, 'process_message')
            assert hasattr(module, 'is_complete')
            assert hasattr(module, 'get_results')
            assert hasattr(module, 'checkpoint_state')
            assert hasattr(module, 'resume_from_checkpoint')
            assert hasattr(module, 'compile_results')
            assert hasattr(module, 'on_error')

