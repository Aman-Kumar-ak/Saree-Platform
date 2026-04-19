import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAddresses } from '../context/AddressContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import LoginPromptModal from '../components/LoginPromptModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import LoadingState from '../components/LoadingState.jsx'
import {
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
      <LoadingState
        title="Loading addresses..."
        description="Checking your account and saved delivery addresses."
      />
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
    setShowForm(false)
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
    if (editingId) return
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

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingId) return
    const nextForm = normalizeAddressForm(form)
    const validationError = validateAddressForm(nextForm)

    if (validationError) {
      addToast(validationError, 'error', 3000)
      return
    }

    setSubmitting(true)
    try {
      await updateAddress(editingId, nextForm)
      addToast('Address updated successfully!', 'success', 2500)
      resetForm()
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

  const openAddForm = () => {
    if (showForm) {
      closeForm()
      return
    }
    resetForm()
    setShowForm(true)
  }

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-16 lg:pb-12">
      <div className="absolute inset-x-4 top-0 -z-10 h-40 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(28,25,23,0.08),_transparent_55%),radial-gradient(circle_at_top_right,_rgba(168,162,158,0.18),_transparent_45%)] blur-2xl sm:inset-x-6" />

      <section className="overflow-hidden rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm ring-1 ring-black/[0.02] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
              My Addresses
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
              Keep your delivery addresses organized.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-stone-900 px-4 text-sm font-semibold text-white transition active:opacity-90"
          >
            {showForm ? 'Close' : '+ Add Address'}
          </button>
        </div>

        <div
          className={`grid overflow-hidden transition-all duration-300 ease-out ${
            showForm
              ? 'mt-5 max-h-[1400px] grid-rows-[1fr] opacity-100'
              : 'max-h-0 grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0">
            <AddressFormPanel
              title="Add New Address"
              variant="embedded"
              form={form}
              submitting={submitting}
              submitLabel="Add Address"
              onClose={closeForm}
              onSubmit={handleSubmit}
              onFieldChange={updateField}
              onDefaultChange={(checked) =>
                setForm((current) => ({ ...current, isDefault: checked }))
              }
            />
          </div>
        </div>
      </section>

      <section className="mt-6 pb-20 sm:pb-10 lg:pb-6">
        {loading ? (
          <LoadingState
            title="Loading addresses..."
            description="Fetching your saved delivery addresses."
            className="min-h-[26svh]"
          />
        ) : addresses.length === 0 ? (
          <div className="overflow-hidden rounded-[28px] border border-dashed border-stone-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-stone-900">
              No addresses saved yet
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Add your first address to speed up checkout and keep your delivery details in one place.
            </p>
            <button
              type="button"
              onClick={openAddForm}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-stone-900 px-4 text-sm font-semibold text-white transition active:opacity-90"
            >
              Add first address
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 pb-10 lg:pb-0">
            {addresses.map((address) => (
              <AddressCard
                key={address._id}
                address={address}
                onEdit={() => handleEdit(address)}
                onDelete={() => setDeleteTarget(address)}
              />
            ))}
          </div>
        )}
      </section>

      <EditAddressModal
        open={Boolean(editingId)}
        title="Edit Address"
        variant="modal"
        form={form}
        submitting={submitting}
        onClose={() => {
          if (!submitting) resetForm()
        }}
        onSubmit={handleEditSubmit}
        onFieldChange={updateField}
        onDefaultChange={(checked) =>
          setForm((current) => ({ ...current, isDefault: checked }))
        }
      />

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

function AddressCard({ address, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <article className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-semibold tracking-tight text-stone-950">
              {address.fullName}
            </p>
            {address.isDefault ? (
              <span className="inline-flex items-center rounded-full bg-stone-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                Default
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-stone-600">{address.phone}</p>
          <p className="mt-3 text-sm leading-relaxed text-stone-700">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ''}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-stone-700">
            {address.city}, {address.state} {address.pincode}
          </p>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            aria-label={`Open actions for ${address.fullName}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-600 transition hover:border-stone-300 hover:bg-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle cx="12" cy="5" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="12" cy="19" r="1.7" />
            </svg>
          </button>

          {menuOpen ? (
            <div className="absolute bottom-12 right-0 z-30 w-48 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl sm:top-12 sm:bottom-auto sm:w-44">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onEdit()
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-stone-800 transition hover:bg-stone-50"
              >
                Edit address
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete()
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
              >
                Delete address
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function AddressFormPanel({
  title,
  variant = 'embedded',
  form,
  submitting,
  submitLabel,
  onClose,
  onSubmit,
  onFieldChange,
  onDefaultChange,
}) {
  const isModal = variant === 'modal'

  return (
    <div
      className={
        isModal
          ? 'flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden bg-white'
          : 'pt-1'
      }
    >
      <div className={isModal ? 'border-b border-stone-200 px-4 pb-4 pt-5 sm:px-6' : 'pb-4'}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
          {title}
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className={
          isModal
            ? 'flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6'
            : 'grid gap-4'
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full Name">
            <input
              type="text"
              required
              maxLength="120"
              value={form.fullName}
              onChange={(e) => onFieldChange('fullName', e.target.value)}
              placeholder="Enter full name"
              className="w-full min-h-[46px] rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-stone-400"
            />
          </Field>

          <Field label="Phone (10 digits)">
            <input
              type="tel"
              required
              inputMode="numeric"
              maxLength={10}
              minLength={10}
              pattern="[6-9][0-9]{9}"
              value={form.phone}
              onChange={(e) => onFieldChange('phone', e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full min-h-[46px] rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-stone-400"
            />
          </Field>
        </div>

        <Field label="Address Line 1">
          <input
            type="text"
            required
            maxLength="200"
            value={form.line1}
            onChange={(e) => onFieldChange('line1', e.target.value)}
            placeholder="House no., street, etc."
            className="w-full min-h-[46px] rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-stone-400"
          />
        </Field>

        <Field label="Address Line 2 (optional)">
          <input
            type="text"
            value={form.line2}
            maxLength="200"
            onChange={(e) => onFieldChange('line2', e.target.value)}
            placeholder="Apartment, suite, etc."
            className="w-full min-h-[46px] rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-stone-400"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="City">
            <input
              type="text"
              required
              maxLength="80"
              value={form.city}
              onChange={(e) => onFieldChange('city', e.target.value)}
              placeholder="Enter city"
              className="w-full min-h-[46px] rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-stone-400"
            />
          </Field>

          <Field label="State">
            <select
              required
              value={form.state}
              onChange={(e) => onFieldChange('state', e.target.value)}
              className="w-full min-h-[46px] rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-stone-400"
            >
              <option value="">Select a state</option>
              {INDIA_STATE_OPTIONS.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="PIN Code">
          <input
            type="text"
            required
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            pattern="[0-9]{6}"
            value={form.pincode}
            onChange={(e) => onFieldChange('pincode', e.target.value)}
            placeholder="6-digit PIN code"
            className="w-full min-h-[46px] rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-stone-400"
          />
        </Field>

        <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => onDefaultChange(e.target.checked)}
            className="h-4 w-4 rounded border-stone-200"
          />
          <span className="text-sm font-medium text-stone-700">
            Set as default address
          </span>
        </label>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 min-h-[48px] rounded-full bg-stone-900 px-5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? 'Saving...' : submitLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-full border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-800 transition hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </label>
      {children}
    </div>
  )
}

function EditAddressModal({
  open,
  title,
  variant,
  form,
  submitting,
  onClose,
  onSubmit,
  onFieldChange,
  onDefaultChange,
}) {
  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape' && !submitting) {
        onClose()
      }
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, submitting, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/30 px-4 py-4 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[calc(100svh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-2xl">
        <AddressFormPanel
          title={title}
          variant={variant}
          form={form}
          submitting={submitting}
          onClose={onClose}
          submitLabel="Save changes"
          onSubmit={onSubmit}
          onFieldChange={onFieldChange}
          onDefaultChange={onDefaultChange}
        />
      </div>
    </div>,
    document.body
  )
}
