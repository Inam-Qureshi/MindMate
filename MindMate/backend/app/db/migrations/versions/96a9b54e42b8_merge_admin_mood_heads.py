"""merge_admin_mood_heads

Revision ID: 96a9b54e42b8
Revises: 7b2f2c89e5dd, add_approval_timeline
Create Date: 2025-11-13 16:42:39.364240

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision: str = '96a9b54e42b8'
down_revision: Union[str, Sequence[str], None] = ('7b2f2c89e5dd', 'add_approval_timeline')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

