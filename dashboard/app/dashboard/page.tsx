'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import OrdersTable from '@/components/OrdersTable'
import { Order, getOrdersBySeller } from '@/lib/firebase'

export default function Dashboard() {
  const searchParams = useSearchParams()
  const sellerId = searchParams.get('seller')

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!sellerId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await getOrdersBySeller(sellerId)
      setOrders(data)
    } catch (err) {
      setError('Failed to load orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [sellerId])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  if (!sellerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">TeleStore Dashboard</h1>
          <p className="text-gray-600 mb-4">
            Please provide your seller ID in the URL:
          </p>
          <code className="block bg-gray-100 p-3 rounded text-sm text-gray-800">
            /dashboard?seller=YOUR_SELLER_ID
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Orders Dashboard</h1>
          <p className="mt-2 text-gray-600">Seller ID: {sellerId}</p>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button
              onClick={fetchOrders}
              className="ml-4 text-red-800 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <OrdersTable
            orders={orders}
            sellerId={sellerId}
            onOrderUpdated={fetchOrders}
          />
        )}
      </div>
    </div>
  )
}
