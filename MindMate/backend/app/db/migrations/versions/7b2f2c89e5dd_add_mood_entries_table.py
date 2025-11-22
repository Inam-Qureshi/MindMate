"""add mood entries table

Revision ID: 7b2f2c89e5dd
Revises: 3c9a5d0db1a0
Create Date: 2025-11-12 11:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "7b2f2c89e5dd"
down_revision: Union[str, None] = "3c9a5d0db1a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create mood_entries table if absent."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("mood_entries"):
        op.create_table(
            "mood_entries",
            sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("entry_date", sa.Date(), nullable=False),
            sa.Column("mood_score", sa.Numeric(precision=4, scale=2), nullable=False),
            sa.Column("energy_level", sa.Numeric(precision=4, scale=2), nullable=False),
            sa.Column("stress_level", sa.Numeric(precision=4, scale=2), nullable=False),
            sa.Column("sleep_quality", sa.Numeric(precision=4, scale=2), nullable=False),
            sa.Column("motivation_level", sa.Numeric(precision=4, scale=2), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column("created_by", sa.String(length=100), nullable=True),
            sa.Column("updated_by", sa.String(length=100), nullable=True),
            sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.ForeignKeyConstraint(
                ["patient_id"], ["patients.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("patient_id", "entry_date", name="uq_mood_entry_patient_date"),
        )
        inspector = sa.inspect(bind)

    if inspector.has_table("mood_entries"):
        existing_indexes = {index["name"] for index in inspector.get_indexes("mood_entries")}

        if "idx_mood_entry_patient_date" not in existing_indexes:
            op.create_index(
                "idx_mood_entry_patient_date",
                "mood_entries",
                ["patient_id", "entry_date"],
                unique=False,
            )

        if op.f("ix_mood_entries_entry_date") not in existing_indexes:
            op.create_index(
                op.f("ix_mood_entries_entry_date"),
                "mood_entries",
                ["entry_date"],
                unique=False,
            )


def downgrade() -> None:
    """Drop mood_entries table."""
    if sa.inspect(op.get_bind()).has_table("mood_entries"):
        op.drop_index(op.f("ix_mood_entries_entry_date"), table_name="mood_entries")
        op.drop_index("idx_mood_entry_patient_date", table_name="mood_entries")
        op.drop_table("mood_entries")

