import os
import time
import uuid

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)
from telegram.request import HTTPXRequest

import firebase_service


load_dotenv()


SELECTING_PRODUCT = 1
ENTERING_QUANTITY = 2


async def _send(update: Update, context: ContextTypes.DEFAULT_TYPE, text: str) -> None:
    if update.effective_chat is None:
        return
    await context.bot.send_message(chat_id=update.effective_chat.id, text=text)


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        err = context.error
        if update is not None and isinstance(update, Update) and update.effective_chat is not None:
            await context.bot.send_message(chat_id=update.effective_chat.id, text=f"Error: {err}")
    except Exception:
        return


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.effective_user is None:
        return

    await _send(
        update,
        context,
        "TeleStore is live!\n\nCustomers: /menu to browse & order\n\nSeller Commands:\n/setadminchannel - Set order notifications\n/addtestproduct - Add sample product\n/listproducts - View your products\n/orders - View recent orders",
    )


async def health(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        firebase_service.init_firebase()
        await _send(update, context, "Firebase connected.")
    except Exception as e:
        await _send(update, context, f"Firebase error: {e}")


def _seller_id_from_update(update: Update) -> str:
    if update.effective_user is None:
        raise RuntimeError("No effective_user")
    return str(update.effective_user.id)


def _store_seller_id() -> str:
    store_seller_id = os.environ.get("STORE_SELLER_ID")
    if not store_seller_id:
        raise RuntimeError("Missing env var STORE_SELLER_ID")
    return str(store_seller_id)


async def _require_store_owner(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    if update.effective_user is None:
        await _send(update, context, "Error: missing user.")
        return False

    if str(update.effective_user.id) != _store_seller_id():
        await _send(update, context, "This command is only available to the store owner.")
        return False

    return True


def _pick_seller_id_for_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> str:
    return _store_seller_id()


async def set_admin_channel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        if update.effective_chat is None:
            raise RuntimeError("No effective_chat")

        if not await _require_store_owner(update, context):
            return

        seller_id = _seller_id_from_update(update)
        firebase_service.set_admin_channel(seller_id=seller_id, admin_channel_id=update.effective_chat.id)
        await _send(
            update,
            context,
            f"Admin channel set to chat_id={update.effective_chat.id}. New orders will be posted here.",
        )
    except Exception as e:
        await _send(update, context, f"Error: {e}")


async def add_test_product(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        if not await _require_store_owner(update, context):
            return

        seller_id = _seller_id_from_update(update)
        product_id = str(uuid.uuid4())

        firebase_service.upsert_product(
            seller_id=seller_id,
            product_id=product_id,
            name="Test Product",
            price=9.99,
            stock=10,
        )

        await _send(update, context, f"Added product {product_id} under /sellers/{seller_id}/products")
    except Exception as e:
        await _send(update, context, f"Error: {e}")


async def menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        if update.message is None:
            return ConversationHandler.END

        seller_id = _pick_seller_id_for_menu(update, context)
        products = firebase_service.get_products(seller_id=seller_id)

        if not products:
            await _send(update, context, "No products available.")
            return ConversationHandler.END

        numbered: list[tuple[str, dict]] = []
        for pid, pdata in products.items():
            if isinstance(pdata, dict):
                numbered.append((pid, pdata))
        if not numbered:
            await _send(update, context, "No products available.")
            return ConversationHandler.END

        numbered.sort(key=lambda x: str(x[1].get("name", "")))

        mapping: dict[str, str] = {}
        lines: list[str] = []
        for idx, (pid, pdata) in enumerate(numbered, start=1):
            name = pdata.get("name")
            price = pdata.get("price")
            lines.append(f"{idx}) {name} - {price}")
            mapping[str(idx)] = pid

        context.user_data["menu_seller_id"] = seller_id
        context.user_data["menu_mapping"] = mapping

        await _send(update, context, "\n".join(lines) + "\n\nReply with the product number.")
        return SELECTING_PRODUCT
    except Exception as e:
        await _send(update, context, f"Error: {e}")
        return ConversationHandler.END


async def select_product(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        if update.message is None or update.message.text is None:
            return ConversationHandler.END

        mapping = context.user_data.get("menu_mapping")
        if not isinstance(mapping, dict):
            await _send(update, context, "Please use /menu first.")
            return ConversationHandler.END

        choice = update.message.text.strip()
        product_id = mapping.get(choice)
        if not product_id:
            await _send(update, context, "Invalid selection. Reply with a number from the menu.")
            return SELECTING_PRODUCT

        seller_id = context.user_data.get("menu_seller_id")
        if not isinstance(seller_id, str):
            await _send(update, context, "Please use /menu again.")
            return ConversationHandler.END

        products = firebase_service.get_products(seller_id=seller_id)
        product = products.get(product_id)
        if not isinstance(product, dict):
            await _send(update, context, "Product not found. Please use /menu again.")
            return ConversationHandler.END

        context.user_data["selected_product_id"] = product_id
        context.user_data["selected_product"] = product

        await _send(update, context, "How many?")
        return ENTERING_QUANTITY
    except Exception as e:
        await _send(update, context, f"Error: {e}")
        return ConversationHandler.END


async def enter_quantity(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        if update.message is None or update.message.text is None:
            return ConversationHandler.END

        qty_text = update.message.text.strip()
        if not qty_text.isdigit():
            await _send(update, context, "Please send a number quantity (e.g. 1, 2, 3).")
            return ENTERING_QUANTITY

        quantity = int(qty_text)
        if quantity <= 0:
            await _send(update, context, "Quantity must be at least 1.")
            return ENTERING_QUANTITY

        if update.effective_user is None:
            await _send(
                update,
                context,
                "Please send messages as yourself (not as a channel/anonymous). Try ordering in private chat with the bot.",
            )
            return ConversationHandler.END

        seller_id = context.user_data.get("menu_seller_id")
        product_id = context.user_data.get("selected_product_id")
        product = context.user_data.get("selected_product")
        if not isinstance(seller_id, str) or not isinstance(product_id, str) or not isinstance(product, dict):
            await _send(update, context, "Please use /menu again.")
            return ConversationHandler.END

        price = float(product.get("price", 0))
        total = price * quantity

        order_id = str(uuid.uuid4())
        order = {
            "seller_id": seller_id,
            "customer_id": str(update.effective_user.id),
            "items": [
                {
                    "product_id": product_id,
                    "quantity": quantity,
                    "price": price,
                }
            ],
            "total": total,
            "timestamp": int(time.time()),
            "status": "new",
        }

        firebase_service.create_order(order_id=order_id, order=order)

        await _send(update, context, f"Order confirmed. Order ID: {order_id}")

        admin_channel_id = firebase_service.get_admin_channel_id(seller_id=seller_id)
        if admin_channel_id is not None:
            name = product.get("name")
            await context.bot.send_message(
                chat_id=admin_channel_id,
                text=(
                    "New order\n"
                    f"Order ID: {order_id}\n"
                    f"Customer: {update.effective_user.id}\n"
                    f"Item: {name} ({product_id})\n"
                    f"Qty: {quantity}\n"
                    f"Total: {total}"
                ),
            )

        context.user_data.pop("selected_product_id", None)
        context.user_data.pop("selected_product", None)
        return ConversationHandler.END
    except Exception as e:
        await _send(update, context, f"Error: {e}")
        return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await _send(update, context, "Cancelled.")
    return ConversationHandler.END


async def orders(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        if not await _require_store_owner(update, context):
            return

        seller_id = _store_seller_id()
        orders_data = firebase_service.get_orders_by_seller(seller_id=seller_id, limit=10)

        if not orders_data:
            await _send(update, context, "No orders found.")
            return

        lines = ["Recent Orders:"]
        for order_id, order in orders_data.items():
            total = order.get("total", 0)
            status = order.get("status", "unknown")
            ts = order.get("timestamp", 0)
            from datetime import datetime
            time_str = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M") if ts else "N/A"
            lines.append(f"\nOrder ID: {order_id[:8]}...\nTotal: ${total} | Status: {status} | {time_str}")

        await _send(update, context, "\n".join(lines))
    except Exception as e:
        await _send(update, context, f"Error: {e}")


async def list_products(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        if not await _require_store_owner(update, context):
            return

        seller_id = _store_seller_id()
        products = firebase_service.get_products(seller_id=seller_id)

        if not products:
            await _send(update, context, "No products found.")
            return

        lines = []
        for pid, p in products.items():
            name = p.get("name")
            price = p.get("price")
            stock = p.get("stock")
            if stock is None:
                lines.append(f"{pid}: {name} - {price}")
            else:
                lines.append(f"{pid}: {name} - {price} (stock: {stock})")

        await _send(update, context, "\n".join(lines))
    except Exception as e:
        await _send(update, context, f"Error: {e}")


def main() -> None:
    token = os.environ.get("BOT_TOKEN")
    if not token:
        raise RuntimeError("Missing env var BOT_TOKEN")

    request = HTTPXRequest(
        connection_pool_size=8,
        connect_timeout=30,
        read_timeout=30,
        write_timeout=30,
        pool_timeout=30,
    )
    app = Application.builder().token(token).request(request).build()

    order_flow = ConversationHandler(
        entry_points=[CommandHandler("menu", menu)],
        states={
            SELECTING_PRODUCT: [MessageHandler(filters.TEXT & ~filters.COMMAND, select_product)],
            ENTERING_QUANTITY: [MessageHandler(filters.TEXT & ~filters.COMMAND, enter_quantity)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        per_chat=True,
        per_user=False,
        name="order_flow",
        persistent=False,
    )

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("health", health))
    app.add_handler(CommandHandler("setadminchannel", set_admin_channel))
    app.add_handler(CommandHandler("addtestproduct", add_test_product))
    app.add_handler(CommandHandler("listproducts", list_products))
    app.add_handler(CommandHandler("orders", orders))
    app.add_handler(order_flow)

    app.add_error_handler(on_error)

    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
