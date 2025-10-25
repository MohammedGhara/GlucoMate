import { Router } from "express";
import { db } from "../config/db.js";

const r = Router();

/* ---------- helpers ---------- */
function toHHMM(x = "") {
  // Accepts "H:MM", "HH:MM", "h:mm am/pm", etc. → returns "HH:MM"
  const s = String(x).trim();
  if (!s) return "";
  // Try 24h "HH:MM"
  let m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m) {
    let H = Math.max(0, Math.min(23, Number(m[1])));
    let M = Math.max(0, Math.min(59, Number(m[2])));
    return `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`;
  }
  // Try 12h "HH:MM AM/PM"
  m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/.exec(s);
  if (m) {
    let h = Number(m[1]) % 12;
    const M = Math.max(0, Math.min(59, Number(m[2])));
    const am = m[3].toUpperCase() === "AM";
    const H = am ? h : h + 12;
    return `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`;
  }
  return "";
}
function normalizeTimes(arr = []) {
  const clean = arr
    .map(toHHMM)
    .filter(Boolean);
  return Array.from(new Set(clean)).sort(); // unique + sorted
}

/** POST /api/user-meds  { medication_id, dose, times? }
 *  Upsert by (user_id, medication_id). Optionally sets reminder times.
 */
r.post("/user-meds", (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: "Login required" });

  const { medication_id, dose, times } = req.body || {};
  const cleanDose = String(dose ?? "").trim();
  if (!medication_id || !cleanDose) {
    return res.status(400).json({ msg: "medication_id and dose are required" });
  }

  // ensure med + get friendly name for emails
  const med = db
    .prepare(`SELECT id, generic_name FROM medications WHERE id = ?`)
    .get(medication_id);
  if (!med) return res.status(404).json({ msg: "Medication not found" });

  // get user's email for emails
  const u = db.prepare(`SELECT email FROM users WHERE id = ?`).get(userId);
  const userEmail = u?.email || "";

  // upsert + persist user_email & medication_name (scheduler reads these)
  db.prepare(`
    INSERT INTO user_medications (user_id, medication_id, dose, is_active, user_email, medication_name)
    VALUES (?, ?, ?, 1, ?, ?)
    ON CONFLICT(user_id, medication_id) DO UPDATE SET
      dose = excluded.dose,
      is_active = 1,
      user_email = excluded.user_email,
      medication_name = excluded.medication_name
  `).run(userId, medication_id, cleanDose, userEmail, med.generic_name);

  // fetch id
  const row = db.prepare(
    `SELECT id FROM user_medications WHERE user_id = ? AND medication_id = ?`
  ).get(userId, medication_id);

  // set times
  if (Array.isArray(times)) {
    const nextTimes = normalizeTimes(times);
    db.prepare(`DELETE FROM user_medication_times WHERE user_med_id = ?`).run(row.id);
    const ins = db.prepare(
      `INSERT INTO user_medication_times (user_med_id, time_24h) VALUES (?, ?)`
    );
    const tx = db.transaction((arr) => arr.forEach((t) => ins.run(row.id, t)));
    tx(nextTimes);
  }

  res.json({ ok: true, user_med_id: row.id });
});

/** GET /api/user-meds
 *  Returns active meds + times for logged-in user
 */
r.get("/user-meds", (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: "Login required" });

  const meds = db
    .prepare(
      `
    SELECT 
      um.id            AS user_med_id,
      um.user_id,
      um.user_email,               -- persisted for reminders
      um.medication_name,          -- persisted for reminders
      m.id            AS medication_id,
      m.generic_name,
      m.brand_name,
      m.form,
      m.strength,
      um.dose,
      um.instructions,
      um.is_active
    FROM user_medications um
    JOIN medications m ON m.id = um.medication_id
    WHERE um.user_id = ? AND um.is_active = 1
    ORDER BY m.generic_name
  `
    )
    .all(userId);

  const ids = meds.map((m) => m.user_med_id);
  let times = [];
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    times = db
      .prepare(
        `
      SELECT id, user_med_id, time_24h
      FROM user_medication_times
      WHERE user_med_id IN (${placeholders})
      ORDER BY time_24h
    `
      )
      .all(...ids);
  }
  const byMed = times.reduce((a, t) => ((a[t.user_med_id] ??= []).push(t), a), {});
  res.json(meds.map((m) => ({ ...m, times: byMed[m.user_med_id] || [] })));
});

/** PATCH /api/user-meds/:id  { dose?, instructions?, times?, is_active? } */
r.patch("/user-meds/:id", (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: "Login required" });

  const id = Number(req.params.id);
  const row = db.prepare(`SELECT * FROM user_medications WHERE id = ? AND user_id = ?`).get(id, userId);
  if (!row) return res.status(404).json({ msg: "Not found" });

  const dose = req.body.dose ?? row.dose ?? "";
  const instructions = req.body.instructions ?? row.instructions ?? "";
  const is_active = req.body.is_active != null ? (req.body.is_active ? 1 : 0) : row.is_active;

  // keep user_email & medication_name fresh (in case user/med changed)
  const u = db.prepare(`SELECT email FROM users WHERE id = ?`).get(userId);
  const med = db
    .prepare(
      `SELECT m.generic_name FROM medications m JOIN user_medications um ON um.medication_id = m.id WHERE um.id = ?`
    )
    .get(id);

  db.prepare(
    `UPDATE user_medications 
     SET dose = ?, instructions = ?, is_active = ?, 
         user_email = ?, medication_name = ?
     WHERE id = ?`
  ).run(String(dose), String(instructions), is_active, u?.email || "", med?.generic_name || row.medication_name || "", id);

  if (Array.isArray(req.body.times)) {
    const nextTimes = normalizeTimes(req.body.times);
    db.prepare(`DELETE FROM user_medication_times WHERE user_med_id = ?`).run(id);
    const ins = db.prepare(
      `INSERT INTO user_medication_times (user_med_id, time_24h) VALUES (?, ?)`
    );
    const tx = db.transaction((arr) => arr.forEach((t) => ins.run(id, t)));
    tx(nextTimes);
  }

  res.json({ ok: true });
});

/** DELETE /api/user-meds/:id  (soft delete) */
r.delete("/user-meds/:id", (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: "Login required" });

  const id = Number(req.params.id);
  db.prepare(`UPDATE user_medications SET is_active = 0 WHERE id = ? AND user_id = ?`).run(id, userId);
  res.json({ ok: true });
});

export default r;
