"""Tests for the search endpoint."""


def test_search_by_name(client):
    client.post("/api/item", json={"ident": "S1", "name": "Red Toolbox"})
    client.post("/api/item", json={"ident": "S2", "name": "Blue Bin"})
    r = client.get("/api/item/search?q=toolbox")
    assert r.status_code == 200
    results = r.json()
    assert len(results) == 1
    assert results[0]["ident"] == "S1"


def test_search_by_ident(client):
    client.post("/api/item", json={"ident": "BOX-99", "name": "Storage"})
    r = client.get("/api/item/search?q=BOX-99")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["ident"] == "BOX-99"


def test_search_by_description(client):
    client.post("/api/item", json={"ident": "D1", "name": "Winter Box", "description": "Contains winter clothes"})
    r = client.get("/api/item/search?q=winter")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["ident"] == "D1"


def test_search_by_metadata_value(client):
    item = client.post("/api/item", json={"ident": "M1", "name": "Widget"}).json()
    attr = client.post("/api/metadata-attributes/", json={"name": "Color"}).json()
    client.post(
        f"/api/item/{item['id']}/metadata",
        json=[{"attribute_id": attr["id"], "value": "chartreuse"}],
    )
    r = client.get("/api/item/search?q=chartreuse")
    assert r.status_code == 200
    results = r.json()
    assert len(results) == 1
    assert results[0]["ident"] == "M1"


def test_search_case_insensitive(client):
    client.post("/api/item", json={"ident": "CI1", "name": "UPPERCASE NAME"})
    r = client.get("/api/item/search?q=uppercase")
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_search_no_results(client):
    client.post("/api/item", json={"ident": "NR1", "name": "Something"})
    r = client.get("/api/item/search?q=zzzznotfound")
    assert r.status_code == 200
    assert len(r.json()) == 0


def test_search_empty_query_rejected(client):
    r = client.get("/api/item/search?q=")
    assert r.status_code == 422  # validation error


def test_search_multiple_matches(client):
    client.post("/api/item", json={"ident": "MM1", "name": "Red Box"})
    client.post("/api/item", json={"ident": "MM2", "name": "Red Bin"})
    client.post("/api/item", json={"ident": "MM3", "name": "Blue Box"})
    r = client.get("/api/item/search?q=red")
    assert r.status_code == 200
    idents = {i["ident"] for i in r.json()}
    assert idents == {"MM1", "MM2"}
