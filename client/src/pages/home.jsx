import { Link } from "react-router-dom";
import FeatureCard from "../components/FeatureCard";
import { useI18n } from "../i18n";

export default function Home() {
  const { t } = useI18n();
  return (
    <main className="container">
      <section className="hero">
        <div>
          <h1>{t("home_title")}</h1>
          <p>{t("home_sub")}</p>
          <div className="cta">
            <Link to="/register" className="btn primary">{t("get_started")}</Link>
            <Link to="/dashboard" className="btn">{t("demo")}</Link>
          </div>
        </div>
        <div className="card">
          <h3 style={{marginTop:0}}>Today</h3>
          <ul style={{margin:0, paddingLeft:"18px", lineHeight:1.9}}>
            <li>Next med: Metformin 20:00</li>
            <li>Last glucose: <b>112 mg/dL</b></li>
          </ul>
        </div>
      </section>

      {/* FEATURES */}
      <section className="cards">
        <FeatureCard icon={"🩸"} title="Glucose log"
          text="Quickly add readings and see trends over time with safe ranges." />
        <FeatureCard icon={"💊"} title="Med reminders"
          text="Flexible schedules, push/email reminders, and adherence tracking." />
        <FeatureCard icon={"📈"} title="Insights"
          text="Simple, rule-based guidance for high/low readings and A1C goals." />
        <FeatureCard icon={"💬"} title="Chat"
          text="Secure patient–caregiver chat with notes and attachments." />
        <FeatureCard icon={"🛡️"} title="Privacy first"
          text="Your data is encrypted in transit and stored securely." />
        <FeatureCard icon={"🌐"} title="Multi-language"
          text="English • العربية • עברית (UI & tips)." />
      </section>

      <footer className="footer">
        <div className="container">
          © {new Date().getFullYear()} GlucoMate — Educational MVP, not medical advice.
        </div>
      </footer>
    </main>
  );
}
