import { Router } from "express";
import { chatOnce } from "../services/ai.js";
import { auth } from "../middleware/auth.js";
import { db } from "../config/db.js";

const router = Router();

/**
 * POST /api/ai/chat
 * body: { message: string }
 */
router.post("/ai/chat", auth, async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ ok: false, msg: "message is required" });

    const system = `
You are GlucoMate Assistant. You help with diabetes education, med info,
and app guidance. Be concise, friendly, never give diagnosis.
Encourage consulting a healthcare professional for medical decisions.
If you are unsure, say so. Use simple language.
`.trim();

    const answer = await chatOnce({ system, user: message });
    res.json({ ok: true, answer });
  } catch (e) {
    console.error("ai/chat error:", e);
    res.status(500).json({ ok: false, msg: "AI error" });
  }
});

/**
 * POST /api/ai/plan
 * Optional body: { goals?: string, preferences?: string }
 */
router.post("/ai/plan", auth, async (req, res) => {
  try {
    const userId = req.user?.id;

    // --- detect column names in readings ---
    const cols = db.prepare(`PRAGMA table_info(readings)`).all().map(c => c.name);

    // value column (glucose)
    const readingCol =
      cols.includes("glucose") ? "glucose" :
      cols.includes("value") ? "value" :
      cols.includes("value_mgdl") ? "value_mgdl" :
      null;

    // timestamp column
    const timeCol =
      cols.includes("taken_at") ? "taken_at" :
      cols.includes("takenAt") ? "takenAt" :
      cols.includes("timestamp") ? "timestamp" :
      null;

    // user id column
    const userCol =
      cols.includes("user_id") ? "user_id" :
      cols.includes("userId") ? "userId" :
      "user_id"; // fallback

    if (!readingCol || !timeCol) {
      return res.status(500).json({
        ok: false,
        msg: "DB schema issue: could not find glucose/time columns in 'readings' table",
      });
    }

    // Recent readings
    const readings = db.prepare(`
      SELECT ${readingCol} AS reading_value, ${timeCol} AS taken_time
      FROM readings
      WHERE ${userCol} = ?
      ORDER BY ${timeCol} DESC
      LIMIT 30
    `).all(userId);

    // Active meds
    const meds = db.prepare(`
      SELECT um.id AS user_med_id, m.generic_name, m.brand_name, um.dose
      FROM user_medications um
      JOIN medications m ON m.id = um.medication_id
      WHERE um.user_id = ? AND um.is_active = 1
    `).all(userId);

    const { goals = "", preferences = "" } = req.body || {};

    const system = `
You are a diabetes self-management coach.
Create practical, friendly suggestions for the next 7 days:
- daily glucose monitoring hints
- meal guidance (simple, regional-agnostic)
- activity ideas (light/moderate)
- medication adherence reminders
- warning signs to watch and when to contact a clinician
Avoid clinical orders; offer options. Keep it under 250 words.
Always include a short safety disclaimer at the end.
`.trim();

    const user = `
User goals: ${goals || "not specified"}
Preferences/constraints: ${preferences || "not specified"}

Recent glucose readings (most recent first):
${readings.length ? readings.map(r => `• ${r.reading_value} at ${r.taken_time}`).join("\n") : "• none"}

Active medications:
${meds.length ? meds.map(m => `• ${m.generic_name}${m.brand_name ? " (" + m.brand_name + ")" : ""} — dose: ${m.dose || "n/a"}`).join("\n") : "• none"}
`.trim();

    const plan = await chatOnce({ system, user });
    res.json({ ok: true, plan });
  } catch (e) {
    console.error("ai/plan error:", e);
    res.status(500).json({ ok: false, msg: "AI error" });
  }
});

export default router;
