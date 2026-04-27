import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const tab =
  'relative inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold no-underline transform-gpu transition-[color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform [-webkit-tap-highlight-color:transparent]'

export default function AdminShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const headerRef = useRef(null)

  useEffect(() => {
    document.title = 'Admin · Shop'

    const updateToastTop = () => {
      const headerBottom = headerRef.current?.getBoundingClientRect().bottom ?? 0
      const nextTop = `${Math.ceil(headerBottom + 12)}px`
      document.documentElement.style.setProperty('--app-toast-top', nextTop)
    }

    updateToastTop()

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            updateToastTop()
          })
        : null

    if (observer && headerRef.current) {
      observer.observe(headerRef.current)
    }

    window.addEventListener('resize', updateToastTop)

    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
      window.removeEventListener('resize', updateToastTop)
      observer?.disconnect()
      document.documentElement.style.removeProperty('--app-toast-top')
    }
  }, [])

  if (!user) {
    return (
      <div className="flex min-h-[40svh] items-center justify-center bg-[#fafaf9] px-4 text-sm text-stone-600">
        Checking access...
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[linear-gradient(180deg,#fafaf9_0%,#f5f1ea_100%)] pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] text-stone-900">
      <header
        ref={headerRef}
        className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 shadow-sm backdrop-blur-md"
      >
        <div className="mx-auto max-w-[1600px] px-3 py-2.5 sm:px-6 sm:py-2.5">
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

      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6">
        <Outlet />
      </div>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex justify-center px-4 sm:bottom-[calc(env(safe-area-inset-bottom)+1rem)]">
        <nav className="inline-flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-full bg-stone-950/95 p-1 shadow-2xl shadow-black/15 backdrop-blur-xl scrollbar-none">
          <NavLink
            to="/admin/orders"
            className={({ isActive }) =>
              `${tab} shrink-0 ${
                isActive
                  ? 'min-w-[86px] scale-100 text-stone-950'
                  : 'min-w-[86px] scale-[0.97] text-stone-200 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-full bg-white shadow-md transform-gpu transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive ? 'scale-100 opacity-100' : 'scale-[0.9] opacity-0'
                  }`}
                />
                <span className="relative z-10">Orders</span>
              </>
            )}
          </NavLink>
          <NavLink
            to="/admin/products"
            className={({ isActive }) =>
              `${tab} shrink-0 ${
                isActive
                  ? 'min-w-[90px] scale-100 text-stone-950'
                  : 'min-w-[90px] scale-[0.97] text-stone-200 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-full bg-white shadow-md transform-gpu transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive ? 'scale-100 opacity-100' : 'scale-[0.9] opacity-0'
                  }`}
                />
                <span className="relative z-10">Products</span>
              </>
            )}
          </NavLink>
          <NavLink
            to="/admin/advertisements"
            className={({ isActive }) =>
              `${tab} shrink-0 ${
                isActive
                  ? 'min-w-[122px] scale-100 text-stone-950'
                  : 'min-w-[122px] scale-[0.97] text-stone-200 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-full bg-white shadow-md transform-gpu transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive ? 'scale-100 opacity-100' : 'scale-[0.9] opacity-0'
                  }`}
                />
                <span className="relative z-10">Advertisements</span>
              </>
            )}
          </NavLink>
          <NavLink
            to="/admin/categories"
            className={({ isActive }) =>
              `${tab} shrink-0 ${
                isActive
                  ? 'min-w-[98px] scale-100 text-stone-950'
                  : 'min-w-[98px] scale-[0.97] text-stone-200 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-full bg-white shadow-md transform-gpu transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive ? 'scale-100 opacity-100' : 'scale-[0.9] opacity-0'
                  }`}
                />
                <span className="relative z-10">Categories</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log out from admin?"
        message="You'll be signed out and taken back to the storefront."
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
