const IN_10 = /^[6-9]\d{9}$/;

/**
 * Normalize user input (10 digits or +91...) to 10-digit India mobile.
 */
export function normalizeIndiaPhone10(input) {
  const raw = String(input ?? "").replace(/\s/g, "");
  if (IN_10.test(raw)) return raw;
  if (raw.startsWith("+91") && IN_10.test(raw.slice(3))) return raw.slice(3);
  if (raw.startsWith("91") && raw.length === 12 && IN_10.test(raw.slice(2))) {
    return raw.slice(2);
  }
  return null;
}

/**
 * Firebase phone_number like +9198... → 10 digits.
 */
export function firebasePhoneTo10(phoneNumber) {
  if (!phoneNumber) return null;
  const digits = String(phoneNumber).replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return null;
}

/** Comma-separated list from env → Set of 10-digit phones. */
export function adminPhoneSetFromEnv(raw) {
  if (!raw) return new Set();
  const out = new Set();
  for (const part of String(raw).split(",")) {
    const n = normalizeIndiaPhone10(part.trim());
    if (n) out.add(n);
  }
  return out;
}
