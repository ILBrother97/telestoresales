'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import OrdersTable from '@/components/OrdersTable'
import { Order, getOrdersBySeller } from '@/lib/firebase'

type Tab = 'orders' | 'products' | 'settings'

function DashboardContent() {
  const searchParams = useSearchParams()
  const sellerId = searchParams.get('seller')
  const [activeTab, setActiveTab] = useState<Tab>('orders')

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

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return (
          <>
            {loading && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                {error}
                <button onClick={fetchOrders} className="ml-4 text-red-800 underline">Retry</button>
              </div>
            )}
            {!loading && !error && (
              <OrdersTable orders={orders} sellerId={sellerId} onOrderUpdated={fetchOrders} />
            )}
          </>
        )
      case 'products':
        return (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">Products management coming soon!</p>
            <p className="text-sm text-gray-400 mt-2">Use /listproducts or /addtestproduct in bot chat</p>
          </div>
        )
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Bot Commands</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span>/listproducts</span>
                <span className="text-gray-500">View products</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>/addtestproduct</span>
                <span className="text-gray-500">Add sample product</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>/setadminchannel</span>
                <span className="text-gray-500">Set notifications</span>
              </div>
              <div className="flex justify-between py-2">
                <span>/orders</span>
                <span className="text-gray-500">View orders in chat</span>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">TeleStore</h1>
          <p className="text-sm text-gray-600">Seller: {sellerId}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4 bg-white rounded-lg p-1 shadow-sm">
          {(['orders', 'products', 'settings'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
