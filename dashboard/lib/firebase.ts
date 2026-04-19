import { initializeApp, getApps, getApp } from 'firebase/app'
import { getDatabase, ref, get, update, query, orderByChild, equalTo } from 'firebase/database'

const firebaseConfig = {
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DB_URL,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
const db = getDatabase(app)

export interface Order {
  order_id: string
  seller_id: string
  customer_id: string
  items: Array<{
    product_id?: string
    name?: string
    price: number
    quantity: number
  }>
  total: number
  timestamp: number
  status: 'pending' | 'completed' | 'cancelled' | 'new'
}

export async function getOrdersBySeller(sellerId: string): Promise<Order[]> {
  const ordersRef = ref(db, 'orders')
  const snapshot = await get(ordersRef)
  
  if (!snapshot.exists()) {
    return []
  }

  const orders: Order[] = []
  snapshot.forEach((child) => {
    const order = child.val()
    if (order.seller_id === sellerId) {
      orders.push({
        order_id: child.key as string,
        ...order,
      })
    }
  })

  // Sort by timestamp descending (newest first)
  return orders.sort((a, b) => b.timestamp - a.timestamp)
}

export async function markOrderAsCompleted(orderId: string): Promise<void> {
  const orderRef = ref(db, `orders/${orderId}`)
  await update(orderRef, {
    status: 'completed',
  })
}

export { db }
