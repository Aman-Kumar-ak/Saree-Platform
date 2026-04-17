/**
 * One-off: verify MONGODB_URI from backend/.env connects. Does not print secrets.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDb, isDbConnected } from "../config/db.js";

async function main() {
  const ok = await connectDb();
  if (!ok) {
    console.error("FAIL: MONGODB_URI missing or empty in backend/.env");
    process.exit(1);
  }
  if (!isDbConnected()) {
    console.error("FAIL: Connection did not reach ready state");
    process.exit(1);
  }
  console.log("OK: MongoDB connected");
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
