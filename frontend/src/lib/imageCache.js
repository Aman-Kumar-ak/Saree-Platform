const CACHE_NAME = 'saree-platform-image-cache-v1'
const VERSION_PREFIX = 'saree-platform-image-version:'
const sharedCache = new Map()
const pendingLoads = new Map()

function getVersionKey(url) {
  return `${VERSION_PREFIX}${url}`
}

function getSharedEntry(key) {
  return sharedCache.get(key) ?? null
}

function storeSharedEntry(key, objectUrl, refs = 1) {
  const existing = sharedCache.get(key)
  if (existing) {
    existing.refs += refs
    return existing.objectUrl
  }

  sharedCache.set(key, { objectUrl, refs })
  return objectUrl
}

export function releaseCachedImage(url, version) {
  if (!url) return
  const key = `${url}|${version ?? ''}`
  const entry = sharedCache.get(key)
  if (!entry) return

  entry.refs -= 1
  if (entry.refs <= 0) {
    URL.revokeObjectURL(entry.objectUrl)
    sharedCache.delete(key)
  }
}

export function cancelCachedImageRequest(url, version) {
  if (!url) return
  const key = `${url}|${version ?? ''}`
  const pending = pendingLoads.get(key)
  if (pending && pending.requests > 0) {
    pending.requests -= 1
  }
}

export async function resolveCachedImage(url, version) {
  if (!url) return ''

  const key = `${url}|${version ?? ''}`
  const cachedEntry = getSharedEntry(key)
  if (cachedEntry) {
    cachedEntry.refs += 1
    return cachedEntry.objectUrl
  }

  const existing = pendingLoads.get(key)
  if (existing) {
    existing.requests += 1
    return existing.promise
  }

  const pending = {
    requests: 1,
    promise: null,
  }

  pending.promise = (async () => {
    let cachedVersion = null
    try {
      cachedVersion = window.localStorage.getItem(getVersionKey(url))
    } catch {
      cachedVersion = null
    }

    if (cachedVersion === String(version ?? '')) {
      try {
        const cache = await caches.open(CACHE_NAME)
        const response = await cache.match(url)
        if (response) {
          const objectUrl = URL.createObjectURL(await response.blob())
          if (pending.requests <= 0) {
            URL.revokeObjectURL(objectUrl)
            return url
          }
          storeSharedEntry(key, objectUrl, pending.requests)
          return objectUrl
        }
      } catch {
        // Fall through to network fetch below.
      }
    }

    try {
      const response = await fetch(url, {
        cache: cachedVersion === String(version ?? '') ? 'force-cache' : 'no-cache',
      })
      if (!response.ok) throw new Error('Image request failed')

      const responseForCache = response.clone()
      const objectUrl = URL.createObjectURL(await response.blob())
      if (pending.requests <= 0) {
        URL.revokeObjectURL(objectUrl)
        return url
      }
      storeSharedEntry(key, objectUrl, pending.requests)

      try {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(url, responseForCache)
      } catch {
        // Cache API may be unavailable or the response may be opaque.
      }

      try {
        window.localStorage.setItem(getVersionKey(url), String(version ?? ''))
      } catch {
        // Ignore storage failures.
      }

      return objectUrl
    } catch {
      return url
    }
  })()

  pendingLoads.set(key, pending)

  try {
    return await pending.promise
  } finally {
    pendingLoads.delete(key)
  }
}
