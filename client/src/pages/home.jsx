import { Link } from "react-router-dom";
import FeatureCard from "../components/FeatureCard";
import { useI18n } from "../i18n";
import "./home.css";

export default function Home() {
  const { t } = useI18n();

  return (
    <main className="home-wrap">
      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <h1 className="hero-title">
            {t("home_title", "Your daily partner for smarter glucose care")}
          </h1>
          <p className="hero-sub">
            {t("home_sub", "Log. Remind. Understand. Stay in range with simple, clear insights.")}
          </p>
          <div className="cta">
            <Link to="/register" className="btn btn-primary">
              {t("get_started", "Get started")}
            </Link>
            <Link to="/dashboard" className="btn btn-ghost">
              {t("demo", "Live demo")}
            </Link>
          </div>

          {/* tiny trust row */}
          <div className="trust">
            <span>✅ {t("no_medical_advice", "Educational – not medical advice")}</span>
            <span>🔐 {t("privacy_first", "Privacy-first")}</span>
            <span>🌐 {t("multilang", "English • العربية • עברית")}</span>
          </div>
        </div>

        <aside className="hero-card">
          <header className="hero-card-h">
            <span className="pulse-dot" />
            <b>{t("today", "Today")}</b>
          </header>
          <ul className="hero-list">
            <li>
              <span>{t("next_med", "Next med")}</span>
              <b>Metformin</b>
              <time>20:00</time>
            </li>
            <li>
              <span>{t("last_glucose", "Last glucose")}</span>
              <b className="num">112</b>
              <small>mg/dL</small>
            </li>
            <li>
              <span>{t("streak", "Streak")}</span>
              <b>6 {t("days", "days")}</b>
              <small>{t("on_time", "on-time")}</small>
            </li>
          </ul>
        </aside>
      </section>

      {/* FEATURES */}
      <section className="features">
        <FeatureCard
          icon="🩸"
          title={t("feat_glucose_log", "Glucose log")}
          text={t("feat_glucose_log_desc", "Fast entry, tags, and trend lines with safe-range highlights.")}
        />
        <FeatureCard
          icon="💊"
          title={t("feat_med_reminders", "Med reminders")}
          text={t("feat_med_reminders_desc", "Flexible schedules, push/email reminders, adherence tracking.")}
        />
        <FeatureCard
          icon="📈"
          title={t("feat_insights", "Insights")}
          text={t("feat_insights_desc", "Simple rules with A1C estimates and low/high guidance.")}
        />
        <FeatureCard
          icon="💬"
          title={t("feat_chat", "Chat")}
          text={t("feat_chat_desc", "Secure notes and attachments for caregivers or self.")}
        />
        <FeatureCard
          icon="🛡️"
          title={t("feat_privacy", "Privacy first")}
          text={t("feat_privacy_desc", "Encrypted in transit, hashed tokens, least-privilege access.")}
        />
        <FeatureCard
          icon="🌐"
          title={t("feat_multilang", "Multi-language")}
          text={t("feat_multilang_desc", "English • العربية • עברית across UI and tips.")}
        />
      </section>

      {/* HOW IT WORKS */}
      <section className="how">
        <div className="how-step">
          <span className="how-n">1</span>
          <h4>{t("how_1_t", "Create account")}</h4>
          <p>{t("how_1_d", "Set your targets and reminder times in minutes.")}</p>
        </div>
        <div className="how-step">
          <span className="how-n">2</span>
          <h4>{t("how_2_t", "Log & remind")}</h4>
          <p>{t("how_2_d", "Add readings, get nudges, and keep a simple streak.")}</p>
        </div>
        <div className="how-step">
          <span className="how-n">3</span>
          <h4>{t("how_3_t", "See insights")}</h4>
          <p>{t("how_3_d", "Spot patterns early and share a clean report when needed.")}</p>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="band">
        <div className="band-inner">
          <h3>{t("cta_title", "Ready to try GlucoMate?")}</h3>
          <p>{t("cta_sub", "It takes less than a minute to start. No card required.")}</p>
          <div className="band-actions">
            <Link to="/register" className="btn btn-primary">
              {t("cta_create_free", "Create free account")}
            </Link>
            <Link to="/dashboard" className="btn btn-ghost">
              {t("cta_open_demo", "Open demo")}
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        © {new Date().getFullYear()} GlucoMate — {t("educational_mvp", "Educational MVP")}.
      </footer>
    </main>
  );
}
