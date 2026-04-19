import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import LoginPromptModal from '../components/LoginPromptModal.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { CUSTOMER_RETRY_MESSAGE } from '../lib/errorMessages.js'

const statusColors = {
  placed: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels = {
  placed: 'Placed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
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

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const r = await authFetch('/api/user/orders')
      if (!r.ok) throw new Error('Failed to fetch orders')
      const data = await r.json()
      setOrders(data.orders || [])
    } catch {
      addToast(CUSTOMER_RETRY_MESSAGE, 'error', 3000)
    } finally {
      setLoading(false)
    }
  }, [authFetch, addToast])

  useEffect(() => {
    if (ready && user) {
      const id = setTimeout(() => {
        void fetchOrders()
      }, 0)
      return () => clearTimeout(id)
    }
  }, [ready, user, fetchOrders])

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime() || 0
      const bTime = new Date(b.createdAt || 0).getTime() || 0
      return bTime - aTime
    })
  }, [orders])

  // If not logged in
  if (ready && !user) {
    return <LoginPromptModal />
  }

  // Show loading state while checking auth
  if (!ready) {
    return (
      <LoadingState
        title="Loading orders..."
        description="Checking your account and order history."
      />
    )
  }

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-16 lg:pb-12">
      <div className="absolute inset-x-4 top-0 -z-10 h-40 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(28,25,23,0.08),_transparent_55%),radial-gradient(circle_at_top_right,_rgba(168,162,158,0.18),_transparent_45%)] blur-2xl sm:inset-x-6" />

      <section className="overflow-hidden rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
              My Orders
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
              Track your orders, review delivery progress, and open any order for the full breakdown.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="mt-6 pb-20 sm:pb-10 lg:pb-6">
          <LoadingState
            title="Loading orders..."
            description="Fetching your latest orders."
            className="min-h-[30svh]"
          />
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="mt-8 overflow-hidden rounded-[28px] border border-dashed border-stone-200 bg-white p-8 pb-20 text-center shadow-sm sm:pb-10 lg:pb-12">
          <p className="text-lg font-semibold text-stone-900">No orders yet</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Start shopping to create your first order. We'll show every receipt, status update, and delivery detail here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4 pb-20 sm:pb-10 lg:pb-6">
          {sortedOrders.map((order) => {
            const isExpanded = expandedOrder === order._id
            const itemCount = (order.items || []).reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0
            )

            return (
              <article
                key={order._id}
                className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm ring-1 ring-black/[0.02] transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedOrder(isExpanded ? null : order._id)
                  }
                  className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-stone-50/70 focus:outline-none focus-visible:ring-0 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold tracking-tight text-stone-950 sm:text-base">
                        Order #{order.orderNumber}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusColors[order.orderStatus] ||
                          'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {statusLabels[order.orderStatus] || order.orderStatus}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-stone-500 sm:text-base">
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="text-stone-300">-</span>
                      <span>
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="text-base font-semibold tracking-tight text-stone-950 sm:text-lg">
                      Rs. {Number(order.totalAmount).toLocaleString('en-IN')}
                    </p>
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-stone-600 transition ${
                        isExpanded ? 'rotate-180 bg-white' : ''
                      }`}
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M5.5 8l4.5 4 4.5-4" />
                      </svg>
                    </span>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="border-t border-stone-200/80 bg-stone-50/70 px-4 py-4 sm:px-5">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)] 2xl:grid-cols-[minmax(0,1.8fr)_minmax(360px,0.8fr)]">
                      <section className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
                          Items
                        </p>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                          {order.items.map((item, idx) => (
                            <div
                              key={`${order._id}-${idx}`}
                              className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-3 shadow-sm transition hover:shadow-md"
                            >
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                                />
                              ) : (
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                                  No image
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm font-semibold text-stone-950 sm:text-[15px]">
                                  {item.name}
                                </p>
                                <p className="mt-1 text-xs text-stone-500 sm:text-sm">
                                  Qty {item.quantity} x Rs. {Number(item.price).toLocaleString('en-IN')}
                                </p>
                              </div>
                              <p className="shrink-0 text-sm font-semibold text-stone-950 sm:text-base">
                                Rs. {(item.quantity * item.price).toLocaleString('en-IN')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <InfoCard
                          title="Delivery Address"
                          body={[
                            order.address.fullName,
                            order.address.line1,
                            order.address.line2,
                            `${order.address.city}, ${order.address.state} ${order.address.pincode}`,
                            `Phone: ${order.address.phone}`,
                          ].filter(Boolean)}
                        />

                        <InfoCard
                          title="Payment"
                          body={[
                            order.paymentMethod === 'cod'
                              ? 'Cash on Delivery'
                              : 'Prepaid',
                            `Status: ${order.paymentStatus}`,
                          ]}
                        />
                        {order.trackingId ? (
                          <InfoCard
                            title="Tracking ID"
                            body={[order.trackingId]}
                            mono
                          />
                        ) : null}
                      </section>
                    </div>

                    <div className="mt-4 rounded-3xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
                        Status history
                      </p>
                      <div className="mt-3 space-y-3">
                        {order.statusHistory?.length ? (
                          order.statusHistory.map((entry, idx) => (
                            <div key={`${order._id}-status-${idx}`} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <span className="mt-1.5 h-3 w-3 rounded-full bg-stone-900" />
                                {idx < order.statusHistory.length - 1 ? (
                                  <span className="my-1 h-8 w-px bg-stone-200" />
                                ) : null}
                              </div>
                              <div className="pb-1">
                                <p className="text-sm font-semibold capitalize text-stone-950">
                                  {entry.status}
                                </p>
                                <p className="mt-0.5 text-xs text-stone-500">
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
                            Status updates will appear here.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}

function InfoCard({ title, body, mono = false }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
        {title}
      </p>
      <div className={`mt-3 space-y-1 text-sm ${mono ? 'font-mono' : ''}`}>
        {body.map((line) => (
          <p key={line} className="text-stone-700">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
