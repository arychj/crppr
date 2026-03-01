"""
Address (materialized path) management service.

When an item's parent_id changes, its `address` and the `address`
of every descendant must be updated atomically.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Item


def compute_address(session: Session, item: Item) -> str:
    """
    Build the address for *item* based on its parent chain.
    Returns a dot-delimited string of internal IDs (e.g. "1.5.22").
    """
    if item.parent_id is None:
        return str(item.id)

    parent = session.get(Item, item.parent_id)
    if parent is None:
        return str(item.id)

    parent_address = parent.address or str(parent.id)
    return f"{parent_address}.{item.id}"


def set_address_for_new_item(session: Session, item: Item) -> None:
    """Call after INSERT + flush so item.id is populated."""
    item.address = compute_address(session, item)


def update_address_on_move(session: Session, item: Item, old_address: str) -> None:
    """
    After parent_id has been changed and the item has a new address,
    cascade-update every descendant whose address starts with the old prefix.
    """
    new_address = compute_address(session, item)
    item.address = new_address

    _update_descendant_paths(session, old_address, new_address)


def _update_descendant_paths(
    session: Session, old_path: str, new_path: str
) -> None:
    """
    Finds all items whose address starts with 'old_path.'
    and replaces that prefix with 'new_path.'.
    This is a single UPDATE … SET address = REPLACE(…) query — O(descendants).
    """
    session.query(Item).filter(
        Item.address.like(f"{old_path}.%")
    ).update(
        {Item.address: func.replace(Item.address, old_path + ".", new_path + ".")},
        synchronize_session=False,
    )
