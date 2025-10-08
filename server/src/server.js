import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, sequelize } from "./config/db.js";
import authRouter from "./routes/auth.js";
import readingsRouter from "./routes/readings.js";
import { seedMedicationCatalog } from "./jobs/seedmeds.js";
import medsRouter from "./routes/meds.js";
import medsPublic from "./routes/medsPublic.js";
import userMeds from "./routes/userMeds.js";
import { auth } from "./middleware/auth.js";
import aiRouter from "./routes/ai.js";

// ✅ Load .env if it exists, otherwise use defaults
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// ✅ Default fallback values if .env missing
process.env.PORT ??= 5000;
process.env.JWT_SECRET ??= "local_dev_secret_12345";
process.env.SMTP_HOST ??= "smtp.gmail.com";
process.env.SMTP_PORT ??= "587";
process.env.SMTP_SECURE ??= "0";

// =============================================
// Main App Setup
// =============================================
const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// =============================================
// Health Route
// =============================================
app.get("/api/health", (_, res) => res.json({ ok: true }));

// =============================================
// Routes
// =============================================
app.use("/api/auth", authRouter);
app.use("/api/readings", readingsRouter);
app.use("/api", medsPublic);
app.use("/api", medsRouter); // no auth
app.use("/api", auth, userMeds);
app.use("/api", auth, medsRouter);
app.use("/api", aiRouter);

// =============================================
// Database + Seed + Server Start
// =============================================
async function start() {
  await connectDB();
  await sequelize.sync(); // { alter: true } while iterating
  await seedMedicationCatalog();
console.log("OPENAI key?", !!process.env.OPENAI_API_KEY);

  const port = process.env.PORT;
  app.listen(port, () =>
    console.log(`✅ Server running on http://localhost:${port}`)
  );
}

start();
