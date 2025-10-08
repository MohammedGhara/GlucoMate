import { Router } from "express";
const r = Router();

r.get("/", (req, res) => {
  res.json({ ok: true, messages: [] });
});

export default r;   // <<— חשוב: default
