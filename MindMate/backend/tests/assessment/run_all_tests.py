"""
Quick test runner for assessment modules
Run all tests and report results
"""

import subprocess
import sys

def run_tests():
    """Run all assessment tests"""
    test_files = [
        # Phase 1 Tests
        "test_database_operations.py",
        "test_module_workflows.py",
        # Phase 2 Tests
        "test_phase2_interface_compliance.py",
        "test_phase2_state_persistence.py",
        "test_phase2_conversational_flows.py",
        "test_phase2_dsm5_validation.py",
        "test_phase2_evidence_based_treatment.py",
        # Existing Module Tests
        "test_sra_module.py",
        "test_da_module.py",
        "test_tpa_module.py",
        "test_module_integration.py",
        "test_module_registry.py"
    ]
    
    results = {}
    
    for test_file in test_files:
        print(f"\n{'='*60}")
        print(f"Running {test_file}")
        print(f"{'='*60}")
        
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pytest", f"tests/assessment/{test_file}", "-v", "--tb=short", "-x"],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout per file
            )
            
            results[test_file] = {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "passed": result.returncode == 0
            }
            
            print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
            
        except subprocess.TimeoutExpired:
            results[test_file] = {
                "returncode": -1,
                "error": "Timeout",
                "passed": False
            }
            print(f"TIMEOUT: {test_file} took too long")
        except Exception as e:
            results[test_file] = {
                "returncode": -1,
                "error": str(e),
                "passed": False
            }
            print(f"ERROR: {test_file} - {e}")
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = sum(1 for r in results.values() if r.get("passed"))
    total = len(results)
    
    for test_file, result in results.items():
        status = "✓ PASSED" if result.get("passed") else "✗ FAILED"
        print(f"{status}: {test_file}")
        if not result.get("passed") and "error" in result:
            print(f"  Error: {result['error']}")
    
    print(f"\nTotal: {passed}/{total} test files passed")
    
    return passed == total


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

