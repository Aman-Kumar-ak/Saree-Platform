import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import MobileBackButton from '../components/MobileBackButton.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { apiUrl } from '../config/api.js'

export default function OrderConfirmation() {
  const { orderNumber: orderNumberParam } = useParams()
  const location = useLocation()
  const initial = location.state?.order ?? null
  const [order, setOrder] = useState(initial)
  const [loading, setLoading] = useState(() => !initial)
  const [error, setError] = useState(null)

  const orderNumber = orderNumberParam
    ? decodeURIComponent(orderNumberParam)
    : ''

  useEffect(() => {
    if (initial?.orderNumber === orderNumber) {
      return undefined
    }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch(
          apiUrl(`/api/orders/number/${encodeURIComponent(orderNumber)}`)
        )
        if (r.status === 404) {
          if (!cancelled) setError('Order not found.')
          return
        }
        if (!r.ok) throw new Error('failed')
        const data = await r.json()
        if (!cancelled) setOrder(data.order)
      } catch {
        if (!cancelled) setError('Could not load this order.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (orderNumber) run()
    return () => {
      cancelled = true
    }
  }, [orderNumber, initial])

  useEffect(() => {
    if (order?.orderNumber) {
      document.title = `Order ${order.orderNumber} · Shop`
    }
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [order])

  if (loading) {
    return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
        <LoadingState
          title="Loading order..."
          description="Fetching the order summary you requested."
        />
      </main>
    )
  }

  if (error || !order) {
    return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 pt-12 sm:px-6">
        <MobileBackButton to="/" label="Back to shop" />
        <p className="text-sm text-stone-600">{error || 'Order not found.'}</p>
      </main>
    )
  }

  const addr = order.address

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 pt-12 sm:px-6 sm:py-8">
      <MobileBackButton to="/" label="Back to shop" />
      <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950 sm:px-5">
        <p className="font-semibold">Order placed</p>
        <p className="mt-1 text-emerald-900/90">
          Thank you. Pay cash on delivery when your parcel arrives.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Order number
        </p>
        <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-stone-900">
          {order.orderNumber}
        </p>

        <div className="mt-6 space-y-2 border-t border-stone-100 pt-4 text-sm">
          <div className="flex justify-between gap-4 text-stone-600">
            <span>Subtotal</span>
            <span className="tabular-nums text-stone-900">
              ₹{Number(order.subtotal).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-stone-600">
            <span>Shipping</span>
            <span className="tabular-nums text-stone-900">
              ₹{Number(order.shipping).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-t border-stone-100 pt-3 text-base font-semibold text-stone-900">
            <span>Total (COD)</span>
            <span className="tabular-nums">
              ₹{Number(order.totalAmount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-stone-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Delivery
          </p>
          {addr ? (
            <address className="mt-2 text-sm not-italic leading-relaxed text-stone-700">
              {addr.fullName}
              <br />
              {addr.line1}
              {addr.line2 ? (
                <>
                  <br />
                  {addr.line2}
                </>
              ) : null}
              <br />
              {addr.city}, {addr.state} {addr.pincode}
              <br />
              <span className="text-stone-600">Phone: {addr.phone}</span>
            </address>
          ) : null}
        </div>

        <div className="mt-6 border-t border-stone-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Items
          </p>
          <ul className="mt-2 space-y-2 text-sm text-stone-700">
            {order.items?.map((it, i) => (
              <li key={`${it.productId}-${i}`} className="flex justify-between gap-2">
                <span className="min-w-0">
                  {it.name}{' '}
                  <span className="text-stone-400">×{it.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  ₹
                  {(Number(it.price) * it.quantity).toLocaleString('en-IN')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Link
        to="/"
        className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white no-underline [-webkit-tap-highlight-color:transparent] active:opacity-90"
      >
        Continue shopping
      </Link>
    </main>
  )
}
