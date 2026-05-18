import { useState } from 'react'
import { useAddresses } from '../context/AddressContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  INDIA_STATE_OPTIONS,
  createEmptyAddressForm,
  normalizeAddressForm,
  sanitizeAddressField,
  validateAddressForm,
} from '../lib/addressForm.js'

export function AddressSelector({ value, onChange, showForm, onCloseForm }) {
  const { addresses } = useAddresses()

  const handleAddressAdded = (newAddress) => {
    onChange(newAddress)
    onCloseForm?.()
  }

  return (
    <div className="space-y-5">
      <div
        id="delivery-address-form"
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          showForm
            ? 'max-h-[1400px] grid-rows-[1fr] opacity-100'
            : 'max-h-0 grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0">
          <AddressForm
            onClose={onCloseForm}
            onAddressAdded={handleAddressAdded}
          />
        </div>
      </div>

      {addresses.length > 0 ? (
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
            Saved Addresses
          </p>
          <div className="space-y-3">
            {addresses.map((address) => (
              <button
                key={address._id}
                type="button"
                onClick={() => onChange(address)}
                className={`w-full rounded-[24px] border px-4 py-4 text-left shadow-sm transition lg:px-5 ${
                  value?._id === address._id
                    ? 'border-[#5c311f] bg-[#5c311f] text-white shadow-[0_18px_35px_rgba(92,49,31,0.18)]'
                    : 'border-[#e1ccb0] bg-[#fff8ef] hover:border-[#cfa97b] hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`text-[1.05rem] font-semibold leading-snug ${
                        value?._id === address._id ? 'text-white' : 'text-stone-950'
                      }`}
                    >
                      {address.fullName}
                    </p>
                    <p
                      className={`mt-2 text-[15px] ${
                        value?._id === address._id ? 'text-stone-300' : 'text-stone-600'
                      }`}
                    >
                      {address.phone}
                    </p>
                  </div>
                  {address.isDefault ? (
                    <span className="inline-flex shrink-0 rounded-full bg-white/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                      Default
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-3 text-[15px] leading-relaxed ${
                    value?._id === address._id ? 'text-stone-200' : 'text-stone-600'
                  }`}
                >
                  {address.line1}
                  {address.line2 && `, ${address.line2}`}
                </p>
                <p
                  className={`mt-1 text-[15px] leading-relaxed ${
                    value?._id === address._id ? 'text-stone-300' : 'text-stone-600'
                  }`}
                >
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
      className="space-y-4 rounded-[28px] border border-[#dfcaad] bg-[#fff8ef] p-5 shadow-none"
    >
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
          className="w-full min-h-[44px] rounded-xl border border-[#dcc6a7] bg-[#fffdf9] px-3 text-sm focus:border-[#7a451f] focus:ring-2 focus:ring-amber-200"
        />
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
          className="w-full min-h-[44px] rounded-xl border border-[#dcc6a7] bg-[#fffdf9] px-3 text-sm focus:border-[#7a451f] focus:ring-2 focus:ring-amber-200"
        />
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
          className="w-full min-h-[44px] rounded-xl border border-[#dcc6a7] bg-[#fffdf9] px-3 text-sm focus:border-[#7a451f] focus:ring-2 focus:ring-amber-200"
        />
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
          className="w-full min-h-[44px] rounded-xl border border-[#dcc6a7] bg-[#fffdf9] px-3 text-sm focus:border-[#7a451f] focus:ring-2 focus:ring-amber-200"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
          className="w-full min-h-[44px] rounded-xl border border-[#dcc6a7] bg-[#fffdf9] px-3 text-sm focus:border-[#7a451f] focus:ring-2 focus:ring-amber-200"
        />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-2">
            State *
          </label>
          <select
            required
            value={form.state}
            onChange={(e) => updateField('state', e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-[#dcc6a7] bg-[#fffdf9] px-3 text-sm focus:border-[#7a451f] focus:ring-2 focus:ring-amber-200"
          >
            <option value="">Select a state</option>
            {INDIA_STATE_OPTIONS.map((stateName) => (
              <option key={stateName} value={stateName}>
                {stateName}
              </option>
            ))}
          </select>
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
          className="w-full min-h-[44px] rounded-xl border border-[#dcc6a7] bg-[#fffdf9] px-3 text-sm focus:border-[#7a451f] focus:ring-2 focus:ring-amber-200"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 min-h-[44px] rounded-xl border border-[#dcc6a7] bg-[#f8efde] text-stone-700 font-medium text-sm transition hover:bg-[#f2e3ca]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 min-h-[44px] rounded-xl bg-[#5c311f] text-white font-medium text-sm disabled:opacity-50 transition hover:bg-[#4a2618]"
        >
          {loading ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </form>
  )
}
