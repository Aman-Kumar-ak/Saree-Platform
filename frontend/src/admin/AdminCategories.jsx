import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminCategories() {
  const { authFetch } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

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
      await load()
    } catch (e2) {
      setError(e2.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this category?')) return
    const r = await authFetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(d.error || 'Delete failed')
      return
    }
    await load()
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Loading…</p>
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-stone-900">Categories</h1>
      <form
        onSubmit={create}
        className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-stone-800">New category</h2>
        <input
          required
          className="w-full min-h-[44px] rounded-xl border border-stone-200 px-3 text-sm"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full min-h-[44px] rounded-xl border border-stone-200 px-3 text-sm"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Create'}
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-red-700">{error}</p>
      ) : null}

      <ul className="mt-8 space-y-2">
        {items.map((c) => (
          <li
            key={c._id}
            className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <span>
              <span className="font-medium text-stone-900">{c.name}</span>{' '}
              <span className="text-stone-500">({c.slug})</span>
            </span>
            <button
              type="button"
              className="shrink-0 text-red-700"
              onClick={() => remove(c._id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
