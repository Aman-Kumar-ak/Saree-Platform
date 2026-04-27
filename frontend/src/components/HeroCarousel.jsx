import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const ambientShellClass =
  'bg-[linear-gradient(145deg,rgba(250,247,243,0.95),rgba(255,255,255,0.9)_52%,rgba(246,240,233,0.96))]'

const accentPillClasses = {
  amber: 'bg-amber-100 text-amber-800 ring-amber-200/80',
  rose: 'bg-rose-100 text-rose-800 ring-rose-200/80',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200/80',
  sky: 'bg-sky-100 text-sky-800 ring-sky-200/80',
  stone: 'bg-stone-200 text-stone-700 ring-stone-300/80',
}

export function HeroCarousel({ slides = [] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartRef = useRef({ active: false, x: 0, y: 0 })

  useEffect(() => {
    if (slides.length < 2 || isPaused) return undefined
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        window.matchMedia?.('(max-width: 767px)').matches)
    ) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, 6500)

    return () => window.clearInterval(timer)
  }, [isPaused, slides.length])

  if (!slides.length) return null

  const safeActiveIndex = activeIndex % slides.length
  const activeSlide = slides[safeActiveIndex]

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
  }

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % slides.length)
  }

  const formatSlideCount = (count) => String(count).padStart(2, '0')

  const handleTouchStart = (event) => {
    if (event.target instanceof Element && event.target.closest('a,button')) {
      return
    }

    const touch = event.touches[0]
    if (!touch) return

    touchStartRef.current = {
      active: true,
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  const handleTouchEnd = (event) => {
    const touchState = touchStartRef.current
    if (!touchState.active) return

    const touch = event.changedTouches[0]
    touchStartRef.current = { active: false, x: 0, y: 0 }
    if (!touch) return

    const deltaX = touch.clientX - touchState.x
    const deltaY = touch.clientY - touchState.y
    const swipeThreshold = 48

    if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) {
      return
    }

    if (deltaX > 0) {
      goToPrevious()
      return
    }

    goToNext()
  }

  return (
    <section
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured saree collections"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false)
        }
      }}
    >
      <div
        className={`relative overflow-hidden rounded-[1.95rem] border border-white/35 ${ambientShellClass} shadow-[0_18px_48px_rgba(44,28,18,0.08)] backdrop-blur-2xl`}
      >
        <p className="sr-only" aria-live="polite">
          Featured slide {formatSlideCount(safeActiveIndex + 1)} of{' '}
          {formatSlideCount(slides.length)}: {activeSlide?.title}
        </p>

        <div className="relative h-[31.5rem] sm:h-auto sm:min-h-[35rem] lg:min-h-[34rem]">
          {slides.map((slide, index) => {
            const isActive = index === safeActiveIndex
            const accentPillClass =
              accentPillClasses[slide.accentFrom] ?? accentPillClasses.rose
            const slideCountLabel = `${formatSlideCount(index + 1)} / ${formatSlideCount(
              slides.length,
            )}`

            return (
              <article
                key={slide.id ?? index}
                className={`absolute inset-0 transition-all duration-700 ease-out ${
                  isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                aria-hidden={!isActive}
              >
                <div className="grid h-full gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 lg:px-8 lg:py-8">
                  <div className="hidden flex-col justify-center gap-5 lg:flex lg:order-1">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ring-1 ${accentPillClass}`}
                        >
                          {slide.eyebrow ?? 'Featured edit'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-600 ring-1 ring-stone-200/90">
                          {slide.productCount ? `${slide.productCount} styles` : 'Curated selection'}
                        </span>
                      </div>

                      <h2 className="mt-4 max-w-xl font-['Georgia','Times_New_Roman',serif] text-[clamp(2.1rem,6vw,4.25rem)] leading-[0.92] tracking-[-0.04em] text-stone-950 sm:max-w-2xl">
                        {slide.title}
                      </h2>

                      {slide.description ? (
                        <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
                          {slide.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <Link
                        to={slide.href}
                        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-stone-950 px-5 text-sm font-semibold text-white no-underline transition hover:bg-stone-800 sm:w-auto"
                      >
                        {slide.ctaLabel ?? 'Shop collection'}
                      </Link>
                      <span className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-stone-100 px-4 text-sm font-medium text-stone-600 ring-1 ring-stone-200 sm:w-auto">
                        Curated for the season
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                      <span>Slide {slideCountLabel}</span>
                      {isPaused ? <span>Paused while you explore</span> : null}
                    </div>
                  </div>

                  <div className="order-1 flex items-start justify-center pt-1 lg:order-2 lg:items-center lg:justify-end lg:pt-0">
                    <div className="flex w-full max-w-[19.25rem] flex-col items-center gap-3 lg:max-w-[25rem]">
                      <div
                        className={`relative w-full overflow-hidden rounded-[2rem] ${ambientShellClass} aspect-[4/5.7] ring-1 ring-white/70 shadow-[0_28px_60px_rgba(39,24,16,0.12)] sm:aspect-[4/5]`}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.88),transparent_28%),radial-gradient(circle_at_78%_16%,rgba(255,255,255,0.44),transparent_24%)]" />
                        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0))]" />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(248,244,239,0.42)_100%)]" />

                        <div className="absolute inset-3 overflow-hidden rounded-[1.55rem] bg-white">
                          {slide.image ? (
                            <div className="flex h-full w-full items-center justify-center p-1.5 sm:p-2">
                              <img
                                src={slide.image}
                                alt={slide.title}
                                className="max-h-full max-w-full rounded-[1.35rem] object-contain object-center drop-shadow-[0_32px_50px_rgba(32,22,14,0.2)] transition duration-700"
                              />
                            </div>
                          ) : (
                            <div className="h-full w-full bg-white" />
                          )}
                        </div>

                        <div className="absolute bottom-4 right-4 hidden rounded-full bg-stone-950/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white shadow-lg lg:inline-flex">
                          {slide.productCount ? `${slide.productCount} styles` : 'Curated'}
                        </div>

                        <div className="absolute inset-x-3 bottom-3 rounded-[1rem] border border-white/70 bg-white/82 p-2 shadow-[0_18px_34px_rgba(44,28,18,0.1)] backdrop-blur-md lg:hidden">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-600 ring-1 ring-stone-200/90">
                              {slide.productCount ? `${slide.productCount} styles` : 'Curated selection'}
                            </span>
                          </div>

                          <h3 className="mt-2 w-full overflow-hidden text-ellipsis whitespace-nowrap font-['Georgia','Times_New_Roman',serif] text-[0.9rem] leading-none tracking-[-0.03em] text-stone-950 sm:text-[1.05rem]">
                            {slide.title}
                          </h3>

                          {slide.description ? (
                            <p className="mt-1 hidden text-xs leading-relaxed text-stone-600 sm:block sm:text-sm">
                              {slide.description}
                            </p>
                          ) : null}

                          <div className="mt-3 flex items-center gap-2">
                            <Link
                              to={slide.href}
                              className="inline-flex min-h-[34px] flex-1 items-center justify-center rounded-full bg-stone-950 px-4 text-[11px] font-semibold text-white no-underline transition hover:bg-stone-800"
                            >
                              {slide.ctaLabel ?? 'Shop collection'}
                            </Link>
                            <span className="hidden min-h-[40px] items-center rounded-full bg-stone-100 px-3 text-[11px] font-medium text-stone-600 ring-1 ring-stone-200 sm:inline-flex">
                              Tap to explore
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 lg:hidden">
                        {slides.map((item, itemIndex) => {
                          const active = itemIndex === safeActiveIndex

                          return (
                            <button
                              key={`mobile-dot-${item.id ?? itemIndex}`}
                              type="button"
                              onClick={() => setActiveIndex(itemIndex)}
                              className={`rounded-full transition-all duration-300 ${
                                active
                                  ? 'h-2.5 w-8 bg-stone-950'
                                  : 'h-2.5 w-2.5 bg-stone-300 hover:bg-stone-400'
                              }`}
                              aria-label={`Show slide ${itemIndex + 1}: ${item.title}`}
                              aria-pressed={active}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 hidden justify-center px-4 lg:flex lg:bottom-6">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/24 px-3 py-2 shadow-[0_18px_32px_rgba(44,28,18,0.12)] backdrop-blur-xl">
            {slides.map((slide, index) => {
              const active = index === safeActiveIndex

              return (
                <button
                  key={`dot-${slide.id ?? index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    active ? 'w-9 bg-stone-950' : 'w-2.5 bg-stone-300 hover:bg-stone-400'
                  }`}
                  aria-label={`Show slide ${index + 1}: ${slide.title}`}
                  aria-pressed={active}
                />
              )
            })}
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 sm:flex">
          {slides.length > 1 ? (
            <div className="pointer-events-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={goToPrevious}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/24 text-stone-700 shadow-[0_12px_28px_rgba(44,28,18,0.12)] backdrop-blur-xl transition hover:border-white/70 hover:bg-white/40 hover:text-stone-950"
                aria-label="Previous slide"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/24 text-stone-700 shadow-[0_12px_28px_rgba(44,28,18,0.12)] backdrop-blur-xl transition hover:border-white/70 hover:bg-white/40 hover:text-stone-950"
                aria-label="Next slide"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
