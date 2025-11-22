"""remove legacy personal fields from mandatory questionnaire

Revision ID: f3a493c3f4a9
Revises: eefa741f23d1
Create Date: 2025-11-14 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a493c3f4a9'
down_revision: Union[str, Sequence[str], None] = 'eefa741f23d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('mandatory_questionnaires', schema=None) as batch_op:
        batch_op.drop_column('full_name')
        batch_op.drop_column('gender')
        batch_op.drop_column('chief_complaint')


def downgrade() -> None:
    with op.batch_alter_table('mandatory_questionnaires', schema=None) as batch_op:
        batch_op.add_column(sa.Column('chief_complaint', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('gender', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('full_name', sa.String(length=200), nullable=True))

