"""Tests for inventory import/export (JSON and CSV)."""

import csv
import io
import json


# ── Helpers ──────────────────────────────────────────────────────────

def _seed_tree(client):
    """Create a small inventory tree with metadata and return the created items."""
    # Root container
    root = client.post("/api/item", json={
        "ident": "ROOM-1",
        "name": "Living Room",
        "description": "Main living area",
        "is_container": True,
        "metadata": [{"key": "floor", "value": "1"}, {"key": "color", "value": "beige"}],
    }).json()

    # Child container
    shelf = client.post("/api/item", json={
        "ident": "SHELF-A",
        "name": "Bookshelf",
        "is_container": True,
        "parent_id": root["id"],
        "metadata": [{"key": "material", "value": "wood"}],
    }).json()

    # Leaf item
    book = client.post("/api/item", json={
        "ident": "BOOK-01",
        "name": "Python Cookbook",
        "description": "A great book",
        "parent_id": shelf["id"],
    }).json()

    return root, shelf, book


# ── JSON Export ──────────────────────────────────────────────────────

def test_export_json_empty(client):
    """Exporting empty inventory returns an empty JSON array."""
    r = client.get("/api/inventory/export?format=json")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/json")
    data = r.json()
    assert data == []


def test_export_json_with_data(client):
    """Exporting populated inventory returns all items with metadata."""
    root, shelf, book = _seed_tree(client)

    r = client.get("/api/inventory/export?format=json")
    assert r.status_code == 200
    data = r.json()

    assert len(data) == 3

    # Items are ordered by address (materialized path), so root first
    idents = [d["ident"] for d in data]
    assert "ROOM-1" in idents
    assert "SHELF-A" in idents
    assert "BOOK-01" in idents

    # Check metadata on root
    room = next(d for d in data if d["ident"] == "ROOM-1")
    assert room["metadata"]["floor"] == "1"
    assert room["metadata"]["color"] == "beige"
    assert room["parent_ident"] is None

    # Check parent linkage
    shelf_data = next(d for d in data if d["ident"] == "SHELF-A")
    assert shelf_data["parent_ident"] == "ROOM-1"

    book_data = next(d for d in data if d["ident"] == "BOOK-01")
    assert book_data["parent_ident"] == "SHELF-A"


def test_export_json_content_disposition(client):
    """JSON export has a proper Content-Disposition header."""
    _seed_tree(client)
    r = client.get("/api/inventory/export?format=json")
    assert "crppr-inventory.json" in r.headers.get("content-disposition", "")


# ── CSV Export ───────────────────────────────────────────────────────

def test_export_csv_empty(client):
    """CSV export of empty inventory has only the header row."""
    r = client.get("/api/inventory/export?format=csv")
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    reader = csv.reader(io.StringIO(r.text))
    rows = list(reader)
    assert len(rows) == 1  # header only
    assert rows[0] == ["ident", "name", "description", "is_container", "parent_ident", "metadata"]


def test_export_csv_with_data(client):
    """CSV export contains all items with metadata in a single cell."""
    _seed_tree(client)

    r = client.get("/api/inventory/export?format=csv")
    assert r.status_code == 200
    reader = csv.DictReader(io.StringIO(r.text))
    rows = list(reader)

    assert len(rows) == 3

    room = next(row for row in rows if row["ident"] == "ROOM-1")
    assert room["name"] == "Living Room"
    assert room["parent_ident"] == ""
    # Metadata cell should contain "floor: 1" and "color: beige"
    meta_lines = room["metadata"].strip().split("\n")
    meta_dict = {}
    for line in meta_lines:
        k, v = line.split(": ", 1)
        meta_dict[k] = v
    assert meta_dict["floor"] == "1"
    assert meta_dict["color"] == "beige"

    shelf = next(row for row in rows if row["ident"] == "SHELF-A")
    assert shelf["parent_ident"] == "ROOM-1"
    assert "material: wood" in shelf["metadata"]


def test_export_csv_content_disposition(client):
    """CSV export has a proper Content-Disposition header."""
    _seed_tree(client)
    r = client.get("/api/inventory/export?format=csv")
    assert "crppr-inventory.csv" in r.headers.get("content-disposition", "")


def test_export_invalid_format(client):
    """Invalid format query param returns 422."""
    r = client.get("/api/inventory/export?format=xml")
    assert r.status_code == 422


# ── JSON Import ──────────────────────────────────────────────────────

def test_import_json_creates_items(client):
    """Importing JSON creates new items with metadata and parent links."""
    payload = [
        {
            "ident": "IMP-1",
            "name": "Imported Room",
            "is_container": True,
            "metadata": {"zone": "north"},
        },
        {
            "ident": "IMP-2",
            "name": "Imported Shelf",
            "is_container": True,
            "parent_ident": "IMP-1",
            "metadata": {"height": "180cm"},
        },
        {
            "ident": "IMP-3",
            "name": "Imported Item",
            "parent_ident": "IMP-2",
        },
    ]

    r = client.post(
        "/api/inventory/import",
        files={"file": ("inventory.json", json.dumps(payload).encode(), "application/json")},
    )
    assert r.status_code == 200
    result = r.json()
    assert result["created"] == 3
    assert result["skipped"] == 0

    # Verify items exist with correct structure
    r = client.get("/api/inventory/export?format=json")
    data = r.json()
    assert len(data) == 3

    imp1 = next(d for d in data if d["ident"] == "IMP-1")
    assert imp1["name"] == "Imported Room"
    assert imp1["metadata"]["zone"] == "north"
    assert imp1["parent_ident"] is None

    imp2 = next(d for d in data if d["ident"] == "IMP-2")
    assert imp2["parent_ident"] == "IMP-1"
    assert imp2["metadata"]["height"] == "180cm"

    imp3 = next(d for d in data if d["ident"] == "IMP-3")
    assert imp3["parent_ident"] == "IMP-2"


def test_import_json_skips_existing(client):
    """Re-importing JSON skips existing items."""
    # Create initial item
    client.post("/api/item", json={"ident": "UPD-1", "name": "Original"})

    payload = [{"ident": "UPD-1", "name": "Updated Name"}]
    r = client.post(
        "/api/inventory/import",
        files={"file": ("data.json", json.dumps(payload).encode(), "application/json")},
    )
    assert r.status_code == 200
    assert r.json()["skipped"] == 1
    assert r.json()["created"] == 0
    assert "UPD-1" in r.json()["skipped_idents"]

    # Verify the item was NOT updated
    export = client.get("/api/inventory/export?format=json").json()
    item = next(d for d in export if d["ident"] == "UPD-1")
    assert item["name"] == "Original"


def test_import_json_skips_no_ident(client):
    """Items without an ident are skipped."""
    payload = [{"name": "No Ident Item"}]
    r = client.post(
        "/api/inventory/import",
        files={"file": ("data.json", json.dumps(payload).encode(), "application/json")},
    )
    assert r.status_code == 200
    assert r.json()["skipped"] == 1
    assert r.json()["created"] == 0
    assert "(no ident)" in r.json()["skipped_idents"]


def test_import_json_invalid(client):
    """Malformed JSON returns 400."""
    r = client.post(
        "/api/inventory/import",
        files={"file": ("bad.json", b"not json{{{", "application/json")},
    )
    assert r.status_code == 400


def test_import_json_not_array(client):
    """JSON that isn't an array returns 400."""
    r = client.post(
        "/api/inventory/import",
        files={"file": ("bad.json", json.dumps({"ident": "X"}).encode(), "application/json")},
    )
    assert r.status_code == 400


# ── CSV Import ───────────────────────────────────────────────────────

def _make_csv(rows: list[dict]) -> bytes:
    """Build CSV bytes from a list of row dicts."""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["ident", "name", "description", "is_container", "parent_ident", "metadata"])
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode()


def test_import_csv_creates_items(client):
    """Importing CSV creates items with parsed metadata."""
    csv_data = _make_csv([
        {
            "ident": "CSV-1",
            "name": "CSV Room",
            "description": "A room",
            "is_container": "True",
            "parent_ident": "",
            "metadata": "zone: north\nsize: large",
        },
        {
            "ident": "CSV-2",
            "name": "CSV Item",
            "description": "",
            "is_container": "False",
            "parent_ident": "CSV-1",
            "metadata": "color: red",
        },
    ])

    r = client.post(
        "/api/inventory/import",
        files={"file": ("inv.csv", csv_data, "text/csv")},
    )
    assert r.status_code == 200
    result = r.json()
    assert result["created"] == 2

    export = client.get("/api/inventory/export?format=json").json()
    csv1 = next(d for d in export if d["ident"] == "CSV-1")
    assert csv1["metadata"]["zone"] == "north"
    assert csv1["metadata"]["size"] == "large"

    csv2 = next(d for d in export if d["ident"] == "CSV-2")
    assert csv2["parent_ident"] == "CSV-1"
    assert csv2["metadata"]["color"] == "red"


def test_import_csv_skips_existing(client):
    """Re-importing CSV skips existing items."""
    client.post("/api/item", json={"ident": "CSVUPD-1", "name": "Old"})

    csv_data = _make_csv([{"ident": "CSVUPD-1", "name": "New", "description": "", "is_container": "False", "parent_ident": "", "metadata": ""}])
    r = client.post(
        "/api/inventory/import",
        files={"file": ("data.csv", csv_data, "text/csv")},
    )
    assert r.status_code == 200
    assert r.json()["skipped"] == 1
    assert "CSVUPD-1" in r.json()["skipped_idents"]

    # Verify the item was NOT updated
    export = client.get("/api/inventory/export?format=json").json()
    item = next(d for d in export if d["ident"] == "CSVUPD-1")
    assert item["name"] == "Old"


# ── Round-trip ───────────────────────────────────────────────────────

def test_roundtrip_json(client):
    """Export JSON → re-import → all items skipped (already exist)."""
    _seed_tree(client)

    # Export
    export1 = client.get("/api/inventory/export?format=json").json()
    assert len(export1) == 3

    # Import the same data (all idents already exist → all skipped)
    r = client.post(
        "/api/inventory/import",
        files={"file": ("rt.json", json.dumps(export1).encode(), "application/json")},
    )
    assert r.status_code == 200
    assert r.json()["skipped"] == 3
    assert r.json()["created"] == 0

    # Data unchanged
    export2 = client.get("/api/inventory/export?format=json").json()
    assert len(export2) == 3
    for e1, e2 in zip(export1, export2):
        assert e1["ident"] == e2["ident"]
        assert e1["name"] == e2["name"]
        assert e1["metadata"] == e2["metadata"]
        assert e1["parent_ident"] == e2["parent_ident"]


def test_roundtrip_csv(client):
    """Export CSV → re-import → all items skipped (already exist)."""
    _seed_tree(client)

    # Export as CSV
    csv_text = client.get("/api/inventory/export?format=csv").text

    # Re-import the CSV
    r = client.post(
        "/api/inventory/import",
        files={"file": ("rt.csv", csv_text.encode(), "text/csv")},
    )
    assert r.status_code == 200
    assert r.json()["skipped"] == 3
    assert r.json()["created"] == 0


def test_import_unsupported_format(client):
    """Uploading an unsupported file format returns 400."""
    r = client.post(
        "/api/inventory/import",
        files={"file": ("data.xml", b"<items/>", "application/xml")},
    )
    assert r.status_code == 400
