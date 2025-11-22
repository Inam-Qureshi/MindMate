"""add_missing_appointment_status_enum_values

Revision ID: 1d11971cce1e
Revises: a47af0a8b38a
Create Date: 2025-11-21 23:22:29.014045

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision: str = '1d11971cce1e'
down_revision: Union[str, Sequence[str], None] = 'a47af0a8b38a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing enum values to appointmentstatusenum."""
    # Add missing enum values to the existing enum type
    # The Python enum uses lowercase values, so we add them in lowercase
    # Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction block in PostgreSQL < 12
    # For PostgreSQL 12+, we can use IF NOT EXISTS to make it idempotent
    # Alembic will handle the transaction management
    op.execute("ALTER TYPE appointmentstatusenum ADD VALUE IF NOT EXISTS 'pending_approval'")
    op.execute("ALTER TYPE appointmentstatusenum ADD VALUE IF NOT EXISTS 'approved'")
    op.execute("ALTER TYPE appointmentstatusenum ADD VALUE IF NOT EXISTS 'rejected'")
    op.execute("ALTER TYPE appointmentstatusenum ADD VALUE IF NOT EXISTS 'in_session'")
    op.execute("ALTER TYPE appointmentstatusenum ADD VALUE IF NOT EXISTS 'reviewed'")


def downgrade() -> None:
    """Remove the added enum values."""
    # Note: PostgreSQL does not support removing enum values directly
    # This would require recreating the enum type, which is complex and risky
    # For now, we'll leave a comment that manual intervention may be needed
    # In practice, you would need to:
    # 1. Create a new enum without these values
    # 2. Update all columns to use the new enum
    # 3. Drop the old enum
    # This is not implemented as it's too risky for a downgrade
    pass

