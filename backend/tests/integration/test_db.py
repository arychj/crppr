"""
Integration tests that exercise SQLAlchemy model constraints, cascades,
and relationships directly against a per-test SQLite database.
"""

import pytest

from api.models import Item, MetadataAttribute, MetadataValue, Setting


# ── Constraints ──────────────────────────────────────────────────────


def test_ident_unique_constraint(sqlite_db):
    """Duplicate non-null idents violate the unique constraint."""
    sqlite_db.add(Item(ident="DUP", name="First", address=""))
    sqlite_db.commit()

    sqlite_db.add(Item(ident="DUP", name="Second", address=""))
    with pytest.raises(Exception):  # IntegrityError
        sqlite_db.commit()
    sqlite_db.rollback()


def test_multiple_ghosts_allowed(sqlite_db):
    """Multiple items with ident=None can coexist (null != null)."""
    sqlite_db.add_all([
        Item(name="Ghost A", address=""),
        Item(name="Ghost B", address=""),
    ])
    sqlite_db.commit()

    ghosts = sqlite_db.query(Item).filter(Item.ident.is_(None)).all()
    assert len(ghosts) == 2


def test_attribute_name_unique(sqlite_db):
    """Duplicate attribute names violate the unique constraint."""
    sqlite_db.add(MetadataAttribute(name="Weight", datatype="number", sort_order=0))
    sqlite_db.commit()

    sqlite_db.add(MetadataAttribute(name="Weight", datatype="text", sort_order=1))
    with pytest.raises(Exception):
        sqlite_db.commit()
    sqlite_db.rollback()


def test_metadata_unique_per_item_attribute(sqlite_db):
    """Only one value per (item_id, attribute_id) pair is allowed."""
    attr = MetadataAttribute(name="Color", datatype="text", sort_order=0)
    item = Item(ident="MU-1", name="Thing", address="")
    sqlite_db.add_all([attr, item])
    sqlite_db.commit()

    sqlite_db.add(MetadataValue(item_id=item.id, attribute_id=attr.id, value="Red"))
    sqlite_db.commit()

    sqlite_db.add(MetadataValue(item_id=item.id, attribute_id=attr.id, value="Blue"))
    with pytest.raises(Exception):
        sqlite_db.commit()
    sqlite_db.rollback()


# ── Relationships ────────────────────────────────────────────────────


def test_parent_child_relationship(sqlite_db):
    """Setting parent_id establishes the parent ↔ children relationship."""
    parent = Item(ident="PAR", name="Parent", is_container=True, address="1")
    sqlite_db.add(parent)
    sqlite_db.commit()

    child = Item(ident="CHD", name="Child", parent_id=parent.id, address=f"{parent.id}.2")
    sqlite_db.add(child)
    sqlite_db.commit()
    sqlite_db.refresh(parent)

    assert len(parent.children) == 1
    assert parent.children[0].ident == "CHD"
    assert child.parent.ident == "PAR"


def test_address_materialized_path(sqlite_db):
    """Address field stores the dot-separated materialized path and supports
    LIKE prefix queries for finding descendants."""
    root = Item(ident="R", is_container=True, address="")
    sqlite_db.add(root)
    sqlite_db.commit()
    root.address = str(root.id)
    sqlite_db.commit()

    mid = Item(ident="M", is_container=True, parent_id=root.id, address="")
    sqlite_db.add(mid)
    sqlite_db.commit()
    mid.address = f"{root.id}.{mid.id}"
    sqlite_db.commit()

    leaf = Item(ident="L", parent_id=mid.id, address="")
    sqlite_db.add(leaf)
    sqlite_db.commit()
    leaf.address = f"{root.id}.{mid.id}.{leaf.id}"
    sqlite_db.commit()

    prefix = f"{root.id}.%"
    descendants = sqlite_db.query(Item).filter(Item.address.like(prefix)).all()
    idents = {d.ident for d in descendants}
    assert idents == {"M", "L"}


# ── Cascades ─────────────────────────────────────────────────────────


def test_cascade_delete_children(sqlite_db):
    """Deleting a parent cascades to its children."""
    parent = Item(ident="CDEL-P", name="Parent", is_container=True, address="1")
    sqlite_db.add(parent)
    sqlite_db.commit()

    child = Item(ident="CDEL-C", name="Child", parent_id=parent.id, address=f"{parent.id}.2")
    sqlite_db.add(child)
    sqlite_db.commit()
    child_id = child.id

    sqlite_db.delete(parent)
    sqlite_db.commit()

    assert sqlite_db.get(Item, child_id) is None


def test_metadata_cascade_on_item_delete(sqlite_db):
    """Deleting an item cascades to its MetadataValue rows."""
    attr = MetadataAttribute(name="Size", datatype="text", sort_order=0)
    item = Item(ident="MVC-1", name="Box", address="")
    sqlite_db.add_all([attr, item])
    sqlite_db.commit()

    mv = MetadataValue(item_id=item.id, attribute_id=attr.id, value="Large")
    sqlite_db.add(mv)
    sqlite_db.commit()
    mv_id = mv.id

    sqlite_db.delete(item)
    sqlite_db.commit()

    assert sqlite_db.get(MetadataValue, mv_id) is None


# ── Setting model ────────────────────────────────────────────────────


def test_setting_crud(sqlite_db):
    """Settings table stores key/value pairs."""
    sqlite_db.add(Setting(key="theme", value="dark"))
    sqlite_db.commit()

    setting = sqlite_db.get(Setting, "theme")
    assert setting.value == "dark"

    setting.value = "light"
    sqlite_db.commit()
    sqlite_db.refresh(setting)
    assert setting.value == "light"
