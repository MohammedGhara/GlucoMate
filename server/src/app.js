// server/src/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import testInventoryRouter from "./routes/__test_inventory__.js"; // ⬅ add this line

import adminLogsRouter from "./routes/adminLogs.js";
import authRouter from "./routes/auth.js";
import { auth, maybeAttachUser } from "./middleware/auth.js";
import medsRouter from "./routes/meds.js";
import medsPublic from "./routes/medsPublic.js";
import userMeds from "./routes/userMeds.js";
import aiRouter from "./routes/ai.js";
import readingsRouter from "./routes/readings.js";
import testEmailRoutes from "./routes/testEmail.js";
import { requireAdmin } from "./middleware/roles.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// sensible defaults for local dev (also fine in tests)
process.env.PORT ??= 5000;
process.env.JWT_SECRET ??= "local_dev_secret_12345";

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());


if (process.env.NODE_ENV === "test") {
  app.use("/api", testInventoryRouter);
}

// Attach req.user when a valid Bearer token is present (non-blocking)
app.use(maybeAttachUser);


// health
app.get("/api/health", (_, res) => res.json({ ok: true }));

// auth routes (login/register/me)
app.use("/api/auth", authRouter);

// protected readings API
app.use("/api/readings", auth, readingsRouter);

// public & protected meds routes
app.use("/api", medsPublic);         // public browsing
app.use("/api", medsRouter);         // (if you have mixed public routes here)
app.use("/api", auth, userMeds);     // user's own meds

// ai
app.use("/api", aiRouter);

// test email (require auth)
app.use("/api", auth, testEmailRoutes);

 app.use("/api/admin", auth, requireAdmin, adminLogsRouter);
export default app;
