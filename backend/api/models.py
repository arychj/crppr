from sqlalchemy import (
    Integer,
    Column,
    ForeignKey,
    Index,
    String,
    Text,
    Boolean,
    DateTime,
    func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ident = Column(String(64), unique=True, nullable=True, index=True)
    name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("items.id", ondelete="SET NULL"), nullable=True)
    address = Column(String(1024), nullable=False, default="", index=True)
    is_container = Column(Boolean, nullable=False, default=False)
    is_checked_out = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_viewed = Column(DateTime(timezone=True), nullable=True)
    last_updated = Column(DateTime(timezone=True), nullable=True)

    # relationships
    parent = relationship("Item", remote_side=[id], back_populates="children")
    children = relationship("Item", back_populates="parent", cascade="all")
    metadata_values = relationship("MetadataValue", back_populates="item", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_items_address_pattern", "address"),
    )


class MetadataAttribute(Base):
    __tablename__ = "metadata_attributes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    datatype = Column(String(50), nullable=False, default="text")  # text, number, date, boolean
    sort_order = Column(Integer, nullable=False, default=0)

    values = relationship("MetadataValue", back_populates="attribute")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(255), primary_key=True)
    value = Column(Text, nullable=True)


class MetadataValue(Base):
    __tablename__ = "metadata_values"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    attribute_id = Column(Integer, ForeignKey("metadata_attributes.id", ondelete="CASCADE"), nullable=False)
    value = Column(Text, nullable=True)

    item = relationship("Item", back_populates="metadata_values")
    attribute = relationship("MetadataAttribute", back_populates="values")

    __table_args__ = (
        Index("ix_metadata_values_item_attr", "item_id", "attribute_id", unique=True),
    )
