// server/src/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, sequelize } from "./config/db.js";

import authRouter from "./routes/auth.js";
import { seedMedicationCatalog } from "./jobs/seedmeds.js";
import medsRouter from "./routes/meds.js";
import medsPublic from "./routes/medsPublic.js";
import userMeds from "./routes/userMeds.js";
import { auth, maybeAttachUser } from "./middleware/auth.js";
import aiRouter from "./routes/ai.js";
import readingsRouter from "./routes/readings.js";
import testEmailRoutes from "./routes/testEmail.js";
import { startMedReminderJob } from "./jobs/medReminder.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// sensible defaults for local dev
process.env.PORT ??= 5000;
process.env.JWT_SECRET ??= "local_dev_secret_12345";

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Attach req.user when a valid Bearer token is present (non-blocking)
app.use(maybeAttachUser);

// health
app.get("/api/health", (_, res) => res.json({ ok: true }));

// auth routes (login/register/me)
app.use("/api/auth", authRouter);

// protected readings API
app.use("/api/readings", auth, readingsRouter);

// public & protected meds routes
app.use("/api", medsPublic);        // public browsing
app.use("/api", medsRouter);        // if you have public endpoints here
app.use("/api", auth, userMeds);    // user's own meds

// ai (leave as you had it)
app.use("/api", aiRouter);

// test email endpoint (require auth)
app.use("/api", auth, testEmailRoutes);

async function start() {
  await connectDB();
  await sequelize.sync();      // { alter: true } if you’re iterating schemas
  await seedMedicationCatalog();

  // 🔔 Start the every-minute medication reminder job
  startMedReminderJob();

  console.log("OPENAI key?", !!process.env.OPENAI_API_KEY);
  const port = Number(process.env.PORT);
  app.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
  });
}

start();
