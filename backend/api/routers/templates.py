from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime, timezone

from ..database import get_db
from ..models import Item, MetadataAttribute, MetadataValue
from ..schemas import (
    ItemCreate,
    ItemOut,
    ItemUpdate,
    MetadataValueOut,
    MetadataValueSet,
    MetadataValueCreate,
    ItemChildOut,
)

router = APIRouter()


def _template_to_out(item: Item) -> ItemOut:
    """Convert an ORM Item (template) to the response schema."""
    sorted_mvs = sorted(item.metadata_values, key=lambda mv: mv.attribute.sort_order)
    metadata = [
        MetadataValueOut(
            attribute_id=mv.attribute_id,
            attribute_name=mv.attribute.name,
            value=mv.value,
        )
        for mv in sorted_mvs
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
        children=[],
    )


# ── GET /template  — list all templates ─────────────────────────────

@router.get("/template", response_model=list[ItemOut])
def list_templates(db: Session = Depends(get_db)):
    templates = (
        db.query(Item)
        .filter(Item.is_template == True)
        .order_by(func.lower(Item.name))
        .all()
    )
    return [_template_to_out(t) for t in templates]


# ── GET /template/search  — search templates only ───────────────────

@router.get("/template/search", response_model=list[ItemOut])
def search_templates(
    q: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db),
):
    """Search templates by name, description, or metadata value."""
    pattern = f"%{q}%"

    metadata_item_ids = (
        db.query(MetadataValue.item_id)
        .filter(MetadataValue.value.ilike(pattern))
        .scalar_subquery()
    )

    templates = (
        db.query(Item)
        .filter(
            Item.is_template == True,
            or_(
                Item.name.ilike(pattern),
                Item.description.ilike(pattern),
                Item.id.in_(metadata_item_ids),
            ),
        )
        .limit(50)
        .all()
    )
    return [_template_to_out(t) for t in templates]


# ── GET /template/{id} ──────────────────────────────────────────────

@router.get("/template/{template_id}", response_model=ItemOut)
def get_template(template_id: int, db: Session = Depends(get_db)):
    item = db.get(Item, template_id)
    if not item:
        raise HTTPException(status_code=404, detail="Template not found")
    if not item.is_template:
        raise HTTPException(status_code=404, detail="Template not found")
    return _template_to_out(item)


# ── POST /template ──────────────────────────────────────────────────

@router.post("/template", response_model=ItemOut, status_code=201)
def create_template(body: ItemCreate, db: Session = Depends(get_db)):
    """Create a template item. Templates never have idents."""
    item = Item(
        ident=None,  # templates never get idents
        name=body.name,
        description=body.description,
        parent_id=None,  # templates have no location
        is_container=body.is_container,
        is_checked_out=False,
        is_template=True,
        address="",
        last_updated=datetime.now(timezone.utc),
    )
    db.add(item)
    db.flush()

    # Inline metadata
    if body.metadata:
        _apply_metadata_by_key(db, item.id, body.metadata)

    db.commit()
    db.refresh(item)
    return _template_to_out(item)


# ── PATCH /template/{id} ────────────────────────────────────────────

@router.patch("/template/{template_id}", response_model=ItemOut)
def update_template(template_id: int, body: ItemUpdate, db: Session = Depends(get_db)):
    item = db.get(Item, template_id)
    if not item:
        raise HTTPException(status_code=404, detail="Template not found")
    if not item.is_template:
        raise HTTPException(status_code=404, detail="Template not found")

    if body.name is not None:
        item.name = body.name
    if body.description is not None:
        item.description = body.description
    if body.is_container is not None:
        item.is_container = body.is_container

    # Templates never get idents
    # Templates are never checked out, moved, etc.

    item.last_updated = datetime.now(timezone.utc)
    db.flush()
    db.commit()
    db.refresh(item)
    return _template_to_out(item)


# ── DELETE /template/{id} ───────────────────────────────────────────

@router.delete("/template/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    item = db.get(Item, template_id)
    if not item:
        raise HTTPException(status_code=404, detail="Template not found")
    if not item.is_template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(item)
    db.commit()
    return None


# ── POST /template/{id}/metadata  — set metadata values ─────────────

@router.post("/template/{template_id}/metadata", response_model=list[MetadataValueOut])
def set_template_metadata(template_id: int, values: list[MetadataValueSet], db: Session = Depends(get_db)):
    item = db.get(Item, template_id)
    if not item:
        raise HTTPException(status_code=404, detail="Template not found")
    if not item.is_template:
        raise HTTPException(status_code=404, detail="Template not found")

    results = []
    for mv in values:
        attr = db.get(MetadataAttribute, mv.attribute_id)
        if not attr:
            raise HTTPException(status_code=404, detail=f"Attribute {mv.attribute_id} not found")

        existing = (
            db.query(MetadataValue)
            .filter(MetadataValue.item_id == template_id, MetadataValue.attribute_id == mv.attribute_id)
            .first()
        )
        if existing:
            existing.value = mv.value
            results.append(MetadataValueOut(attribute_id=attr.id, attribute_name=attr.name, value=mv.value))
        else:
            new_mv = MetadataValue(item_id=template_id, attribute_id=mv.attribute_id, value=mv.value)
            db.add(new_mv)
            results.append(MetadataValueOut(attribute_id=attr.id, attribute_name=attr.name, value=mv.value))

    item.last_updated = datetime.now(timezone.utc)
    db.commit()
    return results


# ── DELETE /template/{id}/metadata/{attr_id} ─────────────────────────

@router.delete("/template/{template_id}/metadata/{attribute_id}", status_code=204)
def delete_template_metadata(template_id: int, attribute_id: int, db: Session = Depends(get_db)):
    item = db.get(Item, template_id)
    if not item:
        raise HTTPException(status_code=404, detail="Template not found")
    if not item.is_template:
        raise HTTPException(status_code=404, detail="Template not found")
    mv = (
        db.query(MetadataValue)
        .filter(MetadataValue.item_id == template_id, MetadataValue.attribute_id == attribute_id)
        .first()
    )
    if mv:
        db.delete(mv)
        item.last_updated = datetime.now(timezone.utc)
        db.commit()
    return None


# ── helper ───────────────────────────────────────────────────────────

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
