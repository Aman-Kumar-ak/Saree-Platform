import { isDbConnected } from "../config/db.js";

export function requireDb(_req, res, next) {
  if (!isDbConnected()) {
    res.status(503).json({
      error: "Database unavailable",
      message: "Set MONGODB_URI in backend/.env and restart the API.",
    });
    return;
  }
  next();
}
