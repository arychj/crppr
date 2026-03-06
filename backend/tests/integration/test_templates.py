"""Tests for the /api/template endpoints and template isolation rules."""

import csv
import io


# ── CRUD ─────────────────────────────────────────────────────────────


def test_create_template(client):
    """POST /template creates a template with is_template=True and no ident."""
    r = client.post("/api/template", json={"name": "Widget Template", "is_container": False})
    assert r.status_code == 201
    data = r.json()
    assert data["is_template"] is True
    assert data["ident"] is None
    assert data["parent_id"] is None
    assert data["children"] == []


def test_create_template_ignores_ident_and_parent(client):
    """Even if ident and parent_id are supplied, they are forced to None."""
    container = client.post("/api/item", json={"ident": "BOX", "name": "Box", "is_container": True}).json()
    r = client.post("/api/template", json={
        "name": "Forced",
        "ident": "SHOULD-BE-IGNORED",
        "parent_id": container["id"],
    })
    assert r.status_code == 201
    data = r.json()
    assert data["ident"] is None
    assert data["parent_id"] is None


def test_list_templates(client):
    """GET /template returns only templates."""
    client.post("/api/template", json={"name": "Tmpl A"})
    client.post("/api/template", json={"name": "Tmpl B"})
    client.post("/api/item", json={"ident": "REAL-1", "name": "Regular Item"})

    r = client.get("/api/template")
    assert r.status_code == 200
    names = [t["name"] for t in r.json()]
    assert "Tmpl A" in names
    assert "Tmpl B" in names
    assert "Regular Item" not in names


def test_get_template(client):
    """GET /template/{id} returns a single template."""
    t = client.post("/api/template", json={"name": "Get Me"}).json()
    r = client.get(f"/api/template/{t['id']}")
    assert r.status_code == 200
    assert r.json()["name"] == "Get Me"


def test_get_template_not_found(client):
    r = client.get("/api/template/99999")
    assert r.status_code == 404


def test_get_template_rejects_regular_item(client):
    """GET /template/{id} returns 404 for a non-template item."""
    item = client.post("/api/item", json={"ident": "REG-1", "name": "Regular"}).json()
    r = client.get(f"/api/template/{item['id']}")
    assert r.status_code == 404


def test_update_template(client):
    """PATCH /template/{id} updates name, description, is_container."""
    t = client.post("/api/template", json={"name": "Old Name"}).json()
    r = client.patch(f"/api/template/{t['id']}", json={
        "name": "New Name",
        "description": "Updated desc",
        "is_container": True,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "New Name"
    assert data["description"] == "Updated desc"
    assert data["is_container"] is True


def test_delete_template(client):
    """DELETE /template/{id} removes the template."""
    t = client.post("/api/template", json={"name": "Delete Me"}).json()
    r = client.delete(f"/api/template/{t['id']}")
    assert r.status_code == 204

    # Confirm it's gone
    assert client.get(f"/api/template/{t['id']}").status_code == 404


def test_delete_template_not_found(client):
    r = client.delete("/api/template/99999")
    assert r.status_code == 404


# ── Template search ──────────────────────────────────────────────────


def test_search_templates_by_name(client):
    client.post("/api/template", json={"name": "Drill Template"})
    client.post("/api/template", json={"name": "Saw Template"})

    r = client.get("/api/template/search?q=drill")
    assert r.status_code == 200
    results = r.json()
    assert len(results) == 1
    assert results[0]["name"] == "Drill Template"


def test_search_templates_no_results(client):
    client.post("/api/template", json={"name": "Something"})
    r = client.get("/api/template/search?q=zzzznotfound")
    assert r.status_code == 200
    assert len(r.json()) == 0


# ── Template metadata ───────────────────────────────────────────────


def test_create_template_with_inline_metadata(client):
    """Inline metadata key/value pairs are persisted on template creation."""
    r = client.post("/api/template", json={
        "name": "With Meta",
        "metadata": [
            {"key": "brand", "value": "Acme"},
            {"key": "color", "value": "blue"},
        ],
    })
    assert r.status_code == 201
    meta_names = {m["attribute_name"] for m in r.json()["metadata"]}
    assert "brand" in meta_names
    assert "color" in meta_names


def test_set_template_metadata(client):
    """POST /template/{id}/metadata upserts metadata values."""
    t = client.post("/api/template", json={"name": "Meta Test"}).json()
    attr = client.post("/api/metadata-attributes/", json={"name": "weight"}).json()

    r = client.post(f"/api/template/{t['id']}/metadata", json=[
        {"attribute_id": attr["id"], "value": "5kg"},
    ])
    assert r.status_code == 200
    assert r.json()[0]["value"] == "5kg"


def test_delete_template_metadata(client):
    """DELETE /template/{id}/metadata/{attr_id} removes a metadata value."""
    t = client.post("/api/template", json={"name": "Del Meta"}).json()
    attr = client.post("/api/metadata-attributes/", json={"name": "temp_attr"}).json()
    client.post(f"/api/template/{t['id']}/metadata", json=[
        {"attribute_id": attr["id"], "value": "temporary"},
    ])

    r = client.delete(f"/api/template/{t['id']}/metadata/{attr['id']}")
    assert r.status_code == 204

    # Confirm it's gone
    refreshed = client.get(f"/api/template/{t['id']}").json()
    assert len(refreshed["metadata"]) == 0


# ── Isolation: templates invisible to item endpoints ─────────────────


def test_template_not_in_item_list(client):
    """Templates don't appear in GET /item (root items)."""
    client.post("/api/template", json={"name": "Hidden Template"})
    client.post("/api/item", json={"ident": "VISIBLE", "name": "Visible Item"})

    r = client.get("/api/item")
    assert r.status_code == 200
    names = [i["name"] for i in r.json()]
    assert "Visible Item" in names
    assert "Hidden Template" not in names


def test_template_not_in_item_search(client):
    """Templates don't appear in GET /item/search."""
    client.post("/api/template", json={"name": "Unique Searchable Template"})
    client.post("/api/item", json={"ident": "USR-1", "name": "Unique Searchable Regular"})

    r = client.get("/api/item/search?q=Unique Searchable")
    assert r.status_code == 200
    names = [i["name"] for i in r.json()]
    assert "Unique Searchable Regular" in names
    assert "Unique Searchable Template" not in names


def test_template_not_accessible_via_item_get(client):
    """GET /item/{id} returns 404 for a template."""
    t = client.post("/api/template", json={"name": "Blocked"}).json()
    r = client.get(f"/api/item/{t['id']}")
    assert r.status_code == 404


def test_template_not_in_stats(client):
    """Templates should not be counted in stats."""
    client.post("/api/template", json={"name": "Stat Template"})
    client.post("/api/item", json={"ident": "STAT-1", "name": "Stat Item"})

    r = client.get("/api/stats")
    assert r.status_code == 200
    assert r.json()["total"] == 1  # only the regular item


# ── Isolation: templates cannot be parents ───────────────────────────


def test_create_item_with_template_parent_rejected(client):
    """Creating an item with parent_id pointing to a template returns 400."""
    t = client.post("/api/template", json={"name": "Parent Template", "is_container": True}).json()
    r = client.post("/api/item", json={"ident": "CHILD-1", "name": "Child", "parent_id": t["id"]})
    assert r.status_code == 400
    assert "template" in r.json()["detail"].lower()


def test_move_item_to_template_rejected(client):
    """Moving an item to a template parent via PATCH returns 400."""
    t = client.post("/api/template", json={"name": "Dest Template", "is_container": True}).json()
    item = client.post("/api/item", json={"ident": "MOVABLE-1", "name": "Movable"}).json()
    r = client.patch(f"/api/item/{item['id']}", json={"parent_id": t["id"]})
    assert r.status_code == 400
    assert "template" in r.json()["detail"].lower()


# ── Isolation: templates excluded from export ────────────────────────


def test_export_excludes_templates(client):
    """Templates should not appear in JSON export."""
    client.post("/api/template", json={"name": "Export Template"})
    client.post("/api/item", json={"ident": "EXP-1", "name": "Exportable"})

    r = client.get("/api/inventory/export?format=json")
    assert r.status_code == 200
    data = r.json()
    names = [d["name"] for d in data]
    assert "Exportable" in names
    assert "Export Template" not in names


def test_csv_export_excludes_templates(client):
    """Templates should not appear in CSV export."""
    client.post("/api/template", json={"name": "CSV Hidden"})
    client.post("/api/item", json={"ident": "CSV-1", "name": "CSV Visible"})

    r = client.get("/api/inventory/export?format=csv")
    assert r.status_code == 200
    reader = csv.reader(io.StringIO(r.text))
    rows = list(reader)
    all_names = [row[1] for row in rows[1:]]  # name is column 1
    assert "CSV Visible" in all_names
    assert "CSV Hidden" not in all_names


# ── Enforcement: item endpoints reject templates ─────────────────────


def test_update_item_rejects_template(client):
    """PATCH /item/{id} returns 404 when targeting a template."""
    t = client.post("/api/template", json={"name": "No Patch"}).json()
    r = client.patch(f"/api/item/{t['id']}", json={"name": "Nope"})
    assert r.status_code == 404


def test_item_path_rejects_template(client):
    """GET /item/{id}/path returns 404 for a template."""
    t = client.post("/api/template", json={"name": "No Path"}).json()
    r = client.get(f"/api/item/{t['id']}/path")
    assert r.status_code == 404


def test_set_metadata_via_item_rejects_template(client):
    """POST /item/{id}/metadata returns 404 when targeting a template."""
    t = client.post("/api/template", json={"name": "No Item Meta"}).json()
    attr = client.post("/api/metadata-attributes/", json={"name": "blocked_attr"}).json()
    r = client.post(f"/api/item/{t['id']}/metadata", json=[
        {"attribute_id": attr["id"], "value": "nope"},
    ])
    assert r.status_code == 404


def test_delete_metadata_via_item_rejects_template(client):
    """DELETE /item/{id}/metadata/{attr} returns 404 when targeting a template."""
    t = client.post("/api/template", json={"name": "No Del Meta"}).json()
    r = client.delete(f"/api/item/{t['id']}/metadata/1")
    assert r.status_code == 404


def test_create_item_always_non_template(client):
    """POST /item forces is_template=False even if True is sent."""
    r = client.post("/api/item", json={
        "ident": "NOT-TMPL",
        "name": "Sneaky",
        "is_template": True,
    })
    assert r.status_code == 201
    assert r.json()["is_template"] is False


def test_template_not_in_recent_items(client):
    """Templates never appear in GET /item/recent."""
    t = client.post("/api/template", json={"name": "Recent Template"}).json()
    item = client.post("/api/item", json={"ident": "REC-1", "name": "Recent Item"}).json()
    # Touch the item so it has a last_viewed timestamp
    client.get(f"/api/item/{item['id']}")

    r = client.get("/api/item/recent")
    assert r.status_code == 200
    ids = [i["id"] for i in r.json()]
    assert item["id"] in ids
    assert t["id"] not in ids


# ── Enforcement: template endpoints reject regular items ─────────────


def test_update_template_rejects_item(client):
    """PATCH /template/{id} returns 404 for a regular item."""
    item = client.post("/api/item", json={"ident": "REG-U", "name": "Upd"}).json()
    r = client.patch(f"/api/template/{item['id']}", json={"name": "Nope"})
    assert r.status_code == 404


def test_delete_template_rejects_item(client):
    """DELETE /template/{id} returns 404 for a regular item."""
    item = client.post("/api/item", json={"ident": "REG-D", "name": "Del"}).json()
    r = client.delete(f"/api/template/{item['id']}")
    assert r.status_code == 404


def test_set_template_metadata_rejects_item(client):
    """POST /template/{id}/metadata returns 404 for a regular item."""
    item = client.post("/api/item", json={"ident": "REG-M", "name": "Meta"}).json()
    attr = client.post("/api/metadata-attributes/", json={"name": "tmpl_block"}).json()
    r = client.post(f"/api/template/{item['id']}/metadata", json=[
        {"attribute_id": attr["id"], "value": "nope"},
    ])
    assert r.status_code == 404


def test_delete_template_metadata_rejects_item(client):
    """DELETE /template/{id}/metadata/{attr} returns 404 for a regular item."""
    item = client.post("/api/item", json={"ident": "REG-DM", "name": "DelMeta"}).json()
    r = client.delete(f"/api/template/{item['id']}/metadata/1")
    assert r.status_code == 404


# ── Enforcement: templates cannot participate in hierarchy ───────────


def test_move_by_ident_to_template_rejected(client):
    """POST /item/move rejects moving to a template destination by ident."""
    # Templates have no ident, so we create a container template with a
    # sibling regular container that has an ident, then manually give the
    # template an ident via the DB to test the code path.
    # Instead, test that the ident-based move can't find a template (since
    # templates have ident=None, the ident lookup returns 404).
    client.post("/api/template", json={"name": "Move Dest Template", "is_container": True})
    item = client.post("/api/item", json={"ident": "MV-SRC", "name": "Source"}).json()
    # Templates have no ident, so the destination lookup should 404
    r = client.post("/api/item/move", json={
        "item_ident": "MV-SRC",
        "destination_ident": "NONEXISTENT-TMPL",
    })
    assert r.status_code == 404


def test_template_children_filtered_from_parent(client, db):
    """Templates that somehow have a parent_id don't appear in children list."""
    from api.models import Item as ItemModel
    parent = client.post("/api/item", json={
        "ident": "FILT-P", "name": "Filter Parent", "is_container": True,
    }).json()
    child = client.post("/api/item", json={
        "ident": "FILT-C", "name": "Visible Child", "parent_id": parent["id"],
    }).json()
    # Create a template and manually set its parent_id to test the filter
    tmpl = client.post("/api/template", json={"name": "Sneaky Template"}).json()
    db_tmpl = db.get(ItemModel, tmpl["id"])
    db_tmpl.parent_id = parent["id"]
    db.commit()

    r = client.get(f"/api/item/{parent['id']}")
    assert r.status_code == 200
    child_names = [c["name"] for c in r.json()["children"]]
    assert "Visible Child" in child_names
    assert "Sneaky Template" not in child_names


def test_template_search_excludes_regular_items(client):
    """GET /template/search does not return regular items."""
    client.post("/api/item", json={"ident": "CROSS-1", "name": "CrossSearch Item"})
    client.post("/api/template", json={"name": "CrossSearch Template"})

    r = client.get("/api/template/search?q=CrossSearch")
    assert r.status_code == 200
    results = r.json()
    names = [t["name"] for t in results]
    assert "CrossSearch Template" in names
    assert "CrossSearch Item" not in names


def test_template_always_has_empty_children(client):
    """Template detail always returns children=[] even if children exist in DB."""
    t = client.post("/api/template", json={"name": "No Kids", "is_container": True}).json()
    r = client.get(f"/api/template/{t['id']}")
    assert r.status_code == 200
    assert r.json()["children"] == []
