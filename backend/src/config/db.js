import dns from "node:dns";
import mongoose from "mongoose";
import { getConfig } from "./env.js";

/**
 * `mongodb+srv` requires DNS SRV lookups. Some networks misconfigure DNS (ECONNREFUSED on querySrv).
 * Use public resolvers by default; set MONGODB_DNS_SERVERS=system to keep OS DNS, or e.g. 8.8.8.8,1.1.1.1.
 */
function applySrvDnsIfNeeded(mongodbUri) {
  if (!mongodbUri.startsWith("mongodb+srv")) {
    return;
  }
  const raw = process.env.MONGODB_DNS_SERVERS;
  if (raw !== undefined && String(raw).trim().toLowerCase() === "system") {
    return;
  }
  const servers =
    raw && String(raw).trim()
      ? String(raw)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : ["8.8.8.8", "1.1.1.1"];
  dns.setServers(servers);
}

/**
 * Connects to MongoDB when MONGODB_URI is set in env. Returns true if connected, false if skipped.
 */
export async function connectDb() {
  const { mongodbUri } = getConfig();
  if (!mongodbUri) {
    return false;
  }
  applySrvDnsIfNeeded(mongodbUri);
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongodbUri);
  return true;
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
