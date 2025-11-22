"""add_missing_otp_columns_to_patient_auth_info

Revision ID: ecba55ec568f
Revises: add_forum_specialist
Create Date: 2025-10-13 09:02:12.830817

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ecba55ec568f'
down_revision: Union[str, None] = 'add_forum_specialist'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add missing OTP columns to patient_auth_info table
    op.add_column('patient_auth_info', sa.Column('otp_code', sa.String(6), nullable=True))
    op.add_column('patient_auth_info', sa.Column('otp_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('patient_auth_info', sa.Column('otp_last_request_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the added OTP columns from patient_auth_info table
    op.drop_column('patient_auth_info', 'otp_last_request_at')
    op.drop_column('patient_auth_info', 'otp_expires_at')
    op.drop_column('patient_auth_info', 'otp_code')
