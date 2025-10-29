// server/src/middleware/roles.js

export function requireAdmin(req, res, next) {
  try {
    if (req.user?.role === "admin") return next();
    return res.status(403).json({ error: "Access denied: admin only" });
  } catch (err) {
    console.error("requireAdmin error:", err);
    res.status(500).json({ error: "Server error in requireAdmin" });
  }
}
