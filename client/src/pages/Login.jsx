import { useState } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";

export default function Login() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const { login } = useAuth();

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await login(email, password);
      nav("/dashboard");
    } catch {
      setErr("Login failed");
    }
  }

  return (
    <main className="container" style={{padding:"40px 0"}}>
      <h2>{t("login")}</h2>
      {err && <div className="card" style={{borderColor:"#f87171"}}>{err}</div>}
      <form onSubmit={onSubmit} className="card" style={{maxWidth:500}}>
        <label>{t("email")}<br/>
          <input value={email} onChange={e=>setEmail(e.target.value)} required style={{width:"100%"}}/>
        </label><br/><br/>
        <label>{t("password")}<br/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={{width:"100%"}}/>
        </label><br/><br/>
        <button className="btn primary">{t("submit")}</button>
      </form>
    </main>
  );
}
