import os
from typing import Any, Dict, Optional

import firebase_admin
from firebase_admin import credentials, db


_app: Optional[firebase_admin.App] = None


def init_firebase() -> None:
    global _app

    if _app is not None:
        return

    credentials_path = os.environ.get("FIREBASE_CREDENTIALS_PATH")
    database_url = os.environ.get("FIREBASE_DB_URL")

    if not credentials_path:
        raise RuntimeError("Missing env var FIREBASE_CREDENTIALS_PATH")

    if not database_url:
        raise RuntimeError("Missing env var FIREBASE_DB_URL")

    cred = credentials.Certificate(credentials_path)
    _app = firebase_admin.initialize_app(cred, {"databaseURL": database_url})


def sellers_ref() -> db.Reference:
    init_firebase()
    return db.reference("/sellers")


def orders_ref() -> db.Reference:
    init_firebase()
    return db.reference("/orders")


def set_admin_channel(*, seller_id: str, admin_channel_id: int) -> None:
    sellers_ref().child(seller_id).child("admin_channel_id").set(admin_channel_id)


def get_admin_channel_id(*, seller_id: str) -> Optional[int]:
    value = sellers_ref().child(seller_id).child("admin_channel_id").get()
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def get_seller_ids() -> list[str]:
    sellers = sellers_ref().get() or {}
    if not isinstance(sellers, dict):
        return []
    return list(sellers.keys())


def create_order(*, order_id: str, order: Dict[str, Any]) -> None:
    orders_ref().child(order_id).set(order)


def get_orders_by_seller(*, seller_id: str, limit: int = 10) -> Dict[str, Any]:
    all_orders = orders_ref().get() or {}
    if not isinstance(all_orders, dict):
        return {}
    seller_orders = {
        oid: o for oid, o in all_orders.items()
        if isinstance(o, dict) and o.get("seller_id") == seller_id
    }
    # Sort by timestamp descending (newest first) and limit
    sorted_orders = dict(
        sorted(
            seller_orders.items(),
            key=lambda x: x[1].get("timestamp", 0) if isinstance(x[1], dict) else 0,
            reverse=True
        )[:limit]
    )
    return sorted_orders


def upsert_product(
    *,
    seller_id: str,
    product_id: str,
    name: str,
    price: float,
    stock: Optional[int] = None,
) -> None:
    data: Dict[str, Any] = {
        "name": name,
        "price": price,
    }
    if stock is not None:
        data["stock"] = stock

    sellers_ref().child(seller_id).child("products").child(product_id).set(data)


def get_products(*, seller_id: str) -> Dict[str, Any]:
    products = sellers_ref().child(seller_id).child("products").get()
    return products or {}
