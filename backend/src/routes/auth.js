import { Router } from "express";
import { isFirebaseAdminConfigured, verifyFirebaseIdToken } from "../config/firebaseAdmin.js";
import { firebasePhoneTo10, normalizeIndiaPhone10 } from "../lib/phone.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getConfig } from "../config/env.js";
import { signUserToken } from "../services/authJwt.js";
import {
  assertAuthNotSuspended,
  clearOtpVerifyFailures,
  registerOtpSendAttempt,
  registerOtpVerifyFailure,
} from "../services/authThrottle.js";
import { upsertUserFromFirebase } from "../services/upsertUserFromFirebase.js";
import { User } from "../models/User.js";

export const authRouter = Router();

authRouter.post("/firebase", async (req, res, next) => {
  try {
    const { jwtSecret } = getConfig();
    const hasJwt = Boolean(jwtSecret && String(jwtSecret).trim().length >= 16);
    const hasFirebaseAdmin = isFirebaseAdminConfigured();
    if (!hasJwt || !hasFirebaseAdmin) {
      const missing = [];
      if (!hasJwt) missing.push("jwt_secret");
      if (!hasFirebaseAdmin) missing.push("firebase_service_account");
      res.status(503).json({
        error: "Auth not configured",
        missing,
        message:
          "Backend needs (1) JWT_SECRET with at least 16 characters and (2) Firebase Admin credentials: set FIREBASE_SERVICE_ACCOUNT_PATH to your downloaded service account JSON file, or use FIREBASE_SERVICE_ACCOUNT_B64 / FIREBASE_SERVICE_ACCOUNT_JSON. Frontend VITE_FIREBASE_* keys are separate — they only run OTP in the browser; the API verifies tokens with the service account. Restart the API after editing backend/.env.",
      });
      return;
    }

    const idToken = String(req.body?.idToken ?? "").trim();
    if (!idToken) {
      res.status(400).json({ error: "idToken is required" });
      return;
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const phone10 = firebasePhoneTo10(decoded.phone_number);
    if (!phone10) {
      res.status(400).json({ error: "Phone number missing on token" });
      return;
    }
    await assertAuthNotSuspended(phone10);
    const name = req.body?.name != null ? String(req.body.name) : undefined;
    const signup = Boolean(req.body?.signup);

    if (signup) {
      const existing = await User.findOne({ phone: phone10 }).select("_id").lean().exec();
      if (existing) {
        res.status(409).json({ error: "User already exists. Please login instead." });
        return;
      }
    }

    if (signup && (!name || !String(name).trim())) {
      res.status(400).json({ error: "Name is required for sign up" });
      return;
    }

    // For login (not signup), require user to exist in database
    const user = await upsertUserFromFirebase(decoded, { name, loginOnly: !signup });
    await clearOtpVerifyFailures(phone10);

    const token = signUserToken(user);
    res.json({
      token,
      user: {
        id: String(user._id),
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    if (err.code === "AUTH_SUSPENDED") {
      res.status(429).json({
        error: err.message,
        retryAfterSec: err.retryAfterSec ?? 0,
      });
      return;
    }
    if (err.code === "NO_PHONE") {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.code === "USER_NOT_FOUND") {
      res.status(404).json({ error: "No user found" });
      return;
    }
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  const u = req.authUser;
  res.json({
    user: {
      id: String(u._id),
      name: u.name,
      phone: u.phone,
      role: u.role,
    },
  });
});

/** Validate phone format and check if user exists for login */
authRouter.post("/validate-phone", async (req, res) => {
  try {
    const raw = req.body?.phone;
    const mode = req.body?.mode || "login"; // "login" or "signup"
    
    const n = normalizeIndiaPhone10(raw);
    if (!n) {
      res.status(400).json({ ok: false, error: "Invalid phone number" });
      return;
    }
    await assertAuthNotSuspended(n);
    
    // For login, check if user exists in database
    if (mode === "login") {
      const user = await User.findOne({ phone: n }).exec();
      if (!user) {
        res.status(404).json({ ok: false, error: "No user found" });
        return;
      }
    } else if (mode === "signup") {
      const existing = await User.findOne({ phone: n }).select("_id").lean().exec();
      if (existing) {
        res.status(409).json({
          ok: false,
          error: "User already exists. Please login instead.",
        });
        return;
      }
    }
    await registerOtpSendAttempt(n);
    
    res.json({ ok: true, phone: n });
  } catch (err) {
    if (err.code === "AUTH_SUSPENDED") {
      res.status(429).json({
        ok: false,
        error: err.message,
        retryAfterSec: err.retryAfterSec ?? 0,
      });
      return;
    }
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

authRouter.post("/otp-failure", async (req, res) => {
  try {
    const n = normalizeIndiaPhone10(req.body?.phone);
    if (!n) {
      res.status(400).json({ ok: false, error: "Invalid phone number" });
      return;
    }
    await registerOtpVerifyFailure(n);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === "AUTH_SUSPENDED") {
      res.status(429).json({
        ok: false,
        error: err.message,
        retryAfterSec: err.retryAfterSec ?? 0,
      });
      return;
    }
    res.status(500).json({ ok: false, error: "Server error" });
  }
});
