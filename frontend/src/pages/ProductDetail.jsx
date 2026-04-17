import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiUrl } from '../config/api.js'
import { useCart } from '../context/CartContext.jsx'

export default function ProductDetail() {
  const { slug } = useParams()
  const { addOrUpdate } = useCart()
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
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
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
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm text-stone-600">{error || 'Product not found.'}</p>
        <Link
          to="/"
          className="mt-5 inline-flex min-h-[44px] items-center text-sm font-medium text-stone-800 underline underline-offset-4 [-webkit-tap-highlight-color:transparent] active:opacity-70"
        >
          Back to shop
        </Link>
      </main>
    )
  }

  const price = typeof product.price === 'number' ? product.price : 0
  const cat = product.category
  const canBuy = maxQty >= 1

  function addToCart() {
    if (!product || !canBuy) return
    addOrUpdate(
      {
        productId: product._id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images?.[0] ?? '',
        quantity: qty,
      },
      { replace: true }
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
      <div className="px-4 pt-4 sm:px-0 sm:pt-0">
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-stone-600 no-underline [-webkit-tap-highlight-color:transparent] active:opacity-70 sm:hover:text-stone-900"
        >
          <span aria-hidden className="text-base leading-none">
            ←
          </span>
          Shop
        </Link>
      </div>

      <div className="mt-4 sm:mt-8 sm:grid sm:grid-cols-2 sm:items-start sm:gap-10 lg:gap-14">
        <div className="-mx-4 overflow-hidden bg-stone-100 sm:mx-0 sm:rounded-2xl sm:border sm:border-stone-200/80 sm:shadow-sm">
          <div className="aspect-[2/3] max-h-[min(70svh,720px)] w-full sm:aspect-[3/4] sm:max-h-[560px] lg:max-h-[640px]">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-stone-500">
                No image
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 px-4 sm:mt-0 sm:px-0">
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
          <p className="mt-3 text-xl font-semibold tabular-nums text-stone-900 sm:text-2xl">
            ₹{price.toLocaleString('en-IN')}
          </p>
          {product.description ? (
            <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
              {product.description}
            </p>
          ) : null}
          <p className="mt-4 text-sm text-stone-500">
            In stock:{' '}
            <span className="font-medium text-stone-700">
              {typeof product.stock === 'number' ? product.stock : '—'}
            </span>
          </p>

          <div className="mt-6 space-y-3 sm:mt-8">
            {canBuy ? (
              <div className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 p-0.5">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-stone-800 touch-manipulation [-webkit-tap-highlight-color:transparent] active:bg-stone-200 disabled:opacity-40"
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-stone-800 touch-manipulation [-webkit-tap-highlight-color:transparent] active:bg-stone-200 disabled:opacity-40"
                  disabled={qty >= maxQty}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={!canBuy}
                onClick={addToCart}
                className="w-full min-h-[52px] touch-manipulation rounded-xl bg-stone-900 px-4 py-3.5 text-sm font-semibold text-white [-webkit-tap-highlight-color:transparent] active:opacity-90 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 sm:w-auto sm:min-w-[220px] sm:py-3"
              >
                {canBuy ? 'Add to cart' : 'Out of stock'}
              </button>
              <Link
                to="/cart"
                className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800 no-underline [-webkit-tap-highlight-color:transparent] active:bg-stone-50 sm:w-auto sm:min-w-[140px]"
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
