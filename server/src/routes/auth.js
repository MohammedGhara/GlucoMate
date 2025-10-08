import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";   // <-- Sequelize named export
const r = Router();

// POST /api/auth/register
r.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "patient" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ msg: "Missing fields" });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(409).json({ msg: "Email already used" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error("Register error:", e);
    res.status(500).json({ msg: e.message || "Register error" });
  }
});

// POST /api/auth/login
r.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ msg: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ msg: e.message || "Login error" });
  }
});

export default r;
