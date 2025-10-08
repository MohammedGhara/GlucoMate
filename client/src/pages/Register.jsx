import { useState } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";

export default function Register() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const { register } = useAuth();
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    try {
      await register(name, email, password);
      nav("/dashboard");
    } catch (e) {
    console.error(e);
    setErr(e.response?.data?.msg || e.message || "Register failed");
   }
  }

  return (
    <main className="container" style={{padding:"40px 0"}}>
      <h2>{t("signup")}</h2>
      {err && <div className="card" style={{borderColor:"#f87171"}}>{err}</div>}
      <form onSubmit={onSubmit} className="card" style={{maxWidth:520}}>
        <label>{t("name")}<br/>
          <input value={name} onChange={e=>setName(e.target.value)} required style={{width:"100%"}}/>
        </label><br/><br/>
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
