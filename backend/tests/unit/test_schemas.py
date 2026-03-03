"""Unit tests for Pydantic schemas (validation logic)."""

import pytest
from pydantic import ValidationError

from api.schemas import (
    ItemCreate,
    ItemUpdate,
    IdentRequest,
    MetadataValueCreate,
    MoveRequest,
    MetadataAttributeReorder,
)


# ── ItemCreate ───────────────────────────────────────────────────────


def test_item_create_defaults():
    item = ItemCreate()
    assert item.ident is None
    assert item.name is None
    assert item.is_container is False
    assert item.is_checked_out is False
    assert item.metadata == []


def test_item_create_with_metadata():
    item = ItemCreate(
        ident="BOX-1",
        metadata=[MetadataValueCreate(key="color", value="red")],
    )
    assert len(item.metadata) == 1
    assert item.metadata[0].key == "color"


def test_item_create_metadata_key_required():
    with pytest.raises(ValidationError):
        MetadataValueCreate(value="red")  # missing key


# ── ItemUpdate ───────────────────────────────────────────────────────


def test_item_update_all_optional():
    """All fields are optional — empty update is valid."""
    update = ItemUpdate()
    assert update.name is None
    assert update.ident is None


def test_item_update_tracks_fields_set():
    """model_fields_set tracks which fields were explicitly provided."""
    update = ItemUpdate(ident="NEW")
    assert "ident" in update.model_fields_set
    assert "name" not in update.model_fields_set


# ── IdentRequest ─────────────────────────────────────────────────────


def test_ident_request_defaults():
    req = IdentRequest(start="1", end="10")
    assert req.format == "dec"
    assert req.prefix == ""
    assert req.width == 0


def test_ident_request_all_fields():
    req = IdentRequest(start="A", end="FF", format="hex", prefix="X-", width=4)
    assert req.start == "A"
    assert req.end == "FF"
    assert req.format == "hex"
    assert req.prefix == "X-"
    assert req.width == 4


# ── MoveRequest ──────────────────────────────────────────────────────


def test_move_request_requires_both():
    with pytest.raises(ValidationError):
        MoveRequest(item_ident="A")  # missing destination_ident


def test_move_request_valid():
    req = MoveRequest(item_ident="ITEM-1", destination_ident="BOX-A")
    assert req.item_ident == "ITEM-1"
    assert req.destination_ident == "BOX-A"


# ── MetadataAttributeReorder ─────────────────────────────────────────


def test_reorder_requires_list():
    with pytest.raises(ValidationError):
        MetadataAttributeReorder(order="not a list")


def test_reorder_valid():
    req = MetadataAttributeReorder(order=[3, 1, 2])
    assert req.order == [3, 1, 2]
