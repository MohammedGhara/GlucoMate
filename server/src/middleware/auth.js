// server/src/middleware/auth.js
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

function getSecret() {
  return process.env.JWT_SECRET || process.env.SECRET || "local_dev_secret_12345";
}

/**
 * Soft auth: attach req.user if a valid Bearer token is present.
 * Never blocks the request.
 */
export async function maybeAttachUser(req, _res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return next();

    const payload = jwt.verify(token, getSecret());
    if (!payload?.id) return next();

    // Load the user so downstream has email/name/role
    const u = await User.findByPk(payload.id);
    if (u) req.user = { id: u.id, role: u.role, email: u.email, name: u.name };

    return next();
  } catch {
    // ignore bad token
    return next();
  }
}

/**
 * Hard auth: requires a valid token. Responds 401 otherwise.
 */
export async function auth(req, res, next) {
  try {
    // If maybeAttachUser already set the user, we’re done.
    if (req.user?.id) return next();

    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ msg: "Unauthorized" });

    const payload = jwt.verify(token, getSecret());
    if (!payload?.id) return res.status(401).json({ msg: "Unauthorized" });

    const u = await User.findByPk(payload.id);
    if (!u) return res.status(401).json({ msg: "Unauthorized" });

    req.user = { id: u.id, role: u.role, email: u.email, name: u.name };
    next();
  } catch {
    return res.status(401).json({ msg: "Invalid token" });
  }
}
