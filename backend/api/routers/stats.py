from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from ..database import get_db
from ..models import Item

router = APIRouter()


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(sa_func.count(Item.id)).scalar() or 0
    containers = db.query(sa_func.count(Item.id)).filter(Item.is_container == True).scalar() or 0
    items = total - containers

    # Average items per container (children count for each container)
    avg_items_per_container = 0.0
    if containers > 0:
        avg_items_per_container = round(items / containers, 2)

    # Depth stats from address field: depth = number of '.' separators + 1
    # Address looks like "1.2.3" so depth = count of '.' + 1
    all_addresses = db.query(Item.address).all()
    depths = []
    for (addr,) in all_addresses:
        if addr:
            depth = addr.count(".") + 1
        else:
            depth = 1  # root-level item
        depths.append(depth)

    min_depth = min(depths) if depths else 0
    max_depth = max(depths) if depths else 0
    avg_depth = round(sum(depths) / len(depths), 2) if depths else 0.0

    return {
        "total": total,
        "containers": containers,
        "items": items,
        "avg_items_per_container": avg_items_per_container,
        "min_depth": min_depth,
        "max_depth": max_depth,
        "avg_depth": avg_depth,
    }
