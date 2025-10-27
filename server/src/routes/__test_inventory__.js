// src/routes/__test_inventory__.js
import express from "express";
const router = express.Router();

// Simple in-memory “DB”
let items = [];
let nextId = 1;

// GET /api/inventory
router.get("/inventory", (req, res) => {
  res.json(items);
});

// POST /api/inventory
router.post("/inventory", (req, res) => {
  const { name, unit, dose, time } = req.body;
  if (!name || !unit || dose == null || !time)
    return res.status(400).json({ error: "Missing fields" });
  const item = { id: nextId++, name, unit, dose, time };
  items.push(item);
  res.status(201).json(item);
});

// GET /api/inventory/:id
router.get("/inventory/:id", (req, res) => {
  const item = items.find(x => x.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

// PUT /api/inventory/:id
router.put("/inventory/:id", (req, res) => {
  const idx = items.findIndex(x => x.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  items[idx] = { ...items[idx], ...req.body };
  res.json(items[idx]);
});

// DELETE /api/inventory/:id
router.delete("/inventory/:id", (req, res) => {
  const idx = items.findIndex(x => x.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  items.splice(idx, 1);
  res.status(204).send();
});

// optional bulk insert
router.post("/inventory/bulk", (req, res) => {
  const arr = req.body;
  if (!Array.isArray(arr)) return res.status(400).json({ error: "Expected array" });
  arr.forEach(it => {
    if (it.name && it.unit && it.dose != null && it.time) {
      items.push({ id: nextId++, ...it });
    }
  });
  res.status(201).json(items);
});

export default router;
