"""Add duration_minutes column to exercise_sessions

Revision ID: a47af0a8b38a
Revises: f3a493c3f4a9
Create Date: 2025-11-14 18:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a47af0a8b38a'
down_revision: Union[str, None] = 'f3a493c3f4a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add duration_minutes column for backwards compatibility."""
    op.add_column(
        'exercise_sessions',
        sa.Column('duration_minutes', sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    """Remove duration_minutes column."""
    op.drop_column('exercise_sessions', 'duration_minutes')


