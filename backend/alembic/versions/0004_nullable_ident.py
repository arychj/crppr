"""make ident nullable (ghosts)

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Allow NULL idents — many ghosts can coexist, but non-null must remain unique.
    # SQLite and PostgreSQL both treat NULLs as distinct for UNIQUE constraints,
    # so the existing column-level unique constraint already permits multiple NULLs.
    with op.batch_alter_table("items") as batch_op:
        batch_op.alter_column("ident", existing_type=sa.String(64), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("items") as batch_op:
        batch_op.alter_column("ident", existing_type=sa.String(64), nullable=False)
