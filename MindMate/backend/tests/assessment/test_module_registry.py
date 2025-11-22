"""
Tests for module registry and configuration
"""

import pytest
import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.agents.assessment.config import (
    MODULE_REGISTRY,
    get_module_config,
    ASSESSMENT_FLOW
)


class TestModuleRegistry:
    """Test module registry configuration"""
    
    def test_registry_contains_agent_modules(self):
        """Test that registry contains SRA, DA, TPA modules"""
        assert "sra_symptom_recognition" in MODULE_REGISTRY
        assert "da_diagnostic_analysis" in MODULE_REGISTRY
        assert "tpa_treatment_planning" in MODULE_REGISTRY
    
    def test_sra_module_config(self):
        """Test SRA module configuration"""
        config = MODULE_REGISTRY["sra_symptom_recognition"]
        assert config.name == "sra_symptom_recognition"
        assert "SymptomRecognitionModule" in config.class_path
        assert config.enabled == True
        assert config.priority == 6
        assert config.metadata.get("agent_type") == "internal"
    
    def test_da_module_config(self):
        """Test DA module configuration"""
        config = MODULE_REGISTRY["da_diagnostic_analysis"]
        assert config.name == "da_diagnostic_analysis"
        assert "DiagnosticAnalysisModule" in config.class_path
        assert config.enabled == True
        assert config.priority == 7
        assert config.metadata.get("agent_type") == "internal"
    
    def test_tpa_module_config(self):
        """Test TPA module configuration"""
        config = MODULE_REGISTRY["tpa_treatment_planning"]
        assert config.name == "tpa_treatment_planning"
        assert "TreatmentPlanningModule" in config.class_path
        assert config.enabled == True
        assert config.priority == 8
        assert config.metadata.get("agent_type") == "internal"
    
    def test_no_external_api_urls(self):
        """Test that agent modules don't have external API URLs"""
        sra_config = MODULE_REGISTRY["sra_symptom_recognition"]
        da_config = MODULE_REGISTRY["da_diagnostic_analysis"]
        tpa_config = MODULE_REGISTRY["tpa_treatment_planning"]
        
        assert "api_url" not in sra_config.metadata
        assert "endpoint" not in sra_config.metadata
        assert "api_url" not in da_config.metadata
        assert "endpoint" not in da_config.metadata
        assert "api_url" not in tpa_config.metadata
        assert "endpoint" not in tpa_config.metadata
    
    def test_module_dependencies(self):
        """Test module dependencies are correct"""
        sra_config = MODULE_REGISTRY["sra_symptom_recognition"]
        da_config = MODULE_REGISTRY["da_diagnostic_analysis"]
        tpa_config = MODULE_REGISTRY["tpa_treatment_planning"]
        
        assert "scid_cv_diagnostic" in sra_config.dependencies
        assert "sra_symptom_recognition" in da_config.dependencies
        assert "da_diagnostic_analysis" in tpa_config.dependencies
    
    def test_assessment_flow_includes_agents(self):
        """Test that assessment flow includes agent modules"""
        default_sequence = ASSESSMENT_FLOW["default_sequence"]
        assert "sra_symptom_recognition" in default_sequence
        assert "da_diagnostic_analysis" in default_sequence
        assert "tpa_treatment_planning" in default_sequence
    
    def test_get_module_config(self):
        """Test get_module_config helper"""
        sra_config = get_module_config("sra_symptom_recognition")
        assert sra_config is not None
        assert sra_config.name == "sra_symptom_recognition"
        
        da_config = get_module_config("da_diagnostic_analysis")
        assert da_config is not None
        assert da_config.name == "da_diagnostic_analysis"
        
        tpa_config = get_module_config("tpa_treatment_planning")
        assert tpa_config is not None
        assert tpa_config.name == "tpa_treatment_planning"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

