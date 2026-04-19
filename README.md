# TeleStore - Telegram Sales Bot

Turn your Telegram into an automated sales machine. Customers browse products, place orders, and you get instant notifications.

## Features

- **Product Catalog**: Customers browse via `/menu` with numbered products
- **Order Flow**: Select product → Quantity → Automatic order confirmation
- **Firebase Backend**: All data stored in Realtime Database
- **Admin Notifications**: Orders instantly posted to your admin channel/group
- **Owner Protection**: Seller commands locked to store owner only

## Commands

### Customer Commands
- `/start` - Start the bot
- `/menu` - Browse products and place orders
- `/health` - Check system status

### Seller/Owner Commands (Locked)
- `/addtestproduct` - Add sample product (testing)
- `/setadminchannel` - Set where order notifications go
- `/listproducts` - View your product list
- `/orders` - View recent orders (last 10)

## Quick Setup

### 1. Create Telegram Bot
- Message [@BotFather](https://t.me/botfather)
- Create new bot, copy token
- Run `/setprivacy` → Disable (so bot can receive messages in groups)
- Run `/setcommands` and paste the command list from above

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project → Enable Realtime Database
3. Copy database URL (looks like: `https://xxx.firebaseio.com/`)
4. Project Settings → Service Accounts → Generate Private Key
5. Download JSON file

### 3. Environment Variables
Create `.env` file:

```env
BOT_TOKEN=your_telegram_bot_token
STORE_SELLER_ID=your_telegram_user_id
FIREBASE_DB_URL=https://your-project.firebaseio.com/
FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccountKey.json
```

**Get your Telegram User ID:** Message [@userinfobot](https://t.me/userinfobot)

### 4. Install & Run

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run bot
python main.py
```

### 5. Configure Admin Channel
1. Create a Telegram group or channel
2. Add your bot as administrator
3. Send `/setadminchannel` in that group
4. Bot will confirm: "Admin channel set..."

## Database Schema

```
/sellers/{seller_id}/
  - admin_channel_id
  - products/{product_id}/
    - name
    - price
    - stock

/orders/{order_id}/
  - seller_id
  - customer_id
  - items[]
  - total
  - timestamp
  - status
```

## Deployment (Render)

1. Push code to GitHub
2. Create new Web Service on [Render](https://render.com)
3. Set environment variables in Render dashboard
4. Upload Firebase service account JSON as Secret File
5. Update `FIREBASE_CREDENTIALS_PATH` to match Render's file path

## Testing Order Flow

1. In bot DM or group: `/menu`
2. Reply with product number (e.g., `1`)
3. Reply with quantity (e.g., `2`)
4. Bot confirms with Order ID
5. Check admin channel for notification
6. Verify in Firebase Console → Realtime Database

## Support

- Telegram Bot API: https://core.telegram.org/bots/api
- python-telegram-bot docs: https://docs.python-telegram-bot.org/
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup

## License

MIT License - Built for Fiverr sales automation
