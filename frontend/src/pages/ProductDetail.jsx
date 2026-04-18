import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MobileBackButton from '../components/MobileBackButton.jsx'
import { WishlistButton } from '../components/WishlistButton.jsx'
import { apiUrl } from '../config/api.js'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function ProductDetail() {
  const { slug } = useParams()
  const { addOrUpdate } = useCart()
  const { addToast } = useToast()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    if (!slug) return undefined
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch(apiUrl(`/api/products/${encodeURIComponent(slug)}`))
        if (r.status === 404) {
          if (!cancelled) {
            setProduct(null)
            setError('Not found')
          }
          return
        }
        if (!r.ok) throw new Error('Request failed')
        const data = await r.json()
        if (!cancelled) setProduct(data.product ?? null)
      } catch {
        if (!cancelled) setError('Could not load this product.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [slug])

  const maxQty =
    product && typeof product.stock === 'number'
      ? Math.min(99, Math.max(0, product.stock))
      : 0

  useEffect(() => {
    if (!product || maxQty < 1) return undefined
    const id = requestAnimationFrame(() => {
      setQty((q) => Math.min(maxQty, Math.max(1, q)))
    })
    return () => cancelAnimationFrame(id)
  }, [product, maxQty])

  useEffect(() => {
    if (product?.name) {
      document.title = `${product.name} · Shop`
    }
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [product])

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pt-12 sm:px-6 sm:py-8">
        <MobileBackButton to="/" label="Back to shop" />
        <div className="animate-pulse space-y-4">
          <div className="aspect-[2/3] max-h-[70svh] rounded-2xl bg-stone-200/90 sm:aspect-auto sm:max-h-none sm:min-h-[320px]" />
          <div className="h-6 w-3/4 rounded bg-stone-200" />
          <div className="h-5 w-24 rounded bg-stone-200" />
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 pt-12 sm:px-6">
        <MobileBackButton to="/" label="Back to shop" />
        <p className="text-sm text-stone-600">{error || 'Product not found.'}</p>
      </main>
    )
  }

  const price = typeof product.price === 'number' ? product.price : 0
  const cat = product.category
  const canBuy = maxQty >= 1

  function addToCart() {
    if (!product || !canBuy) return
    addOrUpdate({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images?.[0] ?? '',
      quantity: qty,
    })
    addToast(`${qty}x ${product.name} added to cart`, 'success', 2500)
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12 sm:px-6 sm:py-8">
      <MobileBackButton to="/" label="Back to shop" />

      <div className="mt-5 grid gap-6 sm:mt-8 sm:grid-cols-2 sm:gap-8 lg:gap-10">
        <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-gradient-to-b from-stone-50 to-stone-100/50 shadow-sm ring-1 ring-black/[0.03]">
          <div className="relative aspect-[2/3] w-full max-h-[400px] overflow-hidden sm:aspect-[3/4] sm:max-h-[450px]">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-stone-400">
                <span className="text-sm">No image available</span>
              </div>
            )}
            <div className="absolute bottom-3 right-3 z-20">
              <WishlistButton
                product={product}
                className="h-10 w-10 bg-white/95 shadow-md"
                iconClassName="h-5 w-5"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm ring-1 ring-black/[0.03]">
            {cat?.slug ? (
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500 sm:text-[13px]">
                <Link
                  to={`/?category=${encodeURIComponent(cat.slug)}`}
                  className="text-stone-600 no-underline [-webkit-tap-highlight-color:transparent] active:underline sm:hover:underline"
                >
                  {cat.name}
                </Link>
              </p>
            ) : null}
            <h1 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-stone-900 sm:text-2xl lg:text-3xl">
              {product.name}
            </h1>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-stone-900">
              ₹{price.toLocaleString('en-IN')}
            </p>
          </div>

          {product.description ? (
            <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm ring-1 ring-black/[0.03]">
              <p className="text-[13px] font-medium uppercase tracking-wide text-stone-700">
                Description
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-stone-600">
                {product.description}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm ring-1 ring-black/[0.03]">
            {canBuy ? (
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-stone-600">
                  Select quantity
                </p>
                <div className="mb-5 inline-flex items-center rounded-full border border-stone-200 bg-stone-50 p-1">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-stone-700 transition touch-manipulation [-webkit-tap-highlight-color:transparent] active:bg-stone-200 disabled:opacity-40"
                    disabled={qty <= 1}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums text-stone-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-stone-700 transition touch-manipulation [-webkit-tap-highlight-color:transparent] active:bg-stone-200 disabled:opacity-40"
                    disabled={qty >= maxQty}
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : null}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={!canBuy}
                onClick={addToCart}
                className="w-full min-h-[52px] rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition touch-manipulation [-webkit-tap-highlight-color:transparent] active:opacity-90 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
              >
                {canBuy ? 'Add to cart' : 'Out of stock'}
              </button>
              <Link
                to="/cart"
                className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800 no-underline transition [-webkit-tap-highlight-color:transparent] active:bg-stone-50 sm:hover:border-stone-300"
              >
                View cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
