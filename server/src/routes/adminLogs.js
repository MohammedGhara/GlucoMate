// server/src/routes/adminLogs.js
import { Router } from "express";
import { db } from "../config/db.js";
import { verifyAuditChain } from "../utils/audit.js";

const router = Router();

function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch { return { _raw: s }; } }

/** GET /api/admin/logs */
router.get("/logs", (req, res) => {
  const { page = 1, pageSize = 20, action, entityType, actor, since, until, q } = req.query;

  const wh = []; const args = [];
  if (action)     { wh.push("action = ?");                    args.push(action); }
  if (entityType) { wh.push("entity_type = ?");               args.push(entityType); }
  if (actor)      { wh.push("(user_email = ? OR user_id = ?)"); args.push(actor, actor); }
  if (since)      { wh.push("created_at >= ?");               args.push(since); }
  if (until)      { wh.push("created_at <= ?");               args.push(until); }
  if (q)          { wh.push("(action LIKE ? OR details LIKE ? OR old_value LIKE ? OR new_value LIKE ?)");
                    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }

  const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
  const limit  = Math.max(1, Math.min(1000, Number(pageSize)));
  const offset = (Math.max(1, Number(page)) - 1) * limit;

  const rows = db.prepare(
    `SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(...args, limit, offset);

  const items = rows.map(r => ({
    id: r.id,
    createdAt: r.created_at,
    actorEmail: r.user_email,
    actorRole: r.user_role,
    ip: r.ip_address,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    entity: r.entity_type ? `${r.entity_type}#${r.entity_id ?? "—"}` : "—",
    details: safeParse(r.details),
    oldValue: safeParse(r.old_value),
    newValue: safeParse(r.new_value),
    prevHash: r.prev_hash,
    hash: r.hash,
  }));

  const total = db.prepare(`SELECT COUNT(*) AS c FROM audit_log ${where}`).get(...args).c;
  res.json({ page: Number(page), pageSize: limit, total, items });
});

/** Optional helpers */
router.get("/logs.verify", (_req, res) => res.json(verifyAuditChain()));
router.get("/actions", (_req, res) => {
  const rows = db.prepare(`SELECT DISTINCT action FROM audit_log ORDER BY action`).all();
  res.json(rows.map(r => r.action));
});

export default router;
