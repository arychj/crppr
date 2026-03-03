"""Unit tests for the ident generation service (pure functions)."""

from api.services.ident import _format_value, generate_range


# ── _format_value ────────────────────────────────────────────────────


def test_format_decimal():
    assert _format_value(42, "dec") == "42"


def test_format_hex():
    assert _format_value(255, "hex") == "FF"


def test_format_hex_lowercase_input():
    """Hex output is uppercase regardless."""
    assert _format_value(10, "hex") == "A"


def test_format_with_width_pads():
    """Width pads the numeric portion with leading zeros."""
    assert _format_value(1, "dec", width=4, prefix="a") == "001"


def test_format_with_width_no_truncate():
    """When value fills the width, no extra padding is added."""
    assert _format_value(100, "dec", width=4, prefix="a") == "100"


def test_format_with_width_value_exceeds():
    """When value exceeds width, it is NOT truncated."""
    assert _format_value(10000, "dec", width=4, prefix="a") == "10000"


def test_format_hex_with_width():
    assert _format_value(1, "hex", width=4, prefix="X") == "001"


def test_format_zero_width_no_padding():
    """Width=0 means no padding."""
    assert _format_value(1, "dec", width=0, prefix="") == "1"


# ── generate_range ───────────────────────────────────────────────────


def test_generate_range_decimal():
    result = generate_range(1, 5, "dec")
    assert result == ["1", "2", "3", "4", "5"]


def test_generate_range_hex():
    result = generate_range(10, 12, "hex")
    assert result == ["A", "B", "C"]


def test_generate_range_single():
    result = generate_range(7, 7, "dec")
    assert result == ["7"]


def test_generate_range_with_width():
    result = generate_range(1, 3, "dec", width=4, prefix="P")
    assert result == ["001", "002", "003"]


def test_generate_range_empty():
    """Reversed range produces empty list."""
    result = generate_range(5, 1, "dec")
    assert result == []
