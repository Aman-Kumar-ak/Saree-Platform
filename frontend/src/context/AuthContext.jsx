import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { apiUrl } from '../config/api.js'

const AuthContext = createContext(null)

function storageKey() {
  const k = import.meta.env.VITE_AUTH_STORAGE_KEY
  if (k != null && String(k).trim() !== '') return String(k).trim()
  return 'saree_auth_token'
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(storageKey()) || null
    } catch {
      return null
    }
  })
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const setSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    try {
      if (nextToken) localStorage.setItem(storageKey(), nextToken)
      else localStorage.removeItem(storageKey())
    } catch {
      /* ignore */
    }
  }, [])

  const logout = useCallback(() => {
    setSession(null, null)
  }, [setSession])

  const authFetch = useCallback(
    async (path, options = {}) => {
      const headers = new Headers(options.headers || {})
      if (token) headers.set('Authorization', `Bearer ${token}`)
      const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData
      if (!headers.has('Content-Type') && options.body && !isForm) {
        headers.set('Content-Type', 'application/json')
      }
      return fetch(apiUrl(path), { ...options, headers })
    },
    [token]
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token) {
        if (!cancelled) {
          setUser(null)
          setReady(true)
        }
        return
      }
      try {
        const r = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (r.status === 401) {
          if (!cancelled) setSession(null, null)
          return
        }
        if (!r.ok) throw new Error('me failed')
        const data = await r.json()
        if (!cancelled) setUser(data.user ?? null)
      } catch {
        if (!cancelled) setSession(null, null)
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [token, setSession])

  const value = useMemo(
    () => ({
      token,
      user,
      ready,
      setSession,
      logout,
      authFetch,
    }),
    [token, user, ready, setSession, logout, authFetch]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- auth hook
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
