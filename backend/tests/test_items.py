"""Tests for item CRUD, address recalculation, and breadcrumbs."""


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# ── Create ──────────────────────────────────────────────────────────


def test_create_item_with_ident(client):
    r = client.post("/api/item", json={"ident": "BOX-01", "name": "First Box", "is_container": True})
    assert r.status_code == 201
    data = r.json()
    assert data["ident"] == "BOX-01"
    assert data["name"] == "First Box"
    assert data["is_container"] is True
    assert data["address"] == str(data["id"])


def test_create_item_auto_ident(client):
    r = client.post("/api/item", json={"name": "Auto"})
    assert r.status_code == 201
    data = r.json()
    assert data["ident"]  # should be auto-generated


def test_create_child_item(client):
    parent = client.post("/api/item", json={"ident": "P1", "name": "Parent", "is_container": True}).json()
    child = client.post("/api/item", json={"ident": "C1", "name": "Child", "parent_id": parent["id"]}).json()
    assert child["parent_id"] == parent["id"]
    assert child["address"] == f"{parent['id']}.{child['id']}"


def test_create_item_nonexistent_parent(client):
    r = client.post("/api/item", json={"ident": "ORPHAN", "parent_id": 99999})
    assert r.status_code == 404


# ── Read ────────────────────────────────────────────────────────────


def test_get_item(client):
    created = client.post("/api/item", json={"ident": "G1", "name": "GetMe"}).json()
    r = client.get(f"/api/item/{created['id']}")
    assert r.status_code == 200
    assert r.json()["ident"] == "G1"


def test_get_item_not_found(client):
    r = client.get("/api/item/99999")
    assert r.status_code == 404


def test_list_root_items(client):
    client.post("/api/item", json={"ident": "R1"})
    client.post("/api/item", json={"ident": "R2"})
    r = client.get("/api/item")
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_list_root_excludes_children(client):
    parent = client.post("/api/item", json={"ident": "RP", "is_container": True}).json()
    client.post("/api/item", json={"ident": "RC", "parent_id": parent["id"]})
    r = client.get("/api/item")
    idents = [i["ident"] for i in r.json()]
    assert "RP" in idents
    assert "RC" not in idents


# ── Update / Move ──────────────────────────────────────────────────


def test_update_name(client):
    item = client.post("/api/item", json={"ident": "U1", "name": "Old"}).json()
    r = client.patch(f"/api/item/{item['id']}", json={"name": "New"})
    assert r.status_code == 200
    assert r.json()["name"] == "New"


def test_move_item_updates_address(client):
    a = client.post("/api/item", json={"ident": "A", "is_container": True}).json()
    b = client.post("/api/item", json={"ident": "B", "is_container": True}).json()
    child = client.post("/api/item", json={"ident": "X", "parent_id": a["id"]}).json()
    assert child["address"] == f"{a['id']}.{child['id']}"

    moved = client.patch(f"/api/item/{child['id']}", json={"parent_id": b["id"]}).json()
    assert moved["address"] == f"{b['id']}.{child['id']}"


def test_move_cascades_to_descendants(client):
    a = client.post("/api/item", json={"ident": "MA", "is_container": True}).json()
    b = client.post("/api/item", json={"ident": "MB", "is_container": True}).json()
    child = client.post("/api/item", json={"ident": "MC", "parent_id": a["id"], "is_container": True}).json()
    grandchild = client.post("/api/item", json={"ident": "MG", "parent_id": child["id"]}).json()

    # Before move
    assert grandchild["address"] == f"{a['id']}.{child['id']}.{grandchild['id']}"

    # Move child from A to B
    client.patch(f"/api/item/{child['id']}", json={"parent_id": b["id"]})

    # Check grandchild address was updated
    gc = client.get(f"/api/item/{grandchild['id']}").json()
    assert gc["address"] == f"{b['id']}.{child['id']}.{grandchild['id']}"


def test_prevent_move_under_self(client):
    parent = client.post("/api/item", json={"ident": "SP", "is_container": True}).json()
    child = client.post("/api/item", json={"ident": "SC", "parent_id": parent["id"], "is_container": True}).json()
    r = client.patch(f"/api/item/{parent['id']}", json={"parent_id": child["id"]})
    assert r.status_code == 400


# ── Breadcrumb Path ─────────────────────────────────────────────────


def test_get_item_path(client):
    root = client.post("/api/item", json={"ident": "BR", "name": "Root", "is_container": True}).json()
    mid = client.post("/api/item", json={"ident": "BM", "name": "Mid", "parent_id": root["id"], "is_container": True}).json()
    leaf = client.post("/api/item", json={"ident": "BL", "name": "Leaf", "parent_id": mid["id"]}).json()

    r = client.get(f"/api/item/{leaf['id']}/path")
    assert r.status_code == 200
    path = r.json()
    assert len(path) == 3
    assert path[0]["ident"] == "BR"
    assert path[1]["ident"] == "BM"
    assert path[2]["ident"] == "BL"


# ── Lookup by ident ─────────────────────────────────────────────────


def test_lookup_by_ident_redirects(client):
    item = client.post("/api/item", json={"ident": "LK1"}).json()
    r = client.get(f"/api/ident/LK1", follow_redirects=False)
    assert r.status_code == 307
    assert f"/api/item/{item['id']}" in r.headers["location"]


def test_lookup_by_ident_not_found(client):
    r = client.get("/api/ident/NOPE", follow_redirects=False)
    assert r.status_code == 404


# ── Create with inline metadata ─────────────────────────────────────


def test_create_item_with_metadata(client):
    """Metadata key/value pairs sent at creation time are persisted."""
    r = client.post("/api/item", json={
        "ident": "META1",
        "name": "With Meta",
        "metadata": [
            {"key": "color", "value": "red"},
            {"key": "size", "value": "large"},
        ],
    })
    assert r.status_code == 201
    data = r.json()
    meta_names = {m["attribute_name"] for m in data["metadata"]}
    assert "color" in meta_names
    assert "size" in meta_names


def test_create_item_new_key_auto_creates_attribute(client):
    """A metadata key that doesn't already exist gets created automatically."""
    r = client.post("/api/item", json={
        "ident": "META2",
        "metadata": [{"key": "brand_new_key", "value": "val"}],
    })
    assert r.status_code == 201
    attrs = client.get("/api/metadata-attributes/").json()
    names = [a["name"] for a in attrs]
    assert "brand_new_key" in names


# ── Delete metadata ──────────────────────────────────────────────────


def test_delete_metadata_value(client):
    # Create attribute + item + value
    attr = client.post("/api/metadata-attributes/", json={"name": "del_test"}).json()
    item = client.post("/api/item", json={"ident": "DEL1"}).json()
    client.post(f"/api/item/{item['id']}/metadata", json=[
        {"attribute_id": attr["id"], "value": "temp"},
    ])

    # Delete it
    r = client.delete(f"/api/item/{item['id']}/metadata/{attr['id']}")
    assert r.status_code == 204

    # Verify it's gone
    updated = client.get(f"/api/item/{item['id']}").json()
    assert len(updated["metadata"]) == 0


def test_delete_metadata_nonexistent_item(client):
    r = client.delete("/api/item/99999/metadata/1")
    assert r.status_code == 404
