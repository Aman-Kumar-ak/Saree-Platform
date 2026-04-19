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
      <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
              Delivery address
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Choose a saved address or add a new one.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((open) => !open)}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-white"
          >
            {showForm ? 'Close' : '+ Add New'}
          </button>
        </div>

        {showForm ? (
          <div className="mt-4">
            <AddressForm
              onClose={() => setShowForm(false)}
              onAddressAdded={handleAddressAdded}
            />
          </div>
        ) : null}
      </section>

      {addresses.length > 0 ? (
        <div>
          <p className="mb-3 text-sm font-medium text-stone-700">
            Saved Addresses
          </p>
          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
            style={{ scrollBehavior: 'smooth' }}
          >
            {addresses.map((address) => (
              <button
                key={address._id}
                type="button"
                onClick={() => onChange(address)}
                className={`w-72 shrink-0 rounded-2xl border p-4 text-left transition ${
                  value?._id === address._id
                    ? 'border-stone-900 bg-stone-50 shadow-sm'
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-950">
                      {address.fullName}
                    </p>
                    <p className="mt-1 text-xs text-stone-600">{address.phone}</p>
                  </div>
                  {address.isDefault ? (
                    <span className="inline-flex shrink-0 rounded-full bg-stone-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-stone-600">
                  {address.line1}
                  {address.line2 && `, ${address.line2}`}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">
                  {address.city}, {address.state} {address.pincode}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
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
