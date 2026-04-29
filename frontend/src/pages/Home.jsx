import { useEffect, useLayoutEffect, useState } from 'react'
import { Link, useNavigationType } from 'react-router-dom'
import { CategoryShowcase } from '../components/CategoryShowcase.jsx'
import { HeroCarousel } from '../components/HeroCarousel.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { ProductRail } from '../components/ProductRail.jsx'
import { PromoCollectionCard } from '../components/PromoCollectionCard.jsx'
import { SearchBar } from '../components/SearchBar.jsx'
import { SectionHeader } from '../components/SectionHeader.jsx'
import { apiUrl } from '../config/api.js'
import { readHomeCache, writeHomeCache } from '../lib/homeCache.js'
import { createShopHref } from '../lib/shopQuery.js'
import { CUSTOMER_RETRY_MESSAGE } from '../lib/errorMessages.js'

const HOME_SCROLL_KEY = 'saree-platform-home-scroll-v1'
const HOME_SECTION_SELECTOR = '[data-home-section]'
const HOME_RESTORE_ATTEMPTS = 18

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

function readHomeScrollMemory() {
  if (!canUseSessionStorage()) return null

  try {
    const raw = window.sessionStorage.getItem(HOME_SCROLL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function writeHomeScrollMemory(memory) {
  if (!canUseSessionStorage()) return

  try {
    window.sessionStorage.setItem(HOME_SCROLL_KEY, JSON.stringify(memory))
  } catch {
    // Ignore storage failures.
  }
}

function resolveVisibleHomeSection() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null

  const sections = Array.from(document.querySelectorAll(HOME_SECTION_SELECTOR))
  if (!sections.length) return null

  const markerY = window.scrollY + window.innerHeight * 0.35
  let activeSection = sections[0]

  for (const section of sections) {
    const top = section.offsetTop
    if (top <= markerY) {
      activeSection = section
      continue
    }
    break
  }

  return activeSection?.getAttribute('data-home-section') ?? null
}

export default function Home() {
  const [cachedHome] = useState(() => readHomeCache())
  const [homeData, setHomeData] = useState(() => cachedHome?.data ?? null)
  const [loading, setLoading] = useState(() => !cachedHome)
  const [error, setError] = useState(null)
  const navigationType = useNavigationType()

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const cachedRevision = cachedHome?.revision ?? null
    const hasCachedHome = Boolean(cachedHome)

    async function loadHome() {
      setError(null)

      try {
        const response = await fetch(apiUrl('/api/home'), {
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('Homepage request failed')
        }
        const data = await response.json()
        if (!cancelled) {
          writeHomeCache(data)
          if (cachedRevision !== data.revision) {
            setHomeData(data)
          }
          setError(null)
        }
      } catch {
        if (!cancelled && !hasCachedHome) {
          setError(CUSTOMER_RETRY_MESSAGE)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadHome()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [cachedHome])

  useEffect(() => {
    if (loading || typeof window === 'undefined') return undefined

    let saveRafId = 0
    const saveScrollMemory = () => {
      writeHomeScrollMemory({
        y: window.scrollY,
        sectionId: resolveVisibleHomeSection(),
        updatedAt: Date.now(),
      })
    }

    const onScroll = () => {
      if (saveRafId) return
      saveRafId = window.requestAnimationFrame(() => {
        saveScrollMemory()
        saveRafId = 0
      })
    }

    saveScrollMemory()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (saveRafId) {
        window.cancelAnimationFrame(saveRafId)
      }
      saveScrollMemory()
    }
  }, [loading, homeData?.revision])

  useLayoutEffect(() => {
    if (loading || navigationType !== 'POP' || typeof window === 'undefined') {
      return undefined
    }

    const saved = readHomeScrollMemory()
    if (!saved) return undefined

    let rafId = 0
    let attempts = 0

    const restore = () => {
      const sectionId =
        typeof saved.sectionId === 'string' && saved.sectionId.trim() !== ''
          ? saved.sectionId
          : null
      const sectionNode = sectionId
        ? document.querySelector(`[data-home-section="${sectionId}"]`)
        : null
      const sectionTop = sectionNode instanceof HTMLElement ? sectionNode.offsetTop : 0
      const requestedY =
        typeof saved.y === 'number' && Number.isFinite(saved.y)
          ? Math.max(saved.y, 0)
          : Math.max(sectionTop, 0)
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      )
      const targetY = Math.min(requestedY, maxScroll)

      window.scrollTo(0, targetY)

      const closeEnough = Math.abs(window.scrollY - targetY) <= 2
      const sectionReady = !sectionNode || sectionTop > 0 || targetY === 0
      if ((closeEnough && sectionReady) || attempts >= HOME_RESTORE_ATTEMPTS) {
        return
      }

      attempts += 1
      rafId = window.requestAnimationFrame(() => {
        rafId = window.requestAnimationFrame(restore)
      })
    }

    rafId = window.requestAnimationFrame(() => {
      rafId = window.requestAnimationFrame(restore)
    })

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [loading, navigationType, homeData?.revision])

  if (loading) {
    return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pt-5 pb-24 sm:px-6 sm:pt-8 sm:pb-16 lg:pb-12">
        <LoadingState
          title="Building the home experience..."
          description="Fetching featured collections and live product campaigns."
          className="min-h-[40svh] py-16"
        />
      </main>
    )
  }

  if (error) {
    return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pt-5 pb-24 sm:px-6 sm:pt-8 sm:pb-16 lg:pb-12">
        <div className="rounded-[1.8rem] border border-amber-200/90 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
          {error}
        </div>
      </main>
    )
  }

  const {
    heroSlides = [],
    quickCollections = [],
    featuredCollections = [],
    categoryShowcase = [],
    trendingProducts = [],
    weeklyPicks = [],
    newArrivals = [],
  } = homeData ?? {}

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 pt-4 pb-24 sm:px-6 sm:pt-6 sm:pb-16 lg:pb-12">
      <section
        data-home-section="hero"
        className="relative overflow-hidden rounded-[2.4rem] border border-stone-200/70 bg-[linear-gradient(145deg,#f9f5ef,#f2e9dc_50%,#f8f5ef)] px-4 py-5 shadow-[0_18px_60px_rgba(44,28,18,0.06)] sm:px-7 sm:py-7"
      >
        <div className="absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.14),_transparent_70%)] blur-2xl" />
        <div className="relative z-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-700/80">
            New Season Edit
          </p>
          <h1 className="mt-3 max-w-3xl font-['Georgia','Times_New_Roman',serif] text-[2.3rem] leading-[0.96] text-stone-950 sm:text-[3.2rem]">
            Discover elegant sarees for everyday wear, festive moments, and statement dressing.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
            Explore handpicked price edits, fresh arrivals, and beautiful collections designed to help you shop quickly and confidently.
          </p>
          <SearchBar className="mt-6" />
        </div>
      </section>

      <section data-home-section="carousel" className="mt-6 sm:mt-8">
        <HeroCarousel slides={heroSlides} />
      </section>

      <section data-home-section="budget" className="mt-10 sm:mt-12">
        <SectionHeader
          eyebrow="Shop By Budget"
          title="Beautiful picks for every budget"
          description="Browse affordable favourites, festive value styles, and easy everyday finds without spending time inside filters."
        />
        <div className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-2 pt-2 scrollbar-none snap-x snap-mandatory scroll-px-4 sm:mx-0 sm:grid sm:gap-5 sm:overflow-visible sm:px-0 sm:pt-0 sm:grid-cols-2 xl:grid-cols-3">
          {quickCollections.map((item) => (
            <PromoCollectionCard
              key={item.id}
              item={item}
              className="w-[84vw] flex-none snap-center sm:w-auto sm:flex-auto"
            />
          ))}
        </div>
      </section>

      <section data-home-section="signature" className="mt-10 sm:mt-12">
        <SectionHeader
          eyebrow="Signature Collections"
          title="Shop the saree stories you love"
          description="From cotton comfort to festive silk and designer looks, every collection is made to feel inspiring and easy to explore."
        />
        <div className="mt-6">
          <CategoryShowcase items={categoryShowcase.slice(0, 6)} />
        </div>
      </section>

      <section data-home-section="featured" className="mt-10 sm:mt-12">
        <SectionHeader
          eyebrow="Featured Edits"
          title="Curated styles worth a closer look"
          description="Explore standout collections inspired by trending colours, timeless weaves, occasion dressing, and price-friendly favourites."
          action={
            <Link
              to={createShopHref()}
              className="inline-flex min-h-[46px] items-center rounded-full border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 no-underline transition hover:border-stone-400 hover:bg-stone-50"
            >
              Browse all products
            </Link>
          }
        />
        <div className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-2 pt-2 scrollbar-none snap-x snap-mandatory scroll-px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pt-0 xl:grid-cols-4">
          {featuredCollections.slice(0, 6).map((item) => (
            <PromoCollectionCard
              key={item.id}
              item={item}
              variant="featured"
              className="w-[84vw] flex-none snap-center sm:w-auto sm:flex-auto"
            />
          ))}
        </div>
      </section>

      <section data-home-section="trending" className="mt-10 sm:mt-12">
        <ProductRail
          title="Trending now"
          description="Popular picks shoppers are loving right now, from standout festive looks to easy everyday favourites."
          products={trendingProducts.slice(0, 8)}
          actionHref={createShopHref()}
          actionLabel="Shop trending styles"
        />
      </section>

      <section data-home-section="weekly" className="mt-10 sm:mt-12">
        <ProductRail
          title="This week's highlighted picks"
          description="A rotating edit of fresh, well-stocked styles to keep the storefront lively every few days."
          products={weeklyPicks.slice(0, 8)}
          actionHref={createShopHref({ sort: 'newest' })}
          actionLabel="See latest"
        />
      </section>

      <section data-home-section="new-arrivals" className="mt-10 sm:mt-12">
        <ProductRail
          title="New arrivals"
          description="The newest pieces are still easy to find from the home page without forcing shoppers into filters first."
          products={newArrivals.slice(0, 8)}
          actionHref={createShopHref({ sort: 'newest' })}
          actionLabel="View new arrivals"
        />
      </section>
    </main>
  )
}
