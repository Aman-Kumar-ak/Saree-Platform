import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function RequireAdmin({ children }) {
  const { ready, user } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-[40svh] items-center justify-center bg-[#fafaf9] px-4 text-sm text-stone-600">
        Checking access...
      </div>
    )
  }

  if (!user) {
    const from = `${location.pathname}${location.search || ''}` || '/admin/orders'
    return <Navigate to="/login" replace state={{ from }} />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
