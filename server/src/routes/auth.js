// server/src/routes/auth.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { logAudit } from "../utils/audit.js";

const r = Router();

// POST /api/auth/register
r.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "patient" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Missing fields" });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ msg: "Email already used" });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role });

    // 🔎 Audit: user registration
    await logAudit(req, {
      action: "auth.register",
      entity_type: "User",
      entity_id: user.id,
      details: { email: user.email, role: user.role }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || process.env.SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    console.error("Register error:", e);
    return res.status(500).json({ msg: e.message || "Register error" });
  }
});

// POST /api/auth/login
r.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Audit failed login (optional)
      await logAudit(req, {
        action: "auth.login",
        entity_type: "User",
        entity_id: 0,
        details: { email, result: "invalid_email" }
      });
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      // Audit failed login (optional)
      await logAudit(req, {
        action: "auth.login",
        entity_type: "User",
        entity_id: user.id,
        details: { email: user.email, result: "invalid_password" }
      });
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    // 🔎 Audit: successful login
    await logAudit(req, {
      action: "auth.login",
      entity_type: "User",
      entity_id: user.id,
      details: { email: user.email, role: user.role, result: "ok" }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || process.env.SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ msg: e.message || "Login error" });
  }
});

// GET /api/auth/me
r.get("/me", auth, async (req, res) => {
  const u = req.user;
  return res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
});

export default r;
