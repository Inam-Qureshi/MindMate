"""add_assessment_module_tables

Revision ID: f1a2b3c4d5e6
Revises: ebb9e18786d5
Create Date: 2025-10-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'ebb9e18786d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    def _table_exists(table_name: str) -> bool:
        return sa.inspect(bind).has_table(table_name)

    def _existing_indexes(table_name: str) -> set[str]:
        return {index["name"] for index in sa.inspect(bind).get_indexes(table_name)}

    def _create_index_if_missing(table_name: str, index_name: str, columns: list[str], unique: bool = False):
        if index_name not in _existing_indexes(table_name):
            op.create_index(index_name, table_name, columns, unique=unique)

    # assessment_sessions
    if 'assessment_sessions' not in existing_tables:
        op.create_table(
            'assessment_sessions',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True),
            sa.Column('session_id', sa.String(length=100), nullable=False),
            sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('user_id', sa.String(length=100), nullable=False),
            sa.Column('current_module', sa.String(length=100), nullable=True),
            sa.Column('module_history', postgresql.ARRAY(sa.String()), nullable=True),
            sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('is_complete', sa.Boolean(), nullable=False),
            sa.Column('session_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('session_id')
        )
    if _table_exists('assessment_sessions'):
        _create_index_if_missing('assessment_sessions', 'idx_assessment_sessions_patient', ['patient_id'])
        _create_index_if_missing('assessment_sessions', 'idx_assessment_sessions_patient_active', ['patient_id', 'is_complete'])
        _create_index_if_missing('assessment_sessions', 'idx_assessment_sessions_session_id', ['session_id'])
        _create_index_if_missing('assessment_sessions', 'idx_assessment_sessions_updated', ['updated_at'])
        _create_index_if_missing('assessment_sessions', 'idx_assessment_sessions_user', ['user_id'])
        _create_index_if_missing('assessment_sessions', 'idx_assessment_sessions_complete', ['is_complete'])

    # assessment_module_states
    if 'assessment_module_states' not in existing_tables:
        op.create_table(
            'assessment_module_states',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True),
            sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('module_name', sa.String(length=100), nullable=False),
            sa.Column('state_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column('created_at_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('updated_at_time', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['session_id'], ['assessment_sessions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
    if _table_exists('assessment_module_states'):
        _create_index_if_missing('assessment_module_states', 'idx_module_states_patient', ['patient_id'])
        _create_index_if_missing('assessment_module_states', 'idx_module_states_session', ['session_id'])
        _create_index_if_missing('assessment_module_states', 'idx_module_states_session_module', ['session_id', 'module_name'], unique=True)
        _create_index_if_missing('assessment_module_states', 'idx_module_states_updated', ['updated_at_time'])
        _create_index_if_missing('assessment_module_states', 'idx_module_states_module', ['module_name'])

    # assessment_module_results
    if 'assessment_module_results' not in existing_tables:
        op.create_table(
            'assessment_module_results',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True),
            sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('module_name', sa.String(length=100), nullable=False),
            sa.Column('results_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column('completed_at_time', sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['session_id'], ['assessment_sessions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
    if _table_exists('assessment_module_results'):
        _create_index_if_missing('assessment_module_results', 'idx_module_results_completed', ['completed_at_time'])
        _create_index_if_missing('assessment_module_results', 'idx_module_results_patient', ['patient_id'])
        _create_index_if_missing('assessment_module_results', 'idx_module_results_patient_module', ['patient_id', 'module_name'])
        _create_index_if_missing('assessment_module_results', 'idx_module_results_session', ['session_id'])
        _create_index_if_missing('assessment_module_results', 'idx_module_results_session_module', ['session_id', 'module_name'], unique=True)

    # assessment_conversations
    if 'assessment_conversations' not in existing_tables:
        op.create_table(
            'assessment_conversations',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True),
            sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('module_name', sa.String(length=100), nullable=True),
            sa.Column('role', sa.String(length=20), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
            sa.Column('message_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.CheckConstraint("role IN ('user', 'assistant', 'system')", name='check_conversation_role'),
            sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['session_id'], ['assessment_sessions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
    if _table_exists('assessment_conversations'):
        _create_index_if_missing('assessment_conversations', 'idx_conversations_module', ['module_name'])
        _create_index_if_missing('assessment_conversations', 'idx_conversations_patient', ['patient_id'])
        _create_index_if_missing('assessment_conversations', 'idx_conversations_patient_timestamp', ['patient_id', 'timestamp'])
        _create_index_if_missing('assessment_conversations', 'idx_conversations_session_timestamp', ['session_id', 'timestamp'])
        _create_index_if_missing('assessment_conversations', 'idx_conversations_timestamp', ['timestamp'])
        _create_index_if_missing('assessment_conversations', 'idx_conversations_role', ['role'])

    # assessment_module_transitions
    if 'assessment_module_transitions' not in existing_tables:
        op.create_table(
            'assessment_module_transitions',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True),
            sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('from_module', sa.String(length=100), nullable=True),
            sa.Column('to_module', sa.String(length=100), nullable=False),
            sa.Column('transitioned_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('transition_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['session_id'], ['assessment_sessions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
    if _table_exists('assessment_module_transitions'):
        _create_index_if_missing('assessment_module_transitions', 'idx_transitions_modules', ['from_module', 'to_module'])
        _create_index_if_missing('assessment_module_transitions', 'idx_transitions_patient', ['patient_id'])
        _create_index_if_missing('assessment_module_transitions', 'idx_transitions_session', ['session_id'])
        _create_index_if_missing('assessment_module_transitions', 'idx_transitions_timestamp', ['transitioned_at'])

    # assessment_demographics
    if 'assessment_demographics' not in existing_tables:
        op.create_table(
            'assessment_demographics',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), nullable=True),
            sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('age', sa.Integer(), nullable=True),
            sa.Column('gender', sa.String(length=50), nullable=True),
            sa.Column('education_level', sa.String(length=100), nullable=True),
            sa.Column('occupation', sa.String(length=100), nullable=True),
            sa.Column('marital_status', sa.String(length=50), nullable=True),
            sa.Column('cultural_background', sa.String(length=200), nullable=True),
            sa.Column('location', sa.String(length=200), nullable=True),
            sa.Column('family_psychiatric_conditions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('living_situation', sa.String(length=50), nullable=True),
            sa.Column('financial_status', sa.String(length=50), nullable=True),
            sa.Column('recent_stressors', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('collected_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at_demographics', sa.DateTime(timezone=True), nullable=True),
            sa.CheckConstraint('age >= 18 AND age <= 120'),
            sa.CheckConstraint("gender IN ('Male', 'Female', 'Non-binary', 'Prefer not to say')"),
            sa.CheckConstraint("education_level IN ('No formal education', 'Primary school', 'High school', 'Bachelor''s degree', 'Master''s degree', 'Doctorate')"),
            sa.CheckConstraint("occupation IN ('Student', 'Employed full-time', 'Employed part-time', 'Self-employed', 'Unemployed', 'Retired')"),
            sa.CheckConstraint("marital_status IN ('Single', 'Married', 'Divorced', 'Widowed', 'Separated')"),
            sa.CheckConstraint("living_situation IN ('alone', 'with_family', 'with_partner', 'shared', 'institutionalized')"),
            sa.CheckConstraint("financial_status IN ('stable', 'moderate', 'unstable')"),
            sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['session_id'], ['assessment_sessions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('patient_id')
        )
    if _table_exists('assessment_demographics'):
        _create_index_if_missing('assessment_demographics', 'idx_demographics_collected', ['collected_at'])
        _create_index_if_missing('assessment_demographics', 'idx_demographics_patient', ['patient_id'])
        _create_index_if_missing('assessment_demographics', 'idx_demographics_session', ['session_id'])


def downgrade():
    # Drop tables in reverse order
    op.drop_index('idx_demographics_session', table_name='assessment_demographics')
    op.drop_index('idx_demographics_patient', table_name='assessment_demographics')
    op.drop_index('idx_demographics_collected', table_name='assessment_demographics')
    op.drop_table('assessment_demographics')
    
    op.drop_index('idx_transitions_timestamp', table_name='assessment_module_transitions')
    op.drop_index('idx_transitions_session', table_name='assessment_module_transitions')
    op.drop_index('idx_transitions_patient', table_name='assessment_module_transitions')
    op.drop_index('idx_transitions_modules', table_name='assessment_module_transitions')
    op.drop_table('assessment_module_transitions')
    
    op.drop_index('idx_conversations_role', table_name='assessment_conversations')
    op.drop_index('idx_conversations_timestamp', table_name='assessment_conversations')
    op.drop_index('idx_conversations_session_timestamp', table_name='assessment_conversations')
    op.drop_index('idx_conversations_patient_timestamp', table_name='assessment_conversations')
    op.drop_index('idx_conversations_patient', table_name='assessment_conversations')
    op.drop_index('idx_conversations_module', table_name='assessment_conversations')
    op.drop_table('assessment_conversations')
    
    op.drop_index('idx_module_results_session_module', table_name='assessment_module_results')
    op.drop_index('idx_module_results_session', table_name='assessment_module_results')
    op.drop_index('idx_module_results_patient_module', table_name='assessment_module_results')
    op.drop_index('idx_module_results_patient', table_name='assessment_module_results')
    op.drop_index('idx_module_results_completed', table_name='assessment_module_results')
    op.drop_table('assessment_module_results')
    
    op.drop_index('idx_module_states_module', table_name='assessment_module_states')
    op.drop_index('idx_module_states_updated', table_name='assessment_module_states')
    op.drop_index('idx_module_states_session_module', table_name='assessment_module_states')
    op.drop_index('idx_module_states_session', table_name='assessment_module_states')
    op.drop_index('idx_module_states_patient', table_name='assessment_module_states')
    op.drop_table('assessment_module_states')
    
    op.drop_index('idx_assessment_sessions_complete', table_name='assessment_sessions')
    op.drop_index('idx_assessment_sessions_user', table_name='assessment_sessions')
    op.drop_index('idx_assessment_sessions_updated', table_name='assessment_sessions')
    op.drop_index('idx_assessment_sessions_session_id', table_name='assessment_sessions')
    op.drop_index('idx_assessment_sessions_patient_active', table_name='assessment_sessions')
    op.drop_index('idx_assessment_sessions_patient', table_name='assessment_sessions')
    op.drop_table('assessment_sessions')

