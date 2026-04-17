import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiUrl } from '../config/api.js'
import { useCart } from '../context/CartContext.jsx'

const initialForm = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
}

export default function Checkout() {
  const navigate = useNavigate()
  const { lines, itemCount, clear } = useCart()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Checkout · Shop'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [])

  const subtotal = lines.reduce(
    (s, l) => s + (Number(l.price) || 0) * l.quantity,
    0
  )

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (lines.length === 0) {
      setError('Your cart is empty.')
      return
    }
    setSubmitting(true)
    try {
      const items = lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
      }))
      const r = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'cod',
          items,
          address: {
            fullName: form.fullName.trim(),
            phone: form.phone.replace(/\s/g, ''),
            line1: form.line1.trim(),
            line2: form.line2.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            pincode: form.pincode.trim(),
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
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm text-stone-600">Your cart is empty.</p>
        <Link
          to="/"
          className="mt-4 inline-flex min-h-[44px] items-center text-sm font-medium text-stone-800 underline"
        >
          Back to shop
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 sm:py-8 lg:max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
        Checkout
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Cash on delivery (COD). We&apos;ll confirm your order on this screen.
      </p>

      <div className="mt-6 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <h2 className="text-sm font-semibold text-stone-800">
            Delivery details
          </h2>
          <div>
            <label
              htmlFor="fullName"
              className="block text-xs font-medium text-stone-600"
            >
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              autoComplete="name"
              required
              className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-200 px-3 text-base text-stone-900 outline-none ring-stone-400 focus:border-stone-400 focus:ring-2"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-xs font-medium text-stone-600"
            >
              Mobile (10 digits)
            </label>
            <input
              id="phone"
              name="phone"
              inputMode="numeric"
              autoComplete="tel"
              required
              maxLength={10}
              className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-200 px-3 text-base text-stone-900 outline-none focus:border-stone-400 focus:ring-2"
              value={form.phone}
              onChange={(e) =>
                update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))
              }
            />
          </div>
          <div>
            <label
              htmlFor="line1"
              className="block text-xs font-medium text-stone-600"
            >
              Address line 1
            </label>
            <input
              id="line1"
              name="line1"
              autoComplete="address-line1"
              required
              className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-200 px-3 text-base text-stone-900 outline-none focus:border-stone-400 focus:ring-2"
              value={form.line1}
              onChange={(e) => update('line1', e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="line2"
              className="block text-xs font-medium text-stone-600"
            >
              Address line 2 (optional)
            </label>
            <input
              id="line2"
              name="line2"
              autoComplete="address-line2"
              className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-200 px-3 text-base text-stone-900 outline-none focus:border-stone-400 focus:ring-2"
              value={form.line2}
              onChange={(e) => update('line2', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="city"
                className="block text-xs font-medium text-stone-600"
              >
                City
              </label>
              <input
                id="city"
                name="city"
                autoComplete="address-level2"
                required
                className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-200 px-3 text-base text-stone-900 outline-none focus:border-stone-400 focus:ring-2"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="state"
                className="block text-xs font-medium text-stone-600"
              >
                State
              </label>
              <input
                id="state"
                name="state"
                autoComplete="address-level1"
                required
                className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-200 px-3 text-base text-stone-900 outline-none focus:border-stone-400 focus:ring-2"
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="pincode"
              className="block text-xs font-medium text-stone-600"
            >
              PIN code
            </label>
            <input
              id="pincode"
              name="pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              required
              maxLength={6}
              className="mt-1 w-full min-h-[48px] rounded-xl border border-stone-200 px-3 text-base text-stone-900 outline-none focus:border-stone-400 focus:ring-2"
              value={form.pincode}
              onChange={(e) =>
                update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))
              }
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-stone-900 text-base font-semibold text-white touch-manipulation [-webkit-tap-highlight-color:transparent] disabled:opacity-60 active:opacity-90"
          >
            {submitting ? 'Placing order…' : 'Place order (COD)'}
          </button>
        </form>

        <aside className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 lg:mt-0">
          <h2 className="text-sm font-semibold text-stone-800">Summary</h2>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
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
        </aside>
      </div>
    </main>
  )
}
