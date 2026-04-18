import { useToast } from '../context/ToastContext.jsx'
import { Toast } from './Toast.jsx'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div
      className="fixed left-1/2 z-50 flex w-[min(92vw,32rem)] -translate-x-1/2 flex-col items-center gap-3 px-4 pointer-events-none"
      style={{ top: 'var(--app-toast-top, calc(env(safe-area-inset-top) + 1rem))' }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  )
}
