"""
Pytest configuration and fixtures for assessment tests
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


@pytest.fixture(scope="session", autouse=True)
def mock_database():
    """Mock database connections to speed up tests.

    Some newer tests only import the Assessment v2 stack which does not expose the
    legacy modules referenced below. When those modules are absent we silently
    skip patching so the fixture does not crash the entire test session.
    """
    patch_targets = [
        'app.agents.assessment.sra.sra_module.ModeratorDatabase',
        'app.agents.assessment.da.da_module.ModeratorDatabase',
        'app.agents.assessment.tpa.tpa_module.ModeratorDatabase',
    ]

    active_patches = []
    mock_instances = []

    for target in patch_targets:
        patcher = patch(target)
        try:
            mock_db = patcher.start()
        except (ModuleNotFoundError, AttributeError, ImportError):
            # Module not available in the current test context; skip patching.
            continue

        mock_instance = MagicMock()
        mock_instance.save_module_state.return_value = True
        mock_instance.get_module_state.return_value = None
        mock_db.return_value = mock_instance

        active_patches.append(patcher)
        mock_instances.append(mock_instance)

    yield mock_instances

    for patcher in active_patches:
        patcher.stop()


@pytest.fixture(scope="session", autouse=True)
def mock_llm():
    """Mock LLM calls to speed up tests."""
    patch_targets = [
        'app.agents.assessment.sra.sra_module.LLMWrapper',
        'app.agents.assessment.da.da_module.LLMWrapper',
        'app.agents.assessment.tpa.tpa_module.LLMWrapper',
    ]

    active_patches = []
    mock_instances = []

    for target in patch_targets:
        patcher = patch(target)
        try:
            mock_llm_class = patcher.start()
        except (ModuleNotFoundError, AttributeError, ImportError):
            continue

        mock_llm_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.content = '{"symptoms": [{"symptom_name": "Test", "description": "Test symptom"}]}'
        mock_response.error = None
        mock_llm_instance.generate_response.return_value = mock_response
        mock_llm_class.return_value = mock_llm_instance

        active_patches.append(patcher)
        mock_instances.append(mock_llm_instance)

    yield mock_instances

    for patcher in active_patches:
        patcher.stop()


@pytest.fixture
def mock_llm_for_da():
    """Mock LLM for DA module"""
    with patch('app.agents.assessment.da.da_module.LLMWrapper') as mock_llm_class:
        mock_llm_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.content = '{"primary_diagnosis": {"name": "Test Diagnosis"}, "confidence": 0.8}'
        mock_llm_instance.generate_response.return_value = mock_response
        mock_llm_class.return_value = mock_llm_instance
        yield mock_llm_instance


@pytest.fixture
def mock_llm_for_tpa():
    """Mock LLM for TPA module"""
    with patch('app.agents.assessment.tpa.tpa_module.LLMWrapper') as mock_llm_class:
        mock_llm_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.success = True
        mock_response.content = '{"primary_intervention": {"name": "CBT"}, "reasoning": "Test"}'
        mock_llm_instance.generate_response.return_value = mock_response
        mock_llm_class.return_value = mock_llm_instance
        yield mock_llm_instance

