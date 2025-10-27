import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";

const OK_MIN = 70;
const OK_MAX = 120;

function fmt(iso, locale) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale || undefined, { hour12: false });
}
function bucketTimeOfDay(iso) {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 22) return "Evening";
  return "Night";
}
function weekKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const firstJan = new Date(y, 0, 1);
  const days = Math.floor((dt - firstJan) / (1000 * 60 * 60 * 24));
  const wk = Math.floor((days + firstJan.getDay()) / 7) + 1;
  return `${y}-W${String(wk).padStart(2, "0")}`;
}

export default function Dashboard() {
  const { lang } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(14); // NEW: 7/14/30
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/readings");
      setItems(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // sort once
  const sorted = useMemo(() => [...items].sort((a,b)=> new Date(a.takenAt)-new Date(b.takenAt)), [items]);
  const last = sorted.at(-1);

  // filter by range
  const since = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - rangeDays + 1);
    return d;
  }, [rangeDays]);
  const inRangeWindow = useMemo(
    () => sorted.filter(r => new Date(r.takenAt) >= since),
    [sorted, since]
  );
  const lastWeeks = useMemo(
    () => sorted.filter(r => new Date(r.takenAt) >= (d => (d.setDate(d.getDate()-28), d))(new Date())),
    [sorted]
  );

  // time in range
  const tirCount = inRangeWindow.filter(x => x.glucose >= OK_MIN && x.glucose <= OK_MAX).length;
  const totalCount = inRangeWindow.length;
  const tirPct = totalCount ? Math.round((tirCount/totalCount)*100) : 0;

  // risks
  const lows = inRangeWindow.filter(x => x.glucose > 0 && x.glucose < OK_MIN).length;
  const slightHighs = inRangeWindow.filter(x => x.glucose > OK_MAX && x.glucose <= 250).length;
  const veryHighs = inRangeWindow.filter(x => x.glucose > 250).length;

  // time-of-day bars
  const todCounts = { Morning:0, Afternoon:0, Evening:0, Night:0 };
  inRangeWindow.forEach(r => { todCounts[bucketTimeOfDay(r.takenAt)]++; });
  const todData = Object.entries(todCounts).map(([name, value]) => ({ name, value }));

  // weekly averages (last 4 weeks)
  const byWeek = {};
  lastWeeks.forEach(r => {
    const key = weekKey(r.takenAt);
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(Number(r.glucose || 0));
  });
  const weekSeries = Object.entries(byWeek)
    .map(([wk, arr]) => ({ wk, avg: arr.length ? Math.round(arr.reduce((s,v)=>s+v,0)/arr.length) : null }))
    .sort((a,b) => a.wk.localeCompare(b.wk))
    .slice(-4);

  // adherence & streak
  const daysSet = new Set(inRangeWindow.map(r => new Date(r.takenAt).toDateString()));
  const adherenceDays = daysSet.size; // days with >=1 check in range
  let streak = 0;
  for (let i=0; i<365; i++) {
    const d = new Date(); d.setDate(d.getDate()-i);
    if (daysSet.has(d.toDateString())) streak++;
    else break;
  }

  // insights
  const tips = [];
  if (last?.glucose != null) {
    if (last.glucose < OK_MIN) tips.push("Recent low — keep fast-acting carbs nearby and recheck.");
    else if (last.glucose > 250) tips.push("Very high — hydrate and follow your care plan.");
    else if (last.glucose > OK_MAX) tips.push("Above range — consider a post-meal check in 2 hours.");
    else tips.push("Great! Last value is in range.");
  }
  if (veryHighs >= 1) tips.push("At least one very high reading in this period.");
  if (lows >= 2) tips.push("Multiple lows — discuss dose adjustments with your clinician.");
  if (streak >= 3) tips.push(`Nice streak: ${streak} day(s) logging in a row.`);
  if (!tips.length) tips.push("Add more readings to unlock insights.");

  // CSV export of current window
  function exportCSV() {
    setExporting(true);
    const headers = ["time","glucose","a1c","weight","systolic","diastolic"];
    const rows = inRangeWindow.map(r => [
      new Date(r.takenAt).toISOString(),
      r.glucose ?? "",
      r.a1c ?? "",
      r.weight ?? "",
      r.systolic ?? "",
      r.diastolic ?? "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `glucose-${rangeDays}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(()=>setExporting(false), 600);
  }

  const donutData = [
    { name: "In range", value: tirCount },
    { name: "Out of range", value: totalCount - tirCount },
  ];
  const donutColors = ["#10b981", "#ef4444"];

  const gaugeData = [{ name: "TIR", value: tirPct }];

  return (
    <main className="container" style={{padding:"28px 0 40px"}}>
      {/* header */}
      <section className="page-head">
        <div>
          <h1 className="h1">📋 Dashboard</h1>
          <p className="muted">Color-coded status, habits, adherence, and weekly trends.</p>
        </div>
        <div className="badge">{items.length} total readings</div>
      </section>

      {/* range toggle */}
      <div className="segment">
        <button className={`seg ${rangeDays===7 ? "active":""}`} onClick={()=>setRangeDays(7)}>Last 7d</button>
        <button className={`seg ${rangeDays===14 ? "active":""}`} onClick={()=>setRangeDays(14)}>Last 14d</button>
        <button className={`seg ${rangeDays===30 ? "active":""}`} onClick={()=>setRangeDays(30)}>Last 30d</button>
        <div className="spacer" />
        <button className="btn" onClick={exportCSV} disabled={exporting || !totalCount}>
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* KPI strip */}
      <section className="kpis">
        <div className="kpi">
          <div className="kpi-label">Last</div>
          <div className="kpi-value">{last?.glucose ?? "—"}</div>
          <div className="kpi-sub">{last ? fmt(last.takenAt, lang==="he"?"he-IL":(lang==="ar"?"ar":undefined)) : "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Time in Range</div>
          <div className="kpi-value">{tirPct}%</div>
          <div className="kpi-sub">{tirCount}/{totalCount}</div>
        </div>
        <div className="kpi warn">
          <div className="kpi-label">Highs 181–250</div>
          <div className="kpi-value">{slightHighs}</div>
          <div className="kpi-sub">{rangeDays}d</div>
        </div>
        <div className="kpi danger">
          <div className="kpi-label">Lows &lt;70</div>
          <div className="kpi-value">{lows}</div>
          <div className="kpi-sub">{rangeDays}d</div>
        </div>
      </section>

      {/* top grid: gauge + donut + insights */}
      <section className="grid-3">
        {/* Gauge: Time in Range */}
        <div className="card big">
          <h3 className="card-title">Time in Range (TIR)</h3>
          <div style={{height:260}}>
            {loading ? <div className="skeleton" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="60%" outerRadius="100%" data={gaugeData} startAngle={180} endAngle={0}>
                  <PolarAngleAxis type="number" domain={[0,100]} tick={false} />
                  <RadialBar minAngle={15} background dataKey="value" />
                  {/* label */}
                </RadialBarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="muted">Target typically ≥70% (individualized by clinician).</div>
        </div>

        {/* Donut: in vs out of range */}
        <div className="card big">
          <h3 className="card-title">In-range vs Out-of-range</h3>
          <div style={{height:260}}>
            {loading ? <div className="skeleton" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} label>
                    {donutData.map((e, i) => <Cell key={i} fill={["#10b981", "#ef4444"][i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="card big">
          <h3 className="card-title">Quick insights</h3>
          <ul style={{margin:0, paddingLeft: "18px", lineHeight:1.9}}>
            {tips.map((t,i)=><li key={i}>{t}</li>)}
          </ul>
        </div>
      </section>

      {/* habits + weekly averages */}
      <section className="grid-2" style={{marginTop:14}}>
        <div className="card big">
          <h3 className="card-title">Checks by time of day</h3>
          <div style={{height:300}}>
            {loading ? <div className="skeleton" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={todData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card big">
          <h3 className="card-title">Weekly average (last 4 weeks)</h3>
          <div style={{height:300}}>
            {loading ? <div className="skeleton" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="wk" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* adherence */}
      <section className="card" style={{marginTop:16}}>
        <h3 className="card-title">Adherence & Streak</h3>
        <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
          <div className="pill">{adherenceDays} day(s) with checks in last {rangeDays}</div>
          <div className="pill">{streak} day(s) logging streak</div>
          <div className="pill">Total {totalCount} readings in window</div>
        </div>
      </section>
    </main>
  );
}
