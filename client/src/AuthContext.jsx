// client/src/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { api, setOnUnauthorized } from "./api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user || { email });
    return data;
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  async function register(name, email, password) {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user || { email });
    return data;
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setReady(true); return; }
    api.get("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => logout())
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => () => logout());
  }, []);

  const value = { user, ready, login, logout, register, isAuthed: !!user };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
