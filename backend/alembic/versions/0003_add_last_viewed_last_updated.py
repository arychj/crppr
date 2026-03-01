"""add last_viewed and last_updated to items

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "items",
        sa.Column("last_viewed", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "items",
        sa.Column("last_updated", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("items", "last_updated")
    op.drop_column("items", "last_viewed")
