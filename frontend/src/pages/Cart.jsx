import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useCart } from '../context/CartContext.jsx'

const RUPEE = String.fromCharCode(8377)
const moneyFormatter = new Intl.NumberFormat('en-IN')
const CART_ACCENT_TEXT = 'text-amber-700'
const CART_BUTTON_SOLID = 'bg-[#5c311f] hover:bg-[#4a2618]'

function formatMoney(value) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0
  return `${RUPEE}${moneyFormatter.format(safeValue)}`
}

function clampQuantity(value) {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed)) return 1
  return Math.min(99, Math.max(1, parsed))
}

function SummaryMetric({ label, value }) {
  return (
    <div className="rounded-[22px] border border-[#e1ccb0] bg-[#efdfc4] px-4 py-4 shadow-sm ring-1 ring-black/[0.02]">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.35em] ${CART_ACCENT_TEXT}`}>
        {label}
      </p>
      <p className="mt-2 text-[1.35rem] font-semibold tracking-tight text-stone-950">
        {value}
      </p>
    </div>
  )
}

function CartItemRow({ line, onDecrease, onIncrease, onRemove }) {
  const total = (Number(line.price) || 0) * line.quantity
  const unitPrice = formatMoney(line.price)
  const href = line.slug ? `/product/${line.slug}` : '/shop'
  const image = line.image

  return (
    <article className="px-4 py-4 sm:px-5 lg:px-6">
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 sm:grid-cols-[100px_minmax(0,1fr)] lg:grid-cols-[118px_minmax(0,1fr)_150px] lg:items-center">
        <Link
          to={href}
          aria-label={`View ${line.name}`}
          className="group relative aspect-[3/4] w-full overflow-hidden rounded-[20px] border border-[#e5c98f] bg-[#f4e7cf] p-2 shadow-sm ring-1 ring-black/[0.02]"
        >
          <div className="h-full w-full overflow-hidden rounded-[14px] bg-[#ead9bd]">
            {image ? (
              <img
                src={image}
                alt={line.name}
                loading="eager"
                decoding="async"
                className="h-full w-full rounded-[14px] object-cover object-top transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[14px] border border-dashed border-[#ddc39a] bg-[#efdfc4] px-2 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-stone-500">
                No image
              </div>
            )}
          </div>
        </Link>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4 lg:block">
            <div className="min-w-0">
              <Link
                to={href}
                className="block no-underline outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
              >
                <h2 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-tight text-stone-950 sm:text-[18px] lg:text-[20px]">
                  {line.name}
                </h2>
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-stone-500 sm:text-[15px]">
                <span className={CART_ACCENT_TEXT}>{unitPrice} each</span>
                <span className="hidden sm:inline text-stone-300">|</span>
                <span>
                  {line.quantity} item{line.quantity === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="shrink-0 text-right lg:hidden">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.4em] ${CART_ACCENT_TEXT}`}>
                Total
              </p>
              <p className="mt-1 text-[19px] font-semibold tracking-tight text-stone-950 sm:text-[20px]">
                {formatMoney(total)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 sm:gap-3">
            <div className="inline-flex h-11 items-center rounded-full border border-stone-200 bg-[#f8f1e5] px-1 shadow-sm">
              <button
                type="button"
                aria-label={`Decrease quantity for ${line.name}`}
                onClick={onDecrease}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 active:scale-[0.96]"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M5 10h10" />
                </svg>
              </button>
              <span className="min-w-10 px-2 text-center text-[16px] font-semibold tabular-nums text-stone-900">
                {line.quantity}
              </span>
              <button
                type="button"
                aria-label={`Increase quantity for ${line.name}`}
                onClick={onIncrease}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 active:scale-[0.96]"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M10 5v10" />
                  <path d="M5 10h10" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${line.name} from cart`}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-[#fff3f2] px-4 text-[13px] font-semibold text-rose-700 shadow-sm transition hover:bg-[#ffe7e4] active:scale-[0.98] sm:px-5"
            >
              Remove
            </button>
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-col lg:items-end lg:justify-center">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.4em] ${CART_ACCENT_TEXT}`}>
            Total
          </p>
          <p className="mt-1 text-[24px] font-semibold tracking-tight text-stone-950">
            {formatMoney(total)}
          </p>
        </div>
      </div>
    </article>
  )
}

function EmptyCartState() {
  return (
    <main className="relative mx-auto w-full max-w-[1600px] px-4 py-6 pb-[max(7rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
      <div className="absolute inset-x-4 top-0 -z-10 h-40 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_55%),radial-gradient(circle_at_top_right,_rgba(251,113,133,0.16),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.1),_transparent_38%)] blur-2xl sm:inset-x-6" />

      <section className="overflow-hidden rounded-[34px] border border-stone-200 bg-[#fffaf2] shadow-sm ring-1 ring-black/[0.02]">
        <div className="border-b border-stone-200/70 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                Cart
              </p>
              <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-stone-950 sm:text-[2.45rem]">
                Your cart is empty
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-stone-600 sm:text-[16px]">
                Pick a saree you love and add it here to review it before checkout.
              </p>
            </div>
            <Link
              to="/shop"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#e5c98f] bg-[#f8f1e5] px-4 text-[15px] font-semibold text-stone-900 shadow-sm transition hover:bg-[#f3e7d3] lg:hidden"
            >
              Continue shopping
            </Link>
          </div>
        </div>

        <div className="px-5 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-[30px] bg-gradient-to-br from-amber-100 via-rose-50 to-sky-50 text-stone-500 shadow-inner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-11 w-11"
                aria-hidden="true"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <p className="mt-5 text-lg font-semibold tracking-tight text-stone-950">
              Nothing in the bag yet
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600">
              Explore the collection and add pieces that fit the look you want.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/shop"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-stone-950 via-stone-900 to-amber-900 px-5 text-[15px] font-semibold text-white shadow-[0_16px_32px_rgba(124,63,24,0.18)] transition hover:from-stone-900 hover:to-amber-800"
              >
                Browse the shop
              </Link>
              <Link
                to="/"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#e5c98f] bg-[#f8f1e5] px-5 text-[15px] font-semibold text-stone-900 shadow-sm transition hover:bg-[#f3e7d3]"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function Cart() {
  const { lines, itemCount, setQuantity, removeLine, clear, refreshCart } =
    useCart()
  const [confirmation, setConfirmation] = useState(null)

  useEffect(() => {
    const title = import.meta.env.VITE_APP_TITLE ?? ''
    document.title = title ? `${title} - Cart` : 'Cart'
    return () => {
      document.title = title ? `${title} - Shop` : 'Shop'
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

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.price) || 0) * line.quantity, 0),
    [lines]
  )

  const productCount = lines.length

  function closeConfirmation() {
    setConfirmation(null)
  }

  function openConfirmation(nextConfirmation) {
    setConfirmation(nextConfirmation)
  }

  function confirmPendingAction() {
    if (!confirmation) return
    confirmation.action()
    closeConfirmation()
  }

  function handleClearCart() {
    if (productCount === 0) return
    openConfirmation({
      title: 'Clear cart?',
      message: 'Clear all items from your cart? This cannot be undone.',
      confirmLabel: 'Clear cart',
      cancelLabel: 'Keep cart',
      action: clear,
    })
  }

  function handleRemoveLine(line) {
    openConfirmation({
      title: 'Remove item?',
      message: `Remove ${line.name} from your cart? This cannot be undone.`,
      confirmLabel: 'Remove item',
      cancelLabel: 'Keep item',
      action: () => removeLine(line.productId),
    })
  }

  function handleDecreaseLine(line) {
    if (line.quantity > 1) {
      setQuantity(line.productId, clampQuantity(line.quantity - 1))
      return
    }

    openConfirmation({
      title: 'Remove item?',
      message: `${line.name} is already at quantity 1. Removing it will discard it from your cart.`,
      confirmLabel: 'Remove item',
      cancelLabel: 'Keep item',
      action: () => removeLine(line.productId),
    })
  }

  function handleIncreaseLine(line) {
    setQuantity(line.productId, clampQuantity(line.quantity + 1))
  }

  if (productCount === 0) {
    return <EmptyCartState />
  }

  return (
    <main className="relative mx-auto w-full max-w-[1600px] px-4 py-6 pb-[max(8rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 sm:pb-[max(8.5rem,env(safe-area-inset-bottom))]">
      <div className="absolute inset-x-4 top-0 -z-10 h-40 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_55%),radial-gradient(circle_at_top_right,_rgba(251,113,133,0.14),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.1),_transparent_38%)] blur-2xl sm:inset-x-6" />

      <section className="overflow-hidden rounded-[34px] border border-stone-200 bg-[#fff8ef] shadow-sm ring-1 ring-black/[0.02]">
        <div className="border-b border-stone-200/70 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                Cart
              </p>
              <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-stone-950 sm:text-[2.45rem]">
                Ready for checkout
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-stone-600 sm:text-[16px]">
                Review the pieces you love, adjust quantities, and continue when you are ready.
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.95fr)_minmax(340px,0.85fr)] xl:grid-cols-[minmax(0,2fr)_minmax(360px,0.82fr)]">
            <div className="space-y-4">
              <section className="overflow-hidden rounded-[28px] border border-[#e4cfb3] bg-[#f1e4ce] shadow-sm lg:hidden">
                <div className="border-b border-stone-200/70 px-4 py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                        Summary
                      </p>
                      <p className="mt-1 text-[15px] font-medium text-stone-600">
                        {itemCount} item{itemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="text-[24px] font-semibold tracking-tight text-stone-950">
                      {formatMoney(subtotal)}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-4 sm:px-5">
                  <Link
                    to="/checkout"
                    className={`inline-flex min-h-[48px] w-full items-center justify-center rounded-xl ${CART_BUTTON_SOLID} px-5 text-[15px] font-semibold text-white shadow-[0_16px_32px_rgba(92,49,31,0.22)] transition`}
                  >
                    Proceed to checkout
                  </Link>
                  <Link
                    to="/shop"
                    className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[#e5c98f] bg-[#f8f1e5] px-5 text-[15px] font-semibold text-stone-900 shadow-sm transition hover:bg-[#f3e7d3]"
                  >
                    Continue shopping
                  </Link>
                </div>
              </section>

              <section className="overflow-hidden rounded-[28px] border border-[#e4cfb3] bg-[#fffdf9] shadow-sm">
                <div className="border-b border-stone-200/70 px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                        Cart items
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950 sm:text-[1.35rem]">
                        Ready for review
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-10 shrink-0 items-center rounded-full border border-[#e5c98f] bg-[#f8f1e5] px-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-800">
                        {productCount} product{productCount === 1 ? '' : 's'}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearCart}
                        aria-label="Clear shopping cart"
                        className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-[#fff3f2] px-4 text-[13px] font-semibold text-rose-700 shadow-sm transition hover:bg-[#ffe7e4] active:scale-[0.98]"
                      >
                        Clear cart
                      </button>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-stone-200/80 bg-[#fffdf9]">
                  {lines.map((line) => (
                    <CartItemRow
                      key={line.productId}
                      line={line}
                      onDecrease={() => handleDecreaseLine(line)}
                      onIncrease={() => handleIncreaseLine(line)}
                      onRemove={() => handleRemoveLine(line)}
                    />
                  ))}
                </div>
              </section>
            </div>

            <aside className="hidden lg:block lg:sticky lg:top-6">
              <div className="overflow-hidden rounded-[32px] border border-[#dcc6a7] bg-[#f7efe1] shadow-sm">
                <div className="px-5 py-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                    Checkout
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                    Summary
                  </h2>
                </div>

                <div className="space-y-4 border-t border-[#e4cfb3] bg-[#f7efe1] p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <SummaryMetric label="Products" value={productCount} />
                    <SummaryMetric label="Items" value={itemCount} />
                  </div>

                  <div className="rounded-[24px] border border-[#e1ccb0] bg-[#efdfc4] px-4 py-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-700">
                      Subtotal
                    </p>
                    <p className="mt-3 text-[30px] font-semibold tracking-tight text-stone-950">
                      {formatMoney(subtotal)}
                    </p>
                  </div>

                  <Link
                    to="/checkout"
                    className={`inline-flex min-h-[52px] w-full items-center justify-center rounded-xl ${CART_BUTTON_SOLID} px-5 text-[15px] font-semibold text-white shadow-[0_16px_32px_rgba(92,49,31,0.22)] transition`}
                  >
                    Proceed to checkout
                  </Link>
                  <Link
                    to="/shop"
                    className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-[#e5c98f] bg-[#f8f1e5] px-5 text-[15px] font-semibold text-stone-900 shadow-sm transition hover:bg-[#f3e7d3]"
                  >
                    Continue shopping
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title ?? ''}
        message={confirmation?.message ?? ''}
        confirmLabel={confirmation?.confirmLabel ?? 'Confirm'}
        cancelLabel={confirmation?.cancelLabel ?? 'Cancel'}
        onConfirm={confirmPendingAction}
        onClose={closeConfirmation}
      />
    </main>
  )
}
