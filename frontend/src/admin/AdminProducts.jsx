import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminProducts() {
  const { authFetch } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pr, cr] = await Promise.all([
        authFetch('/api/admin/products'),
        authFetch('/api/admin/categories'),
      ])
      if (!pr.ok || !cr.ok) throw new Error('Failed to load')
      const p = await pr.json()
      const c = await cr.json()
      const cats = c.categories ?? []
      setProducts(p.products ?? [])
      setCategories(cats)
      setCategoryId((prev) => prev || (cats[0]?._id ? String(cats[0]._id) : ''))
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

  async function uploadFile(file) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'products')
    const r = await authFetch('/api/admin/upload', { method: 'POST', body: fd })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || 'Upload failed')
    return d.url
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const url = await uploadFile(file)
      setImages((prev) => [...prev, url])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function create(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await authFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          price: Number(price),
          stock: Number(stock),
          category: categoryId,
          description,
          images,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Create failed')
      setName('')
      setPrice('')
      setStock('0')
      setDescription('')
      setImages([])
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    if (!confirm('Delete this product?')) return
    const r = await authFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
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
      <h1 className="text-xl font-semibold text-stone-900">Products</h1>
      <p className="mt-1 text-sm text-stone-600">
        Create products and upload images (Cloudinary).
      </p>

      <form
        onSubmit={create}
        className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-stone-800">New product</h2>
        <input
          required
          className="w-full min-h-[44px] rounded-xl border border-stone-200 px-3 text-sm"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            required
            inputMode="decimal"
            className="min-h-[44px] rounded-xl border border-stone-200 px-3 text-sm"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            inputMode="numeric"
            className="min-h-[44px] rounded-xl border border-stone-200 px-3 text-sm"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>
        <select
          required
          className="w-full min-h-[44px] rounded-xl border border-stone-200 px-3 text-sm"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <textarea
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div>
          <label className="block text-xs text-stone-500">Images</label>
          <input type="file" accept="image/*" onChange={onPickImage} />
          {images.length ? (
            <ul className="mt-2 space-y-1 text-xs text-stone-600">
              {images.map((u) => (
                <li key={u} className="truncate">
                  {u}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={busy || !categoryId}
          className="w-full rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Create product'}
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm text-red-700">{error}</p>
      ) : null}

      <ul className="mt-8 space-y-2">
        {products.map((p) => (
          <li
            key={p._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <span className="font-medium text-stone-900">{p.name}</span>
            <span className="text-stone-500">
              ₹{Number(p.price).toLocaleString('en-IN')} · stock {p.stock}
            </span>
            <button
              type="button"
              className="text-red-700"
              onClick={() => remove(p._id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
