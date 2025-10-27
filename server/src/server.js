// server/src/server.js
import app from "./app.js"; // ✅ Use the configured Express app from app.js
import { connectDB, sequelize } from "./config/db.js";
import { seedMedicationCatalog } from "./jobs/seedmeds.js";
import { startMedReminderJob } from "./jobs/medReminder.js";

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// ✅ Set sensible defaults for local development
process.env.PORT ??= 5000;
process.env.JWT_SECRET ??= "local_dev_secret_12345";

async function start() {
  try {
    // ✅ Connect database and sync models
    await connectDB();
    await sequelize.sync(); // Use { alter: true } if needed
    await seedMedicationCatalog();

    // ✅ Start the medication reminder cron job
    startMedReminderJob();

    console.log("OPENAI key?", !!process.env.OPENAI_API_KEY);

    // ✅ Start the Express server
    const port = Number(process.env.PORT) || 5000;
    app.listen(port, () => {
      console.log(`✅ Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

// ✅ Run the start function
start();
