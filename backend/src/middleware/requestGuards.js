import { getConfig } from "../config/env.js";

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/;
const SUSPICIOUS_URL_PATTERNS = [
  "$where",
  "%24where",
  "union select",
  "%00",
  "..%2f",
  "..\\",
];

export function guardRequestUrl(req, res, next) {
  const cfg = getConfig();
  const originalUrl = String(req.originalUrl || "");
  const normalizedUrl = originalUrl.toLowerCase();

  if (originalUrl.length > cfg.requestUrlMaxLength) {
    res.status(414).json({ error: "Request URL is too long" });
    return;
  }

  if (CONTROL_CHAR_REGEX.test(originalUrl)) {
    res.status(400).json({ error: "Invalid request URL" });
    return;
  }

  if (SUSPICIOUS_URL_PATTERNS.some((pattern) => normalizedUrl.includes(pattern))) {
    res.status(400).json({ error: "Invalid request URL" });
    return;
  }

  next();
}
