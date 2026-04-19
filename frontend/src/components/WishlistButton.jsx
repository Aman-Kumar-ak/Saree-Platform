import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useWishlist } from '../context/WishlistContext.jsx'
import { CUSTOMER_RETRY_MESSAGE } from '../lib/errorMessages.js'

export function WishlistButton({
  product,
  className = '',
  iconClassName = 'h-6 w-6',
}) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const navigate = useNavigate()
  const location = useLocation()

  const active = isWishlisted(product._id)

  async function handleClick(event) {
    event.preventDefault()
    event.stopPropagation()

    if (!user) {
      navigate('/login', {
        state: { from: `${location.pathname}${location.search || ''}` },
      })
      return
    }

    try {
      await toggleWishlist(product)
      addToast(
        active
          ? `${product.name} removed from wishlist`
          : `${product.name} added to wishlist`,
        active ? 'info' : 'success',
        2200
      )
    } catch {
      addToast(CUSTOMER_RETRY_MESSAGE, 'error', 2800)
    }
  }

  return (
    <button
      type="button"
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={active}
      data-zoom-ignore="true"
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
      onClick={handleClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/95 text-stone-600 shadow-lg backdrop-blur-sm transition [-webkit-tap-highlight-color:transparent] active:scale-[0.96] ${
        active
          ? 'border-rose-300 bg-rose-50 text-rose-500 shadow-[0_10px_24px_rgba(244,63,94,0.22)]'
          : 'hover:border-white hover:text-stone-900'
      } ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? '1.5' : '1.9'}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconClassName} transition-colors duration-200 ${active ? 'text-rose-500' : ''}`}
        aria-hidden="true"
      >
        <path d="M12 20.5 4.84 13.47a4.75 4.75 0 0 1 6.72-6.72L12 7.2l.44-.45a4.75 4.75 0 1 1 6.72 6.72L12 20.5Z" />
      </svg>
    </button>
  )
}
