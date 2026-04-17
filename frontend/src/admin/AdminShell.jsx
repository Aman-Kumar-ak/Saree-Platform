import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const tab =
  'rounded-lg px-3 py-2 text-sm font-medium no-underline [-webkit-tap-highlight-color:transparent] active:opacity-80 sm:px-4'

export default function AdminShell() {
  const { user, ready, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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
    <div className="min-h-svh bg-[#fafaf9] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <header className="border-b border-stone-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Admin
            </p>
            <p className="text-sm font-semibold text-stone-900">{user.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NavLink
              to="/"
              className="text-sm font-medium text-stone-600 no-underline active:underline"
            >
              Storefront
            </NavLink>
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/', { replace: true })
              }}
              className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-800 touch-manipulation active:bg-stone-50"
            >
              Log out
            </button>
          </div>
        </div>
        <nav className="mx-auto mt-3 flex max-w-6xl gap-1 overflow-x-auto pb-1 scrollbar-none">
          <NavLink
            to="/admin/orders"
            className={({ isActive }) =>
              `${tab} shrink-0 ${isActive ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-800'}`
            }
          >
            Orders
          </NavLink>
          <NavLink
            to="/admin/products"
            className={({ isActive }) =>
              `${tab} shrink-0 ${isActive ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-800'}`
            }
          >
            Products
          </NavLink>
          <NavLink
            to="/admin/categories"
            className={({ isActive }) =>
              `${tab} shrink-0 ${isActive ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-800'}`
            }
          >
            Categories
          </NavLink>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </div>
    </div>
  )
}
