"""Tests for metadata attributes and EAV values."""


def test_create_metadata_attribute(client):
    r = client.post("/api/metadata-attributes/", json={"name": "Weight", "datatype": "number"})
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Weight"
    assert data["datatype"] == "number"
    assert "sort_order" in data


def test_create_duplicate_attribute(client):
    client.post("/api/metadata-attributes/", json={"name": "Color"})
    r = client.post("/api/metadata-attributes/", json={"name": "Color"})
    assert r.status_code == 409


def test_list_metadata_attributes(client):
    client.post("/api/metadata-attributes/", json={"name": "Size"})
    client.post("/api/metadata-attributes/", json={"name": "Material"})
    r = client.get("/api/metadata-attributes/")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    # Returned in sort_order
    assert data[0]["name"] == "Size"
    assert data[0]["sort_order"] == 0
    assert data[1]["name"] == "Material"
    assert data[1]["sort_order"] == 1


def test_reorder_metadata_attributes(client):
    a = client.post("/api/metadata-attributes/", json={"name": "Alpha"}).json()
    b = client.post("/api/metadata-attributes/", json={"name": "Beta"}).json()
    c = client.post("/api/metadata-attributes/", json={"name": "Gamma"}).json()
    # Reverse order
    r = client.put("/api/metadata-attributes/reorder", json={"order": [c["id"], b["id"], a["id"]]})
    assert r.status_code == 200
    data = r.json()
    assert data[0]["name"] == "Gamma"
    assert data[1]["name"] == "Beta"
    assert data[2]["name"] == "Alpha"


def test_delete_metadata_attribute(client):
    attr = client.post("/api/metadata-attributes/", json={"name": "Temp"}).json()
    item = client.post("/api/items", json={"ident": "DEL1"}).json()
    client.post(f"/api/items/{item['id']}/metadata", json=[{"attribute_id": attr["id"], "value": "x"}])
    r = client.delete(f"/api/metadata-attributes/{attr['id']}")
    assert r.status_code == 204
    # Attribute is gone
    attrs = client.get("/api/metadata-attributes/").json()
    assert all(a["id"] != attr["id"] for a in attrs)


def test_set_item_metadata(client):
    item = client.post("/api/items", json={"ident": "M1"}).json()
    attr = client.post("/api/metadata-attributes/", json={"name": "Weight"}).json()

    r = client.post(
        f"/api/items/{item['id']}/metadata",
        json=[{"attribute_id": attr["id"], "value": "5kg"}],
    )
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["attribute_name"] == "Weight"
    assert data[0]["value"] == "5kg"


def test_update_existing_metadata(client):
    item = client.post("/api/items", json={"ident": "M2"}).json()
    attr = client.post("/api/metadata-attributes/", json={"name": "Color"}).json()

    # Set initial value
    client.post(
        f"/api/items/{item['id']}/metadata",
        json=[{"attribute_id": attr["id"], "value": "red"}],
    )
    # Update value
    r = client.post(
        f"/api/items/{item['id']}/metadata",
        json=[{"attribute_id": attr["id"], "value": "blue"}],
    )
    assert r.json()[0]["value"] == "blue"


def test_metadata_on_nonexistent_item(client):
    attr = client.post("/api/metadata-attributes/", json={"name": "Stuff"}).json()
    r = client.post(
        "/api/items/99999/metadata",
        json=[{"attribute_id": attr["id"], "value": "x"}],
    )
    assert r.status_code == 404


def test_metadata_with_nonexistent_attribute(client):
    item = client.post("/api/items", json={"ident": "M3"}).json()
    r = client.post(
        f"/api/items/{item['id']}/metadata",
        json=[{"attribute_id": 99999, "value": "x"}],
    )
    assert r.status_code == 404


def test_item_detail_includes_metadata(client):
    item = client.post("/api/items", json={"ident": "M4"}).json()
    attr = client.post("/api/metadata-attributes/", json={"name": "Brand"}).json()
    client.post(
        f"/api/items/{item['id']}/metadata",
        json=[{"attribute_id": attr["id"], "value": "Acme"}],
    )

    r = client.get(f"/api/items/{item['id']}")
    meta = r.json()["metadata"]
    assert len(meta) == 1
    assert meta[0]["attribute_name"] == "Brand"
    assert meta[0]["value"] == "Acme"
