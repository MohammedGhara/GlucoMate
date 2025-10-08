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

  // restore session on first load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setReady(true);
      return;
    }
    // try to fetch me; don't hard-logout if it fails (network, etc.)
    api.get("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => {
        // token might be invalid → logout politely
        logout();
      })
      .finally(() => setReady(true));
  }, []);

  // hook global 401 handler
  useEffect(() => {
    setOnUnauthorized(() => () => {
      // only logout if token exists (api.js checks that) to avoid accidental sign-outs
      logout();
    });
  }, []);

  const value = { user, ready, login, logout, isAuthed: !!user };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
