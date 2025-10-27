import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n";
import AuthLayout from "../auth/AuthLayout";
import PasswordInput from "../auth/PasswordInput";
import "../auth/auth.css";

export default function Login() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]   = useState("");
  const [ok, setOk]     = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      await login(email.trim(), password);
      setOk(t("welcome_back") || "Welcome back!");
      // tiny delay so the success state is visible
      setTimeout(()=>nav("/dashboard"), 400);
    } catch (e) {
      setErr(e?.response?.data?.msg || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={t("login") || "Login"}
      subtitle={t("login_sub") || "Access your dashboard"}
    >
      {err && <div className="err" role="alert">{err}</div>}
      {ok  && <div className="ok">{ok}</div>}

      <form className="auth-form" onSubmit={onSubmit}>
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
          <PasswordInput
            value={password}
            onChange={e=>setPassword(e.target.value)}
          />
         
        </div>

        <button className="btn" disabled={busy}>
          {busy ? (t("loading") || "Loading…") : (t("submit") || "Sign in")}
        </button>
      </form>

      <p className="helper">
        {t("No Account?") || "No account?"}{" "}
        <Link className="link" to="/register">{t("signup") || "Create one"}</Link>
      </p>
    </AuthLayout>
  );
}
