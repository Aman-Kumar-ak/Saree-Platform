import { Router } from "express";
import { isFirebaseAdminConfigured, verifyFirebaseIdToken } from "../config/firebaseAdmin.js";
import { normalizeIndiaPhone10 } from "../lib/phone.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getConfig } from "../config/env.js";
import { signUserToken } from "../services/authJwt.js";
import { upsertUserFromFirebase } from "../services/upsertUserFromFirebase.js";

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
    const name = req.body?.name != null ? String(req.body.name) : undefined;
    const signup = Boolean(req.body?.signup);

    if (signup && (!name || !String(name).trim())) {
      res.status(400).json({ error: "Name is required for sign up" });
      return;
    }

    const user = await upsertUserFromFirebase(decoded, { name });

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
    if (err.code === "NO_PHONE") {
      res.status(400).json({ error: err.message });
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

/** Optional: validate phone format before sending OTP (client-side does too). */
authRouter.post("/validate-phone", (req, res) => {
  const raw = req.body?.phone;
  const n = normalizeIndiaPhone10(raw);
  if (!n) {
    res.status(400).json({ ok: false, error: "Invalid phone number" });
    return;
  }
  res.json({ ok: true, phone: n });
});
