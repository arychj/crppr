from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import MetadataAttribute, MetadataValue
from ..schemas import MetadataAttributeCreate, MetadataAttributeOut, MetadataAttributeReorder

router = APIRouter(prefix="/metadata-attributes", tags=["metadata"])


@router.get("/", response_model=list[MetadataAttributeOut])
def list_attributes(db: Session = Depends(get_db)):
    return db.query(MetadataAttribute).order_by(MetadataAttribute.sort_order).all()


@router.post("/", response_model=MetadataAttributeOut, status_code=201)
def create_attribute(body: MetadataAttributeCreate, db: Session = Depends(get_db)):
    existing = db.query(MetadataAttribute).filter(MetadataAttribute.name == body.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Attribute name already exists")
    max_order = db.query(func.coalesce(func.max(MetadataAttribute.sort_order), -1)).scalar()
    attr = MetadataAttribute(name=body.name, datatype=body.datatype, sort_order=max_order + 1)
    db.add(attr)
    db.commit()
    db.refresh(attr)
    return attr


@router.put("/reorder", response_model=list[MetadataAttributeOut])
def reorder_attributes(body: MetadataAttributeReorder, db: Session = Depends(get_db)):
    """Set sort_order for each attribute based on position in the supplied list."""
    for idx, attr_id in enumerate(body.order):
        attr = db.get(MetadataAttribute, attr_id)
        if attr:
            attr.sort_order = idx
    db.commit()
    return db.query(MetadataAttribute).order_by(MetadataAttribute.sort_order).all()


@router.delete("/{attribute_id}", status_code=204)
def delete_attribute(attribute_id: int, db: Session = Depends(get_db)):
    attr = db.get(MetadataAttribute, attribute_id)
    if not attr:
        raise HTTPException(status_code=404, detail="Attribute not found")
    # Remove all values using this attribute
    db.query(MetadataValue).filter(MetadataValue.attribute_id == attribute_id).delete()
    db.delete(attr)
    db.commit()
    return None
