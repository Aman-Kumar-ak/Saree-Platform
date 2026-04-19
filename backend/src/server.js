import "dotenv/config";
import cors from "cors";
import express from "express";
import { getConfig } from "./config/env.js";
import { connectDb, isDbConnected } from "./config/db.js";
import { isFirebaseAdminConfigured } from "./config/firebaseAdmin.js";
import { requireDb } from "./middleware/requireDb.js";
import { adminRouter } from "./routes/admin/index.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { ordersRouter } from "./routes/orders.js";
import { productsRouter } from "./routes/products.js";
import { userRouter } from "./routes/user.js";
import addressesRouter from "./routes/addresses.js";

const cfg = getConfig();
const app = express();

app.use(cors({ origin: cfg.corsOrigin, credentials: true }));
app.use(express.json());

function sendHealthJson(_req, res) {
  const body = { ok: true, running: true, db: isDbConnected() };
  if (cfg.apiServiceName) {
    body.service = cfg.apiServiceName;
  }
  res.json(body);
}

function sendPingText(_req, res) {
  res.type("text/plain").send("ok running");
}

app.get("/api/health", sendHealthJson);
app.get("/healthz", sendPingText);
app.get("/api/ping", sendPingText);
app.get("/", sendPingText);

app.use("/api/auth", requireDb, authRouter);
app.use("/api/categories", requireDb, categoriesRouter);
app.use("/api/products", requireDb, productsRouter);
app.use("/api/orders", requireDb, ordersRouter);
app.use("/api/user", requireDb, userRouter);
app.use("/api/addresses", requireDb, addressesRouter);
app.use("/api/admin", requireDb, adminRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function main() {
  const connected = await connectDb();
  if (!connected) {
    console.warn(
      "MONGODB_URI not set or empty; API runs without database (set backend/.env to enable)."
    );
  }

  const { port, host } = getConfig();
  const onListen = () => {
    console.log(`API listening on port ${port}${host ? ` (host ${host})` : ""}`);
    
    // Verification check for Firebase and Database
    const firebaseConfigured = isFirebaseAdminConfigured();
    const dbConnected = isDbConnected();
    
    if (firebaseConfigured && dbConnected) {
      console.log("✅ firebase running, database is connected");
    } else {
      const status = [];
      if (firebaseConfigured) status.push("firebase running");
      else status.push("firebase not configured");
      if (dbConnected) status.push("database connected");
      else status.push("database not connected");
      console.log(`⚠️  ${status.join(", ")}`);
    }
  };
  if (host) {
    app.listen(port, host, onListen);
  } else {
    app.listen(port, onListen);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
