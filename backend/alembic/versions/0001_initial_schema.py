"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-02-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "items",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("ident", sa.String(64), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("parent_id", sa.Integer, sa.ForeignKey("items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("address", sa.String(1024), nullable=False, server_default="", index=True),
        sa.Column("is_container", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_items_address_pattern", "items", ["address"])

    op.create_table(
        "metadata_attributes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), unique=True, nullable=False),
        sa.Column("datatype", sa.String(50), nullable=False, server_default="text"),
    )

    op.create_table(
        "settings",
        sa.Column("key", sa.String(255), primary_key=True),
        sa.Column("value", sa.Text, nullable=True),
    )

    op.create_table(
        "metadata_values",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("item_id", sa.Integer, sa.ForeignKey("items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attribute_id", sa.Integer, sa.ForeignKey("metadata_attributes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("value", sa.Text, nullable=True),
    )
    op.create_index("ix_metadata_values_item_attr", "metadata_values", ["item_id", "attribute_id"], unique=True)


def downgrade() -> None:
    op.drop_table("metadata_values")
    op.drop_table("settings")
    op.drop_table("metadata_attributes")
    op.drop_table("items")
