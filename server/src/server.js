import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB, sequelize } from "./config/db.js";
import authRouter from "./routes/auth.js";
import readingsRouter from "./routes/readings.js";
import { seedMedicationCatalog } from "./jobs/seedmeds.js";
seedMedicationCatalog();
import medsRouter from "./routes/meds.js";
import medsPublic from "./routes/medsPublic.js";
import userMeds from "./routes/userMeds.js";
import { auth } from "./middleware/auth.js";

dotenv.config();
const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/readings", readingsRouter);

app.use("/api", medsPublic);

app.use("/api", medsRouter); // no auth

app.use("/api", auth, userMeds);
app.use("/api", auth, medsRouter);
app.get("/api/health", (_req, res) => res.json({ ok: true }));

async function start() {
  await connectDB();
  await sequelize.sync(); // { alter: true } while iterating
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log("Server http://localhost:" + port));
}
start();
