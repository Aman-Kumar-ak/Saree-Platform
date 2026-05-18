import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from './AuthContext.jsx'

const CartContext = createContext(null)

function getStorageKey() {
  const k = import.meta.env.VITE_CART_STORAGE_KEY
  if (k != null && String(k).trim() !== '') return String(k).trim()
  return 'saree_cart_v1'
}

function makeGuestKey(baseKey) {
  return `${baseKey}:guest`
}

function makeAccountKey(baseKey, userId) {
  return `${baseKey}:user:${userId}`
}

function clampQuantity(value) {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed)) return 1
  return Math.min(99, Math.max(1, parsed))
}

function normalizeLine(line) {
  if (!line || typeof line !== 'object') return null

  const productId = String(line.productId ?? '').trim()
  if (!productId) return null

  const quantity = clampQuantity(line.quantity)
  return {
    productId,
    slug: line.slug != null ? String(line.slug) : '',
    name: line.name != null ? String(line.name) : '',
    price: Number.isFinite(Number(line.price)) ? Number(line.price) : 0,
    image: line.image != null ? String(line.image) : '',
    quantity,
  }
}

function normalizeLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return []

  const seen = new Map()
  for (const line of lines) {
    const normalized = normalizeLine(line)
    if (!normalized) continue
    seen.set(normalized.productId, normalized)
  }
  return [...seen.values()]
}

function signatureForLines(lines) {
  return JSON.stringify(normalizeLines(lines))
}

function readStoredCart(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { lines: [], updatedAt: 0 }

    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const lines = normalizeLines(parsed)
      return {
        lines,
        updatedAt: lines.length > 0 ? 1 : 0,
      }
    }

    if (parsed && typeof parsed === 'object') {
      const updatedAt = Number.isFinite(Number(parsed.updatedAt))
        ? Number(parsed.updatedAt)
        : 0
      const lines = normalizeLines(parsed.lines)
      return {
        lines,
        updatedAt: updatedAt || (lines.length > 0 ? 1 : 0),
      }
    }
  } catch {
    /* ignore parse issues */
  }

  return { lines: [], updatedAt: 0 }
}

function writeStoredCart(key, state) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        lines: normalizeLines(state.lines),
        updatedAt: Number.isFinite(Number(state.updatedAt))
          ? Number(state.updatedAt)
          : 0,
      })
    )
  } catch {
    /* quota/private mode */
  }
}

function snapshotFromUser(user) {
  return {
    lines: normalizeLines(user?.cartItems),
    updatedAt: Number.isFinite(Number(user?.cartUpdatedAt))
      ? Number(user.cartUpdatedAt)
      : user?.cartUpdatedAt
        ? new Date(user.cartUpdatedAt).getTime()
        : 0,
  }
}

function chooseLatestSnapshot(...snapshots) {
  return snapshots.reduce((best, candidate) => {
    if (candidate.updatedAt > best.updatedAt) {
      return candidate
    }
    return best
  })
}

function buildInitialCartState({ ready, user, guestKey, accountKey }) {
  const guestState = readStoredCart(guestKey)
  if (!ready || !user || !accountKey) {
    return {
      key: guestKey,
      state: guestState,
      syncedSignature: signatureForLines(guestState.lines),
    }
  }

  const accountState = readStoredCart(accountKey)
  const serverState = snapshotFromUser(user)
  const chosenState = chooseLatestSnapshot(serverState, accountState, guestState)
  writeStoredCart(accountKey, chosenState)

  return {
    key: accountKey,
    state: chosenState,
    syncedSignature: signatureForLines(serverState.lines),
  }
}

export function CartProvider({ children }) {
  const { user, ready, authFetch } = useAuth()
  const storageBaseKey = useMemo(() => getStorageKey(), [])
  const guestKey = useMemo(() => makeGuestKey(storageBaseKey), [storageBaseKey])
  const accountKey = user?.id ? makeAccountKey(storageBaseKey, user.id) : null
  const [initialCart] = useState(() =>
    buildInitialCartState({ ready, user, guestKey, accountKey })
  )
  const [cartState, setCartState] = useState(initialCart.state)
  const currentKeyRef = useRef(initialCart.key)
  const cartStateRef = useRef(initialCart.state)
  const syncTimerRef = useRef(null)
  const syncRequestIdRef = useRef(0)
  const lastSyncedSignatureRef = useRef(initialCart.syncedSignature)

  useEffect(() => {
    cartStateRef.current = cartState
  }, [cartState])

  const replaceCart = useCallback((updater) => {
    setCartState((prev) => {
      const nextLines = normalizeLines(
        typeof updater === 'function' ? updater(prev.lines) : updater
      )
      const nextState = {
        lines: nextLines,
        updatedAt: Date.now(),
      }
      writeStoredCart(currentKeyRef.current, nextState)
      return nextState
    })
  }, [])

  const syncCartToServer = useCallback(
    async (key, snapshot) => {
      if (!ready || !user) return

      const requestId = ++syncRequestIdRef.current
      const linesToSync = normalizeLines(snapshot.lines)
      try {
        const response = await authFetch('/api/user/cart', {
          method: 'PUT',
          body: JSON.stringify({ items: linesToSync }),
        })

        if (requestId !== syncRequestIdRef.current) return
        if (!response.ok) {
          throw new Error('sync failed')
        }

        const data = await response.json().catch(() => ({}))
        const savedLines = normalizeLines(data.items ?? linesToSync)
        const serverUpdatedAt = Number.isFinite(Number(data.updatedAt))
          ? Number(data.updatedAt)
          : Date.now()
        const syncedState = {
          lines: savedLines,
          updatedAt: serverUpdatedAt,
        }

        writeStoredCart(key, syncedState)

        if (currentKeyRef.current === key) {
          lastSyncedSignatureRef.current = signatureForLines(savedLines)
          setCartState(syncedState)
        }
      } catch {
        /* Keep the local cart as-is and retry on the next change. */
      }
    },
    [authFetch, ready, user]
  )

  const refreshCartFromServer = useCallback(async () => {
    if (!ready || !user || !accountKey) return null

    try {
      const response = await authFetch('/api/user/cart')
      if (response.status === 401 || response.status === 404) {
        return null
      }
      if (!response.ok) {
        throw new Error('refresh failed')
      }

      const data = await response.json().catch(() => ({}))
      const serverState = {
        lines: normalizeLines(data.items),
        updatedAt: Number.isFinite(Number(data.updatedAt))
          ? Number(data.updatedAt)
          : Date.now(),
      }
      const currentState = cartStateRef.current
      const serverSignature = signatureForLines(serverState.lines)
      const currentSignature = signatureForLines(currentState.lines)
      const serverIsNewer =
        serverState.updatedAt > currentState.updatedAt ||
        (serverState.updatedAt === currentState.updatedAt &&
          serverSignature !== currentSignature)

      if (serverIsNewer) {
        currentKeyRef.current = accountKey
        setCartState(serverState)
        writeStoredCart(accountKey, serverState)
        lastSyncedSignatureRef.current = serverSignature
        return serverState
      }

      writeStoredCart(accountKey, currentState)
      return currentState
    } catch {
      return null
    }
  }, [accountKey, authFetch, ready, user])

  const flushPendingSync = useCallback(() => {
    if (!ready || !user) return

    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }

    const currentSignature = signatureForLines(cartState.lines)
    if (currentSignature === lastSyncedSignatureRef.current) {
      return
    }

    void syncCartToServer(currentKeyRef.current, {
      lines: cartState.lines,
      updatedAt: cartState.updatedAt,
    })
  }, [cartState.lines, cartState.updatedAt, ready, syncCartToServer, user])

  useEffect(() => {
    if (!ready || !user) return undefined

    const currentSignature = signatureForLines(cartState.lines)
    if (currentSignature === lastSyncedSignatureRef.current) {
      return undefined
    }

    if (syncTimerRef.current != null) {
      window.clearTimeout(syncTimerRef.current)
    }

    const key = currentKeyRef.current
    const snapshot = {
      lines: cartState.lines,
      updatedAt: cartState.updatedAt,
    }

    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null
      void syncCartToServer(key, snapshot)
    }, 250)

    return () => {
      if (syncTimerRef.current != null) {
        window.clearTimeout(syncTimerRef.current)
        syncTimerRef.current = null
      }
    }
  }, [cartState.lines, cartState.updatedAt, ready, syncCartToServer, user])

  useEffect(() => {
    if (!ready || !user) return undefined

    const handleOnline = () => {
      flushPendingSync()
    }

    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [flushPendingSync, ready, user])

  const addOrUpdate = useCallback(
    (line, opts = {}) => {
      const replace = Boolean(opts.replace)
      const incoming = normalizeLine(line)
      if (!incoming) return

      replaceCart((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.productId === incoming.productId
        )

        if (existingIndex === -1) {
          return [...prev, { ...incoming, quantity: clampQuantity(incoming.quantity) }]
        }

        const next = [...prev]
        const current = next[existingIndex]
        next[existingIndex] = {
          ...current,
          ...incoming,
          quantity: replace
            ? clampQuantity(incoming.quantity)
            : clampQuantity(current.quantity + incoming.quantity),
        }
        return next
      })
    },
    [replaceCart]
  )

  const setQuantity = useCallback(
    (productId, quantity) => {
      const id = String(productId)
      const raw = Math.floor(Number(quantity))
      if (!Number.isFinite(raw) || raw < 1) {
        replaceCart((prev) => prev.filter((item) => item.productId !== id))
        return
      }

      const nextQuantity = Math.min(99, raw)
      replaceCart((prev) =>
        prev.map((item) =>
          item.productId === id ? { ...item, quantity: nextQuantity } : item
        )
      )
    },
    [replaceCart]
  )

  const removeLine = useCallback(
    (productId) => {
      const id = String(productId)
      replaceCart((prev) => prev.filter((item) => item.productId !== id))
    },
    [replaceCart]
  )

  const clear = useCallback(() => {
    replaceCart([])
  }, [replaceCart])

  const itemCount = useMemo(
    () => cartState.lines.reduce((total, line) => total + line.quantity, 0),
    [cartState.lines]
  )

  const value = useMemo(
    () => ({
      lines: cartState.lines,
      itemCount,
      addOrUpdate,
      setQuantity,
      removeLine,
      clear,
      refreshCart: refreshCartFromServer,
    }),
    [
      addOrUpdate,
      cartState.lines,
      clear,
      itemCount,
      refreshCartFromServer,
      removeLine,
      setQuantity,
    ]
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
