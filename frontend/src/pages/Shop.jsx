import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { apiUrl } from '../config/api.js'
import { CUSTOMER_RETRY_MESSAGE } from '../lib/errorMessages.js'

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categorySlug = searchParams.get('category') ?? ''

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      const q = categorySlug
        ? `?category=${encodeURIComponent(categorySlug)}`
        : ''
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch(apiUrl('/api/categories')).then((r) => {
            if (!r.ok) throw new Error('Categories request failed')
            return r.json()
          }),
          fetch(apiUrl(`/api/products${q}`)).then((r) => {
            if (!r.ok) throw new Error('Products request failed')
            return r.json()
          }),
        ])
        if (cancelled) return
        setCategories(catRes.categories ?? [])
        setProducts(prodRes.products ?? [])
      } catch {
        if (!cancelled) setError(CUSTOMER_RETRY_MESSAGE)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [categorySlug])

  const categoryButtons = useMemo(() => {
    const all = { slug: '', name: 'All' }
    const rest = categories.map((c) => ({ slug: c.slug, name: c.name }))
    return [all, ...rest]
  }, [categories])

  function selectCategory(slug) {
    if (!slug) {
      setSearchParams({})
    } else {
      setSearchParams({ category: slug })
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-24 sm:px-6 sm:pt-8 sm:pb-16 lg:pb-12">
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
          Shop
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
          Browse by category. Prices and stock are shown per product.
        </p>
      </div>

      <div className="relative mt-5 sm:mt-6">
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-0.5 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {categoryButtons.map((c) => {
            const active =
              (c.slug === '' && categorySlug === '') || c.slug === categorySlug
            return (
              <button
                key={c.slug || 'all'}
                type="button"
                onClick={() => selectCategory(c.slug)}
                className={`shrink-0 touch-manipulation rounded-full border px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] sm:min-h-0 sm:py-2 ${
                  active
                    ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                    : 'border-stone-200 bg-white text-stone-700 active:bg-stone-50 sm:hover:border-stone-300'
                }`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
        <LoadingState
          title="Loading shop..."
          description="Fetching categories and products."
          className="min-h-[32svh] py-10"
        />
      )}
      {error && (
        <div className="mt-6 rounded-2xl border border-amber-200/90 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 sm:mt-8">
          {error}
        </div>
      )}
      {!loading && !error && products.length === 0 && (
        <p className="mt-8 text-sm text-stone-600">
          No products available right now.
        </p>
      )}
      {!loading && !error && products.length > 0 && (
        <ul className="mt-6 grid list-none grid-cols-2 gap-3 p-0 pb-6 sm:mt-8 sm:grid-cols-3 sm:gap-4 sm:pb-10 lg:grid-cols-4 lg:pb-6">
          {products.map((p) => (
            <li key={p._id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
