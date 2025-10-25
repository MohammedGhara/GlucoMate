// server/src/utils/mailer.js
import nodemailer from "nodemailer";

const from =
  process.env.EMAIL_FROM ||
  (process.env.EMAIL ? `Alerts <${process.env.EMAIL}>` : "Alerts <no-reply@example.com>");

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendEmail({ to, subject, text, html }) {
  if (!to) throw new Error("sendEmail: 'to' is required");
  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html || text,
  });
}
