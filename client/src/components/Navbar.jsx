import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span className="logo">G</span>
          <span>{t("brand")}</span>
        </Link>

        <nav className="navlinks">
          <NavLink className="link" to="/">{t("nav_home")}</NavLink>
          <NavLink className="link" to="/dashboard">{t("nav_dashboard")}</NavLink>
          <NavLink className="link" to="/readings">{t("nav_readings")}</NavLink>
          <NavLink className="link" to="/medications">Medications</NavLink>
                    <NavLink className="link" to="/assistant">Assistant</NavLink>
          <NavLink className="link" to="/plan">Plan</NavLink>
          {user?.role === "admin" && (
            <NavLink className="link" to="/admin/logs">Admin Logs</NavLink>
          )}

        </nav>

        <div className="actions">
          <select className="btn" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="en">English</option>

            <option value="he">עברית</option>
            <option value="ar">العربية</option>
          </select>
          {user ? (
            <>
              <span className="btn">{user.name}</span>
              <button className="btn primary" onClick={logout}>{t("logout")}</button>
            </>
          ) : (
            <>
              <Link className="btn" to="/login">{t("login")}</Link>
              <Link className="btn primary" to="/register">{t("signup")}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
