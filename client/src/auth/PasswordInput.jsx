// src/auth/PasswordInput.jsx
import { useState } from "react";

export default function PasswordInput({ value, onChange, placeholder = "••••••••", required=true }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        className="input"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete="current-password"
      />
      <div className="input-right">
        <button
          type="button"
          className="icon-btn"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={()=>setShow(s=>!s)}
          title={show ? "Hide" : "Show"}
        >
          {/* eye / eye-off SVG */}
          {show ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c5 0 9.27 3.11 11 7-1.73 3.89-6 7-11 7s-9.27-3.11-11-7c1.73-3.89 6-7 11-7zm0 3a4 4 0 100 8 4 4 0 000-8z"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5c2.5 0 4.76.74 6.64 1.98l1.94-1.94 1.41 1.41-18 18-1.41-1.41 3.02-3.02C3.7 18.06 1.9 16.34 1 14c1.73-3.89 6-7 11-7zm0 3c-.46 0-.9.08-1.31.22l6.09 6.09A4 4 0 0012 8z"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}
