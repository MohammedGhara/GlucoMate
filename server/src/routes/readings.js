// server/src/routes/readings.js
import { Router } from "express";
import { Reading } from "../models/Reading.js";
import { User } from "../models/User.js";            // 🔹 add this
import { notifyOnGlucose } from "../services/alerts.js";

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

export default router;
