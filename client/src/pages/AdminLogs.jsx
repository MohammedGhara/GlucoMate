// client/src/pages/AdminLogs.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

/**
 * AdminLogs — single-file with HUMAN SUMMARY in Details
 * - Details shows a clear sentence (e.g., "✅ User already done / logged in")
 * - Then shows a code-mode JSON viewer (pretty/min/raw, line numbers, copy, fullscreen)
 */
export default function AdminLogs() {
  useInjectStyles();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [entityType, setEntityType] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [actions, setActions] = useState([]);
  const [chainOk, setChainOk] = useState(null);

  const totalPages = useMemo(
    () => Math.max(Math.ceil((total || 1) / pageSize), 1),
    [total, pageSize]
  );

  function buildQueryString(p = page) {
    const qs = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (q) qs.set("q", q);
    if (action) qs.set("action", action);
    if (actor) qs.set("actor", actor);
    if (entityType) qs.set("entityType", entityType);
    if (since) qs.set("since", isoStartOfDay(since));
    if (until) qs.set("until", isoEndOfDay(until));
    return qs.toString();
  }

  async function load(p = 1) {
    setLoading(true); setErr("");
    try {
      const { data } = await api.get(`/admin/logs?${buildQueryString(p)}`);
      const arr = data.items || [];
      setItems(arr);
      setTotal(data.total ?? arr.length);
      setPage(data.page ?? p);
    } catch (e) {
      setErr(e?.response?.data?.msg || e.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    api.get("/admin/actions").then(({ data }) => setActions(data || []));
    api.get("/admin/logs.verify").then(({ data }) => setChainOk(!!data?.ok));
  }, []);

  function resetFilters() {
    setQ(""); setAction(""); setActor(""); setEntityType(""); setSince(""); setUntil("");
    load(1);
  }

  function exportCsv() {
    const headers = ["Time","Action","Email","Role","IP","EntityType","EntityId","Details","PrevHash","Hash"];
    const lines   = [headers.join(",")];
    items.forEach(r => {
      const details = r.details ?? r.newValue ?? r.oldValue ?? "";
      const pretty  = typeof details === "string" ? details : JSON.stringify(details);
      const row = [
        r.createdAt ? new Date(r.createdAt).toISOString() : "",
        r.action || "",
        r.actorEmail || "",
        r.actorRole || "",
        r.ip || "",
        r.entityType || "",
        r.entityId ?? "",
        pretty.replace(/"/g,'""'),
        r.prevHash || "",
        r.hash || ""
      ].map(v => `"${String(v).replace(/\n/g," ")}"`);
      lines.push(row.join(","));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="alx-wrap">
      <header className="alx-header">
        <div>
          <h1>🔐 Audit Logs</h1>
          <p className="alx-muted">Immutable trail of user & system actions (Part 11 ready).</p>
        </div>
        <div className="alx-badge">
          {items.length} shown · chain {chainOk === null ? "…" : chainOk ? "OK ✅" : "BROKEN ❌"}
        </div>
      </header>

      {/* Filters */}
      <section className="alx-card">
        <h3 className="alx-card-title">Filters</h3>
        <div className="alx-grid">
          <Field label="Search"><input className="alx-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="free text in action/details…" /></Field>
          <Field label="Action"><input className="alx-input" value={action} onChange={e=>setAction(e.target.value)} placeholder="e.g. auth.login" /></Field>
          <Field label="Actor email / id"><input className="alx-input" value={actor} onChange={e=>setActor(e.target.value)} placeholder="user@example.com" /></Field>
          <Field label="Entity type"><input className="alx-input" value={entityType} onChange={e=>setEntityType(e.target.value)} placeholder="e.g. UserMedication" /></Field>
          <Field label="Since"><input type="date" className="alx-input" value={since} onChange={e=>setSince(e.target.value)} /></Field>
          <Field label="Until"><input type="date" className="alx-input" value={until} onChange={e=>setUntil(e.target.value)} /></Field>
        </div>

        {!!actions.length && (
          <div className="alx-chips">
            {actions.slice(0, 14).map(a => (
              <button key={a} className={`alx-chip ${action===a ? "active":""}`} onClick={()=>{ setAction(a); load(1); }}>
                {a}
              </button>
            ))}
          </div>
        )}

        <div className="alx-actions">
          <button className="alx-btn alx-primary" onClick={()=>load(1)} disabled={loading}>Apply</button>
          <button className="alx-btn" onClick={resetFilters} disabled={loading}>Reset</button>
          <div style={{flex:1}} />
          <button className="alx-btn" onClick={exportCsv} disabled={!items.length}>Export CSV</button>
        </div>
      </section>

      {err && <div className="alx-error">{err}</div>}

      {/* Table */}
      <section className="alx-card">
        <div className="alx-table-wrap">
          <table className="alx-table">
            <thead>
              <tr>
                <th style={{minWidth:160}}>Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Entity</th>
                <th>ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7}><div className="alx-skeleton" /></td></tr>}
              {!loading && items.length===0 && <tr><td colSpan={7} className="alx-empty">No results</td></tr>}

              {!loading && items.map(row => {
                const payload = row.details ?? row.newValue ?? row.oldValue;
                return (
                  <tr key={row.id}>
                    <td title={row.createdAt}>
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                      <div className="alx-muted alx-small">{row.ip || "—"}</div>
                    </td>
                    <td>
                      <Badge value={row.action} />
                      <div><button className="alx-link" onClick={()=>{ setAction(row.action); load(1); }}>filter</button></div>
                    </td>
                    <td>{row.actorEmail || "—"}</td>
                    <td>{row.actorRole || "—"}</td>
                    <td>{row.entityType || "—"}</td>
                    <td>
                      <code>{row.entityId ?? "—"}</code>
                      {!!row.entityId && (
                        <button className="alx-btn alx-xs" style={{marginLeft:6}}
                          onClick={()=>navigator.clipboard.writeText(String(row.entityId))}>
                          copy
                        </button>
                      )}
                    </td>
                    <td>
                      {/* 👇 NEW: human summary first */}
                      <DetailsSummary row={row} payload={payload} />
                      {/* then the code-mode viewer */}
                      <CodePreview value={payload} />
                      <div className="alx-muted alx-hash">
                        <code>{short(row.prevHash || "", 12)}</code> → <code>{short(row.hash || "", 12)}</code>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="alx-pager">
          <button className="alx-btn" disabled={page<=1} onClick={()=>load(page-1)}>← Prev</button>
          <div>Page <strong>{page}</strong> / {totalPages}</div>
          <button className="alx-btn alx-primary" disabled={page>=totalPages} onClick={()=>load(page+1)}>Next →</button>
        </div>
      </section>
    </main>
  );
}

/* ---------------- Details summary ---------------- */

function DetailsSummary({ row, payload }) {
  const info = normalizePayload(payload);
  const a = (row.action || "").toLowerCase();
  const email = info.email || row.actorEmail || "user";
  const role  = info.role || row.actorRole || row.role || row.entityType || "";

  let text = "";
  let tone = "ok"; // ok | warn | err | info

  // --- auth flows ---
  if (a.startsWith("auth.login")) {
    if (info.result === "ok" || info.success === true) {
      text = `✅ Login OK — ${email}${role ? ` (${role})` : ""}`;
      tone = "ok";
    } else if (info.reason === "already") {
      text = `ℹ️ User already done — ${email} is already logged in`;
      tone = "info";
    } else {
      text = `❌ Login failed — ${email}${info.reason ? ` (${info.reason})` : ""}`;
      tone = "err";
    }
  } else if (a.startsWith("auth.register")) {
    if (info.exists || info.reason === "exists" || info.already === true) {
      text = `⚠️ User already done — ${email} exists`;
      tone = "warn";
    } else if (info.result === "ok" || info.success) {
      text = `✅ Registered — ${email}${role ? ` (${role})` : ""}`;
      tone = "ok";
    } else {
      text = `❌ Registration failed — ${email}${info.reason ? ` (${info.reason})` : ""}`;
      tone = "err";
    }
  }

  // --- CRUD & generic actions ---
  else if (a.includes("create")) {
    text = `🟢 Created ${row.entityType || "entity"} ${row.entityId ?? ""}`.trim();
  } else if (a.includes("update")) {
    const changed = info.changedFields?.length ? ` [${info.changedFields.join(", ")}]` : "";
    text = `🟡 Updated ${row.entityType || "entity"} ${row.entityId ?? ""}${changed}`;
  } else if (a.includes("remove") || a.includes("delete")) {
    text = `🔴 Removed ${row.entityType || "entity"} ${row.entityId ?? ""}`;
  } else {
    // fallback
    text = info.result === "ok" || info.success ? "✅ Action OK" : "ℹ️ Action";
    if (email && a.includes("auth")) text += ` — ${email}`;
  }

  return (
    <div className={`alx-kv ${tone}`}>
      <span className="alx-kv-text">{text}</span>
      {!!info.meta && <span className="alx-kv-meta">{info.meta}</span>}
    </div>
  );
}

function normalizePayload(p) {
  // make it easy to read different shapes
  if (!p || typeof p !== "object") return {};
  const email = p.email || p.userEmail || p.actorEmail;
  const role  = p.role || p.userRole || p.actorRole;
  const result = p.result;
  const success = p.success;
  const exists = p.exists;
  const reason = p.reason || p.error || p.msg;
  const changedFields = Array.isArray(p.changedFields) ? p.changedFields
                      : p.diff && typeof p.diff === "object" ? Object.keys(p.diff) : undefined;
  const meta = p.message || p.note || undefined;
  const already = p.already;
  return { email, role, result, success, exists, reason, changedFields, meta, already };
}

/* ---------------- tiny components ---------------- */

function Field({ label, children }) {
  return (
    <div className="alx-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Badge({ value }) {
  const tone = (value||"").startsWith("auth.") ? "blue"
            : (value||"").includes("update")    ? "amber"
            : (value||"").includes("remove")    ? "rose"
            : "slate";
  return <span className={`alx-badge-${tone}`}>{value || "—"}</span>;
}

/**
 * CodePreview — code-mode JSON viewer
 * pretty / min / raw · line numbers · copy · wrap · fullscreen
 */
function CodePreview({ value }) {
  if (value == null) return <span>—</span>;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("pretty");
  const [modal, setModal] = useState(false);
  const [wrap, setWrap] = useState(false);

  const isString = typeof value === "string";
  const pretty = isString ? value : JSON.stringify(value, null, 2);
  const raw    = isString ? value : JSON.stringify(value);
  const text   = mode === "pretty" ? pretty : mode === "min" ? raw : String(value);

  const html   = addLineNumbers(syntaxHighlight(escapeHtml(text)));

  return (
    <>
      <div className={`alx-code ${open ? "open" : ""} ${wrap ? "wrap" : ""}`} dangerouslySetInnerHTML={{ __html: html }} />
      <div className="alx-code-actions">
        {!isString && <button className="alx-link alx-small" onClick={()=>setOpen(v=>!v)}>{open ? "collapse" : "expand"}</button>}
        <button className="alx-link alx-small" onClick={()=>navigator.clipboard.writeText(text)}>copy</button>
        <span className="alx-dot" />
        <button className={`alx-link alx-small ${mode==="pretty"?"on":""}`} onClick={()=>setMode("pretty")}>pretty</button>
        <button className={`alx-link alx-small ${mode==="min"?"on":""}`} onClick={()=>setMode("min")}>min</button>
        <button className={`alx-link alx-small ${mode==="raw"?"on":""}`} onClick={()=>setMode("raw")}>raw</button>
        <span className="alx-dot" />
        <button className="alx-link alx-small" onClick={()=>setWrap(w=>!w)}>{wrap ? "no-wrap" : "wrap"}</button>
        <span className="alx-dot" />
        <button className="alx-link alx-small" onClick={()=>setModal(true)}>fullscreen</button>
      </div>

      {modal && (
        <div className="alx-modal" onClick={()=>setModal(false)}>
          <div className="alx-modal-dialog" onClick={e=>e.stopPropagation()}>
            <div className="alx-modal-head">
              <strong>Details</strong>
              <div style={{flex:1}} />
              <button className="alx-btn alx-xs" onClick={()=>navigator.clipboard.writeText(text)}>Copy</button>
              <button className="alx-btn alx-xs" onClick={()=>setModal(false)}>Close</button>
            </div>
            <div className="alx-modal-body">
              <pre className="alx-code open wrap" dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- helpers ---------------- */

function short(s="", max=12){ return s.length>max ? s.slice(0,max)+"…" : s; }
function isoStartOfDay(d){ if(!d) return ""; const [y,m,dd] = d.split("-").map(Number); return new Date(Date.UTC(y,m-1,dd,0,0,0,0)).toISOString(); }
function isoEndOfDay(d){ if(!d) return ""; const [y,m,dd] = d.split("-").map(Number); return new Date(Date.UTC(y,m-1,dd,23,59,59,999)).toISOString(); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/** Tiny JSON highlighter */
function syntaxHighlight(html){
  html = html.replace(/(&quot;[^&]*?&quot;)(\s*:\s*)/g, '<span class="tk-key">$1</span>$2');
  html = html.replace(/:&nbsp;?(&quot;[^&]*?&quot;)/g, ': <span class="tk-str">$1</span>');
  html = html.replace(/(&quot;[^&]*?&quot;)(?!\s*:)/g, '<span class="tk-str">$1</span>');
  html = html.replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="tk-num">$1</span>');
  html = html.replace(/\b(true|false|null)\b/g, '<span class="tk-bool">$1</span>');
  return html;
}
function addLineNumbers(html){
  const lines = html.split("\n");
  return lines.map((ln, i) =>
    `<span class="alx-ln">${i+1}</span><span class="alx-lc">${ln || "&nbsp;"}</span>`
  ).join("\n");
}

/* ---------------- style injector (one-file) ---------------- */

function useInjectStyles() {
  useEffect(() => {
    const id = "alx-styles";
    if (document.getElementById(id)) return;
    const css = `
:root { --alx-bg:#0B0F19; --alx-card:#161A24; --alx-border:rgba(255,255,255,.10);
        --alx-text:#E6E9F5; --alx-sub:#A8B2D1; --alx-accent:#7C8CFF; }
.alx-wrap{padding:28px 20px 40px;color:var(--alx-text);}
.alx-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.alx-muted{opacity:.75;color:var(--alx-sub)}
.alx-badge{background:rgba(255,255,255,.06);border:1px solid var(--alx-border);padding:8px 12px;border-radius:12px}
.alx-card{background:color-mix(in oklab, var(--alx-card) 92%, black 8%);border:1px solid var(--alx-border);border-radius:14px;padding:16px;margin-top:12px;box-shadow:0 4px 18px rgba(0,0,0,.3)}
.alx-card-title{margin:0 0 10px 0;font-weight:600}
.alx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.alx-field label{display:block;font-size:12px;color:var(--alx-sub);margin:0 0 6px 2px}
.alx-input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--alx-border);background:rgba(255,255,255,.05);color:var(--alx-text);outline:none}
.alx-input:focus{border-color:color-mix(in oklab, var(--alx-accent) 70%, white 30%);box-shadow:0 0 0 3px rgba(124,140,255,.15)}
.alx-actions{display:flex;gap:8px;margin-top:12px;align-items:center}
.alx-btn{background:rgba(255,255,255,.08);border:1px solid var(--alx-border);color:var(--alx-text);border-radius:10px;padding:8px 12px;cursor:pointer;transition:.18s}
.alx-btn:hover{background:rgba(255,255,255,.16)}
.alx-btn.alx-primary{background:var(--alx-accent);border:none;color:#0B0F19}
.alx-btn.alx-xs{padding:4px 8px;font-size:12px}
.alx-link{background:none;border:none;color:var(--alx-accent);cursor:pointer;padding:0}
.alx-link:hover{text-decoration:underline}
.alx-small{font-size:12px}
.alx-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.alx-chip{background:rgba(255,255,255,.06);border:1px solid var(--alx-border);border-radius:999px;padding:6px 12px;cursor:pointer}
.alx-chip.active{background:var(--alx-accent);border:none;color:#0B0F19}
.alx-error{border-left:3px solid #f87171;background:#7f1d1d33;padding:10px;border-radius:10px;margin-top:10px}
.alx-table{width:100%;border-collapse:collapse}
.alx-table th,.alx-table td{border-bottom:1px solid rgba(255,255,255,.08);padding:12px 10px;text-align:left;vertical-align:top}
.alx-table th{background:rgba(255,255,255,.04);font-weight:600;position:sticky;top:0}
.alx-table-wrap{overflow:auto;border-radius:10px}
.alx-empty{text-align:center;opacity:.75;padding:18px}
.alx-skeleton{height:120px;border-radius:10px;background:linear-gradient(90deg,#1a2030 25%,#2a3145 50%,#1a2030 75%);background-size:400% 100%;animation:alx-shimmer 1.2s infinite}
@keyframes alx-shimmer{100%{background-position:-400% 0}}
.alx-hash{font-size:11px;margin-top:6px}
.alx-badge-blue{background:#1e3a8a33;border:1px solid #3b82f633;border-radius:999px;padding:3px 10px}
.alx-badge-amber{background:#92400e33;border:1px solid #fbbf2433;border-radius:999px;padding:3px 10px}
.alx-badge-rose{background:#7f1d1d33;border:1px solid #f8717133;border-radius:999px;padding:3px 10px}
.alx-badge-slate{background:#0f172a33;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:3px 10px}

/* ---- human summary pill ---- */
.alx-kv{display:flex;gap:10px;align-items:center;margin-bottom:6px}
.alx-kv.ok .alx-kv-text{color:#9BE58B}
.alx-kv.warn .alx-kv-text{color:#FFD278}
.alx-kv.err .alx-kv-text{color:#FF8A8A}
.alx-kv.info .alx-kv-text{color:#80D4FF}
.alx-kv-text{font-weight:600}
.alx-kv-meta{opacity:.8}

/* ---- Code Mode ---- */
.alx-code{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  background:#0f1322;border:1px solid rgba(255,255,255,.12);border-radius:10px;margin:0;padding:10px 0;
  line-height:1.45;max-height:24px;overflow:hidden;white-space:pre;position:relative;}
.alx-code.open{max-height:340px;overflow:auto}
.alx-code.wrap{white-space:pre-wrap}
.alx-code-actions{display:flex;gap:10px;align-items:center;margin-top:6px}
.alx-dot{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.35)}
.alx-link.on{font-weight:700;text-decoration:underline}
.alx-ln{display:inline-block;min-width:2.6em;padding:0 10px 0 8px;margin-right:8px;text-align:right;color:#6272a4;user-select:none;border-right:1px solid rgba(255,255,255,.08)}
.alx-lc{display:inline-block;padding-right:12px}
.tk-key{color:#9cdcfe}
.tk-str{color:#c3e88d}
.tk-num{color:#f78c6c}
.tk-bool{color:#ffcb6b}

/* Modal */
.alx-modal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:60}
.alx-modal-dialog{width:min(1100px,92vw);max-height:88vh;background:#111629;border:1px solid rgba(255,255,255,.12);border-radius:14px;display:flex;flex-direction:column}
.alx-modal-head{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
.alx-modal-body{padding:12px;overflow:auto}
    `;
    const el = document.createElement("style");
    el.id = id;
    el.appendChild(document.createTextNode(css));
    document.head.appendChild(el);
  }, []);
}
