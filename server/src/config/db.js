// server/src/config/db.js
import { Sequelize } from "sequelize";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

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

// ---------- Base schema (idempotent; better-sqlite3) ----------
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

CREATE TABLE IF NOT EXISTS email_reminder_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_med_id   INTEGER NOT NULL,
  sent_date     TEXT    NOT NULL,  -- YYYY-MM-DD (user/server local date)
  time_24h      TEXT    NOT NULL,  -- 'HH:MM'
  sent_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_med_id, sent_date, time_24h)
);

CREATE TABLE IF NOT EXISTS glucose_alert_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL,
  glucose   REAL    NOT NULL,
  kind      TEXT    NOT NULL,          -- 'high' | 'low'
  reading_at DATETIME,
  sent_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Part 11: audit trail (append-only, hashed chain optional via prev_hash/hash)
CREATE TABLE IF NOT EXISTS audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  user_id      INTEGER,
  user_email   TEXT,
  user_role    TEXT,
  ip_address   TEXT,
  action       TEXT NOT NULL,      -- e.g. 'auth.login', 'reading.create'
  entity_type  TEXT,               -- e.g. 'User','Reading','Medication'
  entity_id    TEXT,
  old_value    TEXT,               -- JSON string
  new_value    TEXT,               -- JSON string
  details      TEXT,               -- JSON string
  prev_hash    TEXT,
  hash         TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_log(user_email);

CREATE INDEX IF NOT EXISTS idx_gal_user ON glucose_alert_log(user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_rem_log_daily ON email_reminder_log(sent_date, time_24h);
CREATE INDEX IF NOT EXISTS idx_um_user ON user_medications(user_id);
CREATE INDEX IF NOT EXISTS idx_um_med  ON user_medications(medication_id);
CREATE INDEX IF NOT EXISTS idx_umt_med ON user_medication_times(user_med_id);
`;
db.exec(INIT_SQL);

// Columns added later (safe if re-run)
function ensureUserEmailColumn() {
  const cols = db.prepare(`PRAGMA table_info(user_medications)`).all();
  if (!cols.some(c => c.name === "user_email")) {
    db.exec(`ALTER TABLE user_medications ADD COLUMN user_email TEXT`);
  }
}
function ensureMedicationNameColumn() {
  const cols = db.prepare(`PRAGMA table_info(user_medications)`).all();
  if (!cols.some(c => c.name === "medication_name")) {
    db.exec(`ALTER TABLE user_medications ADD COLUMN medication_name TEXT`);
    console.log("✅ Added medication_name column to user_medications");
  }
}
ensureUserEmailColumn();
ensureMedicationNameColumn();

// --- Ensure users table exists (idempotent) ---
function ensureUsersTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'patient',
      createdAt  TEXT DEFAULT (datetime('now')),
      updatedAt  TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);
  `);
}

// --- Seed an admin user on boot (idempotent) ---
async function seedAdmin() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gluco-mate.local";
  const ADMIN_PASS  = process.env.ADMIN_PASSWORD || "admin1234";
  const ADMIN_NAME  = process.env.ADMIN_NAME || "Admin";

  const existing = db.prepare(`SELECT id, role FROM users WHERE email = ?`).get(ADMIN_EMAIL);

  const now = new Date().toISOString(); // ISO string is OK for TEXT columns

  if (!existing) {
    const hash = await bcrypt.hash(ADMIN_PASS, 10);

    // ⬇️ include createdAt & updatedAt to satisfy NOT NULL
    const info = db
      .prepare(`
        INSERT INTO users (name, email, password, role, createdAt, updatedAt)
        VALUES (?, ?, ?, 'admin', ?, ?)
      `)
      .run(ADMIN_NAME, ADMIN_EMAIL, hash, now, now);

    // audit
    db.prepare(`
      INSERT INTO audit_log (created_at, user_id, user_email, user_role, ip_address, action, entity_type, entity_id, details)
      VALUES (datetime('now'), NULL, ?, 'system', '127.0.0.1', 'seed.admin.create', 'User', ?, json(?))
    `).run(
      ADMIN_EMAIL,
      String(info.lastInsertRowid),
      JSON.stringify({ email: ADMIN_EMAIL, name: ADMIN_NAME })
    );

    console.log(`✅ Seeded admin: ${ADMIN_EMAIL} / (password set via env ADMIN_PASSWORD)`);
    return;
  }

  if (existing.role !== "admin") {
    // ⬇️ also keep updatedAt valid
    db.prepare(`
      UPDATE users
         SET role = 'admin',
             updatedAt = ?
       WHERE id = ?
    `).run(now, existing.id);

    db.prepare(`
      INSERT INTO audit_log (created_at, user_id, user_email, user_role, ip_address, action, entity_type, entity_id, details)
      VALUES (datetime('now'), ?, ?, 'system', '127.0.0.1', 'seed.admin.promote', 'User', ?, json(?))
    `).run(
      existing.id,
      ADMIN_EMAIL,
      String(existing.id),
      JSON.stringify({ promotedTo: "admin" })
    );

    console.log(`🔼 Promoted existing user to admin: ${ADMIN_EMAIL}`);
  }
}

// --- Public: connect & ensure everything, then seed admin ---
export async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ SQLite connected successfully:", DB_FILE);

    // Ensure dependent tables exist, then seed admin
    ensureUsersTable();
    await seedAdmin();
  } catch (error) {
    console.error("❌ Database connection error:", error);
    throw error;
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  try { db.close(); } catch {}
  try { sequelize.close(); } catch {}
  process.exit(0);
});
