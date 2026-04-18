import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MobileBackButton from '../components/MobileBackButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { AddressSelector } from '../components/AddressSelector.jsx'
import LoginPromptModal from '../components/LoginPromptModal.jsx'

export default function Checkout() {
  const navigate = useNavigate()
  const { user, ready, authFetch } = useAuth()
  const { lines, itemCount, clear } = useCart()
  const { addToast } = useToast()
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Checkout · Shop'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [])

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

  const subtotal = lines.reduce(
    (s, l) => s + (Number(l.price) || 0) * l.quantity,
    0
  )

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)

    if (lines.length === 0) {
      setError('Your cart is empty.')
      return
    }

    if (!selectedAddress) {
      setError('Please select or add a delivery address.')
      return
    }

    setSubmitting(true)
    try {
      const items = lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
      }))
      const r = await authFetch('/api/orders', {
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
      const data = await r.json().catch(() => ({}))
      if (r.status === 409) {
        setError(
          data.error ||
            'Not enough stock for one or more items. Update your cart and try again.'
        )
        return
      }
      if (!r.ok) {
        setError(data.error || 'Could not place order. Try again.')
        return
      }
      addToast(`Order ${data.order.orderNumber} placed successfully!`, 'success', 3000)
      clear()
      navigate(`/order/${encodeURIComponent(data.order.orderNumber)}`, {
        state: { order: data.order },
        replace: true,
      })
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (itemCount === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 pt-12 sm:px-6">
        <MobileBackButton to="/" label="Back to shop" />
        <p className="text-sm text-stone-600">Your cart is empty.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6 pt-12 sm:px-6 sm:py-8 lg:max-w-6xl">
      <MobileBackButton to="/cart" label="Back to cart" />
      <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
        Checkout
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Cash on delivery (COD). We&apos;ll confirm your order on this screen.
      </p>

      <div className="mt-6 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-stone-800 mb-4">
            Delivery Address
          </h2>
          <AddressSelector
            value={selectedAddress}
            onChange={setSelectedAddress}
          />
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 lg:mt-0"
        >
          <div>
            <h2 className="text-sm font-semibold text-stone-800 mb-3">Summary</h2>
            <ul className="space-y-2 text-sm text-stone-600">
              {lines.map((l) => (
                <li key={l.productId} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {l.name}{' '}
                    <span className="text-stone-400">×{l.quantity}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-stone-900">
                    ₹
                    {(
                      (Number(l.price) || 0) * l.quantity
                    ).toLocaleString('en-IN')}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-stone-200 pt-3 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-stone-900">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                Shipping (if configured on the server) is included in the total
                shown on the confirmation screen.
              </p>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !selectedAddress}
            className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-stone-900 text-base font-semibold text-white touch-manipulation [-webkit-tap-highlight-color:transparent] disabled:opacity-60 active:opacity-90"
          >
            {submitting ? 'Placing order…' : 'Place order (COD)'}
          </button>
        </form>
      </div>
    </main>
  )
}
