import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, Legend
} from "recharts";

/* ---------- helpers ---------- */
const pad = (n) => String(n).padStart(2, "0");
function toLocalInputValue(d = new Date()) {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}
function fmtDateTime(iso, locale) {
  const d = new Date(iso);
  return d.toLocaleString(locale || undefined, { hour12: false });
}

/* ---------- component ---------- */
export default function Readings() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ type: "", msg: "" });

  const [form, setForm] = useState({
    glucose: "", a1c: "", weight: "", systolic: "", diastolic: "",
    takenAt: toLocalInputValue()
  });

  function change(k, v) { setForm(s => ({ ...s, [k]: v })); }
  function showToast(type, msg) { setToast({ type, msg }); setTimeout(()=>setToast({type:"", msg:""}), 2500); }

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/readings");
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  async function add(e) {
    e.preventDefault();
    const g = Number(form.glucose);
    if (Number.isNaN(g) || g <= 20 || g >= 600) {
      return showToast("error", "Glucose must be between 20–600 mg/dL");
    }
    try {
      const local = new Date(form.takenAt);
      await api.post("/readings", {
        glucose: g,
        a1c: form.a1c ? Number(form.a1c) : null,
        weight: form.weight ? Number(form.weight) : null,
        // 🔁 CHANGED: systolic remains numeric (insulin units),
        // diastolic is now a string (insulin type) — no Number() coercion
        systolic: form.systolic ? Number(form.systolic) : null,
        diastolic: form.diastolic || null,
        takenAt: local.toISOString(),
      });
      setForm({ glucose: "", a1c: "", weight: "", systolic: "", diastolic: "", takenAt: toLocalInputValue() });
      await load();
      showToast("ok", "Saved!");
    } catch (e) {
      showToast("error", e.response?.data?.msg || e.message || "Save failed");
    }
  }

  useEffect(() => { load(); }, []);

  /* ---------- stats ---------- */
  const sorted = useMemo(() => [...items].sort((a,b)=>new Date(a.takenAt)-new Date(b.takenAt)), [items]);
  const last = sorted[sorted.length-1];
  const last14 = sorted.slice(-14);
  const avg14 = last14.length ? Math.round(last14.reduce((s,x)=>s+Number(x.glucose||0),0)/last14.length) : null;
  const high14 = last14.filter(x => x.glucose >= 180).length;
  const low14 = last14.filter(x => x.glucose > 0 && x.glucose < 70).length;

  const data = useMemo(() => last14.map(x => ({
    x: fmtDateTime(x.takenAt, lang === "he" ? "he-IL" : (lang === "ar" ? "ar" : undefined)),
    glucose: x.glucose
  })), [last14, lang]);

  const CustomTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="tip">
        <div className="tip-title">{label}</div>
        <div>🩸 {payload[0].value} mg/dL</div>
      </div>
    );
  };

  return (
    <main className="container" style={{padding:"28px 0 40px"}}>
      {/* header */}
      <section className="page-head">
        <div>
          <h1 className="h1">📊 {t("nav_readings")}</h1>
          <p className="muted">
            Track your glucose with timestamps. Keep between <b>70–180 mg/dL</b> when possible.
          </p>
        </div>
        <div className="badge">{items.length} entries</div>
      </section>

      {/* KPIs */}
      <section className="kpis">
        <div className="kpi">
          <div className="kpi-label">Last glucose</div>
          <div className="kpi-value">{last?.glucose ?? "—"}</div>
          <div className="kpi-sub">{last ? fmtDateTime(last.takenAt, lang==="he"?"he-IL":(lang==="ar"?"ar":undefined)) : "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">14-day avg</div>
          <div className="kpi-value">{avg14 ?? "—"}</div>
          <div className="kpi-sub">mg/dL</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Highs ≥180</div>
          <div className="kpi-value">{high14}</div>
          <div className="kpi-sub">last 14</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Lows &lt;70</div>
          <div className="kpi-value">{low14}</div>
          <div className="kpi-sub">last 14</div>
        </div>
      </section>

      {/* form + chart */}
      <section className="grid-2">
        <form onSubmit={add} className="card big">
          <h3 className="card-title">➕ {t("add_reading")}</h3>
          <div className="form-grid">
            <div className="form-item">
              <label>🩸 {t("glucose")}</label>
              <input className="input" inputMode="numeric" value={form.glucose} onChange={e=>change("glucose", e.target.value)} required />
            </div>
            <div className="form-item">
              <label>📈 {t("a1c")}</label>
              <input className="input" inputMode="decimal" value={form.a1c} onChange={e=>change("a1c", e.target.value)} />
            </div>
            <div className="form-item">
              <label>⚖️ {t("weight")}</label>
              <input className="input" inputMode="decimal" value={form.weight} onChange={e=>change("weight", e.target.value)} />
            </div>

            {/* 🔁 CHANGED FIELD 1: Systolic -> Insulin (units) */}
            <div className="form-item">
              <label>💉 Insulin (units)</label>
              <input
                className="input"
                inputMode="numeric"
                value={form.systolic}
                onChange={e=>change("systolic", e.target.value)}
                placeholder="e.g. 6"
              />
            </div>

            {/* 🔁 CHANGED FIELD 2: Diastolic -> Insulin type */}
            <div className="form-item">
              <label>💉 Insulin type</label>
              <select
                className="input"
                value={form.diastolic}
                onChange={e=>change("diastolic", e.target.value)}
              >
                <option value="">— choose —</option>
                <option value="Rapid">Rapid</option>
                <option value="Basal">Basal</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            <div className="form-item">
              <label>🕒 Time</label>
              <input className="input" type="datetime-local" value={form.takenAt} onChange={e=>change("takenAt", e.target.value)} />
            </div>
          </div>
          <div className="actions-right">
            <button className="btn primary">{t("save")}</button>
          </div>
          {toast.msg && (
            <div className={`toast ${toast.type === "ok" ? "ok" : "error"}`}>{toast.msg}</div>
          )}
        </form>

        <div className="card big">
          <h3 className="card-title">{t("chart_title")}</h3>
          <div style={{height: 360}}>
            {loading ? (
              <div className="skeleton" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <ReferenceArea y1={70} y2={180} />
                  <XAxis dataKey="x" />
                  <YAxis />
                  <Tooltip content={<CustomTip />} />
                  <Legend />
                  <Line type="monotone" dataKey="glucose" dot strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* table (unchanged) */}
      <section className="card" style={{marginTop:16}}>
        <h3 className="card-title">Latest readings</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Glucose</th>
                <th>A1C</th>
                <th>Weight</th>
                <th>BP</th>
              </tr>
            </thead>
            <tbody>
              {[...items].sort((a,b)=>new Date(b.takenAt)-new Date(a.takenAt)).slice(0,30).map(r=>(
                <tr key={r.id}>
                  <td>{fmtDateTime(r.takenAt, lang==="he"?"he-IL":(lang==="ar"?"ar":undefined))}</td>
                  <td><span className="chip">{r.glucose ?? "—"}</span></td>
                  <td>{r.a1c ?? "—"}</td>
                  <td>{r.weight ?? "—"}</td>
                  <td>{r.systolic && r.diastolic ? `${r.systolic}/${r.diastolic}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
