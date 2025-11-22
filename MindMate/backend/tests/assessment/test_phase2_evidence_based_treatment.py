"""
Phase 2 Task 2.1: Tests for Evidence-Based Treatment Selection in TPA Module

Tests verify that TPA module uses evidence-based treatment guidelines.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.agents.assessment.tpa.tpa_module import TreatmentPlanningModule


class TestEvidenceBasedTreatment:
    """Test evidence-based treatment selection"""
    
    @pytest.fixture
    def module(self):
        """Create TPA module with mocked dependencies"""
        with patch('app.agents.assessment.tpa.tpa_module.ModeratorDatabase'), \
             patch('app.agents.assessment.tpa.tpa_module.LLMWrapper'):
            return TreatmentPlanningModule()
    
    @pytest.fixture
    def session_id(self):
        return "test_tpa_session"
    
    def test_treatment_plan_includes_evidence_level(self, module, session_id):
        """Test that treatment plan includes evidence level"""
        module._sessions[session_id] = {
            "previous_results": {
                "da_diagnostic_analysis": {
                    "primary_diagnosis": {"name": "Major Depressive Disorder"}
                }
            }
        }
        
        # Mock LLM response with evidence level
        module.llm = MagicMock()
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.content = '''{
            "primary_intervention": {
                "name": "Cognitive Behavioral Therapy",
                "type": "psychotherapy",
                "evidence_level": "strong"
            },
            "evidence_sources": ["NICE guidelines", "APA guidelines"]
        }'''
        module.llm.generate_response.return_value = mock_response
        
        module.db = MagicMock()
        module.db.get_session_results_from_db = MagicMock(return_value={})
        
        plan = module._generate_treatment_plan(session_id)
        
        assert plan is not None
        assert "primary_intervention" in plan
        assert "evidence_level" in plan["primary_intervention"]
        assert plan["primary_intervention"]["evidence_level"] in ["strong", "moderate", "limited"]
    
    def test_treatment_plan_includes_evidence_sources(self, module, session_id):
        """Test that treatment plan includes evidence sources"""
        module._sessions[session_id] = {
            "previous_results": {
                "da_diagnostic_analysis": {
                    "primary_diagnosis": {"name": "Major Depressive Disorder"}
                }
            }
        }
        
        # Mock LLM response
        module.llm = MagicMock()
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.content = '''{
            "primary_intervention": {"name": "CBT"},
            "evidence_sources": ["NICE guidelines", "Cochrane Review"]
        }'''
        module.llm.generate_response.return_value = mock_response
        
        module.db = MagicMock()
        module.db.get_session_results_from_db = MagicMock(return_value={})
        
        plan = module._generate_treatment_plan(session_id)
        
        assert plan is not None
        assert "evidence_sources" in plan
        assert isinstance(plan["evidence_sources"], list)
        assert len(plan["evidence_sources"]) > 0
    
    def test_llm_prompt_includes_guidelines(self, module, session_id):
        """Test that LLM prompt references clinical guidelines"""
        module._sessions[session_id] = {
            "previous_results": {
                "da_diagnostic_analysis": {
                    "primary_diagnosis": {"name": "Major Depressive Disorder"}
                }
            }
        }
        
        module.llm = MagicMock()
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.content = '{"primary_intervention": {"name": "CBT"}}'
        module.llm.generate_response.return_value = mock_response
        
        module.db = MagicMock()
        module.db.get_session_results_from_db = MagicMock(return_value={})
        
        plan = module._generate_treatment_plan(session_id)
        
        # Verify LLM was called with guideline references
        assert module.llm.generate_response.called
        call_args = module.llm.generate_response.call_args
        system_prompt = call_args[1].get('system_prompt', '') or call_args[0][1] if len(call_args[0]) > 1 else ''
        
        # Check for guideline references in prompt
        prompt_text = system_prompt + (call_args[0][0] if call_args[0] else '')
        assert "NICE" in prompt_text or "APA" in prompt_text or "Cochrane" in prompt_text or "evidence-based" in prompt_text.lower()
    
    def test_default_evidence_level_assigned(self, module, session_id):
        """Test that default evidence level is assigned if missing"""
        module._sessions[session_id] = {
            "previous_results": {
                "da_diagnostic_analysis": {
                    "primary_diagnosis": {"name": "Major Depressive Disorder"}
                }
            }
        }
        
        # Mock LLM response without evidence_level
        module.llm = MagicMock()
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.content = '{"primary_intervention": {"name": "CBT", "type": "psychotherapy"}}'
        module.llm.generate_response.return_value = mock_response
        
        module.db = MagicMock()
        module.db.get_session_results_from_db = MagicMock(return_value={})
        
        plan = module._generate_treatment_plan(session_id)
        
        assert plan is not None
        assert "primary_intervention" in plan
        assert "evidence_level" in plan["primary_intervention"]
        assert plan["primary_intervention"]["evidence_level"] == "moderate"  # Default
    
    def test_evidence_sources_default(self, module, session_id):
        """Test that evidence sources default to clinical guidelines"""
        module._sessions[session_id] = {
            "previous_results": {
                "da_diagnostic_analysis": {
                    "primary_diagnosis": {"name": "Major Depressive Disorder"}
                }
            }
        }
        
        # Mock LLM response without evidence_sources
        module.llm = MagicMock()
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.content = '{"primary_intervention": {"name": "CBT"}}'
        module.llm.generate_response.return_value = mock_response
        
        module.db = MagicMock()
        module.db.get_session_results_from_db = MagicMock(return_value={})
        
        plan = module._generate_treatment_plan(session_id)
        
        assert plan is not None
        assert "evidence_sources" in plan
        assert isinstance(plan["evidence_sources"], list)
        assert len(plan["evidence_sources"]) > 0
        assert "Clinical practice guidelines" in plan["evidence_sources"] or "guidelines" in str(plan["evidence_sources"]).lower()

