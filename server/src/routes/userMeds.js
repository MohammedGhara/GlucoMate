import { Router } from "express";
import { db } from "../config/db.js";

const r = Router();

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

  // make sure med exists
  const med = db.prepare(`SELECT id FROM medications WHERE id=?`).get(medication_id);
  if (!med) return res.status(404).json({ msg: "Medication not found" });

  // upsert
  db.prepare(`
    INSERT INTO user_medications (user_id, medication_id, dose, is_active)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, medication_id) DO UPDATE SET
      dose=excluded.dose,
      is_active=1
  `).run(userId, medication_id, cleanDose);

  // fetch id
  const row = db.prepare(
    `SELECT id FROM user_medications WHERE user_id=? AND medication_id=?`
  ).get(userId, medication_id);

  if (Array.isArray(times)) {
    db.prepare(`DELETE FROM user_medication_times WHERE user_med_id=?`).run(row.id);
    const stmt = db.prepare(`INSERT INTO user_medication_times (user_med_id, time_24h) VALUES (?, ?)`);
    const tx = db.transaction(arr => arr.forEach(t => t && stmt.run(row.id, t)));
    tx(times);
  }

  res.json({ ok: true, user_med_id: row.id });
});

/** GET /api/user-meds
 *  Returns active meds + times for logged-in user
 */
r.get("/user-meds", (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: "Login required" });

  const meds = db.prepare(`
    SELECT 
      um.id            AS user_med_id,
      um.user_id,
      u.email         AS user_email,
      m.id            AS medication_id,
      m.generic_name,
      m.brand_name,
      m.form,
      m.strength,
      um.dose,
      um.instructions,
      um.is_active
    FROM user_medications um
    JOIN users u       ON u.id = um.user_id
    JOIN medications m ON m.id = um.medication_id
    WHERE um.user_id = ? AND um.is_active = 1
    ORDER BY m.generic_name
  `).all(userId);

  const ids = meds.map(m => m.user_med_id);
  let times = [];
  if (ids.length) {
    const placeholders = ids.map(()=>"?").join(",");
    times = db.prepare(`
      SELECT id, user_med_id, time_24h
      FROM user_medication_times
      WHERE user_med_id IN (${placeholders})
    `).all(...ids);
  }
  const byMed = times.reduce((a, t) => ( (a[t.user_med_id] ??= []).push(t), a ), {});
  res.json(meds.map(m => ({ ...m, times: byMed[m.user_med_id] || [] })));
});

/** PATCH /api/user-meds/:id  { dose?, instructions?, times?, is_active? } */
r.patch("/user-meds/:id", (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: "Login required" });

  const id = Number(req.params.id);
  const row = db.prepare(`SELECT * FROM user_medications WHERE id=? AND user_id=?`).get(id, userId);
  if (!row) return res.status(404).json({ msg: "Not found" });

  const dose = req.body.dose ?? row.dose ?? "";
  const instructions = req.body.instructions ?? row.instructions ?? "";
  const is_active = req.body.is_active != null ? (req.body.is_active ? 1 : 0) : row.is_active;

  db.prepare(`UPDATE user_medications SET dose=?, instructions=?, is_active=? WHERE id=?`)
    .run(String(dose), String(instructions), is_active, id);

  if (Array.isArray(req.body.times)) {
    db.prepare(`DELETE FROM user_medication_times WHERE user_med_id=?`).run(id);
    const stmt = db.prepare(`INSERT INTO user_medication_times (user_med_id, time_24h) VALUES (?, ?)`);
    const tx = db.transaction(arr => arr.forEach(t => t && stmt.run(id, t)));
    tx(req.body.times);
  }

  res.json({ ok: true });
});

/** DELETE /api/user-meds/:id  (soft delete) */
r.delete("/user-meds/:id", (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ msg: "Login required" });

  const id = Number(req.params.id);
  db.prepare(`UPDATE user_medications SET is_active=0 WHERE id=? AND user_id=?`).run(id, userId);
  res.json({ ok: true });
});

export default r;
