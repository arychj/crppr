"""make name non-nullable

Revision ID: 0007
Revises: 0006
Create Date: 2026-03-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Backfill any rows with NULL name
    op.execute("UPDATE items SET name = '<unknown>' WHERE name IS NULL")

    with op.batch_alter_table("items") as batch_op:
        batch_op.alter_column("name", existing_type=sa.String(255), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("items") as batch_op:
        batch_op.alter_column("name", existing_type=sa.String(255), nullable=True)
