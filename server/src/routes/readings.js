// server/src/routes/readings.js
import { Router } from "express";
import { Reading } from "../models/Reading.js";
import { User } from "../models/User.js";            // 🔹 add this
import { notifyOnGlucose } from "../services/alerts.js";
import { db } from "../config/db.js";
import { logAudit } from "../utils/audit.js";
const router = Router();

// Require an attached user (maybeAttachUser ran earlier)
function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ msg: "Unauthorized" });
  next();
}

// list (current user)
router.get("/", requireUser, async (req, res) => {
  const items = await Reading.findAll({
    where: { userId: req.user.id },
    order: [["takenAt", "DESC"]],
    limit: 200,
  });
  res.json(items);
});

// create + send alerts
router.post("/", requireUser, async (req, res) => {
  const { glucose, a1c, weight, takenAt } = req.body;
  if (glucose == null) return res.status(400).json({ msg: "glucose is required" });

  // 🔹 make sure we have a full user with email
  const user = await User.findByPk(req.user.id, { attributes: ["id", "email", "name"] });
  if (!user || !user.email) {
    console.warn("Readings POST: user missing email", req.user?.id);
    return res.status(400).json({ msg: "User has no email on file" });
  }

  const item = await Reading.create({
    userId: user.id,
    glucose,
    a1c,
    weight,
    takenAt,
  });

  // fire-and-forget email (don't block response)
  notifyOnGlucose(user, item)
    .then(() => console.log(`notifyOnGlucose OK for user ${user.email}, g=${glucose}`))
    .catch((e) => console.error("notifyOnGlucose failed:", e.message));

  res.json(item);
});

// CREATE
router.post("/readings", async (req, res) => {
  const { glucose, a1c, weight, systolic, diastolic, takenAt } = req.body;
  const info = db.prepare(`INSERT INTO readings
      (user_id, glucose, a1c, weight, systolic, diastolic, takenAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(req.user.id, glucose, a1c, weight, systolic, diastolic, takenAt);
  await logAudit(req, {
    action: "reading.create",
    entity_type: "Reading",
    entity_id: String(info.lastInsertRowid),
    new_value: { glucose, a1c, weight, systolic, diastolic, takenAt }
  });
  res.json({ id: info.lastInsertRowid });
});

// UPDATE
router.patch("/readings/:id", async (req, res) => {
  const id = req.params.id;
  const oldRow = db.prepare("SELECT * FROM readings WHERE id=? AND user_id=?")
                   .get(id, req.user.id);
  if (!oldRow) return res.status(404).json({ msg: "Not found" });

  const patch = req.body;  // trust only allowed fields in real code
  const next = { ...oldRow, ...patch };
  db.prepare(`UPDATE readings SET glucose=?, a1c=?, weight=?, systolic=?, diastolic=?, takenAt=? WHERE id=? AND user_id=?`)
    .run(next.glucose, next.a1c, next.weight, next.systolic, next.diastolic, next.takenAt, id, req.user.id);

  await logAudit(req, {
    action: "reading.update",
    entity_type: "Reading",
    entity_id: id,
    old_value: oldRow,
    new_value: patch
  });

  res.json({ ok: true });
});

// DELETE
router.delete("/readings/:id", async (req, res) => {
  const id = req.params.id;
  const oldRow = db.prepare("SELECT * FROM readings WHERE id=? AND user_id=?")
                   .get(id, req.user.id);
  if (!oldRow) return res.status(404).json({ msg: "Not found" });

  db.prepare("DELETE FROM readings WHERE id=? AND user_id=?").run(id, req.user.id);

  await logAudit(req, {
    action: "reading.delete",
    entity_type: "Reading",
    entity_id: id,
    old_value: oldRow
  });

  res.json({ ok: true });
});
export default router;
