import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function Cart() {
  const { lines, itemCount, setQuantity, removeLine } = useCart()
  const { addToast } = useToast()

  useEffect(() => {
    document.title = 'Cart · Shop'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [])

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (s, l) => s + (Number(l.price) || 0) * l.quantity,
        0
      ),
    [lines]
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
        Cart
      </h1>
      {itemCount === 0 ? (
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-600 shadow-sm">
          <p>Your cart is empty.</p>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-stone-900 px-5 text-sm font-medium text-white no-underline [-webkit-tap-highlight-color:transparent] active:opacity-90"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-4">
            {lines.map((line) => (
              <li
                key={line.productId}
                className="flex gap-3 rounded-2xl border border-stone-200/90 bg-white p-3 shadow-sm sm:gap-4 sm:p-4"
              >
                <Link
                  to={`/product/${line.slug}`}
                  className="block h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-32 sm:w-24"
                >
                  {line.image ? (
                    <img
                      src={line.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-stone-400">
                      —
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/product/${line.slug}`}
                    className="font-medium text-stone-900 no-underline line-clamp-2 hover:underline"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-stone-800">
                    ₹{(Number(line.price) || 0).toLocaleString('en-IN')}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 p-0.5">
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-stone-700 touch-manipulation [-webkit-tap-highlight-color:transparent] active:bg-stone-200"
                        onClick={() => {
                          if (line.quantity <= 1) {
                            addToast(`${line.name} removed from cart`, 'info', 2000)
                            removeLine(line.productId)
                          } else {
                            setQuantity(
                              line.productId,
                              line.quantity - 1
                            )
                          }
                        }}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-stone-700 touch-manipulation [-webkit-tap-highlight-color:transparent] active:bg-stone-200"
                        onClick={() =>
                          setQuantity(
                            line.productId,
                            line.quantity + 1
                          )
                        }
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-medium text-red-700 touch-manipulation [-webkit-tap-highlight-color:transparent] active:underline"
                      onClick={() => {
                        addToast(`${line.name} removed from cart`, 'info', 2000)
                        removeLine(line.productId)
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between text-sm text-stone-600">
              <span>Subtotal ({itemCount} items)</span>
              <span className="text-base font-semibold tabular-nums text-stone-900">
                ₹{subtotal.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              Shipping (if any) is added on the next step. Final total is
              confirmed when you place the order.
            </p>
            <Link
              to="/checkout"
              className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-stone-900 text-sm font-semibold text-white no-underline [-webkit-tap-highlight-color:transparent] active:opacity-90"
            >
              Proceed to checkout
            </Link>
          </div>
        </>
      )}
    </main>
  )
}
