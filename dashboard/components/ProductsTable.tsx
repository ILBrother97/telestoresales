'use client'

import { Product } from '@/lib/firebase'

interface ProductsTableProps {
  products: Product[]
  sellerId: string
}

export default function ProductsTable({ products, sellerId }: ProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600 mb-2">No products found</p>
        <p className="text-sm text-gray-400">
          Use /addtestproduct in bot chat to add products
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <div key={product.product_id} className="bg-white rounded-lg shadow p-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>
            <span className="font-semibold text-indigo-600 ml-2">
              ${product.price.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between items-center mt-2 pt-2 border-t">
            <span className="text-xs text-gray-500">
              ID: {product.product_id.slice(0, 8)}...
            </span>
            {product.stock !== undefined && (
              <span className={`text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Stock: {product.stock}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
