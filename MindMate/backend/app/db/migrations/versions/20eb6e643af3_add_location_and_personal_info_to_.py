"""add_location_and_personal_info_to_questionnaire

Revision ID: 20eb6e643af3
Revises: 96a9b54e42b8
Create Date: 2025-11-14 09:42:33.321012

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision: str = '20eb6e643af3'
down_revision: Union[str, Sequence[str], None] = '96a9b54e42b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add location information columns with defaults
    op.add_column('mandatory_questionnaires', sa.Column('city', sa.String(100), nullable=True, server_default='Unknown'))
    op.add_column('mandatory_questionnaires', sa.Column('country', sa.String(100), nullable=True, server_default='Unknown'))

    # Add personal information columns with defaults
    op.add_column('mandatory_questionnaires', sa.Column('marital_status', sa.String(50), nullable=True, server_default='Not specified'))
    op.add_column('mandatory_questionnaires', sa.Column('occupation', sa.String(100), nullable=True, server_default='Not specified'))
    op.add_column('mandatory_questionnaires', sa.Column('education', sa.String(100), nullable=True, server_default='Not specified'))
    op.add_column('mandatory_questionnaires', sa.Column('employment_status', sa.String(50), nullable=True, server_default='Not specified'))

    # Update existing rows with default values
    op.execute("UPDATE mandatory_questionnaires SET city = 'Unknown' WHERE city IS NULL")
    op.execute("UPDATE mandatory_questionnaires SET country = 'Unknown' WHERE country IS NULL")
    op.execute("UPDATE mandatory_questionnaires SET marital_status = 'Not specified' WHERE marital_status IS NULL")
    op.execute("UPDATE mandatory_questionnaires SET occupation = 'Not specified' WHERE occupation IS NULL")
    op.execute("UPDATE mandatory_questionnaires SET education = 'Not specified' WHERE education IS NULL")
    op.execute("UPDATE mandatory_questionnaires SET employment_status = 'Not specified' WHERE employment_status IS NULL")

    # Now make columns NOT NULL
    op.alter_column('mandatory_questionnaires', 'city', nullable=False)
    op.alter_column('mandatory_questionnaires', 'country', nullable=False)
    op.alter_column('mandatory_questionnaires', 'marital_status', nullable=False)
    op.alter_column('mandatory_questionnaires', 'occupation', nullable=False)
    op.alter_column('mandatory_questionnaires', 'education', nullable=False)
    op.alter_column('mandatory_questionnaires', 'employment_status', nullable=False)


def downgrade() -> None:
    # Remove personal information columns
    op.drop_column('mandatory_questionnaires', 'employment_status')
    op.drop_column('mandatory_questionnaires', 'education')
    op.drop_column('mandatory_questionnaires', 'occupation')
    op.drop_column('mandatory_questionnaires', 'marital_status')

    # Remove location information columns
    op.drop_column('mandatory_questionnaires', 'country')
    op.drop_column('mandatory_questionnaires', 'city')

