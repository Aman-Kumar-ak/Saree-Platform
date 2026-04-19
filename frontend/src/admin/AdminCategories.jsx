import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import LoadingState from '../components/LoadingState.jsx'

export default function AdminCategories() {
  const { authFetch } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editBusy, setEditBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await authFetch('/api/admin/categories')
      if (!r.ok) throw new Error('Failed to load')
      const data = await r.json()
      setItems(data.categories ?? [])
    } catch (e) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    const id = setTimeout(() => {
      void load()
    }, 0)
    return () => clearTimeout(id)
  }, [load])

  async function create(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await authFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Create failed')
      setName('')
      setDescription('')
      setCreateOpen(false)
      await load()
    } catch (e2) {
      setError(e2.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editTarget) return
    setEditBusy(true)
    setError(null)
    try {
      const r = await authFetch(`/api/admin/categories/${editTarget._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Update failed')

      setItems((prev) =>
        prev.map((item) =>
          item._id === editTarget._id
            ? {
                ...item,
                ...(d.category || {}),
                productCount: item.productCount,
              }
            : item
        )
      )
      setEditTarget(null)
    } catch (e2) {
      setError(e2.message)
    } finally {
      setEditBusy(false)
    }
  }

  async function remove() {
    if (!deleteTarget) return
    const r = await authFetch(`/api/admin/categories/${deleteTarget._id}`, {
      method: 'DELETE',
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(d.error || 'Delete failed')
      return
    }
    setDeleteTarget(null)
    await load()
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading categories..."
        description="Fetching category data from the server."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm ring-1 ring-black/[0.02]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
              New category
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen((open) => !open)}
            className="inline-flex min-h-[40px] items-center rounded-full border border-stone-200 bg-white px-3.5 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50"
            aria-expanded={createOpen}
          >
            {createOpen ? 'Cancel' : 'Add'}
          </button>
        </div>
        <div
          className={`grid overflow-hidden transition-all duration-300 ease-out ${
            createOpen
              ? 'mt-5 max-h-[700px] grid-rows-[1fr] opacity-100'
              : 'max-h-0 grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0">
            <form onSubmit={create} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                    Name
                  </label>
                  <input
                    required
                    className="w-full min-h-[46px] rounded-xl border border-stone-200 px-3 text-sm outline-none transition focus:border-stone-400"
                    placeholder="Category name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                    Description
                  </label>
                  <input
                    className="w-full min-h-[46px] rounded-xl border border-stone-200 px-3 text-sm outline-none transition focus:border-stone-400"
                    placeholder="Optional description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? 'Saving...' : 'Create category'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
            Existing categories
          </h2>
          <span className="text-sm text-stone-500">{items.length} items</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((c) => (
            <article
              key={c._id}
              className="rounded-[28px] border border-stone-200 bg-white/95 p-3.5 shadow-sm ring-1 ring-black/[0.02]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[1.05rem] font-semibold tracking-tight text-stone-950">
                    {c.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                      {Number(c.productCount || 0).toLocaleString('en-IN')} items
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
                    onClick={() => {
                      setEditTarget(c)
                      setEditName(c.name || '')
                      setEditDescription(c.description || '')
                    }}
                    aria-label={`Edit ${c.name}`}
                    title="Edit category"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition active:scale-[0.99] hover:border-red-300 hover:bg-red-100"
                    onClick={() => setDeleteTarget(c)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <CategoryEditDialog
        open={Boolean(editTarget)}
        category={editTarget}
        name={editName}
        description={editDescription}
        busy={editBusy}
        onClose={() => setEditTarget(null)}
        onSave={saveEdit}
        onNameChange={setEditName}
        onDescriptionChange={setEditDescription}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete category?"
        message={
          deleteTarget
            ? `Delete the category "${deleteTarget.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={remove}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  )
}

function CategoryEditDialog({
  open,
  category,
  name,
  description,
  busy,
  onClose,
  onSave,
  onNameChange,
  onDescriptionChange,
}) {
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open || !category) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              Edit category
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">
              {category.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[38px] items-center rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSave} className="mt-5 space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
              Name
            </label>
            <input
              required
              className="w-full min-h-[46px] rounded-xl border border-stone-200 px-3 text-sm outline-none transition focus:border-stone-400"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
              Description
            </label>
            <input
              className="w-full min-h-[46px] rounded-xl border border-stone-200 px-3 text-sm outline-none transition focus:border-stone-400"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
          >
                {busy ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
