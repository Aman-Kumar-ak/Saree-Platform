import admin from "firebase-admin";
import { getConfig } from "./env.js";

let initialized = false;

/**
 * True only if a service account JSON was actually loaded (env path may be wrong).
 */
export function isFirebaseAdminConfigured() {
  try {
    const json = getConfig().firebaseServiceAccountJson;
    return Boolean(json && String(json).trim());
  } catch {
    return false;
  }
}

function ensureInit() {
  if (initialized) return;
  const json = getConfig().firebaseServiceAccountJson;
  if (!json) {
    throw new Error("Firebase Admin is not configured");
  }
  const cred = JSON.parse(json);
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(cred),
    });
  }
  initialized = true;
}

export async function verifyFirebaseIdToken(idToken) {
  ensureInit();
  return admin.auth().verifyIdToken(idToken);
}
