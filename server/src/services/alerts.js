// server/src/services/alerts.js
import { sendEmail } from "../utils/mailer.js";

const APP_NAME = process.env.APP_NAME || "GlucoMate";

function htmlWrap(heading, body) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111">
      <h2>${heading}</h2>
      <p>${body}</p>
      <hr/><p style="color:#666;font-size:12px">${APP_NAME} automated alert</p>
    </div>`;
}

export async function notifyOnGlucose(user, reading) {
  if (!user || !user.email) return;

  const g = Number(reading.glucose);
  if (Number.isNaN(g)) return;

  if (g > 120) {
    await sendEmail({
      to: user.email,
      subject: `High glucose alert: ${g} mg/dL`,
      text: `Your glucose is ${g} mg/dL (above target). Please recheck in 30 minutes.`,
      html: htmlWrap(
        "High glucose alert",
        `Your glucose is <b>${g} mg/dL</b> (above target).<br/>Please recheck in <b>30 minutes</b>.`
      ),
    });

    // follow-up reminder in 30 minutes
    setTimeout(() => {
      sendEmail({
        to: user.email,
        subject: "Reminder: recheck your glucose",
        text: "Please recheck your glucose now (30 minutes after a high reading).",
        html: htmlWrap("Reminder", "Please recheck your glucose now (30 minutes after a high reading)."),
      }).catch((e) => console.error("30-min reminder failed:", e.message));
    }, 30 * 60 * 1000);
  }

  if (g < 80) {
    await sendEmail({
      to: user.email,
      subject: `Low glucose alert: ${g} mg/dL`,
      text: `Your glucose is ${g} mg/dL (below target). Please treat as needed and recheck soon.`,
      html: htmlWrap(
        "Low glucose alert",
        `Your glucose is <b>${g} mg/dL</b> (below target).<br/>Please treat as needed and recheck soon.`
      ),
    });
  }
}
