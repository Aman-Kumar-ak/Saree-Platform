import { useEffect } from 'react'
import { ProductCard } from '../components/ProductCard.jsx'
import LoginPromptModal from '../components/LoginPromptModal.jsx'
import LoadingState from '../components/LoadingState.jsx'
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
      <LoadingState
        title="Loading wishlist..."
        description="Checking your saved sarees."
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:pb-12">
      <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
        Wishlist
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Keep your favorite sarees saved here.
      </p>

      {loading ? (
        <div className="mt-6 lg:pb-6">
          <LoadingState
            title="Loading wishlist..."
            description="Fetching your saved products."
            className="min-h-[28svh]"
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center text-sm text-stone-600 lg:pb-12">
          No wishlist items yet. Tap the heart icon on a product to save it.
        </div>
      ) : (
        <ul className="mt-6 grid list-none grid-cols-2 gap-3 p-0 pb-6 sm:grid-cols-3 sm:gap-4 sm:pb-10 lg:grid-cols-4 lg:pb-6">
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
