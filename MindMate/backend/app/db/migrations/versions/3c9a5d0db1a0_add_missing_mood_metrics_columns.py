"""Add missing PRD mood metric columns.

Revision ID: 3c9a5d0db1a0
Revises: f1a2b3c4d5e6
Create Date: 2025-11-12 09:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "3c9a5d0db1a0"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


TABLE_NAME = "mood_assessments"


def _get_existing_columns():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {col["name"] for col in inspector.get_columns(TABLE_NAME)}


def upgrade() -> None:
    """Upgrade schema by adding missing PRD mood metric columns."""
    existing_columns = _get_existing_columns()

    if "mood_score" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("mood_score", sa.Numeric(precision=3, scale=2), nullable=True),
        )

    if "intensity_level" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("intensity_level", sa.Numeric(precision=3, scale=2), nullable=True),
        )

    if "energy_index" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("energy_index", sa.Numeric(precision=3, scale=2), nullable=True),
        )

    if "trigger_index" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("trigger_index", sa.Numeric(precision=3, scale=2), nullable=True),
        )

    if "coping_effectiveness" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column(
                "coping_effectiveness",
                sa.Numeric(precision=3, scale=2),
                nullable=True,
            ),
        )

    if "msi" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("msi", sa.Numeric(precision=3, scale=2), nullable=True),
        )

    if "dominant_emotions" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column(
                "dominant_emotions",
                postgresql.ARRAY(sa.String()),
                nullable=True,
            ),
        )

    if "summary" not in existing_columns:
        op.add_column(TABLE_NAME, sa.Column("summary", sa.Text(), nullable=True))

    if "positive_triggers" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column(
                "positive_triggers",
                postgresql.ARRAY(sa.String()),
                nullable=True,
            ),
        )

    if "negative_triggers" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column(
                "negative_triggers",
                postgresql.ARRAY(sa.String()),
                nullable=True,
            ),
        )

    if "reasoning" not in existing_columns:
        op.add_column(TABLE_NAME, sa.Column("reasoning", sa.Text(), nullable=True))

    if "llm_summary" not in existing_columns:
        op.add_column(TABLE_NAME, sa.Column("llm_summary", sa.Text(), nullable=True))

    if "responses" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("responses", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        )

    if "assessment_type" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column(
                "assessment_type",
                sa.String(length=50),
                nullable=False,
                server_default=sa.text("'conversational'"),
            ),
        )

    if "completed" not in existing_columns:
        op.add_column(
            TABLE_NAME,
            sa.Column(
                "completed",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
        )


def downgrade() -> None:
    """Downgrade schema by removing PRD mood metric columns."""
    existing_columns = _get_existing_columns()

    if "completed" in existing_columns:
        op.drop_column(TABLE_NAME, "completed")

    if "assessment_type" in existing_columns:
        op.drop_column(TABLE_NAME, "assessment_type")

    if "responses" in existing_columns:
        op.drop_column(TABLE_NAME, "responses")

    if "llm_summary" in existing_columns:
        op.drop_column(TABLE_NAME, "llm_summary")

    if "reasoning" in existing_columns:
        op.drop_column(TABLE_NAME, "reasoning")

    if "negative_triggers" in existing_columns:
        op.drop_column(TABLE_NAME, "negative_triggers")

    if "positive_triggers" in existing_columns:
        op.drop_column(TABLE_NAME, "positive_triggers")

    if "summary" in existing_columns:
        op.drop_column(TABLE_NAME, "summary")

    if "dominant_emotions" in existing_columns:
        op.drop_column(TABLE_NAME, "dominant_emotions")

    if "msi" in existing_columns:
        op.drop_column(TABLE_NAME, "msi")

    if "coping_effectiveness" in existing_columns:
        op.drop_column(TABLE_NAME, "coping_effectiveness")

    if "trigger_index" in existing_columns:
        op.drop_column(TABLE_NAME, "trigger_index")

    if "energy_index" in existing_columns:
        op.drop_column(TABLE_NAME, "energy_index")

    if "intensity_level" in existing_columns:
        op.drop_column(TABLE_NAME, "intensity_level")

    if "mood_score" in existing_columns:
        op.drop_column(TABLE_NAME, "mood_score")

