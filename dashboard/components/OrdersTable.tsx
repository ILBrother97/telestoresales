'use client'

import { useState } from 'react'
import { Order, markOrderAsCompleted } from '@/lib/firebase'

interface OrdersTableProps {
  orders: Order[]
  sellerId: string
  onOrderUpdated: () => void
}

export default function OrdersTable({ orders, sellerId, onOrderUpdated }: OrdersTableProps) {
  const [updating, setUpdating] = useState<string | null>(null)

  const handleMarkCompleted = async (orderId: string) => {
    setUpdating(orderId)
    try {
      await markOrderAsCompleted(orderId)
      onOrderUpdated()
    } catch (error) {
      alert('Failed to update order status')
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }

  const formatItems = (items: Order['items']) => {
    if (!items || items.length === 0) return 'No items'
    return items.map(item => {
      const name = item.name || item.product_id || 'Unknown'
      return `${name} (x${item.quantity})`
    }).join(', ')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'new':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-500">No orders found for this seller.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.order_id} className="bg-white rounded-lg shadow p-3 text-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-medium text-gray-900">Order #{order.order_id.slice(0, 6)}</span>
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <span className="font-semibold text-gray-900">${order.total.toFixed(2)}</span>
          </div>
          
          <div className="text-gray-600 mb-2 truncate">
            {formatItems(order.items)}
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">{formatDate(order.timestamp)}</span>
            
            {(order.status === 'pending' || order.status === 'new') ? (
              <button
                onClick={() => handleMarkCompleted(order.order_id)}
                disabled={updating === order.order_id}
                className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {updating === order.order_id ? '...' : 'Complete'}
              </button>
            ) : (
              <span className="text-green-600 text-xs">✓ Done</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
