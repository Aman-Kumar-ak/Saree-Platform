import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MobileBackButton from '../components/MobileBackButton.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { WishlistButton } from '../components/WishlistButton.jsx'
import { apiUrl } from '../config/api.js'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

function getAmbientColor(image) {
  try {
    const width = 24
    const height = 24
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return '108, 120, 143'

    context.drawImage(image, 0, 0, width, height)
    const { data } = context.getImageData(0, 0, width, height)

    const bins = new Map()
    let fallbackR = 0
    let fallbackG = 0
    let fallbackB = 0
    let fallbackWeight = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < 80) continue

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const brightness = (r + g + b) / 3
      const saturation = max - min
      const weight = Math.max(1, saturation) * (1.1 - Math.min(brightness, 255) / 320)

      fallbackR += r * weight
      fallbackG += g * weight
      fallbackB += b * weight
      fallbackWeight += weight

      if (saturation < 18 || brightness > 245 || brightness < 25) continue

      const key = `${r >> 4},${g >> 4},${b >> 4}`
      const current = bins.get(key)
      if (current) {
        current.weight += weight
        current.r += r * weight
        current.g += g * weight
        current.b += b * weight
      } else {
        bins.set(key, { weight, r: r * weight, g: g * weight, b: b * weight })
      }
    }

    const topBin = [...bins.values()].sort((a, b) => b.weight - a.weight)[0]
    const source =
      topBin ??
      (fallbackWeight > 0
        ? {
            r: fallbackR,
            g: fallbackG,
            b: fallbackB,
            weight: fallbackWeight,
          }
        : null)

    if (!source) return '108, 120, 143'

    const r = Math.round(source.r / source.weight)
    const g = Math.round(source.g / source.weight)
    const b = Math.round(source.b / source.weight)
    return `${r}, ${g}, ${b}`
  } catch {
    return '108, 120, 143'
  }
}

function boostAmbientColor(rgb) {
  const parts = rgb.split(',').map((value) => Number(value.trim()))
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) return rgb

  const [r, g, b] = parts
  const mix = 0.2
  const boostedR = Math.round(r * (1 + mix))
  const boostedG = Math.round(g * (1 + mix))
  const boostedB = Math.round(b * (1 + mix))
  const clamp = (value) => Math.max(0, Math.min(255, value))

  return `${clamp(boostedR)}, ${clamp(boostedG)}, ${clamp(boostedB)}`
}

function ImageViewerModal({ open, src, alt, onClose }) {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/15 active:scale-[0.98]"
      >
        <span className="text-2xl leading-none">{String.fromCharCode(215)}</span>
      </button>

      <div className="flex h-full w-full items-center justify-center">
        <div className="relative max-h-full max-w-[min(96vw,1100px)]">
          <img
            src={src}
            alt={alt}
            className="max-h-[88svh] w-auto max-w-full rounded-[28px] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
            draggable="false"
          />
          <p className="mt-3 text-center text-xs uppercase tracking-[0.24em] text-white/70">
            Tap outside or press Esc to close
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}

function isZoomIgnoredTarget(target) {
  return target instanceof Element && Boolean(target.closest('[data-zoom-ignore="true"]'))
}

const TOUCH_LENS_SIZE = 184
const TOUCH_LENS_Y_OFFSET = 112

function getTouchLensPosition(point, wrapper) {
  const radius = TOUCH_LENS_SIZE / 2
  const minX = radius + 10
  const maxX = Math.max(minX, wrapper.width - radius - 10)
  const minY = radius + 10
  const maxY = Math.max(minY, wrapper.height - radius - 10)
  const x = Math.min(Math.max(point.left, minX), maxX)
  const y = Math.min(Math.max(point.top - TOUCH_LENS_Y_OFFSET, minY), maxY)

  return { left: x, top: y }
}

export default function ProductDetail() {
  const { slug } = useParams()
  const { addOrUpdate } = useCart()
  const { addToast } = useToast()
  const imageRef = useRef(null)
  const imageAreaRef = useRef(null)
  const touchHoldTimerRef = useRef(null)
  const touchStartRef = useRef({ x: 0, y: 0 })
  const touchLongPressRef = useRef(false)
  const suppressNextClickRef = useRef(false)
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qty, setQty] = useState(1)
  const [ambientRgb, setAmbientRgb] = useState('108, 120, 143')
  const ambientColorRef = useRef('')
  const [viewerOpen, setViewerOpen] = useState(false)
  const [mouseZoom, setMouseZoom] = useState({
    active: false,
    x: 50,
    y: 50,
  })
  const [touchZoom, setTouchZoom] = useState({
    active: false,
    x: 50,
    y: 50,
    left: 0,
    top: 0,
  })
  const rupee = String.fromCharCode(8377)
  const minus = String.fromCharCode(8722)

  useEffect(() => {
    if (!slug) return undefined
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(apiUrl(`/api/products/${encodeURIComponent(slug)}`))
        if (response.status === 404) {
          if (!cancelled) {
            setProduct(null)
            setError('Not found')
          }
          return
        }

        if (!response.ok) throw new Error('Request failed')

        const data = await response.json()
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
      setQty((current) => Math.min(maxQty, Math.max(1, current)))
    })
    return () => cancelAnimationFrame(id)
  }, [product, maxQty])

  useEffect(() => {
    if (product?.name) {
      document.title = `${product.name} \u00b7 Shop`
    }

    return () => {
      const title = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = title ? `${title} \u00b7 Shop` : 'Shop'
    }
  }, [product])

  useEffect(() => {
    if (!product?.images?.[0]) return undefined

    const image = imageRef.current
    if (!image || !image.complete) return undefined
    if (ambientColorRef.current) return undefined

    const schedule =
      window.requestIdleCallback ??
      ((callback) =>
        window.setTimeout(
          () =>
            callback({
              didTimeout: true,
              timeRemaining: () => 0,
            }),
          0
        ))
    const cancel =
      window.cancelIdleCallback ?? ((id) => window.clearTimeout(id))

    const id = schedule(() => {
      const nextAmbient = getAmbientColor(image)
      ambientColorRef.current = nextAmbient
      setAmbientRgb(nextAmbient)
    })

    return () => cancel(id)
  }, [product])

  if (loading) {
    return (
      <LoadingState
        title="Loading product..."
        description="Pulling the product details and photos."
      />
    )
  }

  if (error || !product) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 pt-12 sm:px-6 sm:pb-12 lg:pb-16">
        <MobileBackButton to="/" label="Back to shop" />
        <p className="text-sm text-stone-600">{error || 'Product not found.'}</p>
      </main>
    )
  }

  const price = typeof product.price === 'number' ? product.price : 0
  const category = product.category
  const canBuy = maxQty >= 1
  const imageSrc = product.images?.[0] ?? ''
  const ambientColor = boostAmbientColor(ambientRgb)

  function closeViewer() {
    setViewerOpen(false)
    setMouseZoom((current) => ({ ...current, active: false }))
    setTouchZoom((current) => ({ ...current, active: false }))
    touchLongPressRef.current = false
  }

  function openViewer() {
    if (!imageSrc) return
    setViewerOpen(true)
  }

  function clearTouchHoldTimer() {
    if (touchHoldTimerRef.current) {
      window.clearTimeout(touchHoldTimerRef.current)
      touchHoldTimerRef.current = null
    }
  }

  function getZoomPoint(event) {
    const wrapper = imageAreaRef.current
    const image = imageRef.current
    if (!wrapper || !image) return null
    if (isZoomIgnoredTarget(event.target)) return null

    const wrapperRect = wrapper.getBoundingClientRect()
    const imageRect = image.getBoundingClientRect()
    if (!imageRect.width || !imageRect.height) return null

    if (
      event.clientX < imageRect.left ||
      event.clientX > imageRect.right ||
      event.clientY < imageRect.top ||
      event.clientY > imageRect.bottom
    ) {
      return null
    }

    const clientX = Math.min(Math.max(event.clientX, imageRect.left), imageRect.right)
    const clientY = Math.min(Math.max(event.clientY, imageRect.top), imageRect.bottom)

    return {
      x: ((clientX - imageRect.left) / imageRect.width) * 100,
      y: ((clientY - imageRect.top) / imageRect.height) * 100,
      left: clientX - wrapperRect.left,
      top: clientY - wrapperRect.top,
    }
  }

  function hideZoom() {
    setMouseZoom((current) => ({ ...current, active: false }))
    setTouchZoom((current) => ({ ...current, active: false }))
  }

  function handleImagePointerDown(event) {
    if (isZoomIgnoredTarget(event.target)) return

    if (event.pointerType !== 'touch') {
      const point = getZoomPoint(event)
      if (!point) {
        setMouseZoom((current) => ({ ...current, active: false }))
        return
      }
      setMouseZoom({
        active: true,
        x: point.x,
        y: point.y,
      })
      return
    }

    touchLongPressRef.current = false
    touchStartRef.current = { x: event.clientX, y: event.clientY }
    clearTouchHoldTimer()
    touchHoldTimerRef.current = window.setTimeout(() => {
      touchLongPressRef.current = true
      const point = getZoomPoint(event)
      if (!point) return
      const wrapper = imageAreaRef.current?.getBoundingClientRect()
      if (!wrapper) return
      const lensPosition = getTouchLensPosition(point, wrapper)
      setTouchZoom({
        active: true,
        x: point.x,
        y: point.y,
        left: lensPosition.left,
        top: lensPosition.top,
      })
      setMouseZoom((current) => ({ ...current, active: false }))
    }, 220)
  }

  function handleImagePointerMove(event) {
    if (isZoomIgnoredTarget(event.target)) {
      if (event.pointerType === 'mouse') {
        setMouseZoom((current) => ({ ...current, active: false }))
      }
      return
    }

    if (event.pointerType === 'mouse') {
      const point = getZoomPoint(event)
      if (!point) {
        setMouseZoom((current) => ({ ...current, active: false }))
        return
      }
      setMouseZoom({
        active: true,
        x: point.x,
        y: point.y,
      })
      return
    }

    if (event.pointerType !== 'touch' || (!touchHoldTimerRef.current && !touchLongPressRef.current)) return

    const movedTooFar =
      Math.abs(event.clientX - touchStartRef.current.x) > 10 ||
      Math.abs(event.clientY - touchStartRef.current.y) > 10

    if (movedTooFar) {
      clearTouchHoldTimer()
    }

    if (touchLongPressRef.current) {
      const point = getZoomPoint(event)
      if (!point) {
        hideZoom()
        return
      }
      const wrapper = imageAreaRef.current?.getBoundingClientRect()
      if (!wrapper) return
      const lensPosition = getTouchLensPosition(point, wrapper)
      setTouchZoom({
        active: true,
        x: point.x,
        y: point.y,
        left: lensPosition.left,
        top: lensPosition.top,
      })
    }
  }

  function handleImagePointerUp(event) {
    if (event.pointerType !== 'touch') return

    clearTouchHoldTimer()
    if (touchLongPressRef.current) {
      hideZoom()
      suppressNextClickRef.current = true
    }
    touchLongPressRef.current = false
  }

  function handleImageClick(event) {
    if (isZoomIgnoredTarget(event.target)) return

    if (suppressNextClickRef.current) {
      event.preventDefault()
      suppressNextClickRef.current = false
      return
    }

    openViewer()
  }

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
    <main
      className="relative mx-auto w-full max-w-7xl overflow-hidden px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-12 sm:pt-8 lg:pb-16"
      style={{ '--ambient-rgb': ambientColor }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-2 -z-10 h-[10rem] w-[min(66vw,42rem)] -translate-x-1/2 rounded-[30px] bg-[radial-gradient(circle_at_50%_0%,rgba(var(--ambient-rgb),0.38),transparent_24%),radial-gradient(circle_at_18%_12%,rgba(var(--ambient-rgb),0.28),transparent_16%),radial-gradient(circle_at_82%_18%,rgba(var(--ambient-rgb),0.18),transparent_14%),linear-gradient(180deg,rgba(var(--ambient-rgb),0.24),rgba(var(--ambient-rgb),0.08)_52%,rgba(250,250,249,0.92))] blur-2xl sm:top-3 sm:h-[12rem] sm:w-[min(58vw,46rem)] lg:h-[14rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-6 -z-10 h-24 w-24 -translate-x-1/2 rounded-full bg-[rgba(var(--ambient-rgb),0.28)] blur-2xl sm:top-8 sm:h-28 sm:w-28"
      />

      <div className="mb-1 flex justify-start sm:hidden">
        <MobileBackButton to="/" label="Back to shop" variant="inline" />
      </div>

      <div className="mt-2 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-start lg:gap-10">
        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/75 p-1.5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:p-2">
          <div
            ref={imageAreaRef}
            role="button"
            tabIndex={0}
            aria-label="Open image preview"
            onClick={handleImageClick}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openViewer()
              }
            }}
            onPointerDown={handleImagePointerDown}
            onPointerUp={handleImagePointerUp}
            onPointerCancel={() => {
              clearTouchHoldTimer()
              touchLongPressRef.current = false
              hideZoom()
            }}
            onPointerLeave={() => {
              clearTouchHoldTimer()
              touchLongPressRef.current = false
              hideZoom()
            }}
            onContextMenu={(event) => {
              event.preventDefault()
            }}
            onPointerMove={handleImagePointerMove}
            onPointerEnter={(event) => {
              if (isZoomIgnoredTarget(event.target)) return

              if (event.pointerType === 'mouse') {
                const point = getZoomPoint(event)
                if (!point) {
                  setMouseZoom((current) => ({ ...current, active: false }))
                  return
                }
                setMouseZoom({
                  active: true,
                  x: point.x,
                  y: point.y,
                })
              }
            }}
            className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[26px] bg-stone-100/70 outline-none select-none focus-visible:ring-2 focus-visible:ring-stone-500/60 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
            style={{
              touchAction: 'pan-y',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
          >
            <div
              aria-hidden
              className="absolute inset-[4%] rounded-[22px] bg-[radial-gradient(circle_at_18%_16%,rgba(var(--ambient-rgb),0.78),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(var(--ambient-rgb),0.52),transparent_14%),radial-gradient(circle_at_50%_72%,rgba(var(--ambient-rgb),0.24),transparent_26%)] blur-2xl sm:inset-[4%] sm:rounded-[26px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--ambient-rgb),0.22)] via-transparent to-[rgba(var(--ambient-rgb),0.12)]" />
            <div className="relative flex min-h-[min(70svh,720px)] items-center justify-center px-3 py-1.5 sm:min-h-[min(72svh,760px)] sm:px-5 sm:py-2 lg:min-h-[620px] lg:px-6 lg:py-4">
              {imageSrc ? (
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt={product.name}
                  crossOrigin="anonymous"
                  onLoad={(event) => {
                    const nextAmbient = getAmbientColor(event.currentTarget)
                    ambientColorRef.current = nextAmbient
                    setAmbientRgb(nextAmbient)
                  }}
                  className="h-full max-h-[86svh] w-full rounded-[18px] object-contain drop-shadow-[0_20px_45px_rgba(15,23,42,0.12)] transition duration-500 ease-out md:group-hover:scale-[1.24] md:group-hover:drop-shadow-[0_32px_80px_rgba(15,23,42,0.22)]"
                  style={{
                    transformOrigin: `${mouseZoom.x}% ${mouseZoom.y}%`,
                    transform:
                      mouseZoom.active && !touchZoom.active
                        ? 'scale(1.52)'
                        : undefined,
                  }}
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="flex min-h-[520px] items-center justify-center text-stone-400 sm:min-h-[620px]">
                  <span className="text-sm">No image available</span>
                </div>
              )}
            </div>
            {touchZoom.active && imageSrc ? (
              <div
                aria-hidden
                className="pointer-events-none absolute z-30 overflow-hidden rounded-full border border-white/70 shadow-[0_20px_60px_rgba(15,23,42,0.24)] ring-1 ring-black/10"
                style={{
                  width: `${TOUCH_LENS_SIZE}px`,
                  height: `${TOUCH_LENS_SIZE}px`,
                  left: `${touchZoom.left}px`,
                  top: `${touchZoom.top}px`,
                  transform: 'translate(-50%, -50%)',
                  backgroundImage: `url(${imageSrc})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '380%',
                  backgroundPosition: `${touchZoom.x}% ${touchZoom.y}%`,
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_58%,rgba(255,255,255,0.08)_100%)]" />
              </div>
            ) : null}
            <div className="absolute right-4 top-4 z-20">
              <WishlistButton
                product={product}
                className="h-11 w-11 bg-white/95 shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
                iconClassName="h-5 w-5"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <div className="rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:p-6">
            {category?.slug ? (
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500 sm:text-[13px]">
                <Link
                  to={`/?category=${encodeURIComponent(category.slug)}`}
                  className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-stone-700 no-underline transition [-webkit-tap-highlight-color:transparent] active:scale-[0.98] sm:hover:bg-stone-200/80"
                >
                  {category.name}
                </Link>
              </p>
            ) : null}

            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-3xl lg:text-[2.4rem]">
              {product.name}
            </h1>

            <p className="mt-4 text-3xl font-semibold tabular-nums text-stone-900 sm:text-[2.15rem]">
              {rupee}
              {price.toLocaleString('en-IN')}
            </p>
          </div>

          {product.description ? (
            <div className="rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:p-6">
              <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-stone-700">
                Description
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-[15px]">
                {product.description}
              </p>
            </div>
          ) : null}

          <div className="rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:p-6">
            {canBuy ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Select quantity
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    Choose how many pieces you want.
                  </p>
                </div>

                <div className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 p-1 shadow-sm">
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-stone-700 transition touch-manipulation [-webkit-tap-highlight-color:transparent] active:bg-stone-200 disabled:opacity-40"
                    disabled={qty <= 1}
                    onClick={() => setQty((current) => Math.max(1, current - 1))}
                    aria-label="Decrease quantity"
                  >
                    {minus}
                  </button>
                  <span className="min-w-[3rem] text-center text-base font-semibold tabular-nums text-stone-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-stone-700 transition touch-manipulation [-webkit-tap-highlight-color:transparent] active:bg-stone-200 disabled:opacity-40"
                    disabled={qty >= maxQty}
                    onClick={() => setQty((current) => Math.min(maxQty, current + 1))}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                disabled={!canBuy}
                onClick={addToCart}
                className="w-full min-h-[54px] rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition touch-manipulation [-webkit-tap-highlight-color:transparent] active:translate-y-px active:opacity-90 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
              >
                {canBuy ? 'Add to cart' : 'Out of stock'}
              </button>

              <Link
                to="/cart"
                className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800 no-underline transition [-webkit-tap-highlight-color:transparent] active:bg-stone-50 sm:hover:border-stone-300"
              >
                View cart
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ImageViewerModal open={viewerOpen} src={imageSrc} alt={product.name} onClose={closeViewer} />
    </main>
  )
}
