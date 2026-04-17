/**
 * Prints a single FIREBASE_SERVICE_ACCOUNT_JSON=... line for pasting into backend/.env.
 * Usage (from backend folder):
 *   node src/scripts/printFirebaseEnvJson.js "..\saree-platform-2026-firebase-adminsdk-fbsvc-696e4ae7f5.json"
 * Then copy the output into backend/.env (one line, no quotes around the value).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const arg = process.argv[2];
if (!arg) {
  console.error(
    "Usage: node src/scripts/printFirebaseEnvJson.js <path-to-service-account.json>"
  );
  process.exit(1);
}

const abs = resolve(process.cwd(), arg);
const raw = readFileSync(abs, "utf8");
const obj = JSON.parse(raw);
const oneLine = JSON.stringify(obj);
process.stdout.write(`FIREBASE_SERVICE_ACCOUNT_JSON=${oneLine}\n`);
