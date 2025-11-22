"""
Phase 2 Task 2.1: Tests for DSM-5 Criteria Validation in DA Module

Tests verify that DA module properly validates DSM-5 criteria.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.agents.assessment.da.da_module import DiagnosticAnalysisModule


class TestDSM5Validation:
    """Test DSM-5 criteria validation"""
    
    @pytest.fixture
    def module(self):
        """Create DA module with mocked dependencies"""
        with patch('app.agents.assessment.da.da_module.ModeratorDatabase'), \
             patch('app.agents.assessment.da.da_module.LLMWrapper'):
            return DiagnosticAnalysisModule()
    
    def test_validate_major_depressive_disorder(self, module):
        """Test validation for Major Depressive Disorder"""
        diagnosis_name = "Major Depressive Disorder"
        matched_criteria = [
            "depressed mood",
            "loss of interest",
            "sleep disturbance",
            "fatigue",
            "difficulty concentrating",
            "feelings of worthlessness"
        ]
        
        result = module._validate_dsm5_criteria(diagnosis_name, matched_criteria)
        
        assert result["is_valid"] is True
        assert result["criteria_count"] == 6
        assert len(result["missing_criteria"]) == 0
        assert "DSM-5 validation" in result["validation_notes"]
    
    def test_validate_mdd_insufficient_criteria(self, module):
        """Test validation fails when insufficient criteria"""
        diagnosis_name = "Major Depressive Disorder"
        matched_criteria = [
            "depressed mood",
            "loss of interest"
        ]
        
        result = module._validate_dsm5_criteria(diagnosis_name, matched_criteria)
        
        assert result["is_valid"] is False
        assert result["criteria_count"] == 2
        assert "5" in result["validation_notes"]  # Should mention min 5 criteria
    
    def test_validate_mdd_missing_required(self, module):
        """Test validation fails when required criteria missing"""
        diagnosis_name = "Major Depressive Disorder"
        matched_criteria = [
            "sleep disturbance",
            "fatigue",
            "difficulty concentrating",
            "feelings of worthlessness",
            "appetite changes"
        ]
        
        result = module._validate_dsm5_criteria(diagnosis_name, matched_criteria)
        
        assert result["is_valid"] is False
        assert len(result["missing_criteria"]) > 0  # Should flag missing required
    
    def test_validate_generalized_anxiety_disorder(self, module):
        """Test validation for Generalized Anxiety Disorder"""
        diagnosis_name = "Generalized Anxiety Disorder"
        matched_criteria = [
            "excessive anxiety",
            "difficulty controlling worry",
            "restlessness",
            "muscle tension"
        ]
        
        result = module._validate_dsm5_criteria(diagnosis_name, matched_criteria)
        
        assert result["is_valid"] is True
        assert result["criteria_count"] == 4
        assert len(result["missing_criteria"]) == 0
    
    def test_validate_gad_insufficient(self, module):
        """Test GAD validation with insufficient criteria"""
        diagnosis_name = "Generalized Anxiety Disorder"
        matched_criteria = [
            "excessive anxiety"
        ]
        
        result = module._validate_dsm5_criteria(diagnosis_name, matched_criteria)
        
        assert result["is_valid"] is False
        assert result["criteria_count"] == 1
    
    def test_validate_panic_disorder(self, module):
        """Test validation for Panic Disorder"""
        diagnosis_name = "Panic Disorder"
        matched_criteria = [
            "recurrent panic attacks",
            "persistent concern about attacks",
            "significant change in behavior",
            "attacks not due to substance"
        ]
        
        result = module._validate_dsm5_criteria(diagnosis_name, matched_criteria)
        
        assert result["is_valid"] is True
        assert result["criteria_count"] == 4
    
    def test_validate_unknown_diagnosis(self, module):
        """Test validation for unknown diagnosis (basic validation)"""
        diagnosis_name = "Unknown Diagnosis"
        matched_criteria = [
            "symptom 1",
            "symptom 2",
            "symptom 3"
        ]
        
        result = module._validate_dsm5_criteria(diagnosis_name, matched_criteria)
        
        assert isinstance(result["is_valid"], bool)
        assert result["criteria_count"] == 3
        assert "Basic criteria validation" in result["validation_notes"]
    
    def test_validate_empty_criteria(self, module):
        """Test validation with empty criteria list"""
        diagnosis_name = "Major Depressive Disorder"
        matched_criteria = []
        
        result = module._validate_dsm5_criteria(diagnosis_name, matched_criteria)
        
        assert result["is_valid"] is False
        assert result["criteria_count"] == 0
        assert len(result["missing_criteria"]) > 0
    
    def test_validation_integrated_in_diagnostic_analysis(self, module):
        """Test that validation is integrated into diagnostic analysis"""
        session_id = "test_session"
        
        # Setup module state
        module._sessions[session_id] = {
            "previous_results": {
                "sra_symptom_recognition": {
                    "final_symptoms": [{"symptom_name": "Depression"}]
                }
            }
        }
        
        # Mock LLM response with matched criteria
        module.llm = MagicMock()
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.content = '{"primary_diagnosis": {"name": "Major Depressive Disorder"}, "matched_criteria": ["depressed mood", "loss of interest", "sleep disturbance", "fatigue", "difficulty concentrating"], "confidence": 0.8}'
        module.llm.generate_response.return_value = mock_response
        
        # Mock database
        module.db = MagicMock()
        module.db.get_session_results_from_db = MagicMock(return_value={})
        
        result = module._perform_diagnostic_analysis(session_id)
        
        assert result is not None
        assert "primary_diagnosis" in result
        
        # Check if DSM-5 validation was applied
        primary_diag = result.get("primary_diagnosis", {})
        if "dsm5_validation" in primary_diag:
            validation = primary_diag["dsm5_validation"]
            assert "is_valid" in validation
            assert "criteria_count" in validation
            # Should have validation since we have 5+ criteria
            assert validation["criteria_count"] >= 5

