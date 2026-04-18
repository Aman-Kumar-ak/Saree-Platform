import { useEffect, useState } from 'react'

export function Toast({ toast, onRemove }) {
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true)
    }, toast.duration ?? 3000)
    return () => clearTimeout(timer)
  }, [toast.duration])

  useEffect(() => {
    if (!isLeaving) {
      return undefined
    }

    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, 300)

    return () => clearTimeout(timer)
  }, [isLeaving, onRemove, toast.id])

  const bgColor =
    {
      success: 'bg-green-600',
      error: 'bg-red-600',
      warning: 'bg-amber-600',
      info: 'bg-blue-600',
    }[toast.type] || 'bg-green-600'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-fit max-w-full rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ease-out ${bgColor} ${
        isLeaving
          ? 'translate-y-1 scale-95 opacity-0'
          : 'translate-y-0 scale-100 opacity-100'
      }`}
    >
      <span className="block max-w-[min(88vw,28rem)] truncate whitespace-nowrap">
        {toast.message}
      </span>
    </div>
  )
}
