import { useRef, useState } from 'react'
import { useAddresses } from '../context/AddressContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

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
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  })

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    setLoading(true)
    try {
      const newAddress = await addAddress(form)
      addToast('Address added successfully!', 'success', 2500)
      onAddressAdded(newAddress)
    } catch (err) {
      addToast(err.message || 'Failed to add address', 'error', 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
      <h3 className="font-semibold text-stone-900">Add New Address</h3>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          required
          value={form.fullName}
          onChange={(e) =>
            setForm({ ...form, fullName: e.target.value })
          }
          className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">
          Phone (10 digits) *
        </label>
        <input
          type="tel"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">
          Address Line 1 *
        </label>
        <input
          type="text"
          required
          value={form.line1}
          onChange={(e) => setForm({ ...form, line1: e.target.value })}
          placeholder="House no., street, etc."
          className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">
          Address Line 2 (optional)
        </label>
        <input
          type="text"
          value={form.line2}
          onChange={(e) => setForm({ ...form, line2: e.target.value })}
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
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-2">
            State *
          </label>
          <input
            type="text"
            required
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-2">
          PIN Code *
        </label>
        <input
          type="text"
          required
          value={form.pincode}
          onChange={(e) => setForm({ ...form, pincode: e.target.value })}
          className="w-full min-h-[44px] rounded-lg border border-stone-200 px-3 text-sm focus:border-stone-900 focus:ring-2 focus:ring-stone-400"
        />
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
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 min-h-[44px] rounded-lg bg-stone-900 text-white font-medium text-sm disabled:opacity-50 transition"
        >
          {loading ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </div>
  )
}
