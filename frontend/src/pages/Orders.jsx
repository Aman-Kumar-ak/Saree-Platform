import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import LoginPromptModal from '../components/LoginPromptModal.jsx'
import { apiUrl } from '../config/api.js'

const statusColors = {
  placed: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusIcons = {
  placed: '📦',
  packed: '📮',
  shipped: '🚚',
  delivered: '✓',
  cancelled: '✕',
}

export default function Orders() {
  const { user, ready, authFetch } = useAuth()
  const { addToast } = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState(null)

  useEffect(() => {
    document.title = 'My Orders · Shop'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [])

  useEffect(() => {
    if (ready && user) {
      fetchOrders()
    }
  }, [ready, user])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const r = await authFetch('/api/user/orders')
      if (!r.ok) throw new Error('Failed to fetch orders')
      const data = await r.json()
      setOrders(data.orders || [])
    } catch (error) {
      addToast('Failed to load orders', 'error', 3000)
    } finally {
      setLoading(false)
    }
  }

  // If not logged in
  if (ready && !user) {
    return <LoginPromptModal />
  }

  // Show loading state while checking auth
  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm text-stone-600">Loading...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold text-stone-900">My Orders</h1>
      <p className="mt-1 text-sm text-stone-600">
        Track and manage all your orders
      </p>

      {loading ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-stone-200 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-stone-600">No orders yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Start shopping to create your first order
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="rounded-lg border border-stone-200 bg-white shadow-sm hover:shadow-md transition"
            >
              {/* Order Header */}
              <button
                onClick={() =>
                  setExpandedOrder(
                    expandedOrder === order._id ? null : order._id
                  )
                }
                className="w-full px-5 py-4 text-left hover:bg-stone-50 transition flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold text-stone-900">
                      Order #{order.orderNumber}
                    </p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        statusColors[order.orderStatus] ||
                        'bg-stone-100 text-stone-800'
                      }`}
                    >
                      {statusIcons[order.orderStatus]} {order.orderStatus}
                    </span>
                  </div>
                  <div className="text-sm text-stone-600 space-y-1">
                    <p>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="font-medium text-stone-900">
                      ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`w-5 h-5 text-stone-600 transition-transform ${
                    expandedOrder === order._id ? 'rotate-180' : ''
                  }`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Order Details (Expanded) */}
              {expandedOrder === order._id && (
                <div className="border-t border-stone-200 px-5 py-4 space-y-6">
                  {/* Items */}
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-3">
                      Items ({order.items.length})
                    </h3>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 items-start py-2 border-b border-stone-100 last:border-0"
                        >
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-stone-600 mt-1">
                              Qty: {item.quantity} × ₹{Number(item.price).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-stone-900 flex-shrink-0">
                            ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="bg-stone-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Subtotal</span>
                      <span className="text-stone-900">
                        ₹{Number(order.subtotal).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-600">Shipping</span>
                      <span className="text-stone-900">
                        ₹{Number(order.shipping).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="border-t border-stone-200 pt-2 flex justify-between">
                      <span className="font-semibold text-stone-900">Total</span>
                      <span className="font-semibold text-stone-900">
                        ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-3">
                      Delivery Address
                    </h3>
                    <div className="bg-stone-50 rounded-lg p-4 text-sm space-y-1">
                      <p className="font-medium text-stone-900">
                        {order.address.fullName}
                      </p>
                      <p className="text-stone-600">{order.address.line1}</p>
                      {order.address.line2 && (
                        <p className="text-stone-600">{order.address.line2}</p>
                      )}
                      <p className="text-stone-600">
                        {order.address.city}, {order.address.state}{' '}
                        {order.address.pincode}
                      </p>
                      <p className="text-stone-600 mt-2">
                        Phone: {order.address.phone}
                      </p>
                    </div>
                  </div>

                  {/* Order Status Timeline */}
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-3">
                      Order Status
                    </h3>
                    <div className="space-y-3">
                      {order.statusHistory && order.statusHistory.length > 0 ? (
                        order.statusHistory.map((entry, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full bg-stone-900 mt-1.5" />
                              {idx < order.statusHistory.length - 1 && (
                                <div className="w-0.5 h-8 bg-stone-200 my-1" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-stone-900 capitalize">
                                {entry.status}
                              </p>
                              <p className="text-xs text-stone-600">
                                {new Date(entry.at).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-stone-600">
                          Status updates will appear here
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tracking Info */}
                  {order.trackingId && (
                    <div>
                      <h3 className="font-semibold text-stone-900 mb-2">
                        Tracking ID
                      </h3>
                      <p className="font-mono text-sm bg-stone-50 px-3 py-2 rounded text-stone-900">
                        {order.trackingId}
                      </p>
                    </div>
                  )}

                  {/* Payment Info */}
                  <div className="flex items-center justify-between bg-stone-50 rounded-lg p-4">
                    <div>
                      <p className="text-sm text-stone-600">Payment Method</p>
                      <p className="font-medium text-stone-900 capitalize">
                        {order.paymentMethod === 'cod'
                          ? 'Cash on Delivery'
                          : 'Prepaid'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-stone-600">Payment Status</p>
                      <span
                        className={`inline-block px-3 py-1 rounded text-xs font-semibold mt-1 ${
                          order.paymentStatus === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : order.paymentStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
