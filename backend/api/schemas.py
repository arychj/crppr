from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Item ────────────────────────────────────────────────────────────

class ItemBase(BaseModel):
    ident: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    is_container: bool = False
    is_checked_out: bool = False


class MetadataValueCreate(BaseModel):
    """For inline metadata on item creation — key (name) + value."""
    key: str
    value: Optional[str] = None


class ItemCreate(ItemBase):
    """If ident is null the server will auto-generate one."""
    metadata: list[MetadataValueCreate] = []


class ItemUpdate(BaseModel):
    ident: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None  # triggers address recalculation
    is_container: Optional[bool] = None
    is_checked_out: Optional[bool] = None


class MetadataValueOut(BaseModel):
    attribute_id: int
    attribute_name: str
    value: Optional[str] = None

    model_config = {"from_attributes": True}


class ItemOut(BaseModel):
    id: int
    ident: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    address: str
    is_container: bool
    is_checked_out: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    metadata: list[MetadataValueOut] = []
    children: list["ItemChildOut"] = []

    model_config = {"from_attributes": True}


class ItemChildOut(BaseModel):
    id: int
    ident: Optional[str] = None
    name: Optional[str] = None
    is_container: bool
    is_checked_out: bool = False

    model_config = {"from_attributes": True}


# ── Breadcrumb ──────────────────────────────────────────────────────

class BreadcrumbSegment(BaseModel):
    id: int
    ident: Optional[str] = None
    name: Optional[str] = None


# ── Metadata Attribute ──────────────────────────────────────────────

class MetadataAttributeCreate(BaseModel):
    name: str
    datatype: str = "text"


class MetadataAttributeOut(BaseModel):
    id: int
    name: str
    datatype: str
    sort_order: int = 0

    model_config = {"from_attributes": True}


class MetadataAttributeReorder(BaseModel):
    """List of attribute IDs in desired sort order."""
    order: list[int]


# ── Metadata Value ──────────────────────────────────────────────────

class MetadataValueSet(BaseModel):
    attribute_id: int
    value: Optional[str] = None


# ── Settings ────────────────────────────────────────────────────────

class SettingOut(BaseModel):
    key: str
    value: Optional[str] = None

    model_config = {"from_attributes": True}


class SettingUpdate(BaseModel):
    value: Optional[str] = None


# ── Ident Generator ────────────────────────────────────────────────

class IdentRequest(BaseModel):
    start: str
    end: str
    format: str = "dec"
    prefix: str = ""
    width: int = 0


class IdentResponse(BaseModel):
    ident: Optional[str] = None
    exhausted: bool = False


# ── Move ────────────────────────────────────────────────────────────

class MoveRequest(BaseModel):
    item_ident: str
    destination_ident: str


class MoveResponse(BaseModel):
    id: int
    ident: Optional[str] = None
    name: Optional[str] = None
    parent_id: Optional[int] = None
    destination_ident: Optional[str] = None
    destination_name: Optional[str] = None
