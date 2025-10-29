// server/src/utils/audit.js
import crypto from "crypto";
import { db } from "../config/db.js";

let lastHashCache = null;
async function getLastHash() {
  if (lastHashCache) return lastHashCache;
  const row = db.prepare("SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1").get();
  lastHashCache = row?.hash || "";
  return lastHashCache;
}
function sha256(s) { return crypto.createHash("sha256").update(s).digest("hex"); }

/**
 * logAudit(req, { action, entity_type?, entity_id?, old_value?, new_value?, details? })
 */
export async function logAudit(req, payload) {
  const actor = req?.user || {};
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "";

  const row = {
    created_at: new Date().toISOString(),
    user_id: actor.id ?? null,
    user_email: actor.email ?? null,
    user_role: actor.role ?? null,
    ip_address: ip,
    action: payload.action,
    entity_type: payload.entity_type ?? null,
    entity_id: payload.entity_id ?? null,
    old_value: payload.old_value ? JSON.stringify(payload.old_value) : null,
    new_value: payload.new_value ? JSON.stringify(payload.new_value) : null,
    details:   payload.details    ? JSON.stringify(payload.details)    : null,
  };

  const prev_hash = await getLastHash();
  const material = JSON.stringify({ ...row, prev_hash });
  const hash = sha256(material);

  db.prepare(
    `INSERT INTO audit_log
     (created_at,user_id,user_email,user_role,ip_address,action,entity_type,entity_id,old_value,new_value,details,prev_hash,hash)
     VALUES (@created_at,@user_id,@user_email,@user_role,@ip_address,@action,@entity_type,@entity_id,@old_value,@new_value,@details,@prev_hash,@hash)`
  ).run({ ...row, prev_hash, hash });

  lastHashCache = hash; // advance chain
}

export function verifyAuditChain() {
  const rows = db.prepare("SELECT * FROM audit_log ORDER BY id ASC").all();
  let prev = "";
  for (const r of rows) {
    const str = JSON.stringify({
      created_at:r.created_at, user_id:r.user_id, user_email:r.user_email, user_role:r.user_role,
      ip_address:r.ip_address, action:r.action, entity_type:r.entity_type, entity_id:r.entity_id,
      old_value:r.old_value, new_value:r.new_value, details:r.details, prev_hash:prev
    });
    const h = sha256(str);
    if (h !== r.hash) return { ok:false, badId:r.id };
    prev = r.hash;
  }
  return { ok:true, count: rows.length };
}
