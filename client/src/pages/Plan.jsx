import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

/**
 * GlucoMate — Personalized Plan (7-Day Pretty View)
 * --------------------------------------------------
 * ✓ Always renders 7 days
 * ✓ If model returns one long list, auto-distributes across 7 days
 * ✓ Max 6 items per day + “Show more”
 * ✓ Pretty/Raw toggle + Expand/Collapse all
 * ✓ Chips, autosave, copy/download/print
 * ✓ No extra libraries
 */

const STORE_KEY = "gm.plan.v3";

export default function Plan() {
  const [goals, setGoals] = useState("");
  const [prefs, setPrefs] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prettyMode, setPrettyMode] = useState(true);
  const [allOpen, setAllOpen] = useState(true);

  // Restore draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const { goals: g = "", prefs: p = "", plan: pl = "", pretty = true } = JSON.parse(raw);
      setGoals(g); setPrefs(p); setPlan(pl); setPrettyMode(pretty);
    } catch {}
  }, []);

  // Persist draft
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ goals, prefs, plan, pretty: prettyMode }));
    } catch {}
  }, [goals, prefs, plan, prettyMode]);

  const canGenerate = useMemo(
    () => !loading && (goals.trim() || prefs.trim()),
    [loading, goals, prefs]
  );

  async function generate(e) {
    e?.preventDefault?.();
    if (!canGenerate) return;
    setLoading(true); setError(""); setPlan("");
    try {
      const { data } = await api.post("/ai/plan", { goals, preferences: prefs });
      setPlan(data?.plan || "");
      setAllOpen(true);
    } catch (e) {
      setError(e?.response?.data?.msg || e.message || "Could not generate a plan.");
    } finally {
      setLoading(false);
    }
  }

  function addChip(value, target) {
    if (target === "goals") setGoals((v) => (v ? v + "\n" : "") + value);
    else setPrefs((v) => (v ? v + "\n" : "") + value);
  }

  function clearAll() {
    if (!goals && !prefs && !plan) return;
    if (!window.confirm("Clear form and result?")) return;
    setGoals(""); setPrefs(""); setPlan(""); setError("");
  }

  function copyPlan() { if (plan) navigator.clipboard?.writeText(plan).catch(() => {}); }
  function downloadPlan() {
    if (!plan) return;
    const blob = new Blob([plan], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "gluco_plan.txt"; a.click();
    URL.revokeObjectURL(url);
  }
  function printPlan() {
    if (!plan) return;
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(
      `<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; line-height:1.6; padding:20px;">${escapeHtml(plan)}</pre>`
    );
    w.document.close(); w.focus(); w.print();
  }

  const sections = useMemo(() => (prettyMode ? parsePlan(plan) : []), [plan, prettyMode]);

  function toggleAll() { setAllOpen((o) => !o); }

  return (
    <main data-plan className="pl-wrap">
      <PLStyles />

      <header className="pl-head">
        <div className="pl-emoji" aria-hidden>🗓️</div>
        <div>
          <h1 className="pl-title">Personalized Plan</h1>
          <p className="pl-sub">Educational support only — not medical advice. Consult your clinician for decisions.</p>
        </div>
      </header>

      <section className="pl-card" aria-label="Plan form">
        <form onSubmit={generate} className="pl-form">
          <label className="pl-label">
            <span>Your goals (optional)</span>
            <textarea
              className="pl-input"
              rows={3}
              spellCheck
              placeholder="e.g., Reduce morning glucose; walk 30 minutes daily; lose 2 kg this month…"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              aria-label="Your goals"
            />
            <ChipRow>
              <Chip onClick={() => addChip("Reduce morning glucose variability", "goals")}>
                Reduce morning glucose variability
              </Chip>
              <Chip onClick={() => addChip("Walk 25–30 min after dinner (5×/week)", "goals")}>
                Walk 25–30 min after dinner (5×/week)
              </Chip>
              <Chip onClick={() => addChip("Lose ~2 kg this month", "goals")}>
                Lose ~2 kg this month
              </Chip>
            </ChipRow>
          </label>

          <label className="pl-label">
            <span>Preferences / constraints (optional)</span>
            <textarea
              className="pl-input"
              rows={3}
              spellCheck
              placeholder="e.g., vegetarian, no seafood; busy evenings; bad knees; Ramadan fasting; budget-friendly…"
              value={prefs}
              onChange={(e) => setPrefs(e.target.value)}
              aria-label="Preferences and constraints"
            />
            <ChipRow>
              <Chip onClick={() => addChip("Vegetarian, no seafood", "prefs")}>Vegetarian, no seafood</Chip>
              <Chip onClick={() => addChip("Busy evenings; short home workouts", "prefs")}>Busy evenings; short home workouts</Chip>
              <Chip onClick={() => addChip("Bad knees, prefer low-impact", "prefs")}>Bad knees, prefer low-impact</Chip>
              <Chip onClick={() => addChip("Budget-friendly meals", "prefs")}>Budget-friendly meals</Chip>
            </ChipRow>
          </label>

          <div className="pl-actions">
            <button className="pl-btn primary" disabled={!canGenerate}>
              {loading ? "Generating…" : "Generate plan"}
            </button>
            <button type="button" className="pl-btn ghost" onClick={clearAll} disabled={loading && !goals && !prefs && !plan}>Clear</button>
            {plan && (
              <>
                <button type="button" className="pl-btn" onClick={copyPlan}>Copy</button>
                <button type="button" className="pl-btn" onClick={downloadPlan}>Download</button>
                <button type="button" className="pl-btn" onClick={printPlan}>Print</button>
              </>
            )}
          </div>

          {error && (
            <div className="pl-error" role="alert">
              <span>{error}</span>
              <button type="button" className="pl-btn" onClick={generate}>Retry</button>
            </div>
          )}
        </form>
      </section>

      <section className="pl-card" aria-label="Generated plan">
        <div className="pl-card-head">
          <h3>Your 7-day plan</h3>
          <div className="pl-head-actions">
            <label className="pl-switch">
              <input type="checkbox" checked={prettyMode} onChange={(e) => setPrettyMode(e.target.checked)} />
              <span>{prettyMode ? "Pretty view" : "Raw"}</span>
            </label>
            {prettyMode && !!sections.length && (
              <button type="button" className="pl-btn ghost" onClick={toggleAll}>
                {allOpen ? "Collapse all" : "Expand all"}
              </button>
            )}
            {loading && <span className="pl-thinking">Thinking…</span>}
          </div>
        </div>

        {!loading && !plan && (
          <p className="pl-muted">Fill the form and click “Generate plan”.</p>
        )}

        {loading && (
          <div className="pl-skel">
            <div className="bar" /><div className="bar" /><div className="bar" />
          </div>
        )}

        {!loading && plan && prettyMode && (
          <PrettyPlan sections={sections} allOpen={allOpen} />
        )}

        {!loading && plan && !prettyMode && (
          <article className="pl-body mono">{plan}</article>
        )}
      </section>
    </main>
  );
}

/* -------- Pretty rendering -------- */

function PrettyPlan({ sections, allOpen }) {
  return (
    <div className="pp-grid">
      {normalizeToSevenDays(sections).map((sec, idx) => (
        <DayCard key={idx} section={sec} defaultOpen={allOpen} />
      ))}
    </div>
  );
}

function DayCard({ section, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const VISIBLE = 6; // show up to 6 items per day
  const items = showAll ? section.items : section.items.slice(0, VISIBLE);
  const hidden = Math.max(0, section.items.length - items.length);

  return (
    <div className={`pp-card ${open ? "open" : ""}`}>
      <button className="pp-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="pp-pill">{section.title}</span>
        <span className="pp-chevron" aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <>
          <ul className="pp-list">
            {items.map((it, i) => (
              <li key={i} className="pp-item">{decorate(it)}</li>
            ))}
          </ul>
          {hidden > 0 && (
            <div className="pp-more">
              <button type="button" className="pl-btn ghost" onClick={() => setShowAll(true)}>
                Show {hidden} more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Keyword → icon decoration
function decorate(text) {
  const t = String(text || "").trim();
  const lower = t.toLowerCase();
  let icon = "📝";
  if (/breakfast|morning|am\b/.test(lower)) icon = "🍳";
  else if (/lunch|midday|noon/.test(lower)) icon = "🍽️";
  else if (/dinner|evening|pm\b/.test(lower)) icon = "🍽️";
  else if (/walk|steps|exercise|workout|cycle|yoga|stretch/.test(lower)) icon = "🏃";
  else if (/insulin|metformin|meds?|dose|pill|tablet/.test(lower)) icon = "💊";
  else if (/hydrate|water|drink|fluids|\bL\b/.test(lower)) icon = "💧";
  else if (/sleep|bed|rest/.test(lower)) icon = "😴";
  else if (/check|glucose|meter|monitor|reading|finger|cgm/.test(lower)) icon = "🩸";
  else if (/snack|fruit|nuts|yogurt/.test(lower)) icon = "🍎";
  return (<><span className="pp-icon" aria-hidden>{icon}</span><span>{t}</span></>);
}

/* -------- Parse & normalize to 7 days -------- */

function parsePlan(text = "") {
  const lines = text.replace(/\r/g, "").split("\n");
  const sections = [];
  let cur = null;

  // Recognize Day headers in EN / HE / AR
  const dayRe = /^(?:day|יום|اليوم)\s*(\d+|one|two|three|four|five|six|seven)[:\-\s]?/i;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // New day heading
    if (dayRe.test(line)) {
      const num = line.match(/\d+/)?.[0];
      const idx = num ? Number(num) : undefined;
      const title = `Day ${idx || sections.length + 1}`;
      cur = { title, items: [] };
      sections.push(cur);
      continue;
    }

    // Bullet / numbered lines
    if (/^[•\-*\d]+[.)]?\s+/.test(line)) {
      if (!cur) { cur = { title: `Day ${sections.length + 1}`, items: [] }; sections.push(cur); }
      cur.items.push(line.replace(/^[•\-*\d]+[.)]?\s+/, "").trim());
    } else {
      if (!cur) { cur = { title: `Day ${sections.length + 1}`, items: [] }; sections.push(cur); }
      cur.items.push(line);
    }
  }

  // If no days detected but there is content, keep one section
  if (!sections.length && text.trim()) {
    return [{ title: "Recommended Schedule", items: text.split(/\n+/).filter(Boolean) }];
  }
  return sections;
}

// Always return exactly 7 days.
// If <7 sections or just one long section, distribute across 7 buckets.
function normalizeToSevenDays(sections = []) {
  if (!sections.length) return [];

  if (sections.length >= 7) {
    return sections.slice(0, 7).map((s, i) => ({
      title: /^day\s/iu.test(s.title) ? s.title : `Day ${i + 1}`,
      items: (s.items || []).filter(Boolean),
    }));
  }

  // Flatten all items and distribute round-robin
  const all = sections.flatMap(s => s.items || []).filter(Boolean);
  const result = Array.from({ length: 7 }, (_, i) => ({ title: `Day ${i + 1}`, items: [] }));
  let i = 0;
  for (const it of all) {
    result[i % 7].items.push(it);
    i++;
  }

  // Seed any empty days with a simple baseline tip
  for (const d of result) {
    if (d.items.length === 0) d.items.push("Focus on hydration, a 15–20 min walk, and balanced meals.");
  }
  return result;
}

/* -------- UI helpers -------- */

function ChipRow({ children }) { return <div className="pl-chips">{children}</div>; }
function Chip({ children, onClick }) { return <button type="button" className="pl-chip" onClick={onClick}>{children}</button>; }

function escapeHtml(s = "") {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/* -------- Styles -------- */

function PLStyles() {
  return (
    <style>{`
[data-plan] { --bg:#0b1220; --card:#0f172a; --line:#ffffff1a; --text:#e5ecff; --muted:#a5b4d6; --accent:#2563eb; --accent2:#1d4ed8; --ok:#10b981; }
.pl-wrap { max-width: 980px; margin: 0 auto; padding: 24px 16px; color: var(--text); }
.pl-head { display:flex; gap:12px; align-items:center; margin-bottom:12px; }
.pl-emoji { font-size: 28px; }
.pl-title { margin:0; font-size:26px; }
.pl-sub { margin:6px 0 0; color:var(--muted); font-size:14px; }

.pl-card { background: linear-gradient(180deg,#0f172a66,#0f172a88); border:1px solid var(--line); border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,.15); padding:14px; margin-bottom:16px; }
.pl-form { display:grid; gap:12px; }
.pl-label > span { display:block; font-weight:700; margin:4px 0 6px; font-size:14px; }
.pl-input { width:100%; resize:vertical; min-height:68px; padding:10px 12px; border-radius:10px; border:1px solid var(--line); background:#0f152b; color:var(--text); }
.pl-input::placeholder { color:#93a1c7; }
.pl-input:focus { outline:none; border-color:#2f5fff; box-shadow:0 0 0 3px #2563eb33; }

.pl-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
.pl-chip { background:#ffffff12; border:1px solid #ffffff24; color:var(--text); padding:6px 10px; border-radius:999px; cursor:pointer; font-size:12px; }
.pl-chip:hover { background:#ffffff1f; }

.pl-actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.pl-btn { border-radius:10px; padding:8px 12px; border:1px solid var(--line); background:#ffffff10; color:var(--text); font-weight:600; cursor:pointer; }
.pl-btn:hover { background:#ffffff18; }
.pl-btn.primary { background:var(--accent); border-color:var(--accent2); }
.pl-btn.primary:hover { background:var(--accent2); }
.pl-btn.ghost { background:transparent; }

.pl-error { display:flex; gap:10px; align-items:center; justify-content:space-between; padding:10px; border:1px solid #f87171; background:#f8717112; color:#fecaca; border-radius:10px; }

.pl-card-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
.pl-head-actions { display:flex; align-items:center; gap:10px; }
.pl-thinking { color:var(--muted); font-size:13px; }
.pl-muted { color:var(--muted); margin:6px 0; }
.pl-switch { display:inline-flex; align-items:center; gap:6px; color:var(--muted); font-size:13px; }
.pl-body { white-space:pre-wrap; line-height:1.65; font-size:15px; background:#0b1022; border:1px solid var(--line); padding:12px; border-radius:10px; }
.pl-body.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

/* Pretty Plan */
.pp-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:12px; }
.pp-card { border:1px solid var(--line); background:#0b1022; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,.18); overflow:hidden; }
.pp-head { width:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; background:linear-gradient(180deg,#111a35,#0d142b); border:none; color:var(--text); cursor:pointer; }
.pp-pill { display:inline-block; font-weight:800; font-size:13px; background:#1b2752; border:1px solid #26356c; padding:6px 10px; border-radius:999px; }
.pp-chevron { opacity:.8; }
.pp-list { list-style:none; margin:0; padding:10px 12px 12px; display:grid; gap:8px; }
.pp-more { padding: 0 12px 12px; }
.pp-item { display:flex; gap:8px; align-items:flex-start; line-height:1.55; }
.pp-icon { width:20px; display:inline-grid; place-items:center; filter: drop-shadow(0 1px 1px rgba(0,0,0,.3)); }

/* Skeleton */
.pl-skel { display:grid; gap:8px; }
.pl-skel .bar { height:12px; background:linear-gradient(90deg,#1a2340,#223061,#1a2340); border-radius:6px; animation: plShimmer 1.25s linear infinite; }
@keyframes plShimmer { 0%{opacity:.55} 50%{opacity:1} 100%{opacity:.55} }

@media (max-width: 640px) { .pl-title{font-size:22px} .pl-wrap{padding:18px 12px} }
    `}</style>
  );
}
