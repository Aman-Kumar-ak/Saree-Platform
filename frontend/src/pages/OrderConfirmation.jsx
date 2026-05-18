import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState.jsx'
import { apiUrl } from '../config/api.js'

const RUPEE = String.fromCharCode(8377)
const moneyFormatter = new Intl.NumberFormat('en-IN')
const placedAtFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function formatMoney(value) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0
  return `${RUPEE}${moneyFormatter.format(safeValue)}`
}

function formatPaymentLabel(method) {
  if (String(method).toLowerCase() === 'cod') {
    return 'Cash on delivery'
  }
  return String(method || 'Payment pending')
}

function formatPlacedAt(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return placedAtFormatter.format(parsed)
}

function OrderSuccessIcon() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8a5537] shadow-[0_14px_32px_rgba(138,85,55,0.22)]">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-7 w-7 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
  )
}

function OrderItemCard({ item }) {
  const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0)

  return (
    <article className="rounded-[22px] border border-[#e4cfb3] bg-[#fffaf2] px-3 py-3 shadow-sm sm:px-4 sm:py-4">
      <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 sm:grid-cols-[88px_minmax(0,1fr)_124px] sm:items-center">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[16px] border border-[#e5c98f] bg-[#f4e7cf] p-1.5 ring-1 ring-black/[0.02]">
          <div className="h-full w-full overflow-hidden rounded-[11px] bg-[#ead9bd]">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full rounded-[11px] object-cover object-top"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[11px] text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                Item
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3 sm:block">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-stone-950 sm:text-[18px]">
                {item.name}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-stone-500 sm:mt-2 sm:gap-x-3 sm:text-[14px]">
                <span className="text-amber-700">{formatMoney(item.price)} each</span>
                <span className="text-stone-300">|</span>
                <span>
                  {item.quantity} item{item.quantity === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="shrink-0 text-right sm:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                Total
              </p>
              <p className="mt-1 text-[17px] font-semibold tracking-tight text-stone-950">
                {formatMoney(lineTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden text-right sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
            Total
          </p>
          <p className="mt-1 text-[22px] font-semibold tracking-tight text-stone-950">
            {formatMoney(lineTotal)}
          </p>
        </div>
      </div>
    </article>
  )
}

export default function OrderConfirmation() {
  const { orderNumber: orderNumberParam } = useParams()
  const location = useLocation()
  const initial = location.state?.order ?? null
  const [order, setOrder] = useState(initial)
  const [loading, setLoading] = useState(() => !initial)
  const [error, setError] = useState(null)

  const orderNumber = orderNumberParam ? decodeURIComponent(orderNumberParam) : ''

  useEffect(() => {
    if (initial?.orderNumber === orderNumber) {
      return undefined
    }
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          apiUrl(`/api/orders/number/${encodeURIComponent(orderNumber)}`)
        )
        if (response.status === 404) {
          if (!cancelled) setError('Order not found.')
          return
        }
        if (!response.ok) throw new Error('failed')
        const data = await response.json()
        if (!cancelled) setOrder(data.order)
      } catch {
        if (!cancelled) setError('Could not load this order.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (orderNumber) {
      void run()
    }
    return () => {
      cancelled = true
    }
  }, [orderNumber, initial])

  useEffect(() => {
    const title = import.meta.env.VITE_APP_TITLE ?? ''
    if (order?.orderNumber) {
      document.title = title
        ? `${title} - Order ${order.orderNumber}`
        : `Order ${order.orderNumber}`
    }
    return () => {
      const appTitle = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = appTitle ? `${appTitle} - Shop` : 'Shop'
    }
  }, [order])

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
        <LoadingState
          title="Loading order..."
          description="Fetching your placed order details."
        />
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
        <section className="rounded-[28px] border border-[#e0ccb0] bg-[#fffaf2] p-5 text-stone-700 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-700">
            Order
          </p>
          <p className="mt-3 text-base font-medium text-stone-900">
            {error || 'Order not found.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/orders"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#8a5537] px-5 text-sm font-semibold text-white no-underline transition hover:bg-[#74452c]"
            >
              View orders
            </Link>
            <Link
              to="/"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#dfcaad] bg-[#fffdf8] px-5 text-sm font-semibold text-stone-900 no-underline"
            >
              Continue shopping
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const addr = order.address
  const paymentLabel = formatPaymentLabel(order.paymentMethod)
  const placedAt = formatPlacedAt(order.createdAt)
  const subtotal = Number(order.subtotal) || 0
  const shipping = Number(order.shipping) || 0
  const totalAmount = Number(order.totalAmount) || 0
  const productCount = Array.isArray(order.items) ? order.items.length : 0
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    : 0

  return (
    <main className="relative mx-auto w-full max-w-lg px-4 pt-4 pb-[max(9rem,env(safe-area-inset-bottom))] sm:max-w-[1600px] sm:px-6 sm:pt-6 sm:pb-[max(7.5rem,env(safe-area-inset-bottom))]">
      <div className="absolute inset-x-4 top-0 -z-10 h-44 rounded-[2.25rem] bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_52%),radial-gradient(circle_at_top_right,_rgba(92,49,31,0.16),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.1),_transparent_34%)] blur-2xl sm:inset-x-6" />

      <section className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-[linear-gradient(180deg,#fffaf2,#fff7ed)] shadow-sm ring-1 ring-black/[0.02] sm:rounded-[2rem]">
        <div className="border-b border-stone-200/70 px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                Order placed
              </p>
              <h1 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-stone-950 sm:text-[2.5rem]">
                Your order is confirmed
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#dcc29f] bg-[#f3e4cb] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a451f]">
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#dcc29f] bg-[#fff7e8] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a451f]">
                {paymentLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="px-3 py-3 sm:px-6 sm:py-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <div className="space-y-5">
              <section className="rounded-[24px] border border-[#e0ccb0] bg-[#fffdf8] p-4 shadow-sm sm:rounded-[28px] sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <OrderSuccessIcon />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                        Success
                      </p>
                      <p className="mt-2 text-[1.15rem] font-semibold tracking-tight text-stone-950 sm:text-[1.4rem]">
                        Order {order.orderNumber}
                      </p>
                      {placedAt ? (
                        <p className="mt-2 text-sm text-stone-600">Placed on {placedAt}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                    <div className="rounded-[18px] border border-[#dfcaad] bg-[#fffaf2] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                        Products
                      </p>
                      <p className="mt-2 text-[1.55rem] font-semibold tracking-tight text-stone-950">
                        {productCount}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-[#dfcaad] bg-[#fffaf2] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                        Total
                      </p>
                      <p className="mt-2 text-[1.55rem] font-semibold tracking-tight text-stone-950">
                        {formatMoney(totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-[#e0ccb0] bg-[#fffdf8] shadow-sm sm:rounded-[28px]">
                <div className="border-b border-stone-200/70 px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                        Items
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-10 items-center rounded-full border border-[#dcc29f] bg-[#f3e4cb] px-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a451f]">
                        {productCount} product{productCount === 1 ? '' : 's'}
                      </span>
                      <span className="inline-flex h-10 items-center rounded-full border border-[#dcc29f] bg-[#fff7e8] px-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a451f]">
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-[#fffaf2] px-3 py-3 sm:space-y-4 sm:px-5 sm:py-4">
                  {order.items?.map((item, index) => (
                    <OrderItemCard key={`${item.productId}-${index}`} item={item} />
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
              <section className="rounded-[24px] border border-[#dcc6a7] bg-[#f7efe1] p-4 shadow-sm sm:rounded-[28px] sm:p-5">
                <div className="space-y-3 rounded-[22px] border border-[#dfcaad] bg-[#fffaf2] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                        Subtotal
                      </p>
                      <p className="mt-2 text-[1.95rem] font-semibold tracking-tight text-stone-950">
                        {formatMoney(subtotal)}
                      </p>
                    </div>

                    <div className="inline-flex items-center rounded-full border border-[#dcc29f] bg-[#f3e4cb] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a451f]">
                      {paymentLabel}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-stone-200/70 pt-3 text-sm">
                    <div className="flex items-center justify-between gap-4 text-stone-600">
                      <span>Shipping</span>
                      <span className="font-medium text-stone-900">
                        {formatMoney(shipping)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-base font-semibold text-stone-950">
                      <span>Total</span>
                      <span>{formatMoney(totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {addr ? (
                  <div className="mt-4 rounded-[22px] border border-[#dfcaad] bg-[#fffaf2] p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                      Delivery
                    </p>
                    <address className="mt-3 not-italic text-[15px] leading-7 text-stone-700">
                      <span className="block text-[18px] font-semibold tracking-tight text-stone-950">
                        {addr.fullName}
                      </span>
                      <span className="mt-2 block">{addr.line1}</span>
                      {addr.line2 ? <span className="block">{addr.line2}</span> : null}
                      <span className="block">
                        {addr.city}, {addr.state} {addr.pincode}
                      </span>
                      <span className="block">{addr.phone}</span>
                    </address>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <Link
                    to="/orders"
                    className="inline-flex min-h-[50px] items-center justify-center rounded-xl bg-[#8a5537] px-5 text-[15px] font-semibold text-white no-underline shadow-[0_16px_32px_rgba(138,85,55,0.18)] transition hover:bg-[#74452c]"
                  >
                    View orders
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex min-h-[50px] items-center justify-center rounded-xl border border-[#dfcaad] bg-[#fffdf8] px-5 text-[15px] font-semibold text-stone-900 no-underline"
                  >
                    Continue shopping
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
