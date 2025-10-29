// server/src/routes/meExport.js
import { Router } from "express";
import { db } from "../config/db.js";
const r = Router();

/** GET /api/me/export.json */
r.get("/me/export.json", (req, res) => {
  // make sure auth middleware set req.user
  const readings = db.prepare(
    "SELECT * FROM readings WHERE user_id=? ORDER BY takenAt ASC"
  ).all(req.user.id);

  const meds = db.prepare(`
    SELECT um.*, m.generic_name, m.brand_name
    FROM user_medications um
    JOIN medications m ON m.id = um.medication_id
    WHERE um.user_id=? ORDER BY um.id ASC
  `).all(req.user.id);

  res.setHeader("Content-Disposition", "attachment; filename=gluco_data.json");
  res.json({ user: { id: req.user.id, email: req.user.email }, readings, meds });
});

export default r;
