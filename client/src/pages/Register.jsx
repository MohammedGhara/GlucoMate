import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n";
import AuthLayout from "../auth/AuthLayout";
import PasswordInput from "../auth/PasswordInput";
import "../auth/auth.css";

export default function Register() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { register } = useAuth();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]   = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
      nav("/dashboard");
    } catch (e) {
      setErr(e?.response?.data?.msg || e.message || (t("register_failed") || "Register failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={t("signup") || "Create account"}
      subtitle={t("signup_sub") || "Start your journey in minutes"}
    >
      {err && <div className="err" role="alert">{err}</div>}

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="f-row">
          <label className="label" htmlFor="name">{t("name") || "Name"}</label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            required
          />
        </div>

        <div className="f-row">
          <label className="label" htmlFor="email">{t("email") || "Email"}</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="f-row">
          <label className="label" htmlFor="password">{t("password") || "Password"}</label>
        </div>
        <PasswordInput
          value={password}
          onChange={e=>setPassword(e.target.value)}
        />

        <button className="btn" disabled={busy}>
          {busy ? (t("loading") || "Loading…") : (t("submit") || "Create account")}
        </button>
      </form>

      <p className="helper">
        {t("have_account") || "Already have an account?"}{" "}
        <Link className="link" to="/login">{t("login") || "Sign in"}</Link>
      </p>
    </AuthLayout>
  );
}
