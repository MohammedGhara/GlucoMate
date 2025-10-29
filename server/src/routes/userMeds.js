// server/src/routes/userMeds.js
import { Router } from "express";
import { db } from "../config/db.js";
import { logAudit } from "../utils/audit.js";

const r = Router();

/* --------------------------------- helpers -------------------------------- */

function toHHMM(x = "") {
  // Accepts "H:MM", "HH:MM", "h:mm am/pm", "hh:mm PM" → returns "HH:MM" (24h)
  const s = String(x).trim();
  if (!s) return "";

  // 24h "HH:MM"
  let m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m) {
    let H = Math.max(0, Math.min(23, Number(m[1])));
    let M = Math.max(0, Math.min(59, Number(m[2])));
    return `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`;
  }

  // 12h "HH:MM AM/PM"
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
  const clean = arr.map(toHHMM).filter(Boolean);
  return Array.from(new Set(clean)).sort(); // unique + sorted
}

function readUserMedWithTimes(id) {
  const row = db
    .prepare(`SELECT * FROM user_medications WHERE id = ?`)
    .get(id);
  if (!row) return null;

  const times = db
    .prepare(
      `SELECT id, user_med_id, time_24h 
       FROM user_medication_times 
       WHERE user_med_id = ? 
       ORDER BY time_24h`
    )
    .all(id)
    .map((t) => t.time_24h);

  return { ...row, times };
}

/* ---------------------------------- routes --------------------------------- */

/** POST /api/user-meds
 * Upsert by (user_id, medication_id).
 * Body: { medication_id, dose, times? }
 */
r.post("/user-meds", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: "Login required" });

  const { medication_id, dose, times } = req.body || {};
  const cleanDose = String(dose ?? "").trim();
  if (!medication_id || !cleanDose) {
    return res.status(400).json({ msg: "medication_id and dose are required" });
  }

  // make sure medication exists (and get name for emails/logs)
  const med = db
    .prepare(`SELECT id, generic_name FROM medications WHERE id = ?`)
    .get(medication_id);
  if (!med) return res.status(404).json({ msg: "Medication not found" });

  // user email for schedulers/exports
  const u = db.prepare(`SELECT email FROM users WHERE id = ?`).get(userId);
  const userEmail = u?.email || "";

  // Upsert & keep helper columns fresh
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
  const um = db
    .prepare(
      `SELECT id FROM user_medications WHERE user_id = ? AND medication_id = ?`
    )
    .get(userId, medication_id);

  // set times (replace)
  if (Array.isArray(times)) {
    const nextTimes = normalizeTimes(times);
    db.prepare(`DELETE FROM user_medication_times WHERE user_med_id = ?`).run(
      um.id
    );
    const ins = db.prepare(
      `INSERT INTO user_medication_times (user_med_id, time_24h) VALUES (?, ?)`
    );
    const tx = db.transaction((arr) => arr.forEach((t) => ins.run(um.id, t)));
    tx(nextTimes);
  }

  // Audit (new_value only — this is an upsert)
  try {
    await logAudit(req, {
      action: "user_meds.add",
      entity_type: "UserMedication",
      entity_id: um.id,
      new_value: {
        user_id: userId,
        medication_id,
        dose: cleanDose,
        times: Array.isArray(times) ? normalizeTimes(times) : undefined,
      },
    });
  } catch (e) {
    // don't fail request if audit write fails
    console.warn("audit log failed (add):", e?.message || e);
  }

  return res.json({ ok: true, user_med_id: um.id });
});

/** GET /api/user-meds
 * Returns active meds + times for current user
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
        um.user_email,
        um.medication_name,
        m.id             AS medication_id,
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
  const byMed = times.reduce(
    (a, t) => ((a[t.user_med_id] ??= []).push(t), a),
    {}
  );

  return res.json(
    meds.map((m) => ({ ...m, times: byMed[m.user_med_id] || [] }))
  );
});

/** PATCH /api/user-meds/:id
 * Body: { dose?, instructions?, times?, is_active? }
 */
r.patch("/user-meds/:id", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: "Login required" });

  const id = Number(req.params.id);
  const row = db
    .prepare(`SELECT * FROM user_medications WHERE id = ? AND user_id = ?`)
    .get(id, userId);
  if (!row) return res.status(404).json({ msg: "Not found" });

  const oldFull = readUserMedWithTimes(id);

  const dose = req.body.dose ?? row.dose ?? "";
  const instructions = req.body.instructions ?? row.instructions ?? "";
  const is_active =
    req.body.is_active != null ? (req.body.is_active ? 1 : 0) : row.is_active;

  // refresh helper columns (user_email + medication_name)
  const u = db.prepare(`SELECT email FROM users WHERE id = ?`).get(userId);
  const med = db
    .prepare(
      `SELECT m.generic_name 
         FROM medications m 
         JOIN user_medications um ON um.medication_id = m.id 
        WHERE um.id = ?`
    )
    .get(id);

  db.prepare(
    `UPDATE user_medications 
       SET dose = ?, instructions = ?, is_active = ?, 
           user_email = ?, medication_name = ?
     WHERE id = ?`
  ).run(
    String(dose),
    String(instructions),
    is_active,
    u?.email || "",
    med?.generic_name || row.medication_name || "",
    id
  );

  let nextTimesNormalized;
  if (Array.isArray(req.body.times)) {
    nextTimesNormalized = normalizeTimes(req.body.times);
    db.prepare(`DELETE FROM user_medication_times WHERE user_med_id = ?`).run(
      id
    );
    const ins = db.prepare(
      `INSERT INTO user_medication_times (user_med_id, time_24h) VALUES (?, ?)`
    );
    const tx = db.transaction((arr) => arr.forEach((t) => ins.run(id, t)));
    tx(nextTimesNormalized);
  }

  // Audit (old_value + new_value)
  try {
    await logAudit(req, {
      action: "user_meds.update",
      entity_type: "UserMedication",
      entity_id: id,
      old_value: oldFull,
      new_value: {
        dose: String(dose),
        instructions: String(instructions),
        is_active,
        times: nextTimesNormalized ?? oldFull.times,
      },
    });
  } catch (e) {
    console.warn("audit log failed (update):", e?.message || e);
  }

  return res.json({ ok: true });
});

/** DELETE /api/user-meds/:id  (soft delete) */
r.delete("/user-meds/:id", async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: "Login required" });

  const id = Number(req.params.id);
  const existing = db
    .prepare(`SELECT * FROM user_medications WHERE id = ? AND user_id = ?`)
    .get(id, userId);
  if (!existing) return res.status(404).json({ msg: "Not found" });

  const oldFull = readUserMedWithTimes(id);

  db.prepare(
    `UPDATE user_medications SET is_active = 0 WHERE id = ? AND user_id = ?`
  ).run(id, userId);

  // Audit (old_value only; deletion is soft)
  try {
    await logAudit(req, {
      action: "user_meds.remove",
      entity_type: "UserMedication",
      entity_id: id,
      old_value: oldFull,
    });
  } catch (e) {
    console.warn("audit log failed (remove):", e?.message || e);
  }

  return res.json({ ok: true });
});

export default r;
