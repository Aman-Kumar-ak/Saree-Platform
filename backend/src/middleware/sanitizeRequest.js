const FORBIDDEN_KEY_PREFIXES = ["$", "__proto__", "constructor", "prototype"];

function shouldDropKey(key) {
  const normalized = String(key || "").trim();
  if (!normalized) return false;
  return FORBIDDEN_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function deepSanitize(value) {
  if (Array.isArray(value)) {
    return value.map(deepSanitize);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const next = {};
  for (const [key, entry] of Object.entries(value)) {
    if (shouldDropKey(key)) continue;
    next[key] = deepSanitize(entry);
  }
  return next;
}

function sanitizeObjectInPlace(target) {
  if (!target || typeof target !== "object" || Array.isArray(target)) return;
  for (const key of Object.keys(target)) {
    if (shouldDropKey(key)) {
      delete target[key];
      continue;
    }
    const value = target[key];
    if (Array.isArray(value)) {
      target[key] = value.map(deepSanitize);
      continue;
    }
    if (value && typeof value === "object") {
      target[key] = deepSanitize(value);
    }
  }
}

export function sanitizeRequest(req, _res, next) {
  try {
    if (req.body && typeof req.body === "object") {
      req.body = deepSanitize(req.body);
    }
    sanitizeObjectInPlace(req.query);
    sanitizeObjectInPlace(req.params);
    next();
  } catch (err) {
    next(err);
  }
}
