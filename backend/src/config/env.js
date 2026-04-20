/**
 * Centralized config from process.env (set values in backend/.env).
 * Avoids hardcoded ports, URLs, and service names in application code.
 */

import { existsSync, readFileSync } from "node:fs";

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || String(v).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(v).trim();
}

function optionalEnv(name) {
  const v = process.env[name];
  if (v === undefined || String(v).trim() === "") return undefined;
  return String(v).trim();
}

function parseBoolean(raw, fallback = false) {
  if (raw === undefined || raw === "") return fallback;
  const value = String(raw).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

function parsePort(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 65535) {
    throw new Error("PORT must be a number between 1 and 65535");
  }
  return n;
}

/**
 * Comma-separated origins for CORS. If unset, cors uses dynamic origin reflection.
 */
function parseCorsOrigin() {
  const raw = optionalEnv("CORS_ORIGIN");
  if (!raw) {
    return [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ];
  }
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) {
    throw new Error("CORS_ORIGIN is set but empty. Add one or more allowed origins.");
  }
  if (list.length === 1) return list[0];
  return list;
}

function loadFirebaseServiceAccountJson() {
  const inline = optionalEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (inline) return inline;
  const pth = optionalEnv("FIREBASE_SERVICE_ACCOUNT_PATH");
  if (pth && existsSync(pth)) {
    return readFileSync(pth, "utf8");
  }
  const b64 = optionalEnv("FIREBASE_SERVICE_ACCOUNT_B64");
  if (b64) {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  return undefined;
}

function parseOptionalNonNegativeInt(raw) {
  if (raw === undefined || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error("SHIPPING_FLAT_RUPEES must be a non-negative integer");
  }
  return n;
}

function parseUploadMaxMb(raw) {
  const n = Number(raw ?? "5");
  if (!Number.isFinite(n) || n <= 0 || n > 50) {
    throw new Error("UPLOAD_MAX_MB must be between 0 and 50");
  }
  return n;
}

function parseOptionalPositiveInt(raw, fallback, label) {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return n;
}

let cached;

export function getConfig() {
  if (cached) return cached;

  const port = parsePort(requireEnv("PORT"));
  const host = optionalEnv("HOST");
  const mongodbUri = optionalEnv("MONGODB_URI");
  const apiServiceName = optionalEnv("API_SERVICE_NAME");
  const corsOrigin = parseCorsOrigin();
  const orderNumberPrefix = optionalEnv("ORDER_NUMBER_PREFIX") ?? "";
  const shippingFlatRupees = parseOptionalNonNegativeInt(
    optionalEnv("SHIPPING_FLAT_RUPEES")
  );
  const jwtSecret = optionalEnv("JWT_SECRET");
  const jwtExpiresIn = optionalEnv("JWT_EXPIRES_IN") ?? "7d";
  const firebaseServiceAccountJson = loadFirebaseServiceAccountJson();
  const cloudinaryCloudName = optionalEnv("CLOUDINARY_CLOUD_NAME");
  const cloudinaryApiKey = optionalEnv("CLOUDINARY_API_KEY");
  const cloudinaryApiSecret = optionalEnv("CLOUDINARY_API_SECRET");
  const uploadMaxMb = parseUploadMaxMb(optionalEnv("UPLOAD_MAX_MB"));
  const authRateLimitWindowMs = parseOptionalPositiveInt(
    optionalEnv("AUTH_RATE_LIMIT_WINDOW_MS"),
    10 * 60 * 1000,
    "AUTH_RATE_LIMIT_WINDOW_MS"
  );
  const authRateLimitMax = parseOptionalPositiveInt(
    optionalEnv("AUTH_RATE_LIMIT_MAX"),
    30,
    "AUTH_RATE_LIMIT_MAX"
  );
  const apiRateLimitWindowMs = parseOptionalPositiveInt(
    optionalEnv("API_RATE_LIMIT_WINDOW_MS"),
    60 * 1000,
    "API_RATE_LIMIT_WINDOW_MS"
  );
  const apiRateLimitMax = parseOptionalPositiveInt(
    optionalEnv("API_RATE_LIMIT_MAX"),
    240,
    "API_RATE_LIMIT_MAX"
  );
  const adminRateLimitWindowMs = parseOptionalPositiveInt(
    optionalEnv("ADMIN_RATE_LIMIT_WINDOW_MS"),
    60 * 1000,
    "ADMIN_RATE_LIMIT_WINDOW_MS"
  );
  const adminRateLimitMax = parseOptionalPositiveInt(
    optionalEnv("ADMIN_RATE_LIMIT_MAX"),
    120,
    "ADMIN_RATE_LIMIT_MAX"
  );
  const requestJsonLimitKb = parseOptionalPositiveInt(
    optionalEnv("REQUEST_JSON_LIMIT_KB"),
    256,
    "REQUEST_JSON_LIMIT_KB"
  );
  const requestUrlMaxLength = parseOptionalPositiveInt(
    optionalEnv("REQUEST_URL_MAX_LENGTH"),
    2048,
    "REQUEST_URL_MAX_LENGTH"
  );
  const authOtpSendWindowMs = parseOptionalPositiveInt(
    optionalEnv("AUTH_OTP_SEND_WINDOW_MS"),
    10 * 60 * 1000,
    "AUTH_OTP_SEND_WINDOW_MS"
  );
  const authOtpSendMax = parseOptionalPositiveInt(
    optionalEnv("AUTH_OTP_SEND_MAX"),
    4,
    "AUTH_OTP_SEND_MAX"
  );
  const authOtpVerifyWindowMs = parseOptionalPositiveInt(
    optionalEnv("AUTH_OTP_VERIFY_WINDOW_MS"),
    2 * 60 * 1000,
    "AUTH_OTP_VERIFY_WINDOW_MS"
  );
  const authOtpVerifyMax = parseOptionalPositiveInt(
    optionalEnv("AUTH_OTP_VERIFY_MAX"),
    5,
    "AUTH_OTP_VERIFY_MAX"
  );
  const authOtpSuspendMs = parseOptionalPositiveInt(
    optionalEnv("AUTH_OTP_SUSPEND_MS"),
    2 * 60 * 1000,
    "AUTH_OTP_SUSPEND_MS"
  );
  const corsAllowPrivateNetwork = parseBoolean(
    optionalEnv("CORS_ALLOW_PRIVATE_NETWORK"),
    false
  );

  cached = {
    port,
    host: host ?? undefined,
    mongodbUri,
    apiServiceName,
    corsOrigin,
    orderNumberPrefix,
    shippingFlatRupees,
    jwtSecret,
    jwtExpiresIn,
    firebaseServiceAccountJson,
    cloudinaryCloudName,
    cloudinaryApiKey,
    cloudinaryApiSecret,
    uploadMaxMb,
    authRateLimitWindowMs,
    authRateLimitMax,
    apiRateLimitWindowMs,
    apiRateLimitMax,
    adminRateLimitWindowMs,
    adminRateLimitMax,
    requestJsonLimitKb,
    requestUrlMaxLength,
    authOtpSendWindowMs,
    authOtpSendMax,
    authOtpVerifyWindowMs,
    authOtpVerifyMax,
    authOtpSuspendMs,
    corsAllowPrivateNetwork,
  };
  return cached;
}
