// server/src/routes/testEmail.js
import { Router } from "express";
import { sendEmail } from "../utils/mailer.js";

const router = Router();

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ msg: "Unauthorized" });
  next();
}

// POST /api/test-email → sends a test email to the logged-in user's email
router.post("/test-email", requireUser, async (req, res) => {
  try {
    if (!req.user.email) return res.status(400).json({ msg: "User has no email" });

    const info = await sendEmail({
      to: req.user.email,
      subject: "✅ GlucoMate test email",
      text: "If you see this, email sending works!",
      html: `<div style="font-family:sans-serif"><h2>✅ GlucoMate test email</h2><p>If you see this, email sending works!</p></div>`,
    });

    res.json({ ok: true, to: req.user.email, messageId: info.messageId });
  } catch (e) {
    console.error("TEST EMAIL ERROR:", e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

export default router;
