import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import LoadingState from '../components/LoadingState.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function AdminProducts() {
  const { authFetch } = useAuth()
  const { addToast } = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState([])
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState(null)
  const [editImages, setEditImages] = useState([])
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('0')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [uploadNotice, setUploadNotice] = useState('')

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

  async function uploadMany(items) {
    const out = []
    for (const item of items) {
      if (item.kind === 'remote') {
        out.push(item.url)
      } else if (item.kind === 'local') {
        out.push(await uploadFile(item.file))
      }
    }
    return out
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setImages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: 'local',
        file,
        previewUrl,
      },
    ])
  }

  async function create(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const uploadedImages = await uploadMany(images)
      const r = await authFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          price: Number(price),
          stock: Number(stock),
          category: categoryId,
          description,
          images: uploadedImages,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Create failed')
      setName('')
      setPrice('')
      setStock('0')
      setDescription('')
      images
        .filter((item) => item.kind === 'local')
        .forEach((item) => URL.revokeObjectURL(item.previewUrl))
      setImages([])
      setCreateOpen(false)
      addToast('Product created successfully.', 'success', 2500)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      const r = await authFetch(`/api/admin/products/${deleteTarget._id}`, {
        method: 'DELETE',
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(d.error || 'Delete failed')
        return
      }
      setDeleteTarget(null)
      await load()
      addToast('Product deleted successfully.', 'success', 2500)
    } finally {
      setDeleteBusy(false)
    }
  }

  function openEdit(product) {
    setEditTarget(product)
    setEditError(null)
    setUploadNotice('')
    setEditImages(
      Array.isArray(product.images)
        ? product.images.map((url) => ({ id: url, kind: 'remote', url }))
        : []
    )
    setEditName(product.name || '')
    setEditPrice(String(product.price ?? ''))
    setEditStock(String(product.stock ?? 0))
    setEditCategoryId(
      typeof product.category === 'object' && product.category?._id
        ? String(product.category._id)
        : String(product.category ?? '')
    )
    setEditDescription(product.description || '')
  }

  async function editUploadFile(file) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'products')
    const r = await authFetch('/api/admin/upload', { method: 'POST', body: fd })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || 'Upload failed')
    return d.url
  }

  async function uploadEditMany(items) {
    const out = []
    for (const item of items) {
      if (item.kind === 'remote') {
        out.push(item.url)
      } else if (item.kind === 'local') {
        out.push(await editUploadFile(item.file))
      }
    }
    return out
  }

  async function onEditPickImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setEditImages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        kind: 'local',
        file,
        previewUrl,
      },
    ])
    setUploadNotice('')
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editTarget) return
    setEditBusy(true)
    setEditError(null)
    try {
      const uploadedImages = await uploadEditMany(editImages)
      const r = await authFetch(`/api/admin/products/${editTarget._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          price: Number(editPrice),
          stock: Number(editStock),
          category: editCategoryId,
          description: editDescription,
          images: uploadedImages,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Update failed')
      setEditTarget(null)
      setUploadNotice('')
      editImages
        .filter((item) => item.kind === 'local')
        .forEach((item) => URL.revokeObjectURL(item.previewUrl))
      await load()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditBusy(false)
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading products..."
        description="Fetching the latest catalog and categories."
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm ring-1 ring-black/[0.02]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
              New product
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Open this only when you need to add something new.
            </p>
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
              ? 'mt-5 max-h-[1400px] grid-rows-[1fr] opacity-100'
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
                    placeholder="Product name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                      Price
                    </label>
                    <input
                      required
                      inputMode="decimal"
                      className="w-full min-h-[46px] rounded-xl border border-stone-200 px-3 text-sm outline-none transition focus:border-stone-400"
                      placeholder="₹0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                      Stock
                    </label>
                    <input
                      inputMode="numeric"
                      className="w-full min-h-[46px] rounded-xl border border-stone-200 px-3 text-sm outline-none transition focus:border-stone-400"
                      placeholder="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <div className="space-y-1">
                  <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                    Category
                  </label>
                  <select
                    required
                    className="w-full min-h-[46px] rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none transition focus:border-stone-400"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                    Images
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onPickImage}
                    className="block w-full rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-600 file:mr-4 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Description
                </label>
                <textarea
                  className="w-full rounded-xl border border-stone-200 px-3 py-3 text-sm outline-none transition focus:border-stone-400"
                  rows={4}
                  placeholder="Write product details"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <ImagePreviewList
                title="Uploaded images"
                images={images}
                onRemoveImage={(id) =>
                  setImages((prev) => prev.filter((item) => item.id !== id))
                }
              />
              <button
                type="submit"
                disabled={busy || !categoryId}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? 'Saving...' : 'Create product'}
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
            Existing products
          </h2>
          <span className="text-sm text-stone-500">{products.length} items</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {products.map((p) => (
            <article
              key={p._id}
              className="grid grid-cols-[minmax(0,1fr)_136px] items-start gap-3 rounded-[28px] border border-stone-200 bg-white/95 p-3.5 shadow-sm ring-1 ring-black/[0.02] sm:grid-cols-[minmax(0,1fr)_152px] sm:gap-4"
            >
              <div className="order-1 min-w-0">
                <p className="text-[1.05rem] font-semibold tracking-tight text-stone-950 sm:text-[1.02rem]">
                  {p.name}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                    Rs. {Number(p.price).toLocaleString('en-IN')}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Stock {p.stock}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
                  <button
                    type="button"
                    className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-stone-200 bg-stone-50 px-3.5 text-sm font-semibold text-stone-800 transition active:scale-[0.99] hover:border-stone-300 hover:bg-white"
                    onClick={() => openEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[36px] items-center justify-center rounded-full border border-red-200 bg-red-50 px-3.5 text-sm font-semibold text-red-700 transition active:scale-[0.99] hover:border-red-300 hover:bg-red-100"
                    onClick={() => setDeleteTarget(p)}
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-3 hidden items-center gap-2 sm:flex">
                  <button
                    type="button"
                    className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-stone-800 transition active:scale-[0.99] hover:border-stone-300 hover:bg-white"
                    onClick={() => openEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition active:scale-[0.99] hover:border-red-300 hover:bg-red-100"
                    onClick={() => setDeleteTarget(p)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="order-2 justify-self-end sm:order-2 sm:self-start">
                <ProductCardThumb
                  key={`${p._id}-${Array.isArray(p.images) && p.images[0] ? p.images[0] : 'empty'}`}
                  src={Array.isArray(p.images) && p.images[0] ? p.images[0] : ''}
                  alt={p.name}
                />
              </div>
            </article>
          ))}
        </div>      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete product?"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}" from the catalog? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        busy={deleteBusy}
        onConfirm={remove}
        onClose={() => {
          if (!deleteBusy) setDeleteTarget(null)
        }}
      />

      <EditProductDialog
        open={Boolean(editTarget)}
        productName={editTarget?.name || ''}
        categories={categories}
        busy={editBusy}
        error={editError}
        notice={uploadNotice}
        name={editName}
        price={editPrice}
        stock={editStock}
        categoryId={editCategoryId}
        description={editDescription}
        images={editImages}
        onClose={() => {
          if (!editBusy) setEditTarget(null)
        }}
        onSubmit={saveEdit}
        onNameChange={setEditName}
        onPriceChange={setEditPrice}
        onStockChange={setEditStock}
        onCategoryChange={setEditCategoryId}
        onDescriptionChange={setEditDescription}
        onPickImage={onEditPickImage}
        onRemoveImage={(id) =>
          setEditImages((prev) => prev.filter((item) => item.id !== id))
        }
      />
    </div>
  )
}

function ProductCardThumb({ src, alt }) {
  const [hasError, setHasError] = useState(false)
  const showImage = Boolean(src) && !hasError

  return (
    <div className="flex h-[112px] w-[112px] items-center justify-center overflow-hidden rounded-[22px] border border-stone-200 bg-[linear-gradient(135deg,#f8f7f5_0%,#efebe4_100%)] p-3 shadow-sm ring-1 ring-black/[0.03] sm:h-[128px] sm:w-[128px] sm:p-3.5">
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          loading="eager"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
          No Image
        </div>
      )}
    </div>
  )
}

function ImagePreviewList({ title, images, onRemoveImage }) {
  if (!images.length) return null

  return (
    <div className="rounded-2xl bg-stone-50 p-3 text-xs text-stone-600">
      <p className="font-medium text-stone-700">{title}</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {images.map((item) => {
          const src = item.kind === 'local' ? item.previewUrl : item.url

          return (
            <div
              key={item.id}
              className="rounded-3xl border border-stone-200 bg-gradient-to-br from-white to-stone-50 p-3 shadow-sm"
            >
              <div className="grid grid-cols-[80px_1fr] gap-3">
                <button
                  type="button"
                  className="group flex h-24 w-20 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-white ring-1 ring-stone-100"
                  onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}
                  aria-label="Preview image"
                >
                  <img
                    src={src}
                    alt="Selected product"
                    className="h-full w-full object-contain p-1.5 transition group-hover:scale-[1.02]"
                    loading="eager"
                  />
                </button>
                <div className="min-w-0 flex flex-1 flex-col justify-center gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-[36px] items-center justify-center rounded-2xl bg-stone-950 px-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] hover:bg-stone-800"
                    onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[32px] items-center justify-center rounded-2xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition active:scale-[0.99] hover:border-red-300 hover:bg-red-50"
                    onClick={() => onRemoveImage(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EditProductDialog({
  open,
  productName,
  categories,
  busy,
  error,
  notice,
  name,
  price,
  stock,
  categoryId,
  description,
  images,
  onClose,
  onSubmit,
  onNameChange,
  onPriceChange,
  onStockChange,
  onCategoryChange,
  onDescriptionChange,
  onPickImage,
  onRemoveImage,
}) {
  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onClose])

  useEffect(() => {
    if (!open) return undefined
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
      <div className="max-h-[90svh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-stone-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              Edit product
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">
              {productName}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                Name
              </label>
              <input
                className="w-full min-h-[46px] rounded-xl border border-stone-200 px-3 text-sm outline-none transition focus:border-stone-400"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Price
                </label>
                <input
                  className="w-full min-h-[46px] rounded-xl border border-stone-200 px-3 text-sm outline-none transition focus:border-stone-400"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => onPriceChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                  Stock
                </label>
                <input
                  className="w-full min-h-[46px] rounded-xl border border-stone-200 px-3 text-sm outline-none transition focus:border-stone-400"
                  inputMode="numeric"
                  value={stock}
                  onChange={(e) => onStockChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                Category
              </label>
              <select
                className="w-full min-h-[46px] rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none transition focus:border-stone-400"
                value={categoryId}
                onChange={(e) => onCategoryChange(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
                Add image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={onPickImage}
                className="block w-full rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-600 file:mr-4 file:rounded-full file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
              Description
            </label>
            <textarea
              className="w-full rounded-xl border border-stone-200 px-3 py-3 text-sm outline-none transition focus:border-stone-400"
              rows={4}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>

          <ImagePreviewList
            title="Images"
            images={images}
            onRemoveImage={onRemoveImage}
          />

          {notice ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {notice}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-800 transition disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}



