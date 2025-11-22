import sys
import os

# Add the backend directory to the python path
sys.path.append(os.getcwd())

from app.db.session import engine
from sqlalchemy import inspect

def check_schema():
    print("Inspecting database schema...")
    inspector = inspect(engine)
    
    tables = ['patient_auth_info', 'specialists_auth_info', 'specialists_approval_data']
    
    for table in tables:
        print(f"\nColumns in {table}:")
        try:
            columns = inspector.get_columns(table)
            for c in columns:
                print(f"- {c['name']} ({c['type']})")
        except Exception as e:
            print(f"Error inspecting {table}: {e}")

if __name__ == "__main__":
    check_schema()
