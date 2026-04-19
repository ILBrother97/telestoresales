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
    return new Date(timestamp * 1000).toLocaleString()
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
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.order_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.order_id.slice(0, 8)}...
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {formatItems(order.items)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${order.total.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(order.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {(order.status === 'pending' || order.status === 'new') && (
                    <button
                      onClick={() => handleMarkCompleted(order.order_id)}
                      disabled={updating === order.order_id}
                      className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                    >
                      {updating === order.order_id ? 'Updating...' : 'Mark Completed'}
                    </button>
                  )}
                  {order.status === 'completed' && (
                    <span className="text-green-600 text-xs">✓ Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
