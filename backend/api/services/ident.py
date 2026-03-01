"""
Ident generation service.

Given a numeric range [start, end] and a format ("dec" or "hex"),
find the first identifier in that range not already taken in the DB.
"""

from typing import Optional
from sqlalchemy.orm import Session

from ..models import Item


def _format_value(value: int, fmt: str, width: int = 0, prefix: str = "") -> str:
    raw = format(value, "X") if fmt == "hex" else str(value)
    if width > 0:
        pad = max(width - len(prefix) - len(raw), 0)
        return "0" * pad + raw
    return raw


def generate_range(start: int, end: int, fmt: str = "dec", width: int = 0, prefix: str = "") -> list[str]:
    """Return the full list of candidate ident strings."""
    return [_format_value(v, fmt, width, prefix) for v in range(start, end + 1)]


def next_available_ident(
    session: Session,
    start: int,
    end: int,
    fmt: str = "dec",
    prefix: str = "",
    width: int = 0,
) -> Optional[str]:
    """
    Generate the full list of strings in [start, end],
    query which are already taken, return the first free one.
    """
    candidates = [f"{prefix}{_format_value(v, fmt, width, prefix)}" for v in range(start, end + 1)]

    existing = set(
        row[0]
        for row in session.query(Item.ident).filter(Item.ident.in_(candidates)).all()
    )

    for candidate in candidates:
        if candidate not in existing:
            return candidate

    return None  # range exhausted
