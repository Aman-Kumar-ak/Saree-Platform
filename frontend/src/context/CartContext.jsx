import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

const CartContext = createContext(null)

function getStorageKey() {
  const k = import.meta.env.VITE_CART_STORAGE_KEY
  if (k != null && String(k).trim() !== '') return String(k).trim()
  return 'saree_cart_v1'
}

function readLines(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x) =>
        x &&
        typeof x === 'object' &&
        x.productId &&
        typeof x.quantity === 'number' &&
        x.quantity >= 1
    )
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const storageKey = useMemo(() => getStorageKey(), [])
  const [lines, setLines] = useState(() => readLines(storageKey))

  const persist = useCallback(
    (updater) => {
      setLines((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          /* quota or private mode */
        }
        return next
      })
    },
    [storageKey]
  )

  /**
   * @param {object} line - productId, slug, name, price, image?, quantity
   * @param {{ replace?: boolean }} opts - replace=true sets quantity; default merges (+qty)
   */
  const addOrUpdate = useCallback(
    (line, opts = {}) => {
      const replace = Boolean(opts.replace)
      const productId = String(line.productId)
      const addQty = Math.min(99, Math.max(1, Math.floor(Number(line.quantity) || 1)))
      persist((prev) => {
        const i = prev.findIndex((p) => p.productId === productId)
        if (i === -1) {
          return [
            ...prev,
            {
              productId,
              slug: line.slug ?? '',
              name: line.name ?? '',
              price: Number(line.price) || 0,
              image: line.image ?? '',
              quantity: addQty,
            },
          ]
        }
        const next = [...prev]
        const merged = {
          ...next[i],
          ...line,
          productId,
          slug: line.slug ?? next[i].slug,
          name: line.name ?? next[i].name,
          price: Number(line.price ?? next[i].price) || 0,
          image: line.image ?? next[i].image,
        }
        merged.quantity = replace
          ? addQty
          : Math.min(99, next[i].quantity + addQty)
        next[i] = merged
        return next
      })
    },
    [persist]
  )

  const setQuantity = useCallback(
    (productId, quantity) => {
      const raw = Math.floor(Number(quantity))
      if (!Number.isFinite(raw) || raw < 1) {
        persist((prev) => prev.filter((p) => p.productId !== productId))
        return
      }
      const q = Math.min(99, raw)
      persist((prev) =>
        prev.map((p) =>
          p.productId === productId ? { ...p, quantity: q } : p
        )
      )
    },
    [persist]
  )

  const removeLine = useCallback(
    (productId) => {
      persist((prev) => prev.filter((p) => p.productId !== productId))
    },
    [persist]
  )

  const clear = useCallback(() => {
    persist([])
  }, [persist])

  const itemCount = useMemo(
    () => lines.reduce((n, l) => n + l.quantity, 0),
    [lines]
  )

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      addOrUpdate,
      setQuantity,
      removeLine,
      clear,
    }),
    [lines, itemCount, addOrUpdate, setQuantity, removeLine, clear]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook for CartProvider
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
