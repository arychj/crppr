"""Tests for the ident generation endpoint."""


def test_generate_decimal_ident(client):
    r = client.post("/api/ident/generate", json={"start": "1", "end": "10", "format": "dec"})
    assert r.status_code == 200
    data = r.json()
    assert data["ident"] == "1"
    assert data["exhausted"] is False


def test_generate_hex_ident(client):
    r = client.post("/api/ident/generate", json={"start": "A", "end": "14", "format": "hex"})
    assert r.status_code == 200
    assert r.json()["ident"] == "A"  # hex A = decimal 10


def test_generate_with_prefix(client):
    r = client.post("/api/ident/generate", json={"start": "1", "end": "5", "format": "dec", "prefix": "BOX-"})
    assert r.status_code == 200
    assert r.json()["ident"] == "BOX-1"


def test_generate_skips_taken(client):
    # Take ident "1"
    client.post("/api/item", json={"ident": "1"})
    r = client.post("/api/ident/generate", json={"start": "1", "end": "10", "format": "dec"})
    assert r.json()["ident"] == "2"


def test_generate_exhausted(client):
    # Take all idents in range
    for i in range(1, 4):
        client.post("/api/item", json={"ident": str(i)})
    r = client.post("/api/ident/generate", json={"start": "1", "end": "3", "format": "dec"})
    data = r.json()
    assert data["ident"] is None
    assert data["exhausted"] is True


def test_generate_with_width(client):
    """Width pads the numeric portion so total length = width."""
    r = client.post(
        "/api/ident/generate",
        json={"start": "1", "end": "100", "format": "dec", "prefix": "a", "width": 4},
    )
    assert r.status_code == 200
    assert r.json()["ident"] == "a001"


def test_generate_width_no_truncate(client):
    """When value already fills width, no extra padding is added."""
    r = client.post(
        "/api/ident/generate",
        json={"start": "100", "end": "200", "format": "dec", "prefix": "a", "width": 4},
    )
    assert r.status_code == 200
    assert r.json()["ident"] == "a100"


def test_generate_width_hex(client):
    r = client.post(
        "/api/ident/generate",
        json={"start": "1", "end": "FF", "format": "hex", "prefix": "X", "width": 4},
    )
    assert r.status_code == 200
    assert r.json()["ident"] == "X001"


def test_generate_width_skips_taken(client):
    client.post("/api/item", json={"ident": "a001"})
    r = client.post(
        "/api/ident/generate",
        json={"start": "1", "end": "100", "format": "dec", "prefix": "a", "width": 4},
    )
    assert r.json()["ident"] == "a002"
