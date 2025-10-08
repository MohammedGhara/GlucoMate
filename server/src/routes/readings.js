import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { Reading } from "../models/Reading.js";

const r = Router();

// list (current user)
r.get("/", auth, async (req, res) => {
  const items = await Reading.findAll({
    where: { userId: req.user.id },
    order: [["takenAt", "DESC"]],
    limit: 200
  });
  res.json(items);
});

// create
r.post("/", auth, async (req, res) => {
  const { glucose, a1c, weight, systolic, diastolic, takenAt } = req.body;
  if (glucose == null) return res.status(400).json({ msg: "glucose is required" });
  const item = await Reading.create({ userId: req.user.id, glucose, a1c, weight, systolic, diastolic, takenAt });
  res.json(item);
});

export default r;
