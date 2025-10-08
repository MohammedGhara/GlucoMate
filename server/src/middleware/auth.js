import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ msg: "No token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // include email for downstream routes
    req.user = { id: payload.id, role: payload.role, email: payload.email };
    next();
  } catch (e) {
    return res.status(401).json({ msg: "Invalid token" });
  }
}
