import rateLimit from "express-rate-limit";
import { getConfig } from "../config/env.js";

export function createAuthRateLimiter() {
  const cfg = getConfig();
  return rateLimit({
    windowMs: cfg.authRateLimitWindowMs,
    max: cfg.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many auth attempts. Please wait a bit and try again.",
    },
  });
}

export function createApiRateLimiter() {
  const cfg = getConfig();
  return rateLimit({
    windowMs: cfg.apiRateLimitWindowMs,
    max: cfg.apiRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests. Please slow down and try again.",
    },
  });
}

export function createAdminRateLimiter() {
  const cfg = getConfig();
  return rateLimit({
    windowMs: cfg.adminRateLimitWindowMs,
    max: cfg.adminRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many admin requests. Please wait and retry.",
    },
  });
}
