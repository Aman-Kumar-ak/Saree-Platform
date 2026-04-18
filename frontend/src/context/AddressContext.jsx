import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext.jsx'

const AddressContext = createContext(null)

export function AddressProvider({ children }) {
  const { authFetch, user } = useAuth()
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch addresses when user logs in
  useEffect(() => {
    if (!user) {
      setAddresses([])
      return
    }

    let cancelled = false
    const fetchAddresses = async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await authFetch('/api/addresses')
        if (!r.ok) throw new Error('Failed to fetch addresses')
        const data = await r.json()
        if (!cancelled) {
          setAddresses(data.addresses || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
          console.error('Error fetching addresses:', err)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAddresses()
    return () => {
      cancelled = true
    }
  }, [user, authFetch])

  const addAddress = useCallback(
    async (addressData) => {
      try {
        const r = await authFetch('/api/addresses', {
          method: 'POST',
          body: JSON.stringify(addressData),
        })
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || 'Failed to create address')
        }
        const data = await r.json()
        setAddresses((prev) => [data.address, ...prev])
        return data.address
      } catch (err) {
        setError(err.message)
        throw err
      }
    },
    [authFetch]
  )

  const updateAddress = useCallback(
    async (addressId, addressData) => {
      try {
        const r = await authFetch(`/api/addresses/${addressId}`, {
          method: 'PUT',
          body: JSON.stringify(addressData),
        })
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || 'Failed to update address')
        }
        const data = await r.json()
        setAddresses((prev) =>
          prev.map((a) => (a._id === addressId ? data.address : a))
        )
        return data.address
      } catch (err) {
        setError(err.message)
        throw err
      }
    },
    [authFetch]
  )

  const deleteAddress = useCallback(
    async (addressId) => {
      try {
        const r = await authFetch(`/api/addresses/${addressId}`, {
          method: 'DELETE',
        })
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || 'Failed to delete address')
        }
        setAddresses((prev) => prev.filter((a) => a._id !== addressId))
      } catch (err) {
        setError(err.message)
        throw err
      }
    },
    [authFetch]
  )

  const value = useMemo(
    () => ({
      addresses,
      loading,
      error,
      addAddress,
      updateAddress,
      deleteAddress,
    }),
    [addresses, loading, error, addAddress, updateAddress, deleteAddress]
  )

  return (
    <AddressContext.Provider value={value}>
      {children}
    </AddressContext.Provider>
  )
}

export function useAddresses() {
  const context = useContext(AddressContext)
  if (!context) {
    throw new Error('useAddresses must be used within AddressProvider')
  }
  return context
}
