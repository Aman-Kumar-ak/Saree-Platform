/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext.jsx'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { user, ready, authFetch } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setItems([])
      return
    }

    setLoading(true)
    try {
      const r = await authFetch('/api/user/wishlist')
      if (!r.ok) throw new Error('Failed to fetch wishlist')
      const data = await r.json()
      setItems(data.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [authFetch, user])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => {
      void fetchWishlist()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [ready, fetchWishlist])

  const isWishlisted = useCallback(
    (productId) => items.some((item) => item._id === String(productId)),
    [items]
  )

  const addToWishlist = useCallback(
    async (product) => {
      const productId =
        typeof product === 'string' ? product : String(product?._id || '')
      const optimisticItem =
        typeof product === 'string'
          ? { _id: productId }
          : {
              _id: productId,
              name: product?.name,
              slug: product?.slug,
              price: product?.price,
              images: product?.images || [],
            }
      const previousItems = items
      setItems((current) =>
        current.some((item) => item._id === productId)
          ? current
          : [...current, optimisticItem]
      )
      const r = await authFetch(`/api/user/wishlist/${productId}`, {
        method: 'POST',
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setItems(previousItems)
        throw new Error(data.error || 'Failed to add wishlist item')
      }
      setItems(data.items || [])
      return data
    },
    [authFetch, items]
  )

  const removeFromWishlist = useCallback(
    async (productId) => {
      const normalizedId = String(productId)
      const previousItems = items
      setItems((current) =>
        current.filter((item) => item._id !== normalizedId)
      )
      const r = await authFetch(`/api/user/wishlist/${productId}`, {
        method: 'DELETE',
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setItems(previousItems)
        throw new Error(data.error || 'Failed to remove wishlist item')
      }
      setItems(data.items || [])
      return data
    },
    [authFetch, items]
  )

  const toggleWishlist = useCallback(
    async (product) => {
      const productId =
        typeof product === 'string' ? product : String(product?._id || '')
      if (isWishlisted(productId)) {
        return removeFromWishlist(productId)
      }
      return addToWishlist(product)
    },
    [addToWishlist, isWishlisted, removeFromWishlist]
  )

  const value = useMemo(
    () => ({
      items,
      loading,
      count: items.length,
      fetchWishlist,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
    }),
    [
      items,
      loading,
      fetchWishlist,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
    ]
  )

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider')
  }
  return context
}
