import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const tab =
  'relative inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold no-underline [-webkit-tap-highlight-color:transparent]'

export default function AdminShell() {
  const { user, ready, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    document.title = 'Admin · Shop'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!user) {
      const from = `${location.pathname}${location.search || ''}` || '/admin/orders'
      navigate('/login', { replace: true, state: { from } })
      return
    }
    if (user.role !== 'admin') {
      navigate('/', { replace: true })
    }
  }, [ready, user, navigate, location.pathname, location.search])

  if (!ready || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-[40svh] items-center justify-center bg-[#fafaf9] px-4 text-sm text-stone-600">
        Checking access…
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[linear-gradient(180deg,#fafaf9_0%,#f5f1ea_100%)] pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-stone-900">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-3 py-2.5 sm:px-6 sm:py-2.5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone-500 sm:text-[10px]">
                Admin dashboard
              </p>
              <p className="mt-0.5 truncate text-base font-semibold tracking-tight text-stone-950 sm:text-[1.35rem]">
                {user.name}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <NavLink
                to="/"
                className="inline-flex min-h-[36px] items-center rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-800 no-underline hover:border-stone-300 hover:bg-stone-50 sm:min-h-[40px] sm:px-3.5 sm:text-sm"
              >
                Storefront
              </NavLink>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="inline-flex min-h-[36px] items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:border-red-300 hover:bg-red-100 sm:min-h-[40px] sm:px-3.5 sm:text-sm"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        <Outlet />
      </div>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex justify-center px-4 sm:bottom-[calc(env(safe-area-inset-bottom)+1rem)]">
        <nav className="inline-flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-full border border-stone-200 bg-stone-950/95 p-1 shadow-2xl shadow-black/15 backdrop-blur-xl scrollbar-none">
          <NavLink
            to="/admin/orders"
            className={({ isActive }) =>
              `${tab} shrink-0 ${isActive ? 'bg-white text-stone-950 shadow-md' : 'bg-transparent text-stone-200 hover:bg-white/10 hover:text-white'}`
            }
          >
            Orders
          </NavLink>
          <NavLink
            to="/admin/products"
            className={({ isActive }) =>
              `${tab} shrink-0 ${isActive ? 'bg-white text-stone-950 shadow-md' : 'bg-transparent text-stone-200 hover:bg-white/10 hover:text-white'}`
            }
          >
            Products
          </NavLink>
          <NavLink
            to="/admin/categories"
            className={({ isActive }) =>
              `${tab} shrink-0 ${isActive ? 'bg-white text-stone-950 shadow-md' : 'bg-transparent text-stone-200 hover:bg-white/10 hover:text-white'}`
            }
          >
            Categories
          </NavLink>
        </nav>
      </div>
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log out from admin?"
        message="You’ll be signed out and taken back to the storefront."
        confirmLabel="Log out"
        onConfirm={() => {
          setShowLogoutConfirm(false)
          logout()
          navigate('/', { replace: true })
        }}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}
