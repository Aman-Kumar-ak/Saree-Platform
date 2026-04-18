import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export function ProfileMenu() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
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
    setIsOpen(false)
    logout()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-stone-100 text-stone-700 [-webkit-tap-highlight-color:transparent] active:scale-[0.98] hover:bg-stone-200 transition"
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
          className="w-5 h-5"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white border border-stone-200 overflow-hidden z-50">
          {/* User Name Header */}
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
            <p className="text-sm font-semibold text-stone-900">{user.name}</p>
            {user.email && (
              <p className="text-xs text-stone-500 truncate">{user.email}</p>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              to="/orders"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition [-webkit-tap-highlight-color:transparent] active:bg-stone-100 no-underline"
            >
              {/* Orders Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
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
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition [-webkit-tap-highlight-color:transparent] active:bg-stone-100 no-underline"
            >
              {/* Address Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Manage Addresses
            </Link>
          </div>

          {/* Logout Button */}
          <div className="border-t border-stone-100 py-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition [-webkit-tap-highlight-color:transparent] active:bg-red-100 font-medium"
            >
              {/* Logout Icon */}
              <span className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
