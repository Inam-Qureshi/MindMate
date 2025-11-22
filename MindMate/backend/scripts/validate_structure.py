"""
Validation script to test the restructured backend.
Checks imports, configuration, and basic functionality.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_core_imports():
    """Test core module imports."""
    print("Testing core imports...")
    try:
        from app.core.config import settings
        print(f"  ✅ Config imported successfully")
        print(f"     App: {settings.APP_NAME} v{settings.APP_VERSION}")
        return True
    except Exception as e:
        print(f"  ❌ Config import failed: {e}")
        return False


def test_db_imports():
    """Test database module imports."""
    print("Testing database imports...")
    try:
        from app.db.session import get_db, Base, engine
        print(f"  ✅ Database session imported successfully")
        return True
    except Exception as e:
        print(f"  ❌ Database import failed: {e}")
        return False


def test_model_imports():
    """Test model imports."""
    print("Testing model imports...")
    try:
        from app.models import Patient, Specialists, Admin, Base
        print(f"  ✅ Models imported successfully")
        return True
    except Exception as e:
        print(f"  ❌ Model import failed: {e}")
        return False


def test_schema_imports():
    """Test schema imports."""
    print("Testing schema imports...")
    try:
        # Just test that the schemas module exists
        import app.schemas
        print(f"  ✅ Schemas module exists")
        return True
    except Exception as e:
        print(f"  ❌ Schema import failed: {e}")
        return False


def test_api_imports():
    """Test API imports."""
    print("Testing API imports...")
    try:
        from app.api.v1.router import router
        print(f"  ✅ API router imported successfully")
        return True
    except Exception as e:
        print(f"  ❌ API import failed: {e}")
        return False


def test_main_app():
    """Test main application import."""
    print("Testing main application...")
    try:
        from app.main import app
        print(f"  ✅ Main application imported successfully")
        return True
    except Exception as e:
        print(f"  ❌ Main app import failed: {e}")
        return False


def main():
    """Run all validation tests."""
    print("=" * 60)
    print("MindMate Backend Validation Script")
    print("=" * 60)
    print()
    
    tests = [
        test_core_imports,
        test_db_imports,
        test_model_imports,
        test_schema_imports,
        test_api_imports,
        test_main_app,
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"  ❌ Test crashed: {e}")
            results.append(False)
        print()
    
    # Summary
    print("=" * 60)
    print("📊 Validation Summary")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("\n✅ All validation tests passed!")
        print("The restructured backend is ready to use.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        print("Please review the errors above and fix any import issues.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

