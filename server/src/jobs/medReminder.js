// server/src/jobs/medReminder.js
import { db } from "../config/db.js";
import { sendEmail } from "../utils/mailer.js";

const APP_NAME = process.env.APP_NAME || "GlucoMate";

/** build YYYY-MM-DD and HH:MM from Date */
function nowParts(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm   = pad(d.getMonth() + 1);
  const dd   = pad(d.getDate());
  const HH   = pad(d.getHours());
  const MM   = pad(d.getMinutes());
  return { date: `${yyyy}-${mm}-${dd}`, time: `${HH}:${MM}` };
}

/** one tick: find meds that should be emailed at this minute and send */
function runOnce() {
  const { date, time } = nowParts();

  // Find active user meds that have a time = this HH:MM.
  // We denormalize user_email + medication_name so we don't need joins.
  const rows = db.prepare(`
    SELECT um.id              AS user_med_id,
           um.user_email      AS to_email,
           COALESCE(um.medication_name, 'your medication') AS med_name,
           um.dose            AS dose,
           t.time_24h         AS time_24h
    FROM user_medications um
    JOIN user_medication_times t ON t.user_med_id = um.id
    WHERE um.is_active = 1
      AND t.time_24h = ?
      AND um.user_email IS NOT NULL
  `).all(time);

  if (!rows.length) return;

  const alreadySentStmt = db.prepare(`
    SELECT 1 FROM email_reminder_log
    WHERE user_med_id = ? AND sent_date = ? AND time_24h = ?
    LIMIT 1
  `);
  const insertLogStmt = db.prepare(`
    INSERT OR IGNORE INTO email_reminder_log (user_med_id, sent_date, time_24h)
    VALUES (?, ?, ?)
  `);

  rows.forEach(async (r) => {
    // skip if we already sent for this med+date+time
    const sent = alreadySentStmt.get(r.user_med_id, date, r.time_24h);
    if (sent) return;

    try {
      const subject = `⏰ ${APP_NAME}: time to take ${r.med_name}`;
      const body = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
          <h2>It's time for ${r.med_name}</h2>
          <p><b>Scheduled time:</b> ${r.time_24h}</p>
          ${r.dose ? `<p><b>Dose:</b> ${r.dose}</p>` : ""}
          <p style="color:#666;font-size:12px;margin-top:14px">${APP_NAME} automated reminder</p>
        </div>
      `;
      await sendEmail({
        to: r.to_email,
        subject,
        html: body,
        text: `Time to take ${r.med_name} ${r.dose ? `(dose: ${r.dose})` : ""} at ${r.time_24h}.`,
      });

      insertLogStmt.run(r.user_med_id, date, r.time_24h);
      console.log(`📧 Reminder sent → ${r.to_email} (${r.med_name} @ ${r.time_24h})`);
    } catch (e) {
      console.error("Reminder send failed:", e.message);
    }
  });
}

/** start interval timer (runs every 60s) */
export function startMedReminderJob() {
  // run immediately on boot, then every minute
  runOnce();
  setInterval(runOnce, 60 * 1000);
  console.log("⏱️  Medication reminder job running (every minute).");
}
