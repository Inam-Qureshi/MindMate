"""
Test script for response parsing and mapping from free text
Tests various edge cases and improves parsing logic
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../')))

from app.agents.assessment.assessment_v2.base_types import SCIDQuestion, ResponseType
from app.agents.assessment.assessment_v2.deployer.scid_cv_deployer import SCID_CV_ModuleDeployer
from app.agents.assessment.assessment_v2.utils.question_utils import ResponseParser

# Test cases for Risk Assessment yes/no questions
TEST_CASES = [
    # Standard responses
    ("yes", "yes", True),
    ("no", "no", True),
    ("y", "yes", True),
    ("n", "no", True),
    
    # Variations
    ("yeah", "yes", True),
    ("yep", "yes", True),
    ("nope", "no", True),
    ("nah", "no", True),
    ("sure", "yes", True),
    ("definitely", "yes", True),
    ("absolutely", "yes", True),
    ("never", "no", True),
    ("not really", "no", True),
    ("not at all", "no", True),
    
    # Full sentences
    ("yes, I have", "yes", True),
    ("no, I haven't", "no", True),
    ("yes I do", "yes", True),
    ("no I don't", "no", True),
    ("I have not", "no", True),
    ("I do not", "no", True),
    ("I don't", "no", True),
    ("I haven't", "no", True),
    ("I am not", "no", True),
    ("I'm not", "no", True),
    ("I was not", "no", True),
    ("I wasn't", "no", True),
    
    # Edge cases from user conversation
    ("no way are you crazy", "no", True),  # Should parse as "no"
    ("no not tried", "no", True),
    ("no thoughts", "no", True),
    ("no way", "no", True),
    ("not really no", "no", True),
    ("definitely not", "no", True),
    ("absolutely not", "no", True),
    
    # Ambiguous cases
    ("maybe", None, False),  # Should ask for clarification
    ("not sure", None, False),
    ("I don't know", None, False),
    ("uncertain", None, False),
    
    # Mixed responses (should extract yes/no)
    ("yes sometimes", "yes", True),
    ("no never", "no", True),
    ("yes I have but not recently", "yes", True),
    ("no I haven't tried", "no", True),
    
    # Negative patterns
    ("I have no thoughts", "no", True),
    ("I don't have any", "no", True),
    ("I never had", "no", True),
    ("I haven't had any", "no", True),
    ("I don't think so", "no", True),
    ("I think not", "no", True),
    
    # Positive patterns with context
    ("I have had thoughts", "yes", True),
    ("I do feel that way", "yes", True),
    ("I am feeling that", "yes", True),
    ("I was feeling", "yes", True),
    ("I feel", "yes", True),  # Ambiguous but likely yes
    ("I felt", "yes", True),
    
    # Complex responses
    ("No, I have never tried to hurt myself", "no", True),
    ("Yes, I have thought about it", "yes", True),
    ("No way, that's crazy", "no", True),
    ("Not really, no", "no", True),
    ("Yes, sometimes", "yes", True),
    ("No, never", "no", True),
]

def test_yes_no_parsing():
    """Test yes/no parsing with various inputs"""
    print("=" * 80)
    print("Testing Yes/No Response Parsing")
    print("=" * 80)
    
    passed = 0
    failed = 0
    
    for response, expected, should_be_valid in TEST_CASES:
        parsed, is_valid = ResponseParser.parse_yes_no(response)
        
        if should_be_valid:
            if is_valid and parsed == expected:
                print(f"✅ PASS: '{response}' -> '{parsed}'")
                passed += 1
            else:
                print(f"❌ FAIL: '{response}' -> Expected '{expected}', got '{parsed}' (valid: {is_valid})")
                failed += 1
        else:
            if not is_valid:
                print(f"✅ PASS: '{response}' -> Correctly identified as ambiguous")
                passed += 1
            else:
                print(f"⚠️  WARN: '{response}' -> Parsed as '{parsed}' but should be ambiguous")
                failed += 1
    
    print("\n" + "=" * 80)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 80)
    
    return failed == 0

def test_deployer_validation():
    """Test the deployer's validation logic"""
    print("\n" + "=" * 80)
    print("Testing Deployer Validation Logic")
    print("=" * 80)
    
    # Create a test question
    question = SCIDQuestion(
        id="RISK_01",
        sequence_number=1,
        simple_text="Have you had any thoughts about wanting to hurt yourself?",
        response_type=ResponseType.YES_NO,
        priority=1
    )
    
    # Create deployer instance
    deployer = SCID_CV_ModuleDeployer()
    
    passed = 0
    failed = 0
    
    for response, expected, should_be_valid in TEST_CASES[:20]:  # Test first 20
        is_valid, parsed = deployer._validate_response(question, response)
        
        if should_be_valid:
            if is_valid and parsed == expected:
                print(f"✅ PASS: '{response}' -> '{parsed}'")
                passed += 1
            else:
                print(f"❌ FAIL: '{response}' -> Expected '{expected}', got '{parsed}' (valid: {is_valid})")
                failed += 1
        else:
            if not is_valid:
                print(f"✅ PASS: '{response}' -> Correctly identified as invalid")
                passed += 1
            else:
                print(f"⚠️  WARN: '{response}' -> Parsed as '{parsed}' but should be invalid")
                failed += 1
    
    print("\n" + "=" * 80)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 80)
    
    return failed == 0

if __name__ == "__main__":
    print("\n🧪 Testing Response Parsing and Mapping\n")
    
    test1 = test_yes_no_parsing()
    test2 = test_deployer_validation()
    
    if test1 and test2:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Review the output above.")
        sys.exit(1)

