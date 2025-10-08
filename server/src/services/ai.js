// server/src/services/ai.js
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY || "";
if (!apiKey) console.error("❌ Missing OPENAI_API_KEY");

export const openai = new OpenAI({ apiKey });

export async function chatOnce({ system, user }) {
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.3,
  });
  return resp.choices?.[0]?.message?.content?.trim() || "";
}
