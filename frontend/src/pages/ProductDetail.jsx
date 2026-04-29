import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MobileBackButton from '../components/MobileBackButton.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { ProductRail } from '../components/ProductRail.jsx'
import { WishlistButton } from '../components/WishlistButton.jsx'
import { apiUrl } from '../config/api.js'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { recordRecentlyViewed, readRecentlyViewed } from '../lib/recentlyViewed.js'

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
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const resetId = window.requestAnimationFrame(() => {
      setZoomed(false)
    })

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflow
      window.cancelAnimationFrame(resetId)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} image preview`}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[150] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] transition hover:bg-white/18 active:scale-[0.98]"
      >
        <span className="text-2xl leading-none">{String.fromCharCode(215)}</span>
      </button>

      <div className="flex h-full w-full items-center justify-center">
        <button
          type="button"
          aria-label={zoomed ? 'Zoom out image preview' : 'Zoom in image preview'}
          aria-pressed={zoomed}
          onClick={() => setZoomed((current) => !current)}
          className="relative block max-h-[88svh] max-w-[min(96vw,1100px)] overflow-auto rounded-[28px] bg-transparent p-0 outline-none touch-manipulation [-webkit-tap-highlight-color:transparent]"
        >
          <img
            src={src}
            alt={alt}
            className={`block rounded-[28px] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out ${
              zoomed
                ? 'w-[125vw] max-w-none cursor-zoom-out'
                : 'max-h-[88svh] w-auto max-w-full cursor-zoom-in'
            }`}
            draggable="false"
            style={{
              transformOrigin: 'center center',
            }}
          />
        </button>
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
  const zoomHintTimerRef = useRef(null)
  const zoomHintUnmountTimerRef = useRef(null)
  const touchStartRef = useRef({ x: 0, y: 0 })
  const touchLongPressRef = useRef(false)
  const suppressNextClickRef = useRef(false)
  const [product, setProduct] = useState(null)
  const [similarProducts, setSimilarProducts] = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState(() =>
    readRecentlyViewed().slice(0, 8)
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qty, setQty] = useState(1)
  const [ambientRgb, setAmbientRgb] = useState('108, 120, 143')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [showZoomHint, setShowZoomHint] = useState(false)
  const [zoomHintReady, setZoomHintReady] = useState(false)
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

  useEffect(() => {
    if (!slug) return undefined
    let cancelled = false

    async function loadRecommendations() {
      try {
        const response = await fetch(
          apiUrl(`/api/products/${encodeURIComponent(slug)}/recommendations?limit=8`)
        )
        if (!response.ok) throw new Error('Recommendations request failed')
        const data = await response.json()
        if (!cancelled) {
          setSimilarProducts(data.recommendations ?? [])
        }
      } catch {
        if (!cancelled) {
          setSimilarProducts([])
        }
      }
    }

    loadRecommendations()

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
    if (!product?._id) return
    const id = window.requestAnimationFrame(() => {
      const nextItems = recordRecentlyViewed(product)
      setRecentlyViewed(
        nextItems.filter((item) => String(item._id) !== String(product._id)).slice(0, 8)
      )
    })

    return () => window.cancelAnimationFrame(id)
  }, [product])

  useEffect(() => {
    if (!product?._id) return undefined

    let cancelled = false
    let hintShowId = 0

    const id = window.requestAnimationFrame(() => {
      if (cancelled) return

      setSelectedImageIndex(0)
      setViewerOpen(false)
      setShowZoomHint(true)
      setZoomHintReady(false)
      setMouseZoom({
        active: false,
        x: 50,
        y: 50,
      })
      setTouchZoom({
        active: false,
        x: 50,
        y: 50,
        left: 0,
        top: 0,
      })
      if (touchHoldTimerRef.current) {
        window.clearTimeout(touchHoldTimerRef.current)
        touchHoldTimerRef.current = null
      }
      touchLongPressRef.current = false
      suppressNextClickRef.current = false

      if (zoomHintTimerRef.current) {
        window.clearTimeout(zoomHintTimerRef.current)
        zoomHintTimerRef.current = null
      }

      if (zoomHintUnmountTimerRef.current) {
        window.clearTimeout(zoomHintUnmountTimerRef.current)
        zoomHintUnmountTimerRef.current = null
      }

      hintShowId = window.setTimeout(() => {
        if (!cancelled) setZoomHintReady(true)
      }, 16)

      zoomHintTimerRef.current = window.setTimeout(() => {
        if (cancelled) return
        zoomHintTimerRef.current = null
        setZoomHintReady(false)
        zoomHintUnmountTimerRef.current = window.setTimeout(() => {
          if (cancelled) return
          setShowZoomHint(false)
          zoomHintUnmountTimerRef.current = null
        }, 220)
      }, 5000)
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(id)
      if (hintShowId) {
        window.clearTimeout(hintShowId)
      }
      if (zoomHintTimerRef.current) {
        window.clearTimeout(zoomHintTimerRef.current)
        zoomHintTimerRef.current = null
      }
      if (zoomHintUnmountTimerRef.current) {
        window.clearTimeout(zoomHintUnmountTimerRef.current)
        zoomHintUnmountTimerRef.current = null
      }
    }
  }, [product?._id])

  useEffect(() => {
    if (!showZoomHint) return undefined
    if (!mouseZoom.active && !touchZoom.active) return undefined

    const hideId = window.requestAnimationFrame(() => {
      setZoomHintReady(false)
    })

    if (zoomHintTimerRef.current) {
      window.clearTimeout(zoomHintTimerRef.current)
      zoomHintTimerRef.current = null
    }

    if (zoomHintUnmountTimerRef.current) {
      window.clearTimeout(zoomHintUnmountTimerRef.current)
      zoomHintUnmountTimerRef.current = null
    }

    zoomHintUnmountTimerRef.current = window.setTimeout(() => {
      setShowZoomHint(false)
      zoomHintUnmountTimerRef.current = null
    }, 220)

    return () => {
      window.cancelAnimationFrame(hideId)
      if (zoomHintUnmountTimerRef.current) {
        window.clearTimeout(zoomHintUnmountTimerRef.current)
        zoomHintUnmountTimerRef.current = null
      }
    }
  }, [mouseZoom.active, touchZoom.active, showZoomHint])

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
      <main className="mx-auto w-full max-w-[1600px] px-4 py-8 pb-24 pt-12 sm:px-6 sm:pb-12 lg:pb-16">
        <MobileBackButton to="/shop" label="Back to shop" />
        <p className="text-sm text-stone-600">{error || 'Product not found.'}</p>
      </main>
    )
  }

  const price = typeof product.price === 'number' ? product.price : 0
  const category = product.category
  const canBuy = maxQty >= 1
  const galleryImages = (product.images ?? []).filter((image) => {
    if (typeof image !== 'string') return Boolean(image)
    return image.trim().length > 0
  })
  const activeImageIndex = Math.min(
    selectedImageIndex,
    Math.max(0, galleryImages.length - 1)
  )
  const imageSrc = galleryImages[activeImageIndex] ?? ''
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

  function selectImage(index) {
    setSelectedImageIndex(index)
    setViewerOpen(false)
    hideZoom()
    clearTouchHoldTimer()
    touchLongPressRef.current = false
    suppressNextClickRef.current = false
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
      image: imageSrc,
      quantity: qty,
    })
    addToast(`${qty}x ${product.name} added to cart`, 'success', 2500)
  }

  return (
    <main
      className="relative mx-auto w-full max-w-[1600px] overflow-hidden px-4 pb-40 pt-4 sm:px-6 sm:pb-14 sm:pt-8 lg:pb-16"
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

      <div className="mt-2 grid gap-6 sm:mt-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-start lg:gap-10">
        <div className="space-y-4">
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
              <div className="absolute right-4 top-4 z-20">
                <WishlistButton
                  product={product}
                  className="h-11 w-11 bg-white/95 shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
                  iconClassName="h-5 w-5"
                />
              </div>
              {showZoomHint ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-4 sm:bottom-4">
                  <div
                    className={`hidden items-center gap-1.5 rounded-full border border-white/50 bg-white/54 px-4 py-2 text-[11px] font-semibold text-stone-700/90 shadow-[0_10px_22px_rgba(15,23,42,0.1)] backdrop-blur-lg transition-all duration-300 ease-out will-change-transform sm:inline-flex ${
                      zoomHintReady
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-2 scale-95'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5 text-stone-500"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                    <span>Hover to inspect</span>
                  </div>
                  <div
                    className={`flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full border border-white/50 bg-white/58 text-stone-700/90 shadow-[0_10px_22px_rgba(15,23,42,0.1)] backdrop-blur-lg transition-all duration-300 ease-out will-change-transform sm:hidden ${
                      zoomHintReady
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-2 scale-95'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5 text-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 text-stone-500"
                        aria-hidden="true"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                      </svg>
                      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] leading-none">
                        Hold
                      </span>
                      <span className="text-[7px] font-medium uppercase tracking-[0.18em] leading-none text-stone-500">
                        to zoom
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="relative flex min-h-[min(52svh,500px)] items-center justify-center px-3 py-3 sm:min-h-[min(68svh,720px)] sm:px-5 sm:py-4 lg:min-h-[640px] lg:px-6 lg:py-5">
                {imageSrc ? (
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt={product.name}
                    crossOrigin="anonymous"
                    onLoad={(event) => {
                      setAmbientRgb(getAmbientColor(event.currentTarget))
                    }}
                    className={`h-full max-h-[86svh] w-full rounded-[18px] object-contain drop-shadow-[0_20px_45px_rgba(15,23,42,0.12)] transform-gpu will-change-transform transition duration-500 ease-out motion-reduce:transition-none md:group-hover:scale-[1.08] md:group-hover:drop-shadow-[0_32px_80px_rgba(15,23,42,0.22)] ${
                      canBuy ? '' : 'grayscale opacity-80'
                    }`}
                    style={{
                      transformOrigin: `${mouseZoom.x}% ${mouseZoom.y}%`,
                      transform:
                        mouseZoom.active && !touchZoom.active
                          ? 'scale(1.34)'
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
              {!canBuy ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/8 backdrop-blur-[1px]">
                  <div className="rounded-full border border-white/70 bg-stone-950/86 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_14px_30px_rgba(15,23,42,0.24)]">
                    Out of stock
                  </div>
                </div>
              ) : null}
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
                    transition:
                      'left 120ms ease-out, top 120ms ease-out, background-position 120ms ease-out',
                    backgroundImage: `url(${imageSrc})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '380%',
                    backgroundPosition: `${touchZoom.x}% ${touchZoom.y}%`,
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_58%,rgba(255,255,255,0.08)_100%)]" />
                </div>
              ) : null}
            </div>
          </div>

          {galleryImages.length > 1 ? (
            <div className="rounded-[28px] border border-white/70 bg-white/82 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:p-4">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Gallery
                </p>
                <p className="text-xs text-stone-500">
                  {galleryImages.length} photo{galleryImages.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-5 sm:overflow-visible">
                {galleryImages.map((image, index) => {
                  const isSelected = activeImageIndex === index

                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      aria-label={`Show image ${index + 1} of ${galleryImages.length}`}
                      aria-pressed={isSelected}
                      onClick={() => selectImage(index)}
                      className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-[18px] border bg-stone-100 transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:h-24 sm:w-full ${
                        isSelected
                          ? 'border-stone-950 ring-2 ring-stone-900/10'
                          : 'border-stone-200 hover:-translate-y-0.5 hover:border-stone-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                      {isSelected ? (
                        <span className="absolute inset-0 rounded-[18px] ring-2 ring-white/90 ring-inset" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[30px] border border-white/75 bg-white/86 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:p-6 lg:sticky lg:top-24 lg:self-start">
            {category?.slug ? (
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500 sm:text-[13px]">
                <Link
                  to={`/shop?category=${encodeURIComponent(category.slug)}`}
                  className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-stone-700 no-underline transition [-webkit-tap-highlight-color:transparent] active:scale-[0.98] sm:hover:bg-stone-200/80"
                >
                  {category.name}
                </Link>
              </p>
            ) : null}

            <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-3xl lg:text-[2.4rem]">
              {product.name}
            </h1>

            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-stone-500">
                Price
              </p>
              <div className="mt-2 flex items-end gap-1 text-stone-950">
                <span className="pb-0.5 text-[1.45rem] font-semibold leading-none sm:text-[1.7rem]">
                  {rupee}
                </span>
                <span className="text-[2.45rem] font-semibold tabular-nums tracking-[-0.05em] leading-none sm:text-[2.95rem]">
                  {price.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!canBuy ? (
                <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600">
                  Out of stock
                </span>
              ) : null}
            </div>

            <div className="mt-5 rounded-[24px] border border-stone-200/80 bg-stone-50/80 p-4 shadow-sm">
              {canBuy ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Select quantity
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      Choose how many pieces you want.
                    </p>
                  </div>

                  <div className="inline-flex items-center rounded-full border border-stone-200 bg-white p-1 shadow-sm">
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

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={addToCart}
                  className="w-full min-h-[48px] rounded-xl bg-stone-950 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition touch-manipulation [-webkit-tap-highlight-color:transparent] active:translate-y-px active:opacity-90 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 sm:text-sm lg:min-h-[46px]"
                >
                  {canBuy ? 'Add to cart' : 'Out of stock'}
                </button>

                <Link
                  to="/cart"
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-stone-800 no-underline transition [-webkit-tap-highlight-color:transparent] active:bg-stone-50 sm:text-sm lg:min-h-[46px] sm:hover:border-stone-300"
                >
                  View cart
                </Link>
              </div>
            </div>

            {product.description ? (
              <div className="mt-4 rounded-[28px] border border-white/75 bg-white/86 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.03] backdrop-blur-xl sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Description
                </p>
                <h2 className="mt-1 text-lg font-semibold text-stone-900 sm:text-xl">
                  About this piece
                </h2>
                <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-[15px]">
                  {product.description}
                </p>
              </div>
            ) : null}
          </div>

        </div>
      </div>

      <section className="mt-10 sm:mt-12">
        <ProductRail
          title="Similar products you may love"
          description="More styles with a close look, feel, and price range so the next good option is easy to discover."
          products={similarProducts}
          actionHref={category?.slug ? `/shop?category=${encodeURIComponent(category.slug)}` : '/shop'}
          actionLabel="See more like this"
        />
      </section>

      <section className="mt-10 sm:mt-12">
        <ProductRail
          title="Recently viewed"
          description="Quick access to the products you looked at recently, so it's easy to compare and come back."
          products={recentlyViewed}
          actionHref="/shop"
          actionLabel="Continue browsing"
        />
      </section>

      <ImageViewerModal open={viewerOpen} src={imageSrc} alt={product.name} onClose={closeViewer} />
    </main>
  )
}
