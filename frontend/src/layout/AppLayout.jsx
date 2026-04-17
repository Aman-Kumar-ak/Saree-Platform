import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'

export function AppLayout() {
  const title = import.meta.env.VITE_APP_TITLE ?? ''
  const location = useLocation()
  const { itemCount } = useCart()
  const { user, ready, logout } = useAuth()

  const path = location.pathname
  const isCart = path.startsWith('/cart') || path.startsWith('/checkout')

  useEffect(() => {
    document.title = title ? `${title} · Shop` : 'Shop'
  }, [title])

  return (
    <div className="flex min-h-svh min-h-dvh flex-col bg-[#fafaf9] text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link
            to="/"
            className="min-h-[44px] min-w-[44px] content-center text-base font-semibold tracking-tight text-stone-900 no-underline [-webkit-tap-highlight-color:transparent] active:opacity-70 sm:text-lg"
          >
            {title}
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            {!ready ? (
              <span className="text-xs text-stone-400" aria-hidden>
                …
              </span>
            ) : user ? (
              <>
                {user.role === 'admin' ? (
                  <Link
                    to="/admin/orders"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800 no-underline [-webkit-tap-highlight-color:transparent] active:bg-stone-50"
                  >
                    Admin
                  </Link>
                ) : null}
                <span className="hidden max-w-[7rem] truncate text-xs text-stone-500 sm:inline">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 text-sm font-medium text-stone-700 [-webkit-tap-highlight-color:transparent] active:underline"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                state={{ from: `${location.pathname}${location.search || ''}` }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-stone-900 px-4 text-sm font-semibold text-white no-underline [-webkit-tap-highlight-color:transparent] active:opacity-90"
              >
                Log in
              </Link>
            )}
            <Link
              to="/cart"
              className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-4 text-sm font-medium no-underline transition [-webkit-tap-highlight-color:transparent] active:scale-[0.98] ${
                isCart
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              Cart
              {itemCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-none text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              ) : null}
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Outlet />
      </div>
    </div>
  )
}
