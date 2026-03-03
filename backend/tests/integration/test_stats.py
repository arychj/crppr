"""Tests for the /api/stats endpoint."""


def test_stats_empty(client):
    r = client.get("/api/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 0
    assert data["containers"] == 0
    assert data["items"] == 0
    assert data["avg_items_per_container"] == 0.0
    assert data["min_depth"] == 0
    assert data["max_depth"] == 0
    assert data["avg_depth"] == 0.0


def test_stats_with_data(client):
    # Create a container
    r = client.post("/api/item", json={"ident": "BIN-01", "name": "Bin", "is_container": True})
    bin_id = r.json()["id"]
    # Create items inside
    client.post("/api/item", json={"ident": "ITEM-01", "name": "Item 1", "parent_id": bin_id})
    client.post("/api/item", json={"ident": "ITEM-02", "name": "Item 2", "parent_id": bin_id})
    # Create a standalone item
    client.post("/api/item", json={"ident": "ITEM-03", "name": "Standalone"})

    r = client.get("/api/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 4
    assert data["containers"] == 1
    assert data["items"] == 3
    assert data["avg_items_per_container"] == 3.0
    assert data["min_depth"] == 1
    assert data["max_depth"] == 2
    assert data["avg_depth"] > 0
