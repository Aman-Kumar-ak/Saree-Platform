import { useEffect } from 'react'
import { ProductCard } from '../components/ProductCard.jsx'
import LoginPromptModal from '../components/LoginPromptModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useWishlist } from '../context/WishlistContext.jsx'

export default function Wishlist() {
  const { user, ready } = useAuth()
  const { items, loading } = useWishlist()

  useEffect(() => {
    document.title = 'Wishlist · Shop'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [])

  if (ready && !user) {
    return <LoginPromptModal />
  }

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm text-stone-600">Loading...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
        Wishlist
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Keep your favorite sarees saved here.
      </p>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[2/3] animate-pulse rounded-2xl bg-stone-200/80"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center text-sm text-stone-600">
          No wishlist items yet. Tap the heart icon on a product to save it.
        </div>
      ) : (
        <ul className="mt-6 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {items.map((product) => (
            <li key={product._id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
