"""add_forum_question_specialist_support

Revision ID: add_forum_question_specialist_support
Revises: 1893b77224a3
Create Date: 2025-10-10 15:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_forum_specialist'
down_revision = '9294fdf6e9a0'
branch_labels = None
depends_on = None


def upgrade():
    """Add specialist support to forum questions"""
    
    # Add specialist_id column
    op.add_column('forum_questions', sa.Column('specialist_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Add author_name column
    op.add_column('forum_questions', sa.Column('author_name', sa.String(length=200), nullable=True))
    
    # Add foreign key constraint for specialist_id
    op.create_foreign_key('fk_forum_questions_specialist_id', 'forum_questions', 'specialists', ['specialist_id'], ['id'])
    
    # Add index for specialist_id
    op.create_index('idx_forum_question_specialist', 'forum_questions', ['specialist_id'])
    
    # Make patient_id nullable (since now either patient_id or specialist_id can be set)
    op.alter_column('forum_questions', 'patient_id', nullable=True)


def downgrade():
    """Remove specialist support from forum questions"""
    
    # Remove foreign key constraint
    op.drop_constraint('fk_forum_questions_specialist_id', 'forum_questions', type_='foreignkey')
    
    # Remove index
    op.drop_index('idx_forum_question_specialist', 'forum_questions')
    
    # Remove columns
    op.drop_column('forum_questions', 'specialist_id')
    op.drop_column('forum_questions', 'author_name')
    
    # Make patient_id not nullable again
    op.alter_column('forum_questions', 'patient_id', nullable=False)
