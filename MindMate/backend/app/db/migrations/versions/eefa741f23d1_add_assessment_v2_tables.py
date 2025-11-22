"""add assessment v2 tables

Revision ID: eefa741f23d1
Revises: 20eb6e643af3
Create Date: 2025-11-14 13:33:25.228821

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'eefa741f23d1'
down_revision: Union[str, Sequence[str], None] = '20eb6e643af3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create initial_information table to store mandatory questionnaire data
    op.create_table(
        'initial_information',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=False),
        sa.Column('full_name', sa.Text(), nullable=True),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('gender', sa.String(length=50), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('marital_status', sa.String(length=100), nullable=True),
        sa.Column('occupation', sa.String(length=150), nullable=True),
        sa.Column('education', sa.String(length=150), nullable=True),
        sa.Column('employment_status', sa.String(length=150), nullable=True),
        sa.Column('chief_complaint', sa.Text(), nullable=True),
        sa.Column('past_psychiatric_diagnosis', sa.Text(), nullable=True),
        sa.Column('past_psychiatric_treatment', sa.Text(), nullable=True),
        sa.Column('hospitalizations', sa.Text(), nullable=True),
        sa.Column('medical_conditions', sa.Text(), nullable=True),
        sa.Column('medications', sa.Text(), nullable=True),
        sa.Column('alcohol_use', sa.Text(), nullable=True),
        sa.Column('drug_use', sa.Text(), nullable=True),
        sa.Column('smoking_status', sa.Text(), nullable=True),
        sa.Column('suicidal_ideation', sa.Text(), nullable=True),
        sa.Column('self_harm', sa.Text(), nullable=True),
        sa.Column('harm_to_others', sa.Text(), nullable=True),
        sa.Column('current_safety', sa.Text(), nullable=True),
        sa.Column('emergency_contact', sa.Text(), nullable=True),
        sa.Column('preferred_language', sa.String(length=100), nullable=True),
        sa.Column('additional_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_initial_information_user_id', 'initial_information', ['user_id'])
    op.create_index('ix_initial_information_created_at', 'initial_information', ['created_at'])

    # Create assessment_sessions_v2 table to persist LangGraph sessions
    op.create_table(
        'assessment_sessions_v2',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=False),
        sa.Column('session_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_assessment_sessions_v2_user_id', 'assessment_sessions_v2', ['user_id'])
    op.create_index('ix_assessment_sessions_v2_status', 'assessment_sessions_v2', ['status'])
    op.create_index('ix_assessment_sessions_v2_updated_at', 'assessment_sessions_v2', ['updated_at'])


def downgrade() -> None:
    op.drop_index('ix_assessment_sessions_v2_updated_at', table_name='assessment_sessions_v2')
    op.drop_index('ix_assessment_sessions_v2_status', table_name='assessment_sessions_v2')
    op.drop_index('ix_assessment_sessions_v2_user_id', table_name='assessment_sessions_v2')
    op.drop_table('assessment_sessions_v2')

    op.drop_index('ix_initial_information_created_at', table_name='initial_information')
    op.drop_index('ix_initial_information_user_id', table_name='initial_information')
    op.drop_table('initial_information')

