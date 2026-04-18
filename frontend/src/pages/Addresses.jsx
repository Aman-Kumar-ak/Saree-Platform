import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAddresses } from '../context/AddressContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import LoginPromptModal from '../components/LoginPromptModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import {
  ADDRESS_FIELD_HELPERS,
  INDIA_STATE_OPTIONS,
  createEmptyAddressForm,
  normalizeAddressForm,
  sanitizeAddressField,
  validateAddressForm,
} from '../lib/addressForm.js'
import { CUSTOMER_RETRY_MESSAGE } from '../lib/errorMessages.js'

export default function Addresses() {
  const { user, ready } = useAuth()
  const { addresses, loading, addAddress, updateAddress, deleteAddress } =
    useAddresses()
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(createEmptyAddressForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    document.title = 'My Addresses · Shop'
    return () => {
      const t = import.meta.env.VITE_APP_TITLE ?? ''
      document.title = t ? `${t} · Shop` : 'Shop'
    }
  }, [])

  // If not logged in
  if (ready && !user) {
    return <LoginPromptModal />
  }

  // Show loading state while checking auth
  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm text-stone-600">Loading...</p>
      </main>
    )
  }

  const resetForm = () => {
    setForm(createEmptyAddressForm())
    setEditingId(null)
  }

  const handleEdit = (address) => {
    setForm({
      ...createEmptyAddressForm(),
      fullName: address.fullName,
      phone: String(address.phone ?? '').replace(/\D/g, '').slice(0, 10),
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      state: INDIA_STATE_OPTIONS.includes(address.state) ? address.state : '',
      pincode: String(address.pincode ?? '').replace(/\D/g, '').slice(0, 6),
      isDefault: address.isDefault,
    })
    setEditingId(address._id)
    setShowForm(true)
  }

  const updateField = (field, value) => {
    const nextValue = sanitizeAddressField(field, value)
    const limits = {
      phone: 10,
      pincode: 6,
    }

    setForm((current) => ({
      ...current,
      [field]: limits[field]
        ? String(nextValue).slice(0, limits[field])
        : nextValue,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextForm = normalizeAddressForm(form)
    const validationError = validateAddressForm(nextForm)

    if (validationError) {
      addToast(validationError, 'error', 3000)
      return
    }

    setSubmitting(true)

    try {
      if (editingId) {
        await updateAddress(editingId, nextForm)
        addToast('Address updated successfully!', 'success', 2500)
      } else {
        await addAddress(nextForm)
        addToast('Address added successfully!', 'success', 2500)
      }
      resetForm()
      setShowForm(false)
    } catch {
      addToast(CUSTOMER_RETRY_MESSAGE, 'error', 3000)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAddress(deleteTarget._id)
      addToast('Address deleted successfully!', 'success', 2500)
    } catch {
      addToast(CUSTOMER_RETRY_MESSAGE, 'error', 3000)
    } finally {
      setDeleteTarget(null)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    resetForm()
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">My Addresses</h1>
        {!showForm && (
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white [-webkit-tap-highlight-color:transparent] active:opacity-90"
          >
            + Add Address
          </button>
        )}
      </div>

      {/* Addresses List - Shown First */}
      <div>
        {loading ? (
          <div className="mt-8 space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 rounded-lg bg-stone-200 animate-pulse"
              />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="mt-8 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 p-8 text-center">
            <p className="text-stone-600">No addresses saved yet.</p>
            <p className="mt-1 text-sm text-stone-500">
              Add your first address to get started.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address._id}
                className="rounded-lg border border-stone-200 bg-white p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900">
                      {address.fullName}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {address.phone}
                    </p>
                    <p className="mt-2 text-sm text-stone-700">
                      {address.line1}
                      {address.line2 && `, ${address.line2}`}
                    </p>
                    <p className="text-sm text-stone-700">
                      {address.city}, {address.state} {address.pincode}
                    </p>
                    {address.isDefault && (
                      <div className="mt-2 inline-block bg-stone-900 text-white text-[10px] font-semibold px-2 py-1 rounded">
                        Default
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(address)}
                      className="inline-flex min-h-[36px] items-center justify-center rounded px-3 text-sm font-medium text-stone-700 hover:bg-stone-100 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(address)}
                      className="inline-flex min-h-[36px] items-center justify-center rounded px-3 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form - Shown Below - Inline Dropdown Animation */}
      {showForm && (
        <div className="mt-8 max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-stone-900">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-stone-100 transition text-stone-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                maxLength="120"
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Enter full name"
                className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
              />
              <p className="mt-2 text-xs text-stone-500">
                {ADDRESS_FIELD_HELPERS.fullName}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-2">
                Phone (10 digits) *
              </label>
              <input
                type="tel"
                required
                inputMode="numeric"
                maxLength={10}
                minLength={10}
                pattern="[6-9][0-9]{9}"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
              />
              <p className="mt-2 text-xs text-stone-500">
                {ADDRESS_FIELD_HELPERS.phone}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-2">
                Address Line 1 *
              </label>
              <input
                type="text"
                required
                maxLength="200"
                value={form.line1}
                onChange={(e) => updateField('line1', e.target.value)}
                placeholder="House no., street, etc."
                className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
              />
              <p className="mt-2 text-xs text-stone-500">
                {ADDRESS_FIELD_HELPERS.line1}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-2">
                Address Line 2 (optional)
              </label>
              <input
                type="text"
                value={form.line2}
                maxLength="200"
                onChange={(e) => updateField('line2', e.target.value)}
                placeholder="Apartment, suite, etc."
                className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  required
                  maxLength="80"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Enter city"
                  className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
                />
                <p className="mt-2 text-xs text-stone-500">
                  {ADDRESS_FIELD_HELPERS.city}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">
                  State *
                </label>
                <select
                  required
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
                >
                  <option value="">Select a state</option>
                  {INDIA_STATE_OPTIONS.map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-stone-500">
                  {ADDRESS_FIELD_HELPERS.state}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-2">
                PIN Code *
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                pattern="[0-9]{6}"
                value={form.pincode}
                onChange={(e) => updateField('pincode', e.target.value)}
                placeholder="6-digit PIN code"
                className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
              />
              <p className="mt-2 text-xs text-stone-500">
                {ADDRESS_FIELD_HELPERS.pincode}
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
                className="w-4 h-4 rounded border-stone-200"
              />
              <span className="text-sm text-stone-600">Set as default address</span>
            </label>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 min-h-[44px] rounded-lg bg-stone-900 text-white font-medium text-sm disabled:opacity-50 transition"
              >
                {submitting
                  ? 'Saving...'
                  : editingId
                  ? 'Update Address'
                  : 'Add Address'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 min-h-[44px] rounded-lg border border-stone-200 text-stone-700 font-medium text-sm hover:bg-stone-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete address?"
        message={
          deleteTarget
            ? `Delete the address for ${deleteTarget.fullName}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </main>
  )
}
