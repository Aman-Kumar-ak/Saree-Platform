import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import LoginPromptModal from '../components/LoginPromptModal.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
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

const moneyFormatter = new Intl.NumberFormat('en-IN')
const shortDateFormatter = new Intl.DateTimeFormat('en-IN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const orderJourneySteps = ['placed', 'packed', 'shipped', 'delivered']

function parseTimestamp(value) {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function formatRupee(value) {
  const amount = Number(value)
  return `Rs. ${moneyFormatter.format(Number.isFinite(amount) ? amount : 0)}`
}

function formatOrderDate(value) {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return 'Date unavailable'
  return shortDateFormatter.format(new Date(timestamp))
}

function formatOrderDateTime(value) {
  const timestamp = parseTimestamp(value)
  if (!timestamp) return 'Time unavailable'
  return dateTimeFormatter.format(new Date(timestamp))
}

function formatLabel(value, fallback = 'Unknown') {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function getOrderStatusLabel(status) {
  return statusLabels[status] || formatLabel(status)
}

function getPaymentMethodLabel(method) {
  return String(method || '').toLowerCase() === 'cod'
    ? 'Cash on delivery'
    : formatLabel(method, 'Payment pending')
}

function getOrderItemCount(order) {
  return (order.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  )
}

function getOrderItemsTotal(items = []) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0)
    const price = Number(item.price || 0)
    return sum + quantity * price
  }, 0)
}

function getOrderTimestamp(order) {
  return (
    parseTimestamp(order.createdAt) ||
    parseTimestamp(order.updatedAt) ||
    parseTimestamp(order.statusHistory?.[0]?.at) ||
    0
  )
}

function formatCityStatePincode(address = {}) {
  const cityState = [address.city, address.state].filter(Boolean).join(', ')
  return [cityState, address.pincode].filter(Boolean).join(' ')
}

function SummaryChip({ children, tone = 'stone' }) {
  const toneClasses = {
    stone: 'border-stone-200 bg-white text-stone-700',
    amber: 'border-[#dcc29f] bg-[#fff7e8] text-[#7a451f]',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-green-200 bg-green-50 text-green-700',
  }

  return (
    <span
      className={`inline-flex min-h-10 items-center rounded-full border px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.01em] sm:text-[13px] ${toneClasses[tone] || toneClasses.stone}`}
    >
      {children}
    </span>
  )
}

function OrderMetaTag({ children, tone = 'stone' }) {
  const toneClasses = {
    stone: 'border-stone-200 bg-white/90 text-stone-600',
    amber: 'border-[#e5c98f] bg-[#fff4e4] text-[#7a451f]',
  }

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-[12px] font-medium shadow-sm ring-1 ring-black/[0.02] ${
        toneClasses[tone] || toneClasses.stone
      }`}
    >
      {children}
    </span>
  )
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
        statusColors[status] || 'bg-stone-100 text-stone-800'
      }`}
    >
      {getOrderStatusLabel(status)}
    </span>
  )
}

function MetricCard({ label, value, accent = false }) {
  return (
    <div
      className={`rounded-[26px] border px-4 py-4 shadow-sm transition ${
        accent
          ? 'border-[#d7b38c] bg-[#8a5537] text-white shadow-[0_14px_30px_rgba(138,85,55,0.14)]'
          : 'border-stone-200 bg-white/90 text-stone-950'
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.32em] ${
          accent ? 'text-[#f6e4d5]' : 'text-stone-500'
        }`}
      >
        {label}
      </p>
      <p className="mt-2 whitespace-nowrap text-[1.2rem] font-semibold tracking-tight sm:text-[1.8rem]">
        {value}
      </p>
    </div>
  )
}

function SnapshotMetric({ label, value }) {
  return (
    <div className="rounded-[22px] border border-[#e1ccb0] bg-[#efdfc4] px-4 py-4 shadow-sm ring-1 ring-black/[0.02]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
        {label}
      </p>
      <p className="mt-2 text-[1.2rem] font-semibold tracking-tight text-stone-950 sm:text-[1.35rem]">
        {value}
      </p>
    </div>
  )
}

function SnapshotRow({ label, value, mono = false, emphasis = false }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className={emphasis ? 'font-semibold text-stone-900' : 'text-stone-500'}>
        {label}
      </span>
      <span
        className={`text-right ${mono ? 'font-mono' : ''} ${
          emphasis ? 'font-semibold text-stone-950' : 'font-medium text-stone-900'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function OrderProgressCard({ order, itemCount, paymentMethodLabel }) {
  const currentStepIndex = Math.max(
    0,
    orderJourneySteps.indexOf(order.orderStatus)
  )

  if (order.orderStatus === 'cancelled') {
    return (
      <section className="overflow-hidden rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,#fff5f4,#fffdfc)] shadow-sm">
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-red-500">
                Order update
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-950 sm:text-[1.45rem]">
                This order was cancelled
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                Placed on {formatOrderDateTime(order.createdAt)}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SummaryChip tone="stone">
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </SummaryChip>
              <SummaryChip tone="amber">{paymentMethodLabel}</SummaryChip>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#dfcaad] bg-[linear-gradient(180deg,#fffaf2,#fffdf8)] shadow-sm">
      <div className="border-b border-stone-200/70 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-700">
              Order progress
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-950 sm:text-[1.45rem]">
              Your order is {getOrderStatusLabel(order.orderStatus).toLowerCase()}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              Placed on {formatOrderDateTime(order.createdAt)}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SummaryChip tone="stone">
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </SummaryChip>
            <SummaryChip tone="amber">{paymentMethodLabel}</SummaryChip>
            {order.trackingId ? (
              <SummaryChip tone="green">Tracking {order.trackingId}</SummaryChip>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:hidden">
        <div className="relative">
          <div className="absolute left-[12.5%] right-[12.5%] top-5 h-1 rounded-full bg-[#dfccb3]" />
          <div
            className="absolute left-[12.5%] top-5 h-1 rounded-full bg-[#8a5537] transition-all duration-500"
            style={{
              width: `${Math.max(0, currentStepIndex) * 25}%`,
            }}
          />

          <div className="relative grid grid-cols-4 gap-2">
            {orderJourneySteps.map((step, index) => {
              const isComplete = index < currentStepIndex
              const isCurrent = index === currentStepIndex

              return (
                <div
                  key={`${order._id}-mobile-${step}`}
                  className="flex min-w-0 flex-col items-center text-center"
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold shadow-sm ${
                      isCurrent
                        ? 'border-[#8a5537] bg-[#8a5537] text-white shadow-[0_10px_20px_rgba(138,85,55,0.2)]'
                        : isComplete
                          ? 'border-[#dcc7ad] bg-[#f8f1e5] text-[#8a5537]'
                          : 'border-stone-200 bg-white text-stone-500'
                    }`}
                  >
                    {isComplete ? (
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M5 10.5 8.2 13.5 15 6.8" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <p className="mt-2 text-[11px] font-semibold leading-tight text-stone-900">
                    {getOrderStatusLabel(step)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 rounded-[22px] border border-[#dfcaad] bg-white/80 px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">
            Current stage
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight text-stone-950">
                {getOrderStatusLabel(order.orderStatus)}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {order.trackingId
                  ? `Tracking ${order.trackingId}`
                  : 'Tracking updates will appear here'}
              </p>
            </div>
            <StatusPill status={order.orderStatus} />
          </div>
        </div>
      </div>

      <div className="hidden gap-3 px-4 py-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        {orderJourneySteps.map((step, index) => {
          const isComplete = index < currentStepIndex
          const isCurrent = index === currentStepIndex

          return (
            <div
              key={`${order._id}-${step}`}
              className={`rounded-[22px] border px-4 py-4 shadow-sm ${
                isCurrent
                  ? 'border-[#d7b38c] bg-[#fff8ef] text-stone-950 shadow-[0_12px_28px_rgba(138,85,55,0.1)]'
                  : isComplete
                    ? 'border-[#e4cfb3] bg-[#f8f1e5] text-stone-900'
                    : 'border-stone-200 bg-white text-stone-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                    isCurrent
                      ? 'border-[#8a5537] bg-[#8a5537] text-white shadow-sm'
                      : isComplete
                        ? 'border-[#dcc7ad] bg-white text-[#8a5537]'
                        : 'border-stone-200 bg-stone-100 text-stone-500'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">
                    {getOrderStatusLabel(step)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function OrderSnapshotCard({
  order,
  itemCount,
  items,
  address,
  cityStatePincode,
}) {
  const itemLines = Array.isArray(items) ? items : []
  const itemsTotal = getOrderItemsTotal(itemLines)

  return (
    <aside className="overflow-hidden rounded-[28px] border border-[#dcc6a7] bg-[#f7efe1] shadow-sm">
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
          Order snapshot
        </p>
        <div className="mt-3">
          <p className="text-sm text-stone-600">Total payable</p>
          <p className="mt-1 text-[2rem] font-semibold tracking-tight text-stone-950">
            {formatRupee(itemsTotal)}
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t border-[#e4cfb3] bg-[#f7efe1] p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3">
          <SnapshotMetric
            label="Items"
            value={`${itemCount} item${itemCount === 1 ? '' : 's'}`}
          />
          <SnapshotMetric
            label="Placed"
            value={formatOrderDate(order.createdAt)}
          />
        </div>

        <div className="rounded-[22px] border border-[#dfcaad] bg-[#fffdf8] p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
            Delivery address
          </p>
          <address className="mt-3 not-italic space-y-1.5 text-sm leading-relaxed text-stone-700">
            {address.fullName ? (
              <p className="text-base font-semibold tracking-tight text-stone-950">
                {address.fullName}
              </p>
            ) : null}
            {address.line1 ? <p>{address.line1}</p> : null}
            {address.line2 ? <p>{address.line2}</p> : null}
            {cityStatePincode ? <p>{cityStatePincode}</p> : null}
            {address.phone ? <p className="pt-1 text-stone-600">Phone: {address.phone}</p> : null}
          </address>
        </div>

        <div className="rounded-[22px] border border-[#dfcaad] bg-[#fff8ef] p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
            Order totals
          </p>
          <div className="mt-3 space-y-2.5">
            {itemLines.map((item, index) => {
              const quantity = Number(item.quantity || 0)
              const price = Number(item.price || 0)
              const lineTotal = quantity * price
              const label = item.name
                ? `${item.name} x ${quantity}`
                : `Item ${index + 1} x ${quantity}`

              return (
                <SnapshotRow
                  key={`${order._id}-total-line-${index}`}
                  label={label}
                  value={formatRupee(lineTotal)}
                />
              )
            })}
            <div className="border-t border-stone-200 pt-2">
              <SnapshotRow
                label="Total"
                value={formatRupee(itemsTotal)}
                emphasis
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function OrderLineItem({ item }) {
  const quantity = Number(item.quantity || 0)
  const price = Number(item.price || 0)
  const lineTotal = quantity * price

  return (
    <article className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-4 rounded-[24px] border border-stone-200 bg-white px-3 py-3 shadow-sm sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:gap-5 sm:px-4 sm:py-4 lg:grid-cols-[118px_minmax(0,1fr)_auto] lg:items-center">
      <div className="relative aspect-[3/4] w-full self-center overflow-hidden rounded-[20px] border border-[#e5c98f] bg-[#f4e7cf] p-2 shadow-sm ring-1 ring-black/[0.02]">
        <div className="h-full w-full overflow-hidden rounded-[14px] bg-[#ead9bd]">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full rounded-[14px] object-cover object-top"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-[14px] border border-dashed border-[#ddc39a] bg-[#efdfc4] px-2 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-stone-500">
              No image
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 self-center">
        <p className="line-clamp-2 text-[17px] font-semibold leading-snug text-stone-950 sm:text-[20px]">
          {item.name}
        </p>
        <div className="mt-3 flex flex-col gap-1.5 text-[14px] leading-relaxed text-stone-700 sm:text-[15px]">
          <p>
            <span className="font-medium text-stone-500">Quantity:</span>{' '}
            <span className="font-semibold text-stone-900">{quantity}</span>
          </p>
          <p>
            <span className="font-medium text-stone-500">Price per item:</span>{' '}
            <span className="font-semibold text-stone-900">
              {formatRupee(price)}
            </span>
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3 sm:hidden">
          <p className="text-sm font-medium text-stone-500">Total price</p>
          <p className="whitespace-nowrap text-[18px] font-semibold text-stone-950">
            {formatRupee(lineTotal)}
          </p>
        </div>
      </div>

      <div className="hidden sm:flex sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
        <p className="text-sm font-medium text-stone-500 sm:text-[15px]">
          Total price
        </p>
        <p className="whitespace-nowrap text-[17px] font-semibold text-stone-950 sm:mt-1 sm:text-[19px]">
          {formatRupee(lineTotal)}
        </p>
      </div>
    </article>
  )
}

export default function Orders() {
  const { user, ready, authFetch } = useAuth()
  const { addToast } = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState(null)

  useEffect(() => {
    document.title = 'My Orders - Shop'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} - Shop` : 'Shop'
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
      const aTime = getOrderTimestamp(a)
      const bTime = getOrderTimestamp(b)
      return bTime - aTime
    })
  }, [orders])

  const orderSummary = useMemo(() => {
    const totalOrders = sortedOrders.length
    const totalSpent = sortedOrders.reduce(
      (sum, order) => sum + getOrderItemsTotal(order.items || []),
      0
    )

    return {
      totalOrders,
      totalSpent,
    }
  }, [sortedOrders])

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
    <main className="relative mx-auto w-full max-w-[1720px] px-4 py-6 pb-[max(10rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-8 sm:pb-[max(8rem,env(safe-area-inset-bottom))] lg:pb-12">
      <div className="absolute inset-x-4 top-0 -z-10 h-44 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(28,25,23,0.08),_transparent_55%),radial-gradient(circle_at_top_right,_rgba(168,162,158,0.18),_transparent_45%)] blur-2xl sm:inset-x-6" />

      <section className="overflow-hidden rounded-[2.2rem] border border-stone-200 bg-[linear-gradient(180deg,#fffaf2,#fff7ed)] p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-700">
              Order history
            </p>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-stone-950 sm:text-[2.75rem]">
              My Orders
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
              Track your purchases, review delivery progress, and open any order for
              the full breakdown.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <MetricCard
              label="Orders"
              value={orderSummary.totalOrders}
            />
            <MetricCard
              label="Total spent"
              value={formatRupee(orderSummary.totalSpent)}
              accent
            />
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
        <div className="mt-8 overflow-hidden rounded-[30px] border border-dashed border-stone-200 bg-[linear-gradient(180deg,#fffaf2,#fffdf8)] p-8 pb-20 text-center shadow-sm sm:pb-10 lg:pb-12">
          <p className="text-lg font-semibold text-stone-900">No orders yet</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            As soon as you place your first order, we will show the items, delivery
            address, payment method, and status updates here.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/shop"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#8a5537] px-5 text-sm font-semibold text-white transition hover:bg-[#74452c]"
            >
              Start shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4 pb-20 sm:pb-10 lg:pb-6">
          {sortedOrders.map((order) => {
            const isExpanded = expandedOrder === order._id
            const itemCount = getOrderItemCount(order)
            const paymentMethodLabel = getPaymentMethodLabel(order.paymentMethod)
            const items = Array.isArray(order.items) ? order.items : []
            const itemsTotal = getOrderItemsTotal(items)
            const detailsId = `order-details-${order._id}`
            const address = order.address || {}
            const cityStatePincode = formatCityStatePincode(address)

            return (
              <article
                key={order._id}
                className={`overflow-hidden rounded-[30px] border ring-1 ring-black/[0.02] ${
                  isExpanded
                    ? 'border-[#e0ccb0] bg-white/95 shadow-sm'
                    : 'border-[#e7d7c7] bg-[linear-gradient(145deg,#fffdf9,#fff6ed)] shadow-[0_16px_36px_rgba(41,29,22,0.07)]'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                  onClick={() =>
                    setExpandedOrder(isExpanded ? null : order._id)
                  }
                  className="grid w-full items-center gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:grid-cols-[minmax(0,1fr)_182px] sm:px-5 sm:py-4 lg:grid-cols-[minmax(0,1fr)_198px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="truncate text-[1rem] font-semibold tracking-tight text-stone-950 sm:text-[1.02rem] lg:text-[1.08rem]">
                        Order #{order.orderNumber}
                      </p>
                      <StatusPill status={order.orderStatus} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <OrderMetaTag>{formatOrderDate(order.createdAt)}</OrderMetaTag>
                      <OrderMetaTag>
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </OrderMetaTag>
                      <span className="hidden sm:inline-flex">
                        <OrderMetaTag tone="amber">{paymentMethodLabel}</OrderMetaTag>
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-full rounded-[22px] border px-3 py-3 shadow-sm sm:px-4 sm:py-3.5 ${
                      isExpanded
                        ? 'border-[#dfcaad] bg-[#fff8ef]'
                        : 'border-[#e4cfb3] bg-[linear-gradient(180deg,#fffdf9,#fff5ea)]'
                    }`}
                  >
                    <div className="sm:hidden">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-700">
                        Order total
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="whitespace-nowrap text-[1.22rem] font-semibold leading-none tracking-tight tabular-nums text-stone-950">
                          {formatRupee(itemsTotal)}
                        </p>
                        <span
                          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-stone-600 transition ${
                            isExpanded
                              ? 'rotate-180 border-[#8a5537] bg-[#8a5537] text-white'
                              : 'border-stone-200 bg-white text-stone-600'
                          }`}
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <path d="M5.5 8l4.5 4 4.5-4" />
                          </svg>
                        </span>
                      </div>
                    </div>
                    <div className="hidden w-full sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                      <div className="min-w-0 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-700">
                          Order total
                        </p>
                        <p className="mt-1 whitespace-nowrap text-[1.55rem] font-semibold leading-none tracking-tight tabular-nums text-stone-950 lg:text-[1.6rem]">
                          {formatRupee(itemsTotal)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full border text-stone-600 transition ${
                          isExpanded
                            ? 'rotate-180 border-[#8a5537] bg-[#8a5537] text-white'
                            : 'border-stone-200 bg-white text-stone-600'
                        }`}
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                          aria-hidden="true"
                        >
                          <path d="M5.5 8l4.5 4 4.5-4" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded ? (
                  <div
                    id={detailsId}
                    className="border-t border-stone-200/80 bg-[linear-gradient(180deg,#fffdf8,#fbf7f1)] px-4 py-4 sm:px-5 sm:py-5"
                  >
                    <div className="space-y-4">
                      <OrderProgressCard
                        order={order}
                        itemCount={itemCount}
                        paymentMethodLabel={paymentMethodLabel}
                      />

                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_380px]">
                        <section className="overflow-hidden rounded-[28px] border border-[#e0ccb0] bg-[#fffdf8] shadow-sm">
                          <div className="border-b border-stone-200/70 px-4 py-4 sm:px-5">
                            <div className="flex flex-col gap-2">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                                  Items in this order
                                </p>
                                <h3 className="mt-1 text-lg font-semibold tracking-tight text-stone-950 sm:text-[1.35rem]">
                                  Everything included
                                </h3>
                                <p className="mt-2 text-sm text-stone-600 sm:text-[15px]">
                                  {itemCount} item{itemCount === 1 ? '' : 's'} across{' '}
                                  {items.length} design{items.length === 1 ? '' : 's'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 bg-[#fffaf2] px-3 py-3 sm:px-4 sm:py-4">
                          {items.map((item, index) => (
                            <OrderLineItem
                              key={`${order._id}-item-${index}`}
                              item={item}
                            />
                          ))}
                          </div>
                        </section>

                        <OrderSnapshotCard
                          order={order}
                          itemCount={itemCount}
                          items={items}
                          address={address}
                          cityStatePincode={cityStatePincode}
                        />
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
