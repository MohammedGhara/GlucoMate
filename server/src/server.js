// server/src/server.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import adminLogsRouter from "./routes/adminLogs.js";
import meExportRouter from "./routes/meExport.js";
import { auth } from "./middleware/auth.js";
import { requireAdmin } from "./middleware/roles.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import app from "./app.js"; // your configured Express app (routes, middleware, etc.)
import { connectDB, sequelize } from "./config/db.js";
import { seedMedicationCatalog } from "./jobs/seedmeds.js";
import { startMedReminderJob } from "./jobs/medReminder.js";

// Sensible defaults for local dev
process.env.PORT ??= 5000;
process.env.JWT_SECRET ??= "local_dev_secret_12345";

async function start() {
  try {
    // 1) Connect DB, ensure base schema, ensure admin
    await connectDB();

    // 2) Sync Sequelize models (if you have any defined via sequelize.define / models/*)
    //    Use { alter: true } once if you need to evolve tables managed by Sequelize.
    await sequelize.sync();

    // 3) Seed medication catalog (idempotent)
    await seedMedicationCatalog();

    // 4) Start cron jobs (idempotent)
    startMedReminderJob();

    console.log("OPENAI key?", !!process.env.OPENAI_API_KEY);

    // 5) Start HTTP server
    const port = Number(process.env.PORT) || 5000;
    app.listen(port, () => {
      console.log(`✅ Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();
