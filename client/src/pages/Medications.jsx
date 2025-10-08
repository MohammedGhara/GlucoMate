import { useEffect, useState } from "react";
import { api } from "../api";

// ---------- helpers ----------
function to12h(hhmm = "08:00") {
  const [H, M] = hhmm.split(":").map(Number);
  const am = H < 12;
  const h12 = ((H + 11) % 12) + 1; // 0->12, 13->1
  return { h: String(h12).padStart(2, "0"), m: String(M).padStart(2, "0"), ampm: am ? "AM" : "PM" };
}
function to24h(h, m, ampm) {
  let H = Number(h);
  if (ampm === "AM") H = H % 12;      // 12 AM -> 0
  else H = (H % 12) + 12;             // 12 PM -> 12; 1 PM -> 13
  return `${String(H).padStart(2, "0")}:${String(Number(m)).padStart(2, "0")}`;
}
function normalizeTimes(arr = []) {
  const uniq = Array.from(new Set(arr.filter(Boolean)));
  return uniq.sort(); // e.g., ["06:00","08:00","20:30"]
}

// ---------- inline time picker ----------
function TimeItem({ value, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const t = to12h(value || "08:00");
  const [h, setH] = useState(t.h);
  const [m, setM] = useState(t.m);
  const [ampm, setAmpm] = useState(t.ampm);

  useEffect(() => {
    const t2 = to12h(value || "08:00");
    setH(t2.h); setM(t2.m); setAmpm(t2.ampm);
  }, [value]);

  function confirm() {
    onChange(to24h(h, m, ampm));
    setOpen(false);
  }

  const pretty = to12h(value || "08:00");
  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", gap:8 }}>
      <button type="button" className="btn" onClick={() => setOpen(v=>!v)}>
        {pretty.h}:{pretty.m} {pretty.ampm}
      </button>
      <button type="button" className="btn" onClick={onRemove} title="Remove this reminder">✕</button>

      {open && (
        <div
          style={{
            position:"absolute", top:"110%", left:0, zIndex:20,
            padding:10, border:"1px solid rgba(255,255,255,.15)", borderRadius:12,
            background:"rgba(17,24,39,.95)", minWidth:220, display:"grid", gap:8
          }}
        >
          <div style={{ display:"flex", gap:8 }}>
            <select className="input" value={h} onChange={e=>setH(e.target.value)} style={{ width:80 }}>
              {["12","01","02","03","04","05","06","07","08","09","10","11"].map(v=>(
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <select className="input" value={m} onChange={e=>setM(e.target.value)} style={{ width:80 }}>
              {["00","05","10","15","20","25","30","35","40","45","50","55"].map(v=>(
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <select className="input" value={ampm} onChange={e=>setAmpm(e.target.value)} style={{ width:80 }}>
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button className="btn" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn primary" onClick={confirm}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Medications() {
  const [q, setQ] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadMine() {
    setLoading(true);
    const { data } = await api.get("/user-meds");
    setMine(data);
    setLoading(false);
  }
  async function searchCatalog() {
    const { data } = await api.get("/medications", { params: { q } });
    setCatalog(data);
  }
  useEffect(() => { loadMine(); searchCatalog(); }, []);

  async function add(med) {
    const dose = prompt(`Dose for ${med.generic_name} (e.g. 500 mg / 10 units)`) || "";
    if (!dose.trim()) return;
    await api.post("/user-meds", { medication_id: med.id, dose, times: ["08:00"] });
    await loadMine();
  }
  async function remove(user_med_id) {
    if (!confirm("Remove this medication?")) return;
    await api.delete(`/user-meds/${user_med_id}`);
    await loadMine();
  }
  async function updateDose(m, dose) {
    const times = (m.times || []).map(t => t.time_24h);
    await api.patch(`/user-meds/${m.user_med_id}`, { dose, times });
    await loadMine();
  }
  async function updateTimes(m, times) {
    const next = normalizeTimes(times);
    await api.patch(`/user-meds/${m.user_med_id}`, { dose: m.dose || "", times: next });
    await loadMine();
  }

  return (
    <main className="container" style={{padding:"28px 0 40px"}}>
      <section className="page-head">
        <div>
          <h1 className="h1">💊 Medications</h1>
          <p className="muted">Pick your meds, set dose and reminder times.</p>
        </div>
        <div className="badge">{mine.length} active</div>
      </section>

      {/* Search catalog */}
      <section className="card">
        <h3 className="card-title">Find medications</h3>
        <div style={{display:"flex", gap:10}}>
          <input className="input" placeholder="Search generic/brand/class…" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn" onClick={searchCatalog}>Search</button>
        </div>
        <div className="cards" style={{paddingTop:16}}>
          {catalog.map(m=>(
            <div className="card" key={m.id}>
              <div className="icon">💊</div>
              <h3>{m.generic_name}{m.brand_name ? ` • ${m.brand_name}` : ""}</h3>
              <p className="muted">{m.form} • {m.strength} • {m.class}</p>
              {m.notes && <p className="muted" style={{marginTop:6}}>{m.notes}</p>}
              <div style={{marginTop:10}}>
                <button className="btn primary" onClick={()=>add(m)}>Add</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* My meds */}
      <section className="card" style={{marginTop:16}}>
        <h3 className="card-title">My medications</h3>
        {loading ? <div className="skeleton" style={{height:120}}/> : (
          mine.length === 0 ? <p className="muted">No medications added yet.</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th style={{width:220}}>Dose</th>
                    <th>Times</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map(m=>{
                    const times = m.times?.map(t=>t.time_24h) || [];
                    return (
                      <tr key={m.user_med_id}>
                        <td>
                          <div style={{fontWeight:700}}>{m.generic_name}</div>
                          <div className="muted">
                            {m.brand_name ? `${m.brand_name} • ` : ""}{m.form}
                          </div>
                        </td>
                        <td>
                          <input
                            className="input"
                            value={m.dose || ""}
                            onChange={e=>updateDose(m, e.target.value)}
                            placeholder="e.g., 500 mg"
                          />
                        </td>
                        <td>
                          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                            {times.map((t,i)=>(
                              <TimeItem
                                key={i}
                                value={t}
                                onChange={(v)=>{ const next=[...times]; next[i]=v; updateTimes(m, next); }}
                                onRemove={()=>{ const next=times.filter((_,idx)=>idx!==i); updateTimes(m, next); }}
                              />
                            ))}
                            <button
                              className="btn"
                              onClick={()=>{
                                const next = normalizeTimes([...(m.times?.map(x=>x.time_24h)||[]), "08:00"]);
                                updateTimes(m, next);
                              }}
                            >
                              + time
                            </button>
                          </div>
                        </td>
                        <td><button className="btn" onClick={()=>remove(m.user_med_id)}>Remove</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>
    </main>
  );
}
