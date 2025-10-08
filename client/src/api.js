// client/src/api.js
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: false,
});

// ✅ send token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ optional: centralized 401 handling that doesn't nuke your session unnecessarily
let onUnauthorized = null;
export function setOnUnauthorized(fn) { onUnauthorized = fn; }

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // only trigger logout if we actually *had* a token
      const hadToken = !!localStorage.getItem("token");
      if (hadToken && onUnauthorized) onUnauthorized();
    }
    return Promise.reject(err);
  }
);
