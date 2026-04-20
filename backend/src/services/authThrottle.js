import { getConfig } from "../config/env.js";
import { AuthThrottle } from "../models/AuthThrottle.js";

function filterRecent(list, windowMs) {
  const threshold = Date.now() - windowMs;
  return (Array.isArray(list) ? list : []).filter((value) => {
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) && ts >= threshold;
  });
}

function retryAfterSeconds(until) {
  if (!until) return 0;
  const diff = new Date(until).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 1000) : 0;
}

function suspensionError(retryAfterSec, fallbackMessage) {
  const err = new Error(
    retryAfterSec > 0
      ? `Account is temporarily suspended. Try again in ${retryAfterSec}s.`
      : fallbackMessage
  );
  err.code = "AUTH_SUSPENDED";
  err.status = 429;
  err.retryAfterSec = retryAfterSec;
  return err;
}

async function getDoc(phone) {
  let doc = await AuthThrottle.findOne({ phone }).exec();
  if (!doc) {
    doc = await AuthThrottle.create({ phone });
  }
  return doc;
}

async function normalizeThrottleState(doc, cfg) {
  let changed = false;

  const wasSuspended = retryAfterSeconds(doc.suspendedUntil) > 0;
  if (!wasSuspended && doc.suspendedUntil) {
    doc.suspendedUntil = null;
    doc.sendAttempts = [];
    doc.verifyFailures = [];
    changed = true;
  }

  const nextSendAttempts = filterRecent(doc.sendAttempts, cfg.authOtpSendWindowMs);
  if (nextSendAttempts.length !== doc.sendAttempts.length) {
    doc.sendAttempts = nextSendAttempts;
    changed = true;
  }

  const nextVerifyFailures = filterRecent(
    doc.verifyFailures,
    cfg.authOtpVerifyWindowMs
  );
  if (nextVerifyFailures.length !== doc.verifyFailures.length) {
    doc.verifyFailures = nextVerifyFailures;
    changed = true;
  }

  if (changed) {
    await doc.save();
  }
}

export async function registerOtpSendAttempt(phone) {
  const cfg = getConfig();
  const doc = await getDoc(phone);
  await normalizeThrottleState(doc, cfg);

  const retryAfterSec = retryAfterSeconds(doc.suspendedUntil);
  if (retryAfterSec > 0) {
    throw suspensionError(retryAfterSec, "Account is temporarily suspended");
  }

  if (doc.sendAttempts.length >= cfg.authOtpSendMax) {
    doc.suspendedUntil = new Date(Date.now() + cfg.authOtpSuspendMs);
    await doc.save();
    throw suspensionError(
      retryAfterSeconds(doc.suspendedUntil),
      "Too many OTP requests in short time"
    );
  }

  doc.sendAttempts.push(new Date());
  await doc.save();
}

export async function registerOtpVerifyFailure(phone) {
  const cfg = getConfig();
  const doc = await getDoc(phone);
  await normalizeThrottleState(doc, cfg);

  const retryAfterSec = retryAfterSeconds(doc.suspendedUntil);
  if (retryAfterSec > 0) {
    throw suspensionError(retryAfterSec, "Account is temporarily suspended");
  }

  doc.verifyFailures.push(new Date());
  if (doc.verifyFailures.length >= cfg.authOtpVerifyMax) {
    doc.suspendedUntil = new Date(Date.now() + cfg.authOtpSuspendMs);
  }
  await doc.save();

  const lockRetryAfter = retryAfterSeconds(doc.suspendedUntil);
  if (lockRetryAfter > 0) {
    throw suspensionError(lockRetryAfter, "Too many OTP verification attempts");
  }
}

export async function assertAuthNotSuspended(phone) {
  const cfg = getConfig();
  const doc = await AuthThrottle.findOne({ phone }).exec();
  if (!doc) return;
  await normalizeThrottleState(doc, cfg);
  const retryAfterSec = retryAfterSeconds(doc.suspendedUntil);
  if (retryAfterSec > 0) {
    throw suspensionError(retryAfterSec, "Account is temporarily suspended");
  }
}

export async function clearOtpVerifyFailures(phone) {
  await AuthThrottle.updateOne(
    { phone },
    { $set: { verifyFailures: [] } }
  ).exec();
}
