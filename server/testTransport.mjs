import "dotenv/config";
import nodemailer from "nodemailer";

const t = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
});

try {
  await t.verify();
  console.log("✅ Gmail transporter OK for:", process.env.EMAIL);
} catch (e) {
  console.error("❌ VERIFY ERROR:", e.message);
  process.exit(1);
}
