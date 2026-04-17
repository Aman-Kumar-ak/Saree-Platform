/**
 * API base URL from VITE_API_BASE_URL (see frontend/.env).
 * Empty or unset uses same-origin relative paths (e.g. /api/... with Vite dev proxy).
 */
export function getApiBaseUrl() {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (base == null || String(base).trim() === "") {
    return "";
  }
  return String(base).replace(/\/$/, "");
}

export function apiUrl(path) {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
