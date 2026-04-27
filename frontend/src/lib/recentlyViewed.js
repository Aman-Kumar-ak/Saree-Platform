const STORAGE_KEY = 'saree_recently_viewed_v1'
const MAX_ITEMS = 12

function normalizeItem(product) {
  if (!product?._id || !product?.slug) return null

  return {
    _id: String(product._id),
    slug: product.slug,
    name: product.name ?? '',
    price: Number(product.price) || 0,
    images: Array.isArray(product.images) ? product.images.slice(0, 1) : [],
    stock: Number(product.stock) || 0,
    updatedAt: product.updatedAt ?? product.createdAt ?? new Date().toISOString(),
    createdAt: product.createdAt ?? new Date().toISOString(),
  }
}

export function readRecentlyViewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => item?._id && item?.slug) : []
  } catch {
    return []
  }
}

export function recordRecentlyViewed(product) {
  const normalized = normalizeItem(product)
  if (!normalized) return []

  const nextItems = [
    normalized,
    ...readRecentlyViewed().filter((item) => String(item._id) !== normalized._id),
  ].slice(0, MAX_ITEMS)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems))
  } catch {
    // Ignore storage quota issues and continue without persistence.
  }

  return nextItems
}
