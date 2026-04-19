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

export interface Product {
  product_id: string
  name: string
  price: number
  description?: string
  stock?: number
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

export async function getProductsBySeller(sellerId: string): Promise<Product[]> {
  const productsRef = ref(db, `sellers/${sellerId}/products`)
  const snapshot = await get(productsRef)
  
  if (!snapshot.exists()) {
    return []
  }

  const products: Product[] = []
  snapshot.forEach((child) => {
    const product = child.val()
    products.push({
      product_id: child.key as string,
      name: product.name || 'Unnamed Product',
      price: product.price || 0,
      description: product.description,
      stock: product.stock,
    })
  })

  return products
}

export { db }
