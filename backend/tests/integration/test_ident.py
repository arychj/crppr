"""Tests for the ident generation endpoint (DB-dependent behavior)."""


def test_generate_skips_taken(client):
    # Take ident "1"
    client.post("/api/item", json={"ident": "1", "name": "One"})
    r = client.post("/api/ident/generate", json={"start": "1", "end": "10", "format": "dec"})
    assert r.json()["ident"] == "2"


def test_generate_exhausted(client):
    # Take all idents in range
    for i in range(1, 4):
        client.post("/api/item", json={"ident": str(i), "name": f"Item {i}"})
    r = client.post("/api/ident/generate", json={"start": "1", "end": "3", "format": "dec"})
    data = r.json()
    assert data["ident"] is None
    assert data["exhausted"] is True


def test_generate_width_skips_taken(client):
    client.post("/api/item", json={"ident": "a001", "name": "Prefixed"})
    r = client.post(
        "/api/ident/generate",
        json={"start": "1", "end": "100", "format": "dec", "prefix": "a", "width": 4},
    )
    assert r.json()["ident"] == "a002"
