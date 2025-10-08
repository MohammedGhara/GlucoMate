import { Router } from "express";
import { db } from "../config/db.js";

const r = Router();

/** GET /api/medications?q= */
r.get("/medications", (req, res) => {
  const q = (req.query.q || "").trim();
  let rows;
  if (q) {
    rows = db.prepare(`
      SELECT * FROM medications
      WHERE generic_name LIKE ? OR brand_name LIKE ? OR class LIKE ?
      ORDER BY generic_name
      LIMIT 50
    `).all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare(`
      SELECT * FROM medications
      ORDER BY generic_name
      LIMIT 50
    `).all();
  }
  res.json(rows);
});

export default r;
