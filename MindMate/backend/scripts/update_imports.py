"""
Script to update import statements throughout the codebase.
Converts old import paths to new restructured paths.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple

# Define import replacements
REPLACEMENTS: List[Tuple[str, str]] = [
    # Database imports
    (r'from database\.database import', r'from app.db.session import'),
    
    # Core imports
    (r'from core\.config import', r'from app.core.config import'),
    
    # Model imports - SQL models (old path with sql_models directory)
    (r'from models\.sql_models\.(\w+)_models import', r'from app.models.\1 import'),
    (r'from models\.sql_models\.(\w+) import', r'from app.models.\1 import'),
    (r'from models\.sql_models import', r'from app.models import'),
    
    # Model imports - general
    (r'from models\.(\w+)_models import', r'from app.models.\1 import'),
    (r'from models import', r'from app.models import'),
    
    # Schema imports - Pydantic models (old path with pydantic_models directory)
    (r'from models\.pydantic_models\.(\w+)_schemas import', r'from app.schemas.\1 import'),
    (r'from models\.pydantic_models\.(\w+)_pydantic_models import', r'from app.schemas.\1 import'),
    (r'from models\.pydantic_models\.(\w+) import', r'from app.schemas.\1 import'),
    
    # Schema imports - general
    (r'from schemas\.(\w+)_schemas import', r'from app.schemas.\1 import'),
    (r'from schemas import', r'from app.schemas import'),
    
    # Service imports
    (r'from services\.', r'from app.services.'),
    
    # Utility imports
    (r'from utils\.', r'from app.utils.'),
    
    # Router imports (now endpoints)
    (r'from routers\.', r'from app.api.v1.endpoints.'),
    
    # Agent imports
    (r'from agents\.', r'from app.agents.'),
    
    # Assessment imports
    (r'from assessment\.', r'from app.agents.assessment.'),
]


def update_imports_in_file(filepath: Path) -> bool:
    """
    Update imports in a single file.
    
    Args:
        filepath: Path to the file to update
        
    Returns:
        True if file was modified, False otherwise
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return False
    
    original = content
    
    # Apply all replacements
    for pattern, replacement in REPLACEMENTS:
        content = re.sub(pattern, replacement, content)
    
    # Check if content was modified
    if content != original:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Error writing {filepath}: {e}")
            return False
    
    return False


def update_all_imports(directory: str = 'app') -> None:
    """
    Update imports in all Python files.
    
    Args:
        directory: Root directory to search for Python files
    """
    updated_count = 0
    total_files = 0
    
    root_path = Path(directory)
    
    if not root_path.exists():
        print(f"❌ Directory {directory} does not exist")
        return
    
    print(f"🔍 Scanning {directory} for Python files...")
    
    # Walk through directory
    for root, dirs, files in os.walk(root_path):
        # Skip __pycache__ and other cache directories
        dirs[:] = [d for d in dirs if d not in ['__pycache__', '.pytest_cache', '.mypy_cache']]
        
        for file in files:
            if file.endswith('.py'):
                total_files += 1
                filepath = Path(root) / file
                
                if update_imports_in_file(filepath):
                    updated_count += 1
                    print(f"✅ Updated: {filepath}")
    
    print(f"\n{'='*60}")
    print(f"📊 Summary:")
    print(f"  Total Python files: {total_files}")
    print(f"  Files updated: {updated_count}")
    print(f"  Files unchanged: {total_files - updated_count}")
    print(f"{'='*60}\n")
    
    if updated_count > 0:
        print("✅ Import updates completed successfully!")
    else:
        print("ℹ️  No files needed updating")


if __name__ == "__main__":
    import sys
    
    # Get directory from command line or use default
    directory = sys.argv[1] if len(sys.argv) > 1 else 'app'
    
    print("=" * 60)
    print("MindMate Import Update Script")
    print("=" * 60)
    print()
    
    update_all_imports(directory)

