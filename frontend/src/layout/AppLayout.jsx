import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'

export function AppLayout() {
  const title = import.meta.env.VITE_APP_TITLE ?? ''
  const location = useLocation()
  const { itemCount } = useCart()
  const { user, ready } = useAuth()
  const [showHeader, setShowHeader] = useState(true)
  const lastScrollYRef = useRef(0)
  const scrollRafRef = useRef(0)
  const headerVisibleRef = useRef(true)

  const path = location.pathname
  const isHome =
    path === '/' || path.startsWith('/shop') || path.startsWith('/product/')
  const isCart = path.startsWith('/cart') || path.startsWith('/checkout')
  const isWishlist = path.startsWith('/wishlist')
  const isOrders = path.startsWith('/orders')
  const isProfile = path.startsWith('/profile')
  const capsuleItems = [
    {
      to: '/',
      label: 'Home',
      aria: 'Home',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 sm:h-4 sm:w-4"
        >
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10.5V20h14v-9.5" />
          <path d="M10 20v-6h4v6" />
        </svg>
      ),
      active: isHome,
    },
    {
      to: '/cart',
      label: 'Cart',
      aria: 'Shopping cart',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 sm:h-4 sm:w-4"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
      active: isCart,
    },
    {
      to: '/wishlist',
      label: 'Wish',
      aria: 'Wishlist',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={isWishlist ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={isWishlist ? '1.5' : '1.9'}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 sm:h-4 sm:w-4"
        >
          <path d="M12 20.5 4.84 13.47a4.75 4.75 0 0 1 6.72-6.72L12 7.2l.44-.45a4.75 4.75 0 1 1 6.72 6.72L12 20.5Z" />
        </svg>
      ),
      active: isWishlist,
    },
    {
      to: '/orders',
      label: 'Orders',
      aria: 'My orders',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 sm:h-4 sm:w-4"
        >
          <path d="M7 6h13" />
          <path d="M7 12h13" />
          <path d="M7 18h13" />
          <path d="M4 6h.01" />
          <path d="M4 12h.01" />
          <path d="M4 18h.01" />
        </svg>
      ),
      active: isOrders,
    },
    {
      to: '/profile',
      label: 'Profile',
      aria: 'Profile',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 sm:h-4 sm:w-4"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      active: isProfile,
    },
  ]

  useEffect(() => {
    const viewTitle = isCart
      ? 'Cart'
      : isWishlist
        ? 'Wishlist'
        : isOrders
          ? 'Orders'
          : isProfile
            ? 'Profile'
            : isHome
              ? 'Shop'
              : 'Shop'
    document.title = title ? `${title} \u00b7 ${viewTitle}` : viewTitle
  }, [isCart, isHome, isOrders, isProfile, isWishlist, title])

  useEffect(() => {
    function updateHeaderVisibility() {
      const currentY = window.scrollY
      const scrollingUp = currentY < lastScrollYRef.current
      const nearTop = currentY < 24
      const shouldShow = nearTop || scrollingUp || currentY <= 72

      if (shouldShow !== headerVisibleRef.current) {
        headerVisibleRef.current = shouldShow
        setShowHeader(shouldShow)
      }

      lastScrollYRef.current = currentY
      scrollRafRef.current = 0
    }

    function onScroll() {
      if (!scrollRafRef.current) {
        scrollRafRef.current = window.requestAnimationFrame(updateHeaderVisibility)
      }
    }

    const currentY = window.scrollY
    lastScrollYRef.current = currentY
    headerVisibleRef.current = currentY <= 72
    setShowHeader(headerVisibleRef.current)

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current)
      }
    }
  }, [location.pathname])

  useEffect(() => {
    const topOffset = showHeader
      ? 'calc(env(safe-area-inset-top) + 4.75rem)'
      : 'calc(env(safe-area-inset-top) + 1rem)'
    document.documentElement.style.setProperty('--app-toast-top', topOffset)

    return () => {
      document.documentElement.style.removeProperty('--app-toast-top')
    }
  }, [showHeader])

  return (
    <div className="flex min-h-svh min-h-dvh flex-col bg-[#fafaf9] text-stone-900">
      <header
        className={`sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/75 transition-transform duration-300 ease-out ${
          showHeader ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="relative mx-auto grid h-14 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:h-16 sm:px-6">
          <Link
            to="/"
            className="justify-self-start text-sm font-medium tracking-tight text-stone-700 no-underline opacity-0 pointer-events-none sm:text-base"
          >
            {title}
          </Link>
          <Link
            to="/"
            className="min-h-[44px] content-center justify-self-center text-xl font-semibold tracking-tight text-stone-900 no-underline [-webkit-tap-highlight-color:transparent] active:opacity-70 sm:text-2xl"
          >
            {title}
          </Link>
          <nav className="flex items-center justify-self-end gap-2 sm:gap-3">
            {!ready ? (
              <span className="text-xs text-stone-400" aria-hidden>
                ...
              </span>
            ) : user ? (
              user.role === 'admin' ? (
                <Link
                  to="/admin/orders"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800 no-underline [-webkit-tap-highlight-color:transparent] active:bg-stone-50"
                >
                  Admin
                </Link>
              ) : null
            ) : (
              <Link
                to="/login"
                state={{ from: `${location.pathname}${location.search || ''}` }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-stone-900 px-4 text-sm font-semibold text-white no-underline [-webkit-tap-highlight-color:transparent] active:opacity-90"
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="flex-1 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pt-6">
        <Outlet />
      </div>

      <footer className="px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-10 sm:pb-24">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-stone-500">
          <Link
            to="/privacy-policy"
            className="rounded-full px-2 py-1 text-stone-600 no-underline hover:bg-stone-100"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="rounded-full px-2 py-1 text-stone-600 no-underline hover:bg-stone-100"
          >
            Terms
          </Link>
          <Link
            to="/return-refund"
            className="rounded-full px-2 py-1 text-stone-600 no-underline hover:bg-stone-100"
          >
            Return & Refund
          </Link>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 flex justify-center px-4 sm:bottom-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="flex items-end gap-1 rounded-full border border-stone-700/60 bg-stone-950/95 px-2 py-1.5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:gap-0.5 sm:px-2 sm:py-1.5">
          {capsuleItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`relative inline-flex flex-col items-center justify-center rounded-full no-underline transition-[background-color,color,padding,min-width,min-height,transform] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:duration-500 ${
                item.active
                  ? 'min-h-[52px] min-w-[58px] bg-white px-3 py-2 text-stone-950 sm:min-h-[44px] sm:min-w-[58px] sm:px-3 sm:py-1.5'
                  : 'min-h-[52px] min-w-[50px] px-2 py-2 text-stone-200 hover:bg-white/10 hover:text-white sm:min-h-[44px] sm:min-w-[50px] sm:px-2 sm:py-1.5'
              }`}
              aria-label={item.aria}
            >
              <span className="inline-flex flex-col items-center justify-center gap-0.5">
                {item.icon}
                <span className="text-[9px] font-semibold leading-none tracking-tight sm:text-[9px]">
                  {item.label}
                </span>
              </span>
              {item.to === '/cart' && itemCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-900 px-1 text-[11px] font-bold leading-none text-white shadow-[0_6px_14px_rgba(15,23,42,0.28)] sm:h-4 sm:min-w-4 sm:text-[10px]">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
