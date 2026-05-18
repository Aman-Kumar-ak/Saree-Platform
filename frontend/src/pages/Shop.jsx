import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { SearchBar } from '../components/SearchBar.jsx'
import { apiUrl } from '../config/api.js'
import { CUSTOMER_RETRY_MESSAGE } from '../lib/errorMessages.js'
import { QUICK_PRICE_FILTERS } from '../lib/shopQuery.js'

function buildCategoryFallback(products = []) {
  const seen = new Map()

  products.forEach((product) => {
    const category = product?.category
    if (!category?.slug || !category?.name) return
    if (seen.has(category.slug)) return
    seen.set(category.slug, {
      slug: category.slug,
      name: category.name,
    })
  })

  return [...seen.values()]
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categorySlug = searchParams.get('category') ?? ''
  const search = searchParams.get('search') ?? ''
  const priceMin = searchParams.get('priceMin') ?? ''
  const priceMax = searchParams.get('priceMax') ?? ''
  const sort = searchParams.get('sort') ?? ''

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [applied, setApplied] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)

      const query = new URLSearchParams()
      if (categorySlug) query.set('category', categorySlug)
      if (search) query.set('search', search)
      if (priceMin) query.set('priceMin', priceMin)
      if (priceMax) query.set('priceMax', priceMax)
      if (sort) query.set('sort', sort)

      const suffix = query.toString() ? `?${query.toString()}` : ''

      const [catResult, prodResult] = await Promise.allSettled([
        fetch(apiUrl('/api/categories')).then((response) => {
          if (!response.ok) throw new Error('Categories request failed')
          return response.json()
        }),
        fetch(apiUrl(`/api/products${suffix}`)).then((response) => {
          if (!response.ok) throw new Error('Products request failed')
          return response.json()
        }),
      ])

      if (cancelled) return

      const nextProducts =
        prodResult.status === 'fulfilled' ? prodResult.value?.products ?? [] : null
      const nextApplied =
        prodResult.status === 'fulfilled' ? prodResult.value?.applied ?? null : null
      const nextCategories =
        catResult.status === 'fulfilled'
          ? catResult.value?.categories ?? []
          : buildCategoryFallback(nextProducts ?? [])

      setCategories(nextCategories)

      if (prodResult.status === 'fulfilled') {
        setProducts(nextProducts ?? [])
        setApplied(nextApplied)
        setError(null)
      } else {
        setProducts([])
        setApplied(null)
        setError(CUSTOMER_RETRY_MESSAGE)
      }

      if (!cancelled) setLoading(false)
    }

    run()

    return () => {
      cancelled = true
    }
  }, [categorySlug, priceMax, priceMin, retryTick, search, sort])

  const categoryButtons = useMemo(() => {
    const all = { slug: '', name: 'All' }
    const rest = categories.map((category) => ({
      slug: category.slug,
      name: category.name,
    }))
    return [all, ...rest]
  }, [categories])

  function updateSearchParams(mutator) {
    const nextParams = new URLSearchParams(searchParams)
    mutator(nextParams)
    setSearchParams(nextParams)
  }

  function selectCategory(slug) {
    updateSearchParams((params) => {
      if (!slug) {
        params.delete('category')
      } else {
        params.set('category', slug)
      }
    })
  }

  function applyQuickPrice(nextPriceMax) {
    updateSearchParams((params) => {
      params.delete('priceMin')
      params.set('priceMax', String(nextPriceMax))
    })
  }

  function resetFilters() {
    setSearchParams({})
  }

  function retryLoad() {
    setRetryTick((current) => current + 1)
  }

  const correctionSummary =
    Array.isArray(applied?.corrections) && applied.corrections.length > 0
      ? applied.corrections.map((entry) => `${entry.from} -> ${entry.to}`).join(', ')
      : ''
  const hasCorrection =
    Boolean(applied?.correctedSearch) &&
    applied.correctedSearch !== search &&
    Boolean(correctionSummary)

  if (error) {
    return (
      <main className="mx-auto flex min-h-[100svh] w-full max-w-[1600px] items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-amber-200/80 bg-amber-50/95 px-6 py-8 text-center shadow-sm ring-1 ring-black/[0.03]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
            Error loading shop
          </p>
          <h2 className="mt-3 font-['Georgia','Times_New_Roman',serif] text-3xl leading-tight text-amber-950">
            We could not load this catalog right now
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-amber-900/90">
            {error} We will try again with a fresh request.
          </p>
          <button
            type="button"
            onClick={retryLoad}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pt-4 pb-24 sm:px-6 sm:pt-6 sm:pb-16 lg:pb-12">
      <section className="mx-auto w-full max-w-[1600px]">
        <SearchBar
          key={`shop-search-${search}`}
          initialValue={search}
          className=""
          submitLabel="Search catalog"
        />
        {hasCorrection ? (
          <p className="mt-3 text-sm text-stone-600">
            Showing results for{' '}
            <span className="font-semibold text-stone-900">
              {applied.correctedSearch}
            </span>
            .
          </p>
        ) : null}
      </section>

      <section className="mt-6 sm:mt-8">
        <div className="flex flex-col gap-3">
          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-0.5 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {categoryButtons.map((category) => {
              const active =
                (category.slug === '' && categorySlug === '') ||
                category.slug === categorySlug
              return (
                <button
                  key={category.slug || 'all'}
                  type="button"
                  onClick={() => selectCategory(category.slug)}
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'border-stone-950 bg-stone-950 text-white shadow-sm'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  }`}
                >
                  {category.name}
                </button>
              )
            })}
          </div>

          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {QUICK_PRICE_FILTERS.map((item) => {
              const active = Number(priceMax) === Number(item.params.priceMax) && !priceMin
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => applyQuickPrice(item.params.priceMax)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'border-amber-700 bg-amber-50 text-amber-900'
                      : 'border-amber-200/80 bg-white text-stone-700 hover:border-amber-300'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}

            {(search || categorySlug || priceMin || priceMax || sort) && (
              <button
                type="button"
                onClick={resetFilters}
                className="shrink-0 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              Sort
            </label>
            <select
              value={sort}
              onChange={(event) => {
                const nextSort = event.target.value
                updateSearchParams((params) => {
                  if (!nextSort) {
                    params.delete('sort')
                  } else {
                    params.set('sort', nextSort)
                  }
                })
              }}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-800 outline-none"
            >
              <option value="">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price low to high</option>
              <option value="price-desc">Price high to low</option>
            </select>
          </div>
        </div>
      </section>

      {loading && (
        <LoadingState
          title="Loading catalog..."
          description="Fetching products for your selected collection."
          className="min-h-[32svh] py-10"
        />
      )}
      {!loading && products.length === 0 ? (
        <div className="mt-8 rounded-[1.8rem] border border-stone-200 bg-white p-6 text-center shadow-sm">
          <h2 className="font-['Georgia','Times_New_Roman',serif] text-2xl text-stone-950">
            No matching products right now
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Try a broader search, remove one filter, or go back to the homepage collections.
          </p>
          <div className="mt-5">
            <Link
              to="/"
              className="inline-flex rounded-full bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white no-underline"
            >
              Explore homepage collections
            </Link>
          </div>
        </div>
      ) : !loading && products.length > 0 ? (
        <ul className="mt-6 grid list-none grid-cols-2 gap-3 p-0 pb-6 sm:mt-8 sm:grid-cols-3 sm:gap-4 sm:pb-10 lg:grid-cols-4 lg:pb-6">
          {products.map((product) => (
            <li key={product._id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  )
}
