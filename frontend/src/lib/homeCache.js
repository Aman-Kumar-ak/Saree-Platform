const HOME_CACHE_KEY = 'saree-platform-home-cache-v1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readHomeCache() {
  if (!canUseStorage()) return null

  try {
    const raw = window.localStorage.getItem(HOME_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.revision !== 'string') return null
    if (!parsed.data || typeof parsed.data !== 'object') return null

    return parsed
  } catch {
    return null
  }
}

export function writeHomeCache(data) {
  if (!canUseStorage()) return
  if (!data || typeof data !== 'object') return

  try {
    window.localStorage.setItem(
      HOME_CACHE_KEY,
      JSON.stringify({
        revision: typeof data.revision === 'string' ? data.revision : '',
        savedAt: Date.now(),
        data,
      })
    )
  } catch {
    // Ignore storage failures.
  }
}
