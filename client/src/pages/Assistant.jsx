import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";

/**
 * GlucoMate Assistant — BEAUTIFIED chat page (single‑file, drop‑in)
 *
 * ✅ Zero extra deps (no Tailwind / UI libs)
 * ✅ Clean layout, soft gradients, avatars, timestamps
 * ✅ Auto‑scroll, localStorage, multiline composer
 * ✅ Quick prompts, copy, clear w/ confirm, retry last
 * ✅ Typing indicator, accessible (aria‑live)
 * ✅ Small built‑in CSS (scoped via data‑gm root)
 *
 * Usage: replace your current Assistant page with this file.
 * If you already have global .btn/.card styles, this will not conflict.
 */

const STORAGE_KEY = "gm.assistant.history.v2"; // new key to avoid clobbering old layout while testing

export default function Assistant() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");

  const scrollRef = useRef(null);
  const listRef = useRef(null);

  // Persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)); } catch {}
  }, [msgs]);

  // Auto‑scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function sendMessage(prompt) {
    const text = (prompt ?? input).trim();
    if (!text) return;
    const me = { role: "user", content: text, ts: Date.now(), id: crypto.randomUUID?.() || Math.random().toString(36).slice(2) };

    setMsgs((m) => [...m, me]);
    setInput("");
    setError("");
    setLoading(true);
    setLastPrompt(text);

    try {
      const { data } = await api.post("/ai/chat", { message: text });
      const reply = (data?.answer ?? "").trim() || "Sorry — no answer returned.";
      const assistant = { role: "assistant", content: reply, ts: Date.now(), id: crypto.randomUUID?.() || Math.random().toString(36).slice(2) };
      setMsgs((m) => [...m, assistant]);
    } catch (e) {
      console.error("assistant/chat error", e);
      setError(e?.response?.data?.msg || "Something went wrong talking to the assistant.");
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Sorry — something went wrong.", ts: Date.now(), isError: true, id: crypto.randomUUID?.() || Math.random().toString(36).slice(2) }
      ]);
    } finally {
      setLoading(false);
      scrollRef.current?.focus();
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    if (canSend) sendMessage();
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) sendMessage();
    }
  }

  function clearChat() {
    if (!msgs.length) return;
    const ok = window.confirm("Clear conversation history?");
    if (!ok) return;
    setMsgs([]);
    setError("");
  }

  function copy(text) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  function retry() {
    if (!lastPrompt) return;
    sendMessage(lastPrompt);
  }

  const quickPrompts = [
    "How can I remember to take my evening dose?",
    "What are common side effects of metformin?",
    "Give me gentle exercise ideas for a busy day.",
    "How do I log a reading in GlucoMate?",
  ];

  return (
    <main data-gm className="gm-wrap">
      {/* Inline CSS once */}
      <GMStyles />

      {/* Header */}
      <header className="gm-header">
        <div className="gm-logo" aria-hidden>🤖</div>
        <div>
          <h1 className="gm-title">GlucoMate Assistant</h1>
          <p className="gm-sub">Ask about diabetes self‑management, meds, or how to use the app. This is educational support, not medical advice.</p>
        </div>
      </header>

      {/* Quick prompts */}
      <section className="gm-card gm-prompts" role="region" aria-label="Quick prompts">
        <div className="gm-prompts-head">Try one:</div>
        <div className="gm-chiprow">
          {quickPrompts.map((q, i) => (
            <button key={i} className="gm-chip" onClick={() => sendMessage(q)} type="button">{q}</button>
          ))}
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="gm-card gm-error" role="alert">
          <div className="gm-error-text">{error}</div>
          <div className="gm-error-actions">
            <button className="gm-btn" onClick={retry} type="button">Retry</button>
            <button className="gm-btn ghost" onClick={() => setError("")} type="button">Dismiss</button>
          </div>
        </div>
      )}

      {/* Chat box */}
      <section className="gm-card gm-chat">
        <div ref={listRef} className="gm-list" aria-live="polite" aria-label="Conversation">
          {msgs.length === 0 && !loading && (
            <div className="gm-empty">No messages yet. Ask a question to get started.</div>
          )}

          {msgs.map((m) => (
            <Bubble key={m.id} msg={m} onCopy={() => copy(m.content)} />
          ))}

          {loading && <TypingIndicator />}
        </div>

        {/* Composer */}
        <form onSubmit={onSubmit} className="gm-composer" role="form" aria-label="Message composer">
          <textarea
            ref={scrollRef}
            className="gm-input"
            rows={3}
            placeholder="Type your question… (Enter = send, Shift+Enter = newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="gm-row">
            <div className="gm-hint">Enter to send · Shift+Enter for a new line</div>
            <div className="gm-actions">
              <button type="button" className="gm-btn ghost" onClick={clearChat} disabled={loading || msgs.length === 0}>Clear</button>
              <button type="submit" className="gm-btn primary" disabled={!canSend}>{loading ? "Sending…" : "Send"}</button>
            </div>
          </div>
        </form>
      </section>

      {/* Footer mini */}
      <footer className="gm-foot">
        <span>v2</span>
        {lastPrompt && (
          <button type="button" className="gm-link" onClick={retry} title="Retry last message">Retry last</button>
        )}
      </footer>
    </main>
  );
}

function Bubble({ msg, onCopy }) {
  const isUser = msg.role === "user";
  const ts = new Date(msg.ts || Date.now());
  const time = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`gm-bubble ${isUser ? "user" : "assistant"}`}>
      <div className="gm-meta">
        <div className="gm-avatar" aria-hidden>{isUser ? "🙂" : "🤖"}</div>
        <span className={`gm-name ${isUser ? "u" : "a"}`}>{isUser ? "You" : "Assistant"}</span>
        <span className="gm-time">{time}</span>
        {!isUser && (
          <button className="gm-mini" type="button" onClick={onCopy} title="Copy message">Copy</button>
        )}
      </div>
      <div className={`gm-msg ${msg.isError ? "err" : ""}`}>{msg.content}</div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="gm-typing">
      <div className="dot" /><div className="dot" /><div className="dot" />
      <span className="sr-only">Assistant is typing…</span>
    </div>
  );
}

// ————————————————————————————————————————
// Minimal, scoped CSS (no collisions). Loaded once per page.
function GMStyles() {
  return (
    <style>{`
[data-gm] { --bg:#0b1220; --card:#0f172a; --cardSoft:#0f172a14; --text:#e5ecff; --muted:#a5b4d6; --line:#ffffff1a; --accent:#2563eb; --accent-2:#1d4ed8; --surface:#0f172a0d; --err:#ef4444; }

.gm-wrap { max-width: 960px; margin: 0 auto; padding: 24px 16px 56px; color: var(--text); }
.gm-header { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
.gm-logo { font-size: 30px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }
.gm-title { margin: 0; font-size: 28px; letter-spacing: 0.2px; }
.gm-sub { margin: 6px 0 0; color: var(--muted); font-size: 14px; }

.gm-card { background: linear-gradient(180deg, #0f172a66, #0f172a88); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,.15); }
.gm-prompts { margin-top: 16px; padding: 12px; }
.gm-prompts-head { color: var(--muted); margin-bottom: 8px; font-size: 14px; }
.gm-chiprow { display: flex; flex-wrap: wrap; gap: 8px; }
.gm-chip { background: #ffffff0f; color: var(--text); border: 1px solid #ffffff1f; border-radius: 999px; padding: 8px 12px; font-size: 13px; cursor: pointer; transition: transform .08s ease, background .2s;
  backdrop-filter: blur(6px); }
.gm-chip:hover { background: #ffffff1a; transform: translateY(-1px); }

.gm-error { margin-top: 12px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-color: #f87171; background: #f8717112; }
.gm-error-text { color: #fecaca; }
.gm-error-actions { display: flex; gap: 8px; }

.gm-chat { margin-top: 16px; padding: 0; overflow: hidden; }
.gm-list { max-height: 250px; overflow-y: auto; padding: 16px; background: var(--surface); }

.gm-empty { color: var(--muted); font-size: 14px; }

.gm-composer { display: grid; gap: 8px; padding: 12px; border-top: 1px solid var(--line); background: #0b1022;
  backdrop-filter: blur(8px); }
.gm-input { width: 100%; resize: vertical; min-height: 64px; max-height: 220px; padding: 12px; border-radius: 10px; border: 1px solid var(--line); background: #0f152b; color: var(--text); outline: none; }
.gm-input::placeholder { color: #93a1c7; }
.gm-input:focus { border-color: #2f5fff; box-shadow: 0 0 0 3px #2563eb33; }
.gm-row { display: flex; gap: 8px; justify-content: space-between; align-items: center; }
.gm-hint { color: var(--muted); font-size: 12px; }
.gm-actions { display: flex; gap: 8px; }

.gm-btn { border-radius: 10px; padding: 8px 12px; border: 1px solid var(--line); background: #ffffff10; color: var(--text); cursor: pointer; font-weight: 600; }
.gm-btn:hover { background: #ffffff18; }
.gm-btn.primary { background: var(--accent); border-color: var(--accent-2); }
.gm-btn.primary:hover { background: var(--accent-2); }
.gm-btn.ghost { background: transparent; }
.gm-mini { padding: 2px 8px; font-size: 12px; border-radius: 999px; border: 1px solid var(--line); background: transparent; color: var(--text); cursor: pointer; }

.gm-bubble { display: grid; gap: 6px; margin: 10px 0 14px; }
.gm-meta { display: inline-flex; align-items: center; gap: 8px; }
.gm-avatar { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 999px; background: #0f172a; border: 1px solid var(--line); font-size: 14px; }
.gm-name { font-weight: 700; letter-spacing: 0.2px; }
.gm-name.u { color: #c7d2fe; }
.gm-name.a { color: #93c5fd; }
.gm-time { color: var(--muted); font-size: 12px; }

.gm-msg { max-width: 92%; word-break: break-word; white-space: pre-wrap; padding: 12px 14px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.25); border: 1px solid #ffffff14; }
.gm-bubble.user .gm-msg { background: linear-gradient(180deg, #2563eb, #1d4ed8); color: white; }
.gm-bubble.assistant .gm-msg { background: #0f172a; color: var(--text); }
.gm-msg.err { background: #2b0f12; border-color: #ef4444aa; }

.gm-typing { display: inline-flex; align-items: center; gap: 6px; padding: 8px 10px; background: #0f172a; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
.gm-typing .dot { width: 6px; height: 6px; border-radius: 999px; background: #c7d2fe; animation: gmPulse 1.2s infinite ease-in-out; }
.gm-typing .dot:nth-child(2) { animation-delay: .15s; }
.gm-typing .dot:nth-child(3) { animation-delay: .3s; }
@keyframes gmPulse { 0%, 80%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }

.gm-foot { display: flex; gap: 10px; align-items: center; justify-content: flex-end; margin-top: 10px; color: var(--muted); font-size: 12px; }
.gm-link { color: #93c5fd; background: transparent; border: none; cursor: pointer; padding: 0; }

/* Responsive tweaks */
@media (max-width: 640px) {
  .gm-list { max-height: 60vh; }
  .gm-title { font-size: 22px; }
}

/* a11y */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    `}</style>
  );
}