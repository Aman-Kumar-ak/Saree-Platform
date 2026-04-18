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
import { CUSTOMER_RETRY_MESSAGE } from '../lib/errorMessages.js'

const AddressContext = createContext(null)

export function AddressProvider({ children }) {
  const { authFetch, user } = useAuth()
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch addresses when user logs in
  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled = false
    const fetchAddresses = async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await authFetch('/api/addresses')
        if (!r.ok) throw new Error(CUSTOMER_RETRY_MESSAGE)
        const data = await r.json()
        if (!cancelled) {
          setAddresses(data.addresses || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(CUSTOMER_RETRY_MESSAGE)
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
          throw new Error(CUSTOMER_RETRY_MESSAGE)
        }
        const data = await r.json()
        setAddresses((prev) => [data.address, ...prev])
        return data.address
      } catch (err) {
        setError(CUSTOMER_RETRY_MESSAGE)
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
          throw new Error(CUSTOMER_RETRY_MESSAGE)
        }
        const data = await r.json()
        setAddresses((prev) =>
          prev.map((a) => (a._id === addressId ? data.address : a))
        )
        return data.address
      } catch (err) {
        setError(CUSTOMER_RETRY_MESSAGE)
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
          throw new Error(CUSTOMER_RETRY_MESSAGE)
        }
        setAddresses((prev) => prev.filter((a) => a._id !== addressId))
      } catch (err) {
        setError(CUSTOMER_RETRY_MESSAGE)
        throw err
      }
    },
    [authFetch]
  )

  const value = useMemo(
    () => ({
      addresses: user ? addresses : [],
      loading: user ? loading : false,
      error,
      addAddress,
      updateAddress,
      deleteAddress,
    }),
    [user, addresses, loading, error, addAddress, updateAddress, deleteAddress]
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
