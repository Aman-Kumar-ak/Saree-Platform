import { useEffect, useState } from 'react'

export function Toast({ toast, onRemove }) {
  const [isLeaving, setIsLeaving] = useState(false)

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const bgColor =
    {
      success: 'bg-green-600',
      error: 'bg-red-600',
      warning: 'bg-amber-600',
      info: 'bg-blue-600',
    }[toast.type] || 'bg-green-600'

  const icon =
    {
      success: (
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
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      error: (
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      warning: (
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
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      info: (
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    }[toast.type] || null

  return (
    <div
      className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ${bgColor} ${
        isLeaving
          ? 'translate-x-[400px] opacity-0'
          : 'translate-x-0 opacity-100'
      }`}
    >
      {icon}
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={handleClose}
        className="ml-2 inline-flex items-center justify-center rounded-full hover:bg-white/20 transition p-1 [-webkit-tap-highlight-color:transparent]"
        aria-label="Close notification"
      >
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
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
