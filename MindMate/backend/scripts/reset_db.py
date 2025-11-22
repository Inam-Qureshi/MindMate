# reset_db.py
# WARNING: This will delete ALL existing data and migration history!
# Only use in development environments.

import sys
from pathlib import Path

from sqlalchemy import text

# Ensure backend package is on PYTHONPATH when executed as a module
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app.db.session import engine  # noqa: E402  (import after sys.path tweak)
from app.models import Base  # noqa: E402

with engine.connect() as conn:
    # 1) Drop the entire schema (removes all tables, indexes, constraints, *and* alembic_version)
    conn.execute(text("DROP SCHEMA public CASCADE"))
    conn.execute(text("CREATE SCHEMA public"))
    conn.commit()

print("Database schema dropped and recreated successfully!")

# 2) Recreate all tables + indexes defined in ORM models
Base.metadata.create_all(bind=engine)
print("All tables recreated successfully!")

# 3) Ensure Alembic version table is also reset (empty)
with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS alembic_version (
            version_num VARCHAR(32) NOT NULL
        )
    """))
    conn.commit()

print("Alembic version table reset successfully! (Empty, ready for migrations)")
