"""Import / Export endpoints — JSON and CSV formats."""

import csv
import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Item, MetadataAttribute, MetadataValue
from ..services.address import set_address_for_new_item, update_address_on_move

router = APIRouter(prefix="/inventory")


# ── Helpers ──────────────────────────────────────────────────────────

def _item_to_dict(item: Item) -> dict:
    """Flatten an Item + its metadata into a serialisable dict."""
    metadata = {}
    for mv in item.metadata_values:
        metadata[mv.attribute.name] = mv.value
    return {
        "ident": item.ident,
        "name": item.name,
        "description": item.description,
        "is_container": item.is_container,
        "is_checked_out": item.is_checked_out,
        "parent_ident": item.parent.ident if item.parent else None,
        "metadata": metadata,
    }


def _build_tree(db: Session) -> list[dict]:
    """Export all items as a flat list of dicts (parent referenced by ident)."""
    items = db.query(Item).order_by(Item.address).all()
    return [_item_to_dict(i) for i in items]


def _metadata_to_cell(metadata: dict) -> str:
    """Format metadata dict as 'key: value' lines for a single CSV cell."""
    if not metadata:
        return ""
    return "\n".join(f"{k}: {v}" for k, v in metadata.items())


def _cell_to_metadata(cell: str) -> dict:
    """Parse a CSV metadata cell ('key: value' per line) back to a dict."""
    if not cell or not cell.strip():
        return {}
    result = {}
    for line in cell.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        if ": " in line:
            key, value = line.split(": ", 1)
        elif ":" in line:
            key, value = line.split(":", 1)
        else:
            continue
        key = key.strip()
        value = value.strip()
        if key:
            result[key] = value
    return result


def _resolve_or_create_attr(db: Session, name: str) -> MetadataAttribute:
    """Get or create a MetadataAttribute by name."""
    attr = db.query(MetadataAttribute).filter(MetadataAttribute.name == name).first()
    if not attr:
        max_order = db.query(func.coalesce(func.max(MetadataAttribute.sort_order), -1)).scalar()
        attr = MetadataAttribute(name=name, datatype="text", sort_order=max_order + 1)
        db.add(attr)
        db.flush()
    return attr


def _import_items(db: Session, records: list[dict]) -> dict:
    """
    Import a list of item dicts.  Returns summary stats.

    Strategy: two passes.
      1. Create new items (skip any whose ident already exists).
      2. Wire up parent_id by ident and recompute addresses.
    """
    created = 0
    skipped = 0
    skipped_idents: list[str] = []
    ident_map: dict[str, Item] = {}

    # Pass 1: create new items, skip existing
    for rec in records:
        ident = rec.get("ident") or None  # normalise empty string to None

        if ident:
            item = db.query(Item).filter(Item.ident == ident).first()
            if item:
                # Already exists — skip
                skipped += 1
                skipped_idents.append(ident)
                ident_map[ident] = item
                continue

        item = Item(
            ident=ident,
            name=rec.get("name"),
            description=rec.get("description"),
            is_container=bool(rec.get("is_container", False)),
            is_checked_out=bool(rec.get("is_checked_out", False)),
            last_updated=datetime.now(timezone.utc),
        )
        db.add(item)
        db.flush()
        set_address_for_new_item(db, item)
        created += 1

        # Metadata (only for newly created items)
        meta = rec.get("metadata") or {}
        if isinstance(meta, str):
            meta = _cell_to_metadata(meta)
        for key, value in meta.items():
            attr = _resolve_or_create_attr(db, key)
            db.add(MetadataValue(item_id=item.id, attribute_id=attr.id, value=value))

        if ident:
            ident_map[ident] = item

    # Pass 2: wire parent relationships by ident (only for newly created items)
    for rec in records:
        ident = rec.get("ident") or None
        parent_ident = rec.get("parent_ident") or None
        if not ident or ident not in ident_map:
            continue
        item = ident_map[ident]
        # Only wire parents for items we just created
        if ident in skipped_idents:
            continue
        if parent_ident:
            parent = ident_map.get(parent_ident)
            if not parent:
                parent = db.query(Item).filter(Item.ident == parent_ident).first()
            if parent and item.parent_id != parent.id:
                old_address = item.address
                item.parent_id = parent.id
                db.flush()
                update_address_on_move(db, item, old_address)

    db.commit()
    return {"created": created, "skipped": skipped, "skipped_idents": skipped_idents}


# ── Export ───────────────────────────────────────────────────────────

@router.get("/export")
def export_inventory(
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
):
    """Export the full inventory as JSON or CSV."""
    data = _build_tree(db)

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ident", "name", "description", "is_container", "is_checked_out", "parent_ident", "metadata"])
        for row in data:
            writer.writerow([
                row["ident"],
                row["name"] or "",
                row["description"] or "",
                row["is_container"],
                row["is_checked_out"],
                row["parent_ident"] or "",
                _metadata_to_cell(row["metadata"]),
            ])
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=crppr-inventory.csv"},
        )

    # JSON
    return StreamingResponse(
        io.BytesIO(json.dumps(data, indent=2, default=str).encode()),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=crppr-inventory.json"},
    )


# ── Import ───────────────────────────────────────────────────────────

@router.post("/import")
async def import_inventory(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Import inventory from a JSON or CSV file.
    Format is auto-detected from the filename extension or content-type.
    """
    content = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith(".csv") or file.content_type == "text/csv":
        text = content.decode("utf-8-sig")  # handle BOM
        reader = csv.DictReader(io.StringIO(text))
        records = []
        for row in reader:
            rec = {
                "ident": row.get("ident", "").strip(),
                "name": row.get("name", "").strip() or None,
                "description": row.get("description", "").strip() or None,
                "is_container": row.get("is_container", "").strip().lower() in ("true", "1", "yes"),
                "is_checked_out": row.get("is_checked_out", "").strip().lower() in ("true", "1", "yes"),
                "parent_ident": row.get("parent_ident", "").strip() or None,
                "metadata": _cell_to_metadata(row.get("metadata", "")),
            }
            records.append(rec)
    elif filename.endswith(".json") or file.content_type == "application/json":
        try:
            records = json.loads(content)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")
        if not isinstance(records, list):
            raise HTTPException(status_code=400, detail="JSON must be an array of item objects")
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Use .json or .csv",
        )

    result = _import_items(db, records)
    return result
