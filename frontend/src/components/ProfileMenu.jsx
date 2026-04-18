import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

export function ProfileMenu({
  triggerClassName = 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-stone-100 text-stone-700 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] hover:bg-stone-200 transition',
  iconClassName = 'w-5 h-5',
  panelClassName = 'absolute bottom-full left-1/2 mb-3 w-56 -translate-x-1/2 overflow-hidden rounded-3xl border border-stone-700/60 bg-stone-950/95 shadow-2xl shadow-black/20 backdrop-blur-xl z-50',
}) {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!user) return null

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    setIsOpen(false)
    logout()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
        aria-label="Profile menu"
        aria-expanded={isOpen}
      >
        {/* Person Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClassName}
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={panelClassName}>
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            {user.email ? (
              <p className="truncate text-xs text-stone-300">{user.email}</p>
            ) : null}
          </div>

          <div className="p-2">
            <Link
              to="/orders"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-stone-200 no-underline transition [-webkit-tap-highlight-color:transparent] active:bg-white/10 hover:bg-white/10 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              My Orders
            </Link>
            <Link
              to="/address"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-stone-200 no-underline transition [-webkit-tap-highlight-color:transparent] active:bg-white/10 hover:bg-white/10 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Manage Addresses
            </Link>
          </div>

          <div className="border-t border-white/10 p-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setShowLogoutConfirm(true)
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-rose-300 transition [-webkit-tap-highlight-color:transparent] active:bg-white/10 hover:bg-white/10 hover:text-rose-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 shrink-0"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log out?"
        message="You’ll be signed out of your account on this device."
        confirmLabel="Log out"
        onConfirm={handleLogout}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}
