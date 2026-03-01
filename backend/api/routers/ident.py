from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import IdentRequest, IdentResponse
from ..services.ident import next_available_ident

router = APIRouter(prefix="/ident", tags=["ident"])


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
