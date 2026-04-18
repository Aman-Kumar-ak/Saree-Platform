import { useToast } from '../context/ToastContext.jsx'
import { Toast } from './Toast.jsx'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none sm:left-auto sm:right-6">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  )
}
