/**
 * Centralized config from process.env (set values in backend/.env).
 * Avoids hardcoded ports, URLs, and service names in application code.
 */

import { existsSync, readFileSync } from "node:fs";
import { adminPhoneSetFromEnv } from "../lib/phone.js";

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
  if (!raw) return true;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return true;
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
  const adminPhones = adminPhoneSetFromEnv(optionalEnv("ADMIN_PHONES"));
  const firebaseServiceAccountJson = loadFirebaseServiceAccountJson();
  const cloudinaryCloudName = optionalEnv("CLOUDINARY_CLOUD_NAME");
  const cloudinaryApiKey = optionalEnv("CLOUDINARY_API_KEY");
  const cloudinaryApiSecret = optionalEnv("CLOUDINARY_API_SECRET");
  const uploadMaxMb = parseUploadMaxMb(optionalEnv("UPLOAD_MAX_MB"));

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
    adminPhones,
    firebaseServiceAccountJson,
    cloudinaryCloudName,
    cloudinaryApiKey,
    cloudinaryApiSecret,
    uploadMaxMb,
  };
  return cached;
}
