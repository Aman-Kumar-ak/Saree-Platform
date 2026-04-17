import jwt from "jsonwebtoken";
import { getConfig } from "../config/env.js";

export function signUserToken(user) {
  const { jwtSecret, jwtExpiresIn } = getConfig();
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

export function verifyUserToken(token) {
  const { jwtSecret } = getConfig();
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.verify(token, jwtSecret);
}
