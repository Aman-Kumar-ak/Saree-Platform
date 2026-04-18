import { useRef, useState } from 'react'
import { useAddresses } from '../context/AddressContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  ADDRESS_FIELD_HELPERS,
  INDIA_STATE_OPTIONS,
  createEmptyAddressForm,
  normalizeAddressForm,
  sanitizeAddressField,
  validateAddressForm,
} from '../lib/addressForm.js'

export function AddressSelector({ value, onChange }) {
  const { addresses } = useAddresses()
  const scrollContainerRef = useRef(null)
  const [showForm, setShowForm] = useState(false)

  const handleAddressAdded = (newAddress) => {
    onChange(newAddress)
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      {/* Show form if adding new address, otherwise show saved addresses */}
      {showForm ? (
        <AddressForm 
          onClose={() => setShowForm(false)}
          onAddressAdded={handleAddressAdded}
        />
      ) : (
        <>
          {/* Saved Addresses */}
          {addresses.length > 0 && (
            <div>
              <p className="text-sm font-medium text-stone-700 mb-3">
                Saved Addresses
              </p>
              <div
                ref={scrollContainerRef}
                className="flex gap-3 overflow-x-auto scroll-smooth pb-2"
                style={{ scrollBehavior: 'smooth' }}
              >
              {addresses.map((address) => (
                <button
                  key={address._id}
                  type="button"
                  onClick={() => onChange(address)}
                  className={`flex-shrink-0 w-72 p-4 rounded-xl border-2 text-left transition ${
                    value?._id === address._id
                      ? 'border-stone-900 bg-stone-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-stone-900">
                    {address.fullName}
                  </p>
                  <p className="text-xs text-stone-600 mt-1">
                    {address.phone}
                  </p>
                  <p className="text-xs text-stone-600 mt-2">
                    {address.line1}
                    {address.line2 && `, ${address.line2}`}
                  </p>
                  <p className="text-xs text-stone-600">
                    {address.city}, {address.state} {address.pincode}
                  </p>
                  {address.isDefault && (
                    <div className="mt-2 inline-block bg-stone-900 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                      Default
                    </div>
                  )}
                </button>
              ))}
              </div>
            </div>
          )}

          {/* Add New Address Button */}
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-stone-300 text-stone-700 font-medium text-sm hover:bg-stone-50 transition"
          >
            + Add New Address
          </button>
        </>
      )}
    </div>
  )
}

function AddressForm({ onClose, onAddressAdded }) {
  const { addAddress } = useAddresses()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(createEmptyAddressForm)

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
    e?.preventDefault?.()
    const nextForm = normalizeAddressForm(form)
    const validationError = validateAddressForm(nextForm)

    if (validationError) {
      addToast(validationError, 'error', 3000)
      return
    }

    setLoading(true)
    try {
      const newAddress = await addAddress(nextForm)
      addToast('Address added successfully!', 'success', 2500)
      onAddressAdded(newAddress)
    } catch (err) {
      addToast(err.message || 'Failed to add address', 'error', 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-stone-200 bg-white p-5 space-y-4"
    >
      <h3 className="font-semibold text-stone-900">Add New Address</h3>

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

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 min-h-[44px] rounded-lg border border-stone-200 text-stone-700 font-medium text-sm hover:bg-stone-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 min-h-[44px] rounded-lg bg-stone-900 text-white font-medium text-sm disabled:opacity-50 transition"
        >
          {loading ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </form>
  )
}
