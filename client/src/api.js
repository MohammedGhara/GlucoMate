// client/src/api.js
import axios from "axios";


export const api = axios.create({
  baseURL: "http://localhost:5000/api", // all client calls are now /api/*
  withCredentials: false,
});

// attach bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export function setOnUnauthorized(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      const hadToken = !!localStorage.getItem("token");
      if (hadToken && onUnauthorized) onUnauthorized();
    }
    return Promise.reject(err);
  }
);
