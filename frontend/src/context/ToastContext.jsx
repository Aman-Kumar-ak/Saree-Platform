import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [timeoutId, setTimeoutId] = useState(null)

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    // Clear any pending timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    const id = Date.now()
    const toast = { id, message, type }

    // Replace all toasts with the new one
    setToasts([toast])

    if (duration > 0) {
      const id = setTimeout(() => {
        removeToast(id)
      }, duration)
      setTimeoutId(id)
    }

    return id
  }, [timeoutId])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    setTimeoutId(null)
  }, [])

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
    }),
    [toasts, addToast, removeToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
