from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from ..database import get_db
from ..models import Item, MetadataAttribute, MetadataValue
from ..schemas import (
    BreadcrumbSegment,
    ItemChildOut,
    ItemCreate,
    ItemOut,
    ItemUpdate,
    MetadataValueOut,
    MetadataValueSet,
    MetadataValueCreate,
    MoveRequest,
    MoveResponse,
)
from ..services.address import set_address_for_new_item, update_address_on_move
from ..services.ident import next_available_ident
from datetime import datetime, timezone

router = APIRouter()

# ── Default ident generation settings ────────────────────────────────
_IDENT_START = 1
_IDENT_END = 99999
_IDENT_FMT = "dec"
_IDENT_PREFIX = ""


def _item_to_out(item: Item) -> ItemOut:
    """Convert an ORM Item to the response schema."""
    sorted_mvs = sorted(item.metadata_values, key=lambda mv: mv.attribute.sort_order)
    metadata = [
        MetadataValueOut(
            attribute_id=mv.attribute_id,
            attribute_name=mv.attribute.name,
            value=mv.value,
        )
        for mv in sorted_mvs
    ]
    sorted_children = sorted(
        (c for c in item.children if not c.is_template),
        key=lambda c: (not c.is_container, (c.name or "").lower()),
    )
    children = [
        ItemChildOut(
            id=c.id,
            ident=c.ident,
            name=c.name,
            is_container=c.is_container,
            is_checked_out=c.is_checked_out,
            is_template=c.is_template,
        )
        for c in sorted_children
    ]
    return ItemOut(
        id=item.id,
        ident=item.ident,
        name=item.name,
        description=item.description,
        parent_id=item.parent_id,
        address=item.address,
        is_container=item.is_container,
        is_checked_out=item.is_checked_out,
        is_template=item.is_template,
        created_at=item.created_at,
        updated_at=item.updated_at,
        last_updated=item.last_updated,
        metadata=metadata,
        children=children,
    )


# ── GET /item  — list root items (no parent) ───────────────────────

@router.get("/item", response_model=list[ItemOut])
def list_items(db: Session = Depends(get_db)):
    items = (
        db.query(Item)
        .filter(Item.parent_id.is_(None), Item.is_template == False)
        .order_by(Item.is_container.desc(), func.lower(Item.name))
        .all()
    )
    return [_item_to_out(i) for i in items]


# ── GET /item/recent  — last 10 viewed items ───────────────────────

@router.get("/item/recent", response_model=list[ItemOut])
def recent_items(db: Session = Depends(get_db)):
    items = (
        db.query(Item)
        .filter(Item.last_viewed.isnot(None), Item.is_template == False)
        .order_by(Item.last_viewed.desc())
        .limit(10)
        .all()
    )
    return [_item_to_out(i) for i in items]


# ── GET /item/search  — full-text search across all fields ─────────
# NOTE: Must be defined BEFORE /item/{item_id} to avoid path conflict.

@router.get("/item/search", response_model=list[ItemOut])
def search_items(
    q: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db),
):
    """
    Search items by ident, name, description, or any metadata value.
    Returns items matching the query (case-insensitive LIKE).
    """
    pattern = f"%{q}%"

    # IDs of items that match via metadata values
    metadata_item_ids = (
        db.query(MetadataValue.item_id)
        .filter(MetadataValue.value.ilike(pattern))
        .scalar_subquery()
    )

    items = (
        db.query(Item)
        .filter(
            Item.is_template == False,
            or_(
                Item.ident.ilike(pattern),
                Item.name.ilike(pattern),
                Item.description.ilike(pattern),
                Item.id.in_(metadata_item_ids),
            )
        )
        .limit(50)
        .all()
    )
    return [_item_to_out(i) for i in items]


# ── POST /item/move  — move item to a new container by ident ───────

@router.post("/item/move", response_model=MoveResponse)
def move_item(body: MoveRequest, db: Session = Depends(get_db)):
    """Move an item to a different container, specified by idents."""
    item = db.query(Item).filter(Item.ident == body.item_ident).first()
    if not item:
        raise HTTPException(status_code=404, detail=f'Item with ident "{body.item_ident}" not found')

    dest = db.query(Item).filter(Item.ident == body.destination_ident).first()
    if not dest:
        raise HTTPException(status_code=404, detail=f'Destination with ident "{body.destination_ident}" not found')

    if dest.is_template:
        raise HTTPException(status_code=400, detail="Cannot move items into a template")

    if not dest.is_container:
        raise HTTPException(status_code=400, detail=f'Destination "{body.destination_ident}" is not a container')

    if item.id == dest.id:
        raise HTTPException(status_code=400, detail="Cannot move an item into itself")

    # Prevent moving a container under one of its own descendants
    if dest.address and item.address and dest.address.startswith(item.address):
        raise HTTPException(status_code=400, detail="Cannot move a container under one of its own descendants")

    old_address = item.address
    item.parent_id = dest.id
    item.last_updated = datetime.now(timezone.utc)
    db.flush()

    update_address_on_move(db, item, old_address)

    db.commit()
    db.refresh(item)
    return MoveResponse(
        id=item.id,
        ident=item.ident,
        name=item.name,
        parent_id=item.parent_id,
        destination_ident=dest.ident,
        destination_name=dest.name,
    )


# ── GET /item/{id} ─────────────────────────────────────────────────

@router.get("/item/{item_id}", response_model=ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.is_template:
        raise HTTPException(status_code=404, detail="Item not found")
    # Touch last_viewed
    item.last_viewed = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return _item_to_out(item)


# ── POST /item ─────────────────────────────────────────────────────

@router.post("/item", response_model=ItemOut, status_code=201)
def create_item(body: ItemCreate, db: Session = Depends(get_db)):
    ident = body.ident or None  # normalise empty string to None

    if ident:
        # Reject duplicate idents
        if db.query(Item).filter(Item.ident == ident).first():
            raise HTTPException(status_code=409, detail=f'An item with ident "{ident}" already exists')

    # Validate parent exists and is not a template
    if body.parent_id is not None:
        parent = db.get(Item, body.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent item not found")
        if parent.is_template:
            raise HTTPException(status_code=400, detail="Cannot add children to a template")

    item = Item(
        ident=ident,
        name=body.name,
        description=body.description,
        parent_id=body.parent_id,
        is_container=body.is_container,
        is_checked_out=body.is_checked_out,
        is_template=False,  # items created via /item are never templates
        last_updated=datetime.now(timezone.utc),
    )
    db.add(item)
    db.flush()  # populates item.id

    set_address_for_new_item(db, item)

    # Inline metadata
    if body.metadata:
        _apply_metadata_by_key(db, item.id, body.metadata)

    db.commit()
    db.refresh(item)
    return _item_to_out(item)


# ── PATCH /item/{id} ───────────────────────────────────────────────

@router.patch("/item/{item_id}", response_model=ItemOut)
def update_item(item_id: int, body: ItemUpdate, db: Session = Depends(get_db)):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.is_template:
        raise HTTPException(status_code=404, detail="Item not found")

    parent_changed = False
    old_address = item.address

    # Ident update — allow setting, changing, or clearing
    if "ident" in body.model_fields_set:
        new_ident = body.ident or None  # normalise empty string to None
        if new_ident and new_ident != item.ident:
            if db.query(Item).filter(Item.ident == new_ident).first():
                raise HTTPException(status_code=409, detail=f'An item with ident "{new_ident}" already exists')
        item.ident = new_ident

    if body.name is not None:
        item.name = body.name
    if body.description is not None:
        item.description = body.description
    if body.is_container is not None:
        item.is_container = body.is_container
    if body.is_checked_out is not None:
        item.is_checked_out = body.is_checked_out

    # Touch last_updated for any field change
    item.last_updated = datetime.now(timezone.utc)
    if body.parent_id is not None or (body.parent_id is None and "parent_id" in body.model_fields_set):
        if body.parent_id is not None:
            parent = db.get(Item, body.parent_id)
            if not parent:
                raise HTTPException(status_code=404, detail="Parent item not found")
            if parent.is_template:
                raise HTTPException(status_code=400, detail="Cannot add children to a template")
            # Prevent moving an item under itself
            if parent.address and parent.address.startswith(item.address):
                raise HTTPException(status_code=400, detail="Cannot move an item under itself")
        if item.parent_id != body.parent_id:
            item.parent_id = body.parent_id
            parent_changed = True

    db.flush()

    if parent_changed:
        update_address_on_move(db, item, old_address)

    db.commit()
    db.refresh(item)
    return _item_to_out(item)


# ── GET /item/{id}/path  — breadcrumb trail ────────────────────────

@router.get("/item/{item_id}/path", response_model=list[BreadcrumbSegment])
def get_item_path(item_id: int, db: Session = Depends(get_db)):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.is_template:
        raise HTTPException(status_code=404, detail="Item not found")

    ids_in_path = [int(seg) for seg in item.address.split(".") if seg]
    ancestors = db.query(Item).filter(Item.id.in_(ids_in_path)).all()
    ancestor_map = {a.id: a for a in ancestors}

    breadcrumbs = []
    for aid in ids_in_path:
        a = ancestor_map.get(aid)
        if a:
            breadcrumbs.append(BreadcrumbSegment(id=a.id, ident=a.ident, name=a.name))

    return breadcrumbs


# ── PUT /item/{id}/image  — stub ───────────────────────────────────

@router.put("/item/{item_id}/image")
def upload_image(item_id: int):
    return {"status": "not_implemented"}


# ── POST /item/{id}/metadata  — set metadata values ────────────────

def _apply_metadata_by_key(db: Session, item_id: int, entries: list[MetadataValueCreate]):
    """Resolve key names to attribute IDs (creating if needed) and upsert values."""
    for entry in entries:
        attr = db.query(MetadataAttribute).filter(MetadataAttribute.name == entry.key).first()
        if not attr:
            max_order = db.query(func.coalesce(func.max(MetadataAttribute.sort_order), -1)).scalar()
            attr = MetadataAttribute(name=entry.key, datatype="text", sort_order=max_order + 1)
            db.add(attr)
            db.flush()
        existing = (
            db.query(MetadataValue)
            .filter(MetadataValue.item_id == item_id, MetadataValue.attribute_id == attr.id)
            .first()
        )
        if existing:
            existing.value = entry.value
        else:
            db.add(MetadataValue(item_id=item_id, attribute_id=attr.id, value=entry.value))


@router.post("/item/{item_id}/metadata", response_model=list[MetadataValueOut])
def set_metadata(item_id: int, values: list[MetadataValueSet], db: Session = Depends(get_db)):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.is_template:
        raise HTTPException(status_code=404, detail="Item not found")

    results = []
    for mv in values:
        attr = db.get(MetadataAttribute, mv.attribute_id)
        if not attr:
            raise HTTPException(status_code=404, detail=f"Attribute {mv.attribute_id} not found")

        existing = (
            db.query(MetadataValue)
            .filter(MetadataValue.item_id == item_id, MetadataValue.attribute_id == mv.attribute_id)
            .first()
        )
        if existing:
            existing.value = mv.value
            results.append(MetadataValueOut(attribute_id=attr.id, attribute_name=attr.name, value=mv.value))
        else:
            new_mv = MetadataValue(item_id=item_id, attribute_id=mv.attribute_id, value=mv.value)
            db.add(new_mv)
            results.append(MetadataValueOut(attribute_id=attr.id, attribute_name=attr.name, value=mv.value))

    # Touch last_updated when metadata changes
    item.last_updated = datetime.now(timezone.utc)
    db.commit()
    return results


# ── DELETE /item/{id}/metadata/{attr_id}  — remove a metadata value ─

@router.delete("/item/{item_id}/metadata/{attribute_id}", status_code=204)
def delete_metadata_value(item_id: int, attribute_id: int, db: Session = Depends(get_db)):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.is_template:
        raise HTTPException(status_code=404, detail="Item not found")
    mv = (
        db.query(MetadataValue)
        .filter(MetadataValue.item_id == item_id, MetadataValue.attribute_id == attribute_id)
        .first()
    )
    if mv:
        db.delete(mv)
        item.last_updated = datetime.now(timezone.utc)
        db.commit()
    return None
