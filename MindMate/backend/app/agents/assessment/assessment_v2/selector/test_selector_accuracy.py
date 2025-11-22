#!/usr/bin/env python3
"""
Comprehensive Test Suite for Selector Accuracy
===============================================

Tests the accuracy and decision-making logic of both selectors:
1. SCID-SC Items Selector
2. SCID-CV Module Selector

Evaluates:
- Selection accuracy
- Decision-making logic
- Edge case handling
- Fallback mechanisms
"""

import sys
import os
import uuid
import json
from pathlib import Path
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass

# Add backend to path
backend_path = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(backend_path))

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Color codes
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.HEADER}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{'='*80}{Colors.ENDC}\n")

def print_success(text: str):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_error(text: str):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_warning(text: str):
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def print_info(text: str):
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")


# ============================================================================
# TEST CASES - Known Clinical Scenarios
# ============================================================================

@dataclass
class TestCase:
    """Test case with expected outcomes"""
    name: str
    demographics: Dict[str, Any]
    presenting_concern: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    scid_sc_responses: Dict[str, Any]
    expected_scid_sc_items: List[str]  # Expected item IDs
    expected_modules: List[str]  # Expected module IDs
    description: str


TEST_CASES = [
    TestCase(
        name="Major Depression",
        demographics={"age": 35, "gender": "Female"},
        presenting_concern={
            "primary_concern": "feeling sad and hopeless for 3 months",
            "severity": "moderate",
            "symptom_description": "persistent sadness, loss of interest, fatigue"
        },
        risk_assessment={"risk_level": "low", "suicide_ideation": False},
        scid_sc_responses={"positive_screens": ["MDD_01", "MDD_02"]},
        expected_scid_sc_items=["MDD_01", "MDD_02", "MDD_03"],
        expected_modules=["MDD"],
        description="Classic depression case - should select MDD items and module"
    ),
    TestCase(
        name="Anxiety with Panic",
        demographics={"age": 28, "gender": "Male"},
        presenting_concern={
            "primary_concern": "anxiety and panic attacks",
            "severity": "severe",
            "symptom_description": "frequent panic attacks, constant worry, restlessness"
        },
        risk_assessment={"risk_level": "low"},
        scid_sc_responses={"positive_screens": ["PAN_01", "GAD_01"]},
        expected_scid_sc_items=["PAN_01", "GAD_01", "GAD_02"],
        expected_modules=["PANIC", "GAD"],
        description="Anxiety with panic - should select both panic and GAD modules"
    ),
    TestCase(
        name="High Risk - Suicide Ideation",
        demographics={"age": 42, "gender": "Male"},
        presenting_concern={
            "primary_concern": "depression and thoughts of suicide",
            "severity": "severe"
        },
        risk_assessment={
            "risk_level": "high",
            "suicide_ideation": True,
            "past_attempts": True
        },
        scid_sc_responses={"positive_screens": ["MDD_01", "SUI_01"]},
        expected_scid_sc_items=["SUI_01", "SUI_02", "MDD_01"],
        expected_modules=["MDD"],  # Risk assessment should prioritize safety
        description="High risk case - should prioritize risk items"
    ),
    TestCase(
        name="Bipolar Disorder",
        demographics={"age": 30, "gender": "Female"},
        presenting_concern={
            "primary_concern": "mood swings, periods of high energy",
            "severity": "moderate"
        },
        risk_assessment={"risk_level": "low"},
        scid_sc_responses={"positive_screens": ["MAN_01", "MDD_01"]},
        expected_scid_sc_items=["MAN_01", "MAN_02", "MDD_01"],
        expected_modules=["BIPOLAR"],
        description="Bipolar indicators - should select bipolar module"
    ),
    TestCase(
        name="PTSD",
        demographics={"age": 45, "gender": "Male"},
        presenting_concern={
            "primary_concern": "flashbacks and nightmares after accident",
            "severity": "moderate"
        },
        risk_assessment={"risk_level": "low"},
        scid_sc_responses={"positive_screens": ["PTS_01", "PTS_02"]},
        expected_scid_sc_items=["PTS_01", "PTS_02"],
        expected_modules=["PTSD"],
        description="Trauma case - should select PTSD module"
    ),
    TestCase(
        name="Minimal Data",
        demographics={},
        presenting_concern={},
        risk_assessment={},
        scid_sc_responses={},
        expected_scid_sc_items=[],  # Should handle gracefully
        expected_modules=[],  # Should handle gracefully
        description="Empty data - should not crash, return empty or defaults"
    ),
]


# ============================================================================
# ACCURACY METRICS
# ============================================================================

def calculate_precision(selected: List[str], expected: List[str]) -> float:
    """Calculate precision: true positives / (true positives + false positives)"""
    if not selected:
        return 0.0 if expected else 1.0
    
    true_positives = len(set(selected) & set(expected))
    false_positives = len(set(selected) - set(expected))
    
    if true_positives + false_positives == 0:
        return 1.0
    
    return true_positives / (true_positives + false_positives)


def calculate_recall(selected: List[str], expected: List[str]) -> float:
    """Calculate recall: true positives / (true positives + false negatives)"""
    if not expected:
        return 1.0 if not selected else 0.0
    
    true_positives = len(set(selected) & set(expected))
    false_negatives = len(set(expected) - set(selected))
    
    if true_positives + false_negatives == 0:
        return 1.0
    
    return true_positives / (true_positives + false_negatives)


def calculate_f1_score(precision: float, recall: float) -> float:
    """Calculate F1 score"""
    if precision + recall == 0:
        return 0.0
    return 2 * (precision * recall) / (precision + recall)


# ============================================================================
# TEST FUNCTIONS
# ============================================================================

def create_test_session(test_case: TestCase) -> str:
    """Create a test session with test case data"""
    from app.agents.assessment.assessment_v2.moderator import AssessmentModerator
    from app.agents.assessment.assessment_v2.database import ModeratorDatabase
    
    user_id = f"test_user_{uuid.uuid4().hex[:8]}"
    session_id = f"test_session_{uuid.uuid4().hex[:8]}"
    
    moderator = AssessmentModerator()
    moderator.start_assessment(user_id=user_id, session_id=session_id)
    
    db = ModeratorDatabase()
    
    # Store all test data
    db.store_module_data(
        session_id=session_id,
        patient_id=None,
        module_name="demographics",
        data_type="demographics",
        data_content=test_case.demographics,
        data_summary="Test demographics"
    )
    
    db.store_module_data(
        session_id=session_id,
        patient_id=None,
        module_name="presenting_concern",
        data_type="presenting_concern",
        data_content=test_case.presenting_concern,
        data_summary="Test presenting concern"
    )
    
    db.store_module_data(
        session_id=session_id,
        patient_id=None,
        module_name="risk_assessment",
        data_type="risk_assessment",
        data_content=test_case.risk_assessment,
        data_summary="Test risk assessment"
    )
    
    db.store_module_data(
        session_id=session_id,
        patient_id=None,
        module_name="scid_screening",
        data_type="scid_screening",
        data_content=test_case.scid_sc_responses,
        data_summary="Test SCID-SC responses"
    )
    
    return session_id


def test_scid_sc_selector_accuracy():
    """Test SCID-SC selector accuracy across test cases"""
    print_header("SCID-SC Items Selector Accuracy Test")
    
    from app.agents.assessment.assessment_v2.selector.scid_sc_selector import (
        SCID_SC_ItemsSelector
    )
    
    selector = SCID_SC_ItemsSelector()
    results = []
    
    for test_case in TEST_CASES:
        print_info(f"\nTest Case: {test_case.name}")
        print_info(f"Description: {test_case.description}")
        
        try:
            # Create test session
            session_id = create_test_session(test_case)
            
            # Select items
            selected_items = selector.select_scid_items(session_id, max_items=5)
            selected_ids = [item.item_id for item in selected_items]
            
            # Calculate metrics
            precision = calculate_precision(selected_ids, test_case.expected_scid_sc_items)
            recall = calculate_recall(selected_ids, test_case.expected_scid_sc_items)
            f1 = calculate_f1_score(precision, recall)
            
            # Store results
            results.append({
                "test_case": test_case.name,
                "selected": selected_ids,
                "expected": test_case.expected_scid_sc_items,
                "precision": precision,
                "recall": recall,
                "f1": f1
            })
            
            # Print results
            print_info(f"Selected: {selected_ids}")
            print_info(f"Expected: {test_case.expected_scid_sc_items}")
            print_info(f"Precision: {precision:.2f}, Recall: {recall:.2f}, F1: {f1:.2f}")
            
            if f1 >= 0.7:
                print_success(f"Good accuracy (F1 >= 0.7)")
            elif f1 >= 0.5:
                print_warning(f"Moderate accuracy (F1 >= 0.5)")
            else:
                print_error(f"Low accuracy (F1 < 0.5)")
                
        except Exception as e:
            print_error(f"Test case failed: {e}")
            import traceback
            traceback.print_exc()
            results.append({
                "test_case": test_case.name,
                "error": str(e)
            })
    
    # Summary
    print_header("SCID-SC Selector Summary")
    valid_results = [r for r in results if "error" not in r]
    if valid_results:
        avg_precision = sum(r["precision"] for r in valid_results) / len(valid_results)
        avg_recall = sum(r["recall"] for r in valid_results) / len(valid_results)
        avg_f1 = sum(r["f1"] for r in valid_results) / len(valid_results)
        
        print_info(f"Average Precision: {avg_precision:.2f}")
        print_info(f"Average Recall: {avg_recall:.2f}")
        print_info(f"Average F1 Score: {avg_f1:.2f}")
        
        if avg_f1 >= 0.7:
            print_success("Overall: Good accuracy")
        elif avg_f1 >= 0.5:
            print_warning("Overall: Moderate accuracy - needs improvement")
        else:
            print_error("Overall: Low accuracy - significant improvement needed")
    
    return results


def test_module_selector_accuracy():
    """Test SCID-CV module selector accuracy"""
    print_header("SCID-CV Module Selector Accuracy Test")
    
    from app.agents.assessment.assessment_v2.selector.module_selector import (
        SCID_CV_ModuleSelector,
        AssessmentDataCollection
    )
    
    selector = SCID_CV_ModuleSelector(use_llm=True)
    results = []
    
    for test_case in TEST_CASES:
        print_info(f"\nTest Case: {test_case.name}")
        print_info(f"Description: {test_case.description}")
        
        try:
            # Create assessment data
            assessment_data = AssessmentDataCollection(
                demographics=test_case.demographics,
                presenting_concern=test_case.presenting_concern,
                risk_assessment=test_case.risk_assessment,
                scid_sc_responses=test_case.scid_sc_responses,
                session_metadata={}
            )
            
            # Select modules
            selection_result = selector.select_modules(assessment_data, max_modules=3)
            selected_ids = [m.module_id for m in selection_result.selected_modules]
            
            # Calculate metrics
            precision = calculate_precision(selected_ids, test_case.expected_modules)
            recall = calculate_recall(selected_ids, test_case.expected_modules)
            f1 = calculate_f1_score(precision, recall)
            
            # Store results
            results.append({
                "test_case": test_case.name,
                "selected": selected_ids,
                "expected": test_case.expected_modules,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "reasoning": selection_result.reasoning_steps[-1].content if selection_result.reasoning_steps else ""
            })
            
            # Print results
            print_info(f"Selected: {selected_ids}")
            print_info(f"Expected: {test_case.expected_modules}")
            print_info(f"Precision: {precision:.2f}, Recall: {recall:.2f}, F1: {f1:.2f}")
            
            if f1 >= 0.7:
                print_success(f"Good accuracy (F1 >= 0.7)")
            elif f1 >= 0.5:
                print_warning(f"Moderate accuracy (F1 >= 0.5)")
            else:
                print_error(f"Low accuracy (F1 < 0.5)")
                
        except Exception as e:
            print_error(f"Test case failed: {e}")
            import traceback
            traceback.print_exc()
            results.append({
                "test_case": test_case.name,
                "error": str(e)
            })
    
    # Summary
    print_header("Module Selector Summary")
    valid_results = [r for r in results if "error" not in r]
    if valid_results:
        avg_precision = sum(r["precision"] for r in valid_results) / len(valid_results)
        avg_recall = sum(r["recall"] for r in valid_results) / len(valid_results)
        avg_f1 = sum(r["f1"] for r in valid_results) / len(valid_results)
        
        print_info(f"Average Precision: {avg_precision:.2f}")
        print_info(f"Average Recall: {avg_recall:.2f}")
        print_info(f"Average F1 Score: {avg_f1:.2f}")
        
        if avg_f1 >= 0.7:
            print_success("Overall: Good accuracy")
        elif avg_f1 >= 0.5:
            print_warning("Overall: Moderate accuracy - needs improvement")
        else:
            print_error("Overall: Low accuracy - significant improvement needed")
    
    return results


def test_fallback_mechanisms():
    """Test fallback mechanisms when LLM fails"""
    print_header("Fallback Mechanism Test")
    
    from app.agents.assessment.assessment_v2.selector.scid_sc_selector import (
        SCID_SC_ItemsSelector,
        AssessmentDataSummary
    )
    
    selector = SCID_SC_ItemsSelector()
    
    # Test rule-based fallback
    test_data = AssessmentDataSummary(
        demographics={"age": 30, "gender": "Female"},
        presenting_concern={
            "primary_concern": "feeling sad and depressed",
            "severity": "moderate"
        },
        risk_assessment={"risk_level": "low"},
        session_metadata={}
    )
    
    print_info("Testing rule-based selection (LLM unavailable)...")
    rule_items = selector._rule_based_selection(test_data, max_items=5)
    
    if rule_items:
        print_success(f"Rule-based selection returned {len(rule_items)} items")
        print_info(f"Items: {[item.item_id for item in rule_items]}")
    else:
        print_warning("Rule-based selection returned no items")
    
    return len(rule_items) > 0


def run_all_tests():
    """Run all accuracy tests"""
    print_header("Selector Accuracy Test Suite")
    
    results = {
        "scid_sc": test_scid_sc_selector_accuracy(),
        "module_selector": test_module_selector_accuracy(),
        "fallback": test_fallback_mechanisms()
    }
    
    print_header("Final Summary")
    print_info("All tests completed. Review results above for accuracy metrics.")
    
    return results


if __name__ == "__main__":
    run_all_tests()

