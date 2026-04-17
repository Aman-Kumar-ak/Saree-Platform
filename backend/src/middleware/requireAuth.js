import { getConfig } from "../config/env.js";
import { verifyUserToken } from "../services/authJwt.js";
import { User } from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const { jwtSecret } = getConfig();
    if (!jwtSecret) {
      res.status(503).json({
        error: "Auth not configured",
        message: "Set JWT_SECRET in backend/.env",
      });
      return;
    }
    const h = req.headers.authorization;
    const token =
      typeof h === "string" && h.startsWith("Bearer ") ? h.slice(7).trim() : null;
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const payload = verifyUserToken(token);
    const user = await User.findById(payload.sub).lean().exec();
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.authUser = user;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.authUser || req.authUser.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
