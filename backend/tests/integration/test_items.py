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


def test_create_ghost_item(client):
    """An item with no ident is a 'ghost' — it has an id but ident is null."""
    r = client.post("/api/item", json={"name": "Ghost"})
    assert r.status_code == 201
    data = r.json()
    assert data["ident"] is None
    assert data["id"] is not None
    assert data["name"] == "Ghost"


def test_create_multiple_ghosts(client):
    """Multiple ghost items (null ident) can coexist."""
    r1 = client.post("/api/item", json={"name": "Ghost A"})
    r2 = client.post("/api/item", json={"name": "Ghost B"})
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["ident"] is None
    assert r2.json()["ident"] is None
    assert r1.json()["id"] != r2.json()["id"]


def test_create_child_item(client):
    parent = client.post("/api/item", json={"ident": "P1", "name": "Parent", "is_container": True}).json()
    child = client.post("/api/item", json={"ident": "C1", "name": "Child", "parent_id": parent["id"]}).json()
    assert child["parent_id"] == parent["id"]
    assert child["address"] == f"{parent['id']}.{child['id']}"


def test_create_item_nonexistent_parent(client):
    r = client.post("/api/item", json={"ident": "ORPHAN", "name": "Orphan", "parent_id": 99999})
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
    client.post("/api/item", json={"ident": "R1", "name": "Root1"})
    client.post("/api/item", json={"ident": "R2", "name": "Root2"})
    r = client.get("/api/item")
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_list_root_excludes_children(client):
    parent = client.post("/api/item", json={"ident": "RP", "name": "RootP", "is_container": True}).json()
    client.post("/api/item", json={"ident": "RC", "name": "RootC", "parent_id": parent["id"]})
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


def test_update_ident(client):
    """Idents are mutable — can be changed via PATCH."""
    item = client.post("/api/item", json={"ident": "OLD-ID", "name": "Mutable"}).json()
    r = client.patch(f"/api/item/{item['id']}", json={"ident": "NEW-ID"})
    assert r.status_code == 200
    assert r.json()["ident"] == "NEW-ID"

    # Old ident no longer resolves
    assert client.get("/api/ident/OLD-ID", follow_redirects=False).status_code == 404
    # New ident resolves
    assert client.get("/api/ident/NEW-ID", follow_redirects=False).status_code == 307


def test_update_ident_duplicate_rejected(client):
    """Changing ident to one that already exists returns 409."""
    client.post("/api/item", json={"ident": "TAKEN", "name": "First"})
    second = client.post("/api/item", json={"ident": "FREE", "name": "Second"}).json()
    r = client.patch(f"/api/item/{second['id']}", json={"ident": "TAKEN"})
    assert r.status_code == 409


def test_update_ident_same_is_ok(client):
    """Setting ident to the same value it already has is fine."""
    item = client.post("/api/item", json={"ident": "SAME", "name": "Stable"}).json()
    r = client.patch(f"/api/item/{item['id']}", json={"ident": "SAME"})
    assert r.status_code == 200
    assert r.json()["ident"] == "SAME"


def test_clear_ident_makes_ghost(client):
    """Setting ident to null turns an item into a ghost."""
    item = client.post("/api/item", json={"ident": "LIVE", "name": "Labeled"}).json()
    assert item["ident"] == "LIVE"

    r = client.patch(f"/api/item/{item['id']}", json={"ident": ""})
    assert r.status_code == 200
    assert r.json()["ident"] is None

    # Old ident no longer resolves
    assert client.get("/api/ident/LIVE", follow_redirects=False).status_code == 404


def test_assign_ident_to_ghost(client):
    """A ghost can be given an ident, making it findable by label."""
    ghost = client.post("/api/item", json={"name": "Unlabeled"}).json()
    assert ghost["ident"] is None

    r = client.patch(f"/api/item/{ghost['id']}", json={"ident": "NOW-LABELED"})
    assert r.status_code == 200
    assert r.json()["ident"] == "NOW-LABELED"

    # New ident resolves
    assert client.get("/api/ident/NOW-LABELED", follow_redirects=False).status_code == 307


def test_move_item_updates_address(client):
    a = client.post("/api/item", json={"ident": "A", "name": "A", "is_container": True}).json()
    b = client.post("/api/item", json={"ident": "B", "name": "B", "is_container": True}).json()
    child = client.post("/api/item", json={"ident": "X", "name": "X", "parent_id": a["id"]}).json()
    assert child["address"] == f"{a['id']}.{child['id']}"

    moved = client.patch(f"/api/item/{child['id']}", json={"parent_id": b["id"]}).json()
    assert moved["address"] == f"{b['id']}.{child['id']}"


def test_move_cascades_to_descendants(client):
    a = client.post("/api/item", json={"ident": "MA", "name": "MA", "is_container": True}).json()
    b = client.post("/api/item", json={"ident": "MB", "name": "MB", "is_container": True}).json()
    child = client.post("/api/item", json={"ident": "MC", "name": "MC", "parent_id": a["id"], "is_container": True}).json()
    grandchild = client.post("/api/item", json={"ident": "MG", "name": "MG", "parent_id": child["id"]}).json()

    # Before move
    assert grandchild["address"] == f"{a['id']}.{child['id']}.{grandchild['id']}"

    # Move child from A to B
    client.patch(f"/api/item/{child['id']}", json={"parent_id": b["id"]})

    # Check grandchild address was updated
    gc = client.get(f"/api/item/{grandchild['id']}").json()
    assert gc["address"] == f"{b['id']}.{child['id']}.{grandchild['id']}"


def test_prevent_move_under_self(client):
    parent = client.post("/api/item", json={"ident": "SP", "name": "SP", "is_container": True}).json()
    child = client.post("/api/item", json={"ident": "SC", "name": "SC", "parent_id": parent["id"], "is_container": True}).json()
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
    item = client.post("/api/item", json={"ident": "LK1", "name": "Lookup"}).json()
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
        "name": "Meta2",
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
    item = client.post("/api/item", json={"ident": "DEL1", "name": "Del1"}).json()
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


# ── Move ─────────────────────────────────────────────────────────────


def test_move_item_by_ident(client):
    """Move an item to a different container via POST /item/move."""
    box_a = client.post("/api/item", json={"ident": "MBOX-A", "name": "Box A", "is_container": True}).json()
    box_b = client.post("/api/item", json={"ident": "MBOX-B", "name": "Box B", "is_container": True}).json()
    item = client.post("/api/item", json={"ident": "MITEM-1", "name": "Widget", "parent_id": box_a["id"]}).json()
    assert item["parent_id"] == box_a["id"]

    r = client.post("/api/item/move", json={"item_ident": "MITEM-1", "destination_ident": "MBOX-B"})
    assert r.status_code == 200
    data = r.json()
    assert data["parent_id"] == box_b["id"]
    assert data["destination_ident"] == "MBOX-B"

    # Verify the item's address was updated
    moved = client.get(f"/api/item/{item['id']}").json()
    assert moved["parent_id"] == box_b["id"]
    assert moved["address"] == f"{box_b['id']}.{item['id']}"


def test_move_item_not_found(client):
    """Moving a non-existent item returns 404."""
    client.post("/api/item", json={"ident": "MDEST-1", "name": "Dest", "is_container": True})
    r = client.post("/api/item/move", json={"item_ident": "NONEXISTENT", "destination_ident": "MDEST-1"})
    assert r.status_code == 404


def test_move_destination_not_found(client):
    """Moving to a non-existent destination returns 404."""
    client.post("/api/item", json={"ident": "MSRC-1", "name": "Source"})
    r = client.post("/api/item/move", json={"item_ident": "MSRC-1", "destination_ident": "NONEXISTENT"})
    assert r.status_code == 404


def test_move_destination_not_container(client):
    """Moving to a non-container returns 400."""
    client.post("/api/item", json={"ident": "MSRC-2", "name": "Source"})
    client.post("/api/item", json={"ident": "MNOTC-1", "name": "Not a container", "is_container": False})
    r = client.post("/api/item/move", json={"item_ident": "MSRC-2", "destination_ident": "MNOTC-1"})
    assert r.status_code == 400
    assert "not a container" in r.json()["detail"].lower()


def test_move_item_into_itself(client):
    """Moving an item into itself returns 400."""
    client.post("/api/item", json={"ident": "MSELF-1", "name": "Self", "is_container": True})
    r = client.post("/api/item/move", json={"item_ident": "MSELF-1", "destination_ident": "MSELF-1"})
    assert r.status_code == 400


def test_move_container_under_own_descendant(client):
    """Moving a container under one of its own descendants returns 400."""
    parent = client.post("/api/item", json={"ident": "MPAR-1", "name": "Parent", "is_container": True}).json()
    child = client.post("/api/item", json={"ident": "MCHD-1", "name": "Child", "is_container": True, "parent_id": parent["id"]}).json()
    r = client.post("/api/item/move", json={"item_ident": "MPAR-1", "destination_ident": "MCHD-1"})
    assert r.status_code == 400
    assert "descendant" in r.json()["detail"].lower()


def test_move_cascades_address(client):
    """Moving a container updates addresses of its descendants."""
    box = client.post("/api/item", json={"ident": "MCBOX-1", "name": "Box", "is_container": True}).json()
    inner = client.post("/api/item", json={"ident": "MCINN-1", "name": "Inner", "is_container": True, "parent_id": box["id"]}).json()
    leaf = client.post("/api/item", json={"ident": "MCLEF-1", "name": "Leaf", "parent_id": inner["id"]}).json()
    new_parent = client.post("/api/item", json={"ident": "MCNEW-1", "name": "New Parent", "is_container": True}).json()

    r = client.post("/api/item/move", json={"item_ident": "MCBOX-1", "destination_ident": "MCNEW-1"})
    assert r.status_code == 200

    # Verify descendant addresses cascaded
    moved_inner = client.get(f"/api/item/{inner['id']}").json()
    moved_leaf = client.get(f"/api/item/{leaf['id']}").json()
    assert moved_inner["address"] == f"{new_parent['id']}.{box['id']}.{inner['id']}"
    assert moved_leaf["address"] == f"{new_parent['id']}.{box['id']}.{inner['id']}.{leaf['id']}"


# ── Checkout tests ──────────────────────────────────────────────────

def test_checkout_default_false(client):
    """New items default to is_checked_out=False."""
    r = client.post("/api/item", json={"ident": "CO-1", "name": "CheckItem"})
    assert r.status_code == 201
    assert r.json()["is_checked_out"] is False


def test_checkout_toggle_via_patch(client):
    """PATCH can set is_checked_out to True then back to False."""
    item = client.post("/api/item", json={"ident": "CO-2", "name": "ToggleMe"}).json()
    # Check out
    r = client.patch(f"/api/item/{item['id']}", json={"is_checked_out": True})
    assert r.status_code == 200
    assert r.json()["is_checked_out"] is True
    # Check back in
    r = client.patch(f"/api/item/{item['id']}", json={"is_checked_out": False})
    assert r.status_code == 200
    assert r.json()["is_checked_out"] is False


def test_checkout_create_with_true(client):
    """Can create an item already checked out."""
    r = client.post("/api/item", json={"ident": "CO-3", "name": "PreChecked", "is_checked_out": True})
    assert r.status_code == 201
    assert r.json()["is_checked_out"] is True


def test_checkout_in_children(client):
    """Checked-out status appears in parent's children list."""
    parent = client.post("/api/item", json={"ident": "CO-P", "name": "Parent", "is_container": True}).json()
    client.post("/api/item", json={"ident": "CO-C", "name": "Child", "parent_id": parent["id"], "is_checked_out": True})
    fetched = client.get(f"/api/item/{parent['id']}").json()
    child_out = [c for c in fetched["children"] if c["ident"] == "CO-C"][0]
    assert child_out["is_checked_out"] is True


def test_checkout_preserved_on_move(client):
    """Moving an item preserves its checked-out status."""
    box1 = client.post("/api/item", json={"ident": "MV-B1", "name": "Box1", "is_container": True}).json()
    box2 = client.post("/api/item", json={"ident": "MV-B2", "name": "Box2", "is_container": True}).json()
    item = client.post("/api/item", json={"ident": "MV-I1", "name": "Item", "parent_id": box1["id"], "is_checked_out": True}).json()
    r = client.post("/api/item/move", json={"item_ident": "MV-I1", "destination_ident": "MV-B2"})
    assert r.status_code == 200
    moved = client.get(f"/api/item/{item['id']}").json()
    assert moved["is_checked_out"] is True
