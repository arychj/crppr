from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Setting
from ..schemas import SettingOut, SettingUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

# Default values for known settings
_DEFAULTS = {
    "tagline": "a place for all your crap",
    "home_name": "Home",
    "base_url": "",
    "allowed_uris": "[]",
    "scan_no_match_redirect": "true",
    "ident_format": "dec",
    "ident_prefix": "",
    "ident_width": "0",
    "qr_size": "500",
    "qr_dots": "classy-rounded",
    "qr_foreground": "#000000",
    "qr_background": "#ffffff",
    "qr_type": "svg",
    "qr_margin": "10",
}


def _get_or_default(db: Session, key: str) -> SettingOut:
    row = db.get(Setting, key)
    if row:
        return SettingOut(key=row.key, value=row.value)
    return SettingOut(key=key, value=_DEFAULTS.get(key, ""))


@router.get("/", response_model=list[SettingOut])
def list_settings(db: Session = Depends(get_db)):
    """Return all known settings, using defaults for any not yet stored."""
    stored = {s.key: s.value for s in db.query(Setting).all()}
    result = []
    for key, default in _DEFAULTS.items():
        result.append(SettingOut(key=key, value=stored.get(key, default)))
    # Include any extra stored settings not in defaults
    for key, val in stored.items():
        if key not in _DEFAULTS:
            result.append(SettingOut(key=key, value=val))
    return result


@router.get("/{key}", response_model=SettingOut)
def get_setting(key: str, db: Session = Depends(get_db)):
    return _get_or_default(db, key)


@router.put("/{key}", response_model=SettingOut)
def set_setting(key: str, body: SettingUpdate, db: Session = Depends(get_db)):
    row = db.get(Setting, key)
    if row:
        row.value = body.value
    else:
        row = Setting(key=key, value=body.value)
        db.add(row)
    db.commit()
    db.refresh(row)
    return SettingOut(key=row.key, value=row.value)
