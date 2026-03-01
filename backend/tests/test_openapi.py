"""Tests for the OpenAPI schema endpoint."""


def test_openapi_json(client):
    r = client.get("/api/openapi.json")
    assert r.status_code == 200
    schema = r.json()
    assert schema["info"]["title"] == "crppr"
    assert schema["info"]["version"] == "0.1.0"
    assert "/api/items" in schema["paths"]
    assert "/api/health" in schema["paths"]
