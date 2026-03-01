from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Item
from ..schemas import IdentRequest, IdentResponse
from ..services.ident import next_available_ident

router = APIRouter(prefix="/ident", tags=["ident"])


# ── GET /ident/{ident}  — primary lookup by ident ──────────────────

@router.get("/{ident}")
def lookup_by_ident(ident: str, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.ident == ident).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return RedirectResponse(url=f"/api/item/{item.id}", status_code=307)


@router.post("/generate", response_model=IdentResponse)
def generate_ident(body: IdentRequest, db: Session = Depends(get_db)):
    base = 16 if body.format == "hex" else 10
    try:
        start = int(body.start, base)
        end = int(body.end, base)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid start/end for the selected format")
    result = next_available_ident(db, start, end, body.format, body.prefix, body.width)
    if result is None:
        return IdentResponse(ident=None, exhausted=True)
    return IdentResponse(ident=result, exhausted=False)
