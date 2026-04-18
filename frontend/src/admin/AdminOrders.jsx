import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { ADMIN_SUPPORT_MESSAGE } from '../lib/errorMessages.js'

const STATUSES = ['placed', 'packed', 'shipped', 'delivered', 'cancelled']

function getOrderItemCount(order) {
  return (order.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  )
}

export default function AdminOrders() {
  const { authFetch } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingOrderNumber, setSavingOrderNumber] = useState(null)
  const [updatedOrder, setUpdatedOrder] = useState(null)
  const [expandedOrderNumber, setExpandedOrderNumber] = useState(null)
  const updatedTimerRef = useRef(null)
  const orderRefs = useRef(new Map())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await authFetch('/api/admin/orders')
      if (!r.ok) throw new Error(ADMIN_SUPPORT_MESSAGE)
      const data = await r.json()
      setOrders(data.orders ?? [])
    } catch {
      setError(ADMIN_SUPPORT_MESSAGE)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    const id = setTimeout(() => {
      void load()
    }, 0)
    return () => clearTimeout(id)
  }, [load])

  useEffect(() => {
    return () => {
      if (updatedTimerRef.current) {
        clearTimeout(updatedTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!expandedOrderNumber) return
    const node = orderRefs.current.get(expandedOrderNumber)
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [expandedOrderNumber])

  async function savePatch(orderNumber, body) {
    setSavingOrderNumber(orderNumber)
    try {
      const r = await authFetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
        { method: 'PATCH', body: JSON.stringify(body) }
      )
      if (!r.ok) {
        throw new Error(ADMIN_SUPPORT_MESSAGE)
      }
      const data = await r.json().catch(() => ({}))
      if (data.order) {
        setOrders((prev) =>
          prev.map((order) =>
            order.orderNumber === orderNumber ? data.order : order
          )
        )
      }
      setUpdatedOrder({
        orderNumber,
        status: data.order?.orderStatus || body.orderStatus,
      })
      if (updatedTimerRef.current) {
        clearTimeout(updatedTimerRef.current)
      }
      updatedTimerRef.current = setTimeout(() => {
        setUpdatedOrder(null)
      }, 1200)
    } finally {
      setSavingOrderNumber(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Loading orders...</p>
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm ring-1 ring-black/[0.02]">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
          Orders
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Review the order, delivery address, and item quantity before updating status.
        </p>
      </section>

      <div className="grid gap-3">
        {orders.map((o) => {
          const itemCount = getOrderItemCount(o)

          return (
          <article
            key={o.orderNumber}
            ref={(node) => {
              if (!node) {
                orderRefs.current.delete(o.orderNumber)
                return
              }
              orderRefs.current.set(o.orderNumber, node)
            }}
            className={`scroll-mt-[7.5rem] rounded-[28px] border border-stone-200 bg-white/95 p-3.5 shadow-sm ring-1 ring-black/[0.02] ${
              updatedOrder?.orderNumber === o.orderNumber
                ? `admin-order-flash admin-order-flash--${updatedOrder.status || o.orderStatus}`
                : ''
            }`}
          >
            <button
              type="button"
              onClick={() =>
                setExpandedOrderNumber((current) =>
                  current === o.orderNumber ? null : o.orderNumber
                )
              }
              className="flex w-full items-center justify-between gap-3 rounded-[22px] px-1 py-1 text-left sm:hidden"
              aria-expanded={expandedOrderNumber === o.orderNumber}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-mono text-sm font-semibold tracking-tight text-stone-950">
                    {o.orderNumber}
                  </p>
                  <StatusPill status={o.orderStatus} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                    {o.address?.fullName || 'Unknown customer'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Rs. {Number(o.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition ${
                  expandedOrderNumber === o.orderNumber ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>

            <div className="hidden sm:grid sm:gap-4 sm:grid-cols-[minmax(0,1fr)_320px] sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-mono text-sm font-semibold tracking-tight text-stone-950">
                    {o.orderNumber}
                  </p>
                  <StatusPill status={o.orderStatus} />
                  {o.trackingId ? (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      Tracking {o.trackingId}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                    {o.address?.fullName || 'Unknown customer'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
                    {o.address?.phone || 'No phone'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Rs. {Number(o.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="rounded-2xl bg-stone-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                      Delivery Address
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-stone-700">
                      <p className="font-semibold text-stone-950">
                        {o.address?.fullName}
                      </p>
                      <p>{o.address?.line1}</p>
                      {o.address?.line2 ? <p>{o.address.line2}</p> : null}
                      <p>
                        {o.address?.city}, {o.address?.state} {o.address?.pincode}
                      </p>
                      <p className="pt-1 text-stone-600">
                        Phone: {o.address?.phone}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-stone-50 p-3 sm:min-w-[180px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                      Order Totals
                    </p>
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-stone-600">Subtotal</span>
                        <span className="font-semibold text-stone-950">
                          Rs. {Number(o.subtotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-stone-600">Shipping</span>
                        <span className="font-semibold text-stone-950">
                          Rs. {Number(o.shipping).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-2">
                        <span className="font-semibold text-stone-900">Total</span>
                        <span className="font-semibold text-stone-900">
                          Rs. {Number(o.totalAmount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    Items ({itemCount})
                  </p>
                  <div className="mt-2 space-y-2">
                    {(o.items || []).map((item, idx) => (
                      <div
                        key={`${o.orderNumber}-${idx}`}
                        className="grid grid-cols-[72px_minmax(0,1fr)] gap-3.5 rounded-2xl border border-stone-200 bg-white px-3.5 py-3 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:gap-5"
                      >
                        <ItemThumb src={item.image} alt={item.name} />
                        <div className="min-w-0 self-center">
                          <p className="text-[1.1rem] font-semibold leading-snug text-stone-950 sm:text-base sm:whitespace-normal sm:break-words">
                            {item.name}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-stone-700 sm:text-xs sm:font-normal sm:text-stone-600">
                            <span>Quantity {item.quantity}</span>
                            <span className="text-stone-400">|</span>
                            <span>Rs. {Number(item.price).toLocaleString('en-IN')} each</span>
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center justify-between border-t border-stone-200 pt-2.5 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                            Line total
                          </p>
                          <p className="text-[15px] font-semibold text-stone-950 sm:text-sm">
                            Rs. {(item.quantity * item.price).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <OrderEditor
                key={`${o.orderNumber}-${o.orderStatus}-${o.trackingId || ''}`}
                order={o}
                onSave={savePatch}
                isSaving={savingOrderNumber === o.orderNumber}
              />
            </div>

            <div
              className={`mt-4 grid gap-4 sm:hidden ${
                expandedOrderNumber === o.orderNumber ? 'block' : 'hidden'
              }`}
            >
              <OrderDetails order={o} />
              <OrderEditor
                key={`${o.orderNumber}-${o.orderStatus}-${o.trackingId || ''}-mobile`}
                order={o}
                onSave={savePatch}
              isSaving={savingOrderNumber === o.orderNumber}
            />
          </div>
          </article>
          )
        })}
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-600">
          No orders yet.
        </p>
      ) : null}
    </div>
  )
}

function StatusPill({ status }) {
  const colors = {
    placed: 'bg-blue-100 text-blue-800',
    packed: 'bg-purple-100 text-purple-800',
    shipped: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
        colors[status] || 'bg-stone-100 text-stone-800'
      }`}
    >
      {status}
    </span>
  )
}

function ItemThumb({ src, alt }) {
  const [hasError, setHasError] = useState(false)
  const showImage = Boolean(src) && !hasError

  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-[linear-gradient(135deg,#f8f7f5_0%,#efebe4_100%)] p-2.5 shadow-sm ring-1 ring-black/[0.03] sm:h-[84px] sm:w-[84px] sm:p-3">
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          No image
        </div>
      )}
    </div>
  )
}

function OrderDetails({ order }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-stone-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Delivery Address
        </p>
        <div className="mt-2 space-y-1 text-sm text-stone-700">
          <p className="font-semibold text-stone-950">{order.address?.fullName}</p>
          <p>{order.address?.line1}</p>
          {order.address?.line2 ? <p>{order.address.line2}</p> : null}
          <p>
            {order.address?.city}, {order.address?.state} {order.address?.pincode}
          </p>
          <p className="pt-1 text-stone-600">Phone: {order.address?.phone}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-stone-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Order Totals
        </p>
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-600">Subtotal</span>
            <span className="font-semibold text-stone-950">
              Rs. {Number(order.subtotal).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-stone-600">Shipping</span>
            <span className="font-semibold text-stone-950">
              Rs. {Number(order.shipping).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-2">
            <span className="font-semibold text-stone-900">Total</span>
            <span className="font-semibold text-stone-900">
              Rs. {Number(order.totalAmount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Items
        </p>
        <div className="mt-2 space-y-2">
          {(order.items || []).map((item, idx) => (
            <div
              key={`${order.orderNumber}-${idx}`}
              className="grid grid-cols-[72px_minmax(0,1fr)] gap-3.5 rounded-2xl border border-stone-200 bg-white px-3.5 py-3 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center sm:gap-5"
            >
              <ItemThumb src={item.image} alt={item.name} />
              <div className="min-w-0 self-center">
                <p className="text-[1.02rem] font-semibold leading-snug text-stone-950 sm:text-sm sm:truncate">
                  {item.name}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[13px] font-semibold text-stone-700 sm:text-xs sm:font-normal sm:text-stone-600">
                  <span>Quantity {item.quantity}</span>
                  <span className="text-stone-400">|</span>
                  <span>Rs. {Number(item.price).toLocaleString('en-IN')} each</span>
                </div>
              </div>
              <div className="col-span-2 flex items-center justify-between border-t border-stone-200 pt-2 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                  Line total
                </p>
                <p className="text-sm font-semibold text-stone-950">
                  Rs. {(item.quantity * item.price).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OrderEditor({ order, onSave, isSaving }) {
  const [status, setStatus] = useState(() => order.orderStatus)
  const [trackingId, setTrackingId] = useState(() => order.trackingId || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function save() {
    setErr(null)
    setBusy(true)
    try {
      await onSave(order.orderNumber, {
        orderStatus: status,
        trackingId,
      })
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-[24px] bg-stone-50 p-3 sm:sticky sm:top-[7.75rem] sm:max-h-[calc(100svh-9rem)] sm:self-start sm:overflow-y-auto">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
        Admin controls
      </p>
      <div className="mt-3 space-y-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
          Status
        </label>
        <select
          className="w-full min-h-[46px] rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none transition focus:border-stone-400"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
          Tracking ID
        </label>
        <input
          className="w-full min-h-[46px] rounded-xl border border-stone-200 px-3 text-sm outline-none transition focus:border-stone-400"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="Courier tracking"
        />

        <button
          type="button"
          disabled={busy || isSaving}
          onClick={save}
          className="mt-1 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-stone-950 px-4 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy || isSaving ? 'Saving...' : 'Save'}
        </button>

        {err ? <p className="text-xs text-red-600">{err}</p> : null}
      </div>
    </div>
  )
}
