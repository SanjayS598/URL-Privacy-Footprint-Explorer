#!/usr/bin/env python3
# Quick verification script to check that all Python code is valid.
# Run this to ensure there are no syntax errors in the API code.

import sys
from pathlib import Path

def check_imports():
    # Test importing all API modules.
    print("Checking API modules...\n")
    
    modules = [
        ('config', 'Configuration'),
        ('database', 'Database connection'),
        ('models', 'SQLAlchemy models'),
        ('schemas', 'Pydantic schemas'),
        ('tasks', 'Celery tasks'),
        ('main', 'FastAPI application'),
    ]
    
    errors = []
    
    for module_name, description in modules:
        try:
            __import__(module_name)
            print(f"[OK] {description} ({module_name}.py)")
        except Exception as e:
            errors.append(f"[ERROR] {description} ({module_name}.py): {str(e)}")
            print(f"[ERROR] {description} ({module_name}.py)")
            print(f"  Error: {str(e)}")
    
    print("\n" + "="*60)
    
    if errors:
        print(f"\nFound {len(errors)} error(s):\n")
        for error in errors:
            print(f"  {error}")
        return False
    else:
        print("\nAll modules are valid! API skeleton is complete.")
        print("\nNext steps:")
        print("  1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/")
        print("  2. Install Node.js: https://nodejs.org/")
        print("  3. Run: cd infra && docker compose up -d")
        print("  4. Test: curl http://localhost:8000/health")
        return True


if __name__ == "__main__":
    # Make sure we're in the right directory
    api_dir = Path(__file__).parent
    if not (api_dir / "main.py").exists():
        print("Error: Run this script from the apps/api directory")
        sys.exit(1)
    
    success = check_imports()
    sys.exit(0 if success else 1)
