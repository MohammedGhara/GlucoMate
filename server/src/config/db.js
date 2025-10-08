// server/src/config/db.js
import { Sequelize } from "sequelize";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use ONE absolute path for both clients
export const DB_FILE = path.join(__dirname, "../../gluco_mate.db");

// --- better-sqlite3 (sync) ---
export const db = new Database(DB_FILE, { fileMustExist: false });

// Pragmas for reliability
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

// --- Sequelize (async ORM) ---
export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_FILE,
  logging: false,
});

// Schema (idempotent)
const INIT_SQL = `
CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generic_name  TEXT NOT NULL,
  brand_name    TEXT,
  form          TEXT,
  strength      TEXT,
  class         TEXT,
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS user_medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  medication_id INTEGER NOT NULL,
  dose          TEXT,
  instructions  TEXT,
  start_date    DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active     INTEGER DEFAULT 1,
  UNIQUE(user_id, medication_id)
);

CREATE TABLE IF NOT EXISTS user_medication_times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_med_id   INTEGER NOT NULL,
  time_24h      TEXT NOT NULL
);
-- existing tables (medications, user_medications, user_medication_times, ...)

CREATE TABLE IF NOT EXISTS email_reminder_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_med_id   INTEGER NOT NULL,
  sent_date     TEXT    NOT NULL,  -- YYYY-MM-DD (user/server local date)
  time_24h      TEXT    NOT NULL,  -- 'HH:MM'
  sent_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_med_id, sent_date, time_24h)
);

CREATE INDEX IF NOT EXISTS idx_rem_log_daily ON email_reminder_log(sent_date, time_24h);
CREATE INDEX IF NOT EXISTS idx_um_user ON user_medications(user_id);
CREATE INDEX IF NOT EXISTS idx_um_med  ON user_medications(medication_id);
CREATE INDEX IF NOT EXISTS idx_umt_med ON user_medication_times(user_med_id);
`;
db.exec(INIT_SQL);
function ensureUserEmailColumn() {
  const cols = db.prepare(`PRAGMA table_info(user_medications)`).all();
  const hasUserEmail = cols.some(c => c.name === "user_email");
  if (!hasUserEmail) {
    db.exec(`ALTER TABLE user_medications ADD COLUMN user_email TEXT`);
  }
}
ensureUserEmailColumn();
function ensureMedicationNameColumn() {
  const cols = db.prepare(`PRAGMA table_info(user_medications)`).all();
  const hasMedName = cols.some(c => c.name === "medication_name");
  if (!hasMedName) {
    db.exec(`ALTER TABLE user_medications ADD COLUMN medication_name TEXT`);
    console.log("✅ Added medication_name column to user_medications");
  }
}
ensureMedicationNameColumn();

export async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ SQLite connected successfully:", DB_FILE);
  } catch (error) {
    console.error("❌ Database connection error:", error);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  try { db.close(); } catch {}
  try { sequelize.close(); } catch {}
  process.exit(0);
});
