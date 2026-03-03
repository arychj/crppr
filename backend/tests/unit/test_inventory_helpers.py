"""Unit tests for inventory CSV metadata cell parsing/formatting (pure functions)."""

from api.routers.inventory import _metadata_to_cell, _cell_to_metadata


# ── _metadata_to_cell ────────────────────────────────────────────────


def test_metadata_to_cell_basic():
    result = _metadata_to_cell({"color": "red", "size": "large"})
    assert "color: red" in result
    assert "size: large" in result


def test_metadata_to_cell_empty_dict():
    assert _metadata_to_cell({}) == ""


def test_metadata_to_cell_none():
    assert _metadata_to_cell(None) == ""


def test_metadata_to_cell_single():
    assert _metadata_to_cell({"key": "val"}) == "key: val"


def test_metadata_to_cell_multiline_format():
    """Each key-value pair is on its own line."""
    result = _metadata_to_cell({"a": "1", "b": "2"})
    lines = result.split("\n")
    assert len(lines) == 2


# ── _cell_to_metadata ───────────────────────────────────────────────


def test_cell_to_metadata_basic():
    result = _cell_to_metadata("color: red\nsize: large")
    assert result == {"color": "red", "size": "large"}


def test_cell_to_metadata_empty_string():
    assert _cell_to_metadata("") == {}


def test_cell_to_metadata_none():
    assert _cell_to_metadata(None) == {}


def test_cell_to_metadata_whitespace_only():
    assert _cell_to_metadata("   \n  ") == {}


def test_cell_to_metadata_colon_no_space():
    """Handles 'key:value' without a space after colon."""
    result = _cell_to_metadata("color:red")
    assert result == {"color": "red"}


def test_cell_to_metadata_value_with_colon():
    """Colon in value is preserved (only split on first ': ')."""
    result = _cell_to_metadata("url: http://example.com")
    assert result == {"url": "http://example.com"}


def test_cell_to_metadata_strips_whitespace():
    result = _cell_to_metadata("  color : red  \n  size : large  ")
    assert result == {"color": "red", "size": "large"}


def test_cell_to_metadata_skips_blank_lines():
    result = _cell_to_metadata("color: red\n\n\nsize: large\n")
    assert result == {"color": "red", "size": "large"}


def test_cell_to_metadata_skips_lines_without_colon():
    result = _cell_to_metadata("color: red\ngarbage\nsize: large")
    assert result == {"color": "red", "size": "large"}


def test_roundtrip():
    """Formatting then parsing yields the original dict."""
    original = {"color": "red", "size": "large"}
    cell = _metadata_to_cell(original)
    parsed = _cell_to_metadata(cell)
    assert parsed == original
