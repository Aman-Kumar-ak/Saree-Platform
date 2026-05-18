import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { AddressSelector } from '../components/AddressSelector.jsx'
import LoginPromptModal from '../components/LoginPromptModal.jsx'
import LoadingState from '../components/LoadingState.jsx'

const RUPEE = String.fromCharCode(8377)
const moneyFormatter = new Intl.NumberFormat('en-IN')

function formatMoney(value) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0
  return `${RUPEE}${moneyFormatter.format(safeValue)}`
}

function CheckoutOrderLine({ line }) {
  const lineTotal = (Number(line.price) || 0) * line.quantity

  return (
    <article className="rounded-[20px] border border-[#e4cfb3] bg-[#fffaf2] px-3 py-3 shadow-sm sm:rounded-[24px] sm:px-5 sm:py-4">
      <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-3 sm:grid-cols-[96px_minmax(0,1fr)] lg:grid-cols-[104px_minmax(0,1fr)_140px] lg:items-center">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[18px] border border-[#e5c98f] bg-[#f4e7cf] p-1.5 ring-1 ring-black/[0.02] sm:rounded-[20px] sm:p-2">
          <div className="h-full w-full overflow-hidden rounded-[12px] bg-[#ead9bd] sm:rounded-[14px]">
            {line.image ? (
              <img
                src={line.image}
                alt={line.name}
                loading="eager"
                decoding="async"
                className="h-full w-full rounded-[12px] object-cover object-top sm:rounded-[14px]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[12px] text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500 sm:rounded-[14px]">
                Item
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4 lg:block">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-tight text-stone-950 sm:text-[18px]">
                {line.name}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-stone-500 sm:mt-2 sm:gap-x-3 sm:text-[15px]">
                <span className="text-amber-700">{formatMoney(line.price)} each</span>
                <span className="hidden sm:inline text-stone-300">|</span>
                <span>
                  {line.quantity} item{line.quantity === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="shrink-0 text-right lg:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                Total
              </p>
              <p className="mt-1 text-[16px] font-semibold tracking-tight text-stone-950 sm:text-[19px]">
                {formatMoney(lineTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-col lg:items-end lg:justify-center">
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

export default function Checkout() {
  const navigate = useNavigate()
  const { user, ready, authFetch } = useAuth()
  const { lines, itemCount, clear, refreshCart } = useCart()
  const { addToast } = useToast()
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const title = import.meta.env.VITE_APP_TITLE ?? ''
    document.title = title ? `${title} - Checkout` : 'Checkout'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} - Shop` : 'Shop'
    }
  }, [])

  useEffect(() => {
    if (typeof refreshCart !== 'function') return undefined

    let cancelled = false
    const runRefresh = () => {
      if (cancelled) return
      void refreshCart()
    }

    runRefresh()

    const handleFocus = () => runRefresh()
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        runRefresh()
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshCart])

  if (ready && !user) {
    return <LoginPromptModal />
  }

  if (!ready) {
    return (
      <LoadingState
        title="Loading checkout..."
        description="Preparing your cart and delivery options."
      />
    )
  }

  const subtotal = lines.reduce(
    (sum, line) => sum + (Number(line.price) || 0) * line.quantity,
    0
  )
  const productCount = lines.length

  async function onSubmit(e) {
    e.preventDefault()

    if (lines.length === 0) {
      addToast('Your cart is empty.', 'error', 2500)
      return
    }

    if (!selectedAddress) {
      addToast('Please choose the address first.', 'error', 2500)
      return
    }

    setSubmitting(true)
    try {
      const items = lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      }))

      const response = await authFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: 'cod',
          items,
          address: {
            fullName: selectedAddress.fullName,
            phone: selectedAddress.phone,
            line1: selectedAddress.line1,
            line2: selectedAddress.line2,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
          },
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 409) {
        addToast(
          data.error ||
            'Not enough stock for one or more items. Update your cart and try again.',
          'error',
          3000
        )
        return
      }

      if (!response.ok) {
        addToast(data.error || 'Could not place order. Try again.', 'error', 3000)
        return
      }

      addToast(
        `Order ${data.order.orderNumber} placed successfully!`,
        'success',
        3000
      )
      clear()
      navigate(`/order/${encodeURIComponent(data.order.orderNumber)}`, {
        state: { order: data.order },
        replace: true,
      })
    } catch {
      addToast('Network error. Check your connection and try again.', 'error', 3000)
    } finally {
      setSubmitting(false)
    }
  }

  if (itemCount === 0) {
    return (
      <main className="mx-auto w-full max-w-[1600px] px-4 pt-4 pb-[max(7rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6">
        <p className="text-sm text-stone-600">Your cart is empty.</p>
      </main>
    )
  }

  return (
    <main className="relative mx-auto w-full max-w-lg px-4 pt-4 pb-[max(9rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-[max(7.5rem,env(safe-area-inset-bottom))] lg:max-w-[1600px]">
      <div className="absolute inset-x-4 top-0 -z-10 h-44 rounded-[2.25rem] bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_52%),radial-gradient(circle_at_top_right,_rgba(92,49,31,0.16),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.1),_transparent_34%)] blur-2xl sm:inset-x-6" />
      <section className="overflow-hidden rounded-[1.6rem] border border-stone-200 bg-[linear-gradient(180deg,#fffaf2,#fff7ed)] shadow-sm ring-1 ring-black/[0.02] sm:rounded-[2rem]">
        <div className="flex flex-col items-start gap-3 border-b border-stone-200/70 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 sm:py-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-700">
              Checkout
            </p>
            <h1 className="mt-2 text-[1.75rem] font-semibold tracking-tight text-stone-950 sm:text-[2.45rem]">
              Place your order
            </h1>
          </div>
          <div className="inline-flex items-center rounded-full border border-[#d8c0a1] bg-[#f3e4cb] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a451f]">
            {itemCount} items
          </div>
        </div>

        <div className="px-3 py-3 sm:px-6 sm:py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <div>
              <section className="rounded-[24px] border border-[#e0ccb0] bg-[#fffdf8] p-3 shadow-sm sm:rounded-[28px] sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold tracking-tight text-stone-950 sm:text-lg">
                    Delivery address
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm((open) => !open)}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-[#8a5537] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#74452c]"
                    aria-expanded={showAddressForm}
                    aria-controls="delivery-address-form"
                  >
                    {showAddressForm ? 'Close' : 'Add'}
                  </button>
                </div>
                <AddressSelector
                  value={selectedAddress}
                  onChange={setSelectedAddress}
                  showForm={showAddressForm}
                  onCloseForm={() => setShowAddressForm(false)}
                />
              </section>
            </div>

            <form
              onSubmit={onSubmit}
              className="space-y-3 bg-transparent p-0 shadow-none sm:space-y-5 lg:sticky lg:top-6 lg:rounded-[30px] lg:border lg:border-[#dcc6a7] lg:bg-[#f7efe1] lg:p-5 lg:shadow-sm"
            >
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <section className="rounded-[22px] border border-[#dfcaad] bg-[#fffaf2] p-3 shadow-sm sm:rounded-[24px] sm:p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                    Subtotal
                  </p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-tight text-stone-950">
                    {formatMoney(subtotal)}
                  </p>
                </section>

                <section className="rounded-[22px] border border-[#dfcaad] bg-[#fffaf2] p-3 shadow-sm sm:rounded-[24px] sm:p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                    Mode of payment
                  </p>
                  <div className="mt-3 inline-flex items-center rounded-full border border-[#dcc29f] bg-[#f3e4cb] px-4 py-2 text-sm font-semibold text-[#5c311f]">
                    Cash on delivery
                  </div>
                </section>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#8a5537] text-[15px] font-semibold text-white shadow-[0_16px_32px_rgba(138,85,55,0.2)] touch-manipulation transition hover:bg-[#74452c] [-webkit-tap-highlight-color:transparent] disabled:opacity-60 active:opacity-90 sm:min-h-[54px] sm:text-base"
              >
                {submitting ? 'Placing order...' : 'Place order (COD)'}
              </button>

              <section className="overflow-hidden rounded-[24px] border border-[#e0ccb0] bg-[#fffdf8] shadow-sm sm:rounded-[28px]">
                <div className="border-b border-stone-200/70 px-3 py-3 sm:px-5 sm:py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                        Order summary
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-10 shrink-0 items-center rounded-full border border-[#dcc29f] bg-[#f3e4cb] px-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a451f]">
                        {productCount} product{productCount === 1 ? '' : 's'}
                      </span>
                      <span className="inline-flex h-10 shrink-0 items-center rounded-full border border-[#dcc29f] bg-[#f8efde] px-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7a451f]">
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-[#fffaf2] px-3 py-3 sm:space-y-4 sm:px-5 sm:py-4">
                  {lines.map((line) => (
                    <CheckoutOrderLine key={line.productId} line={line} />
                  ))}
                </div>
              </section>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
