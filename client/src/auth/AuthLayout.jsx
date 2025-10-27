// src/auth/AuthLayout.jsx
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-wrap">
      <section className="auth-card" role="region" aria-label={title}>
        <header className="auth-header">
          <span className="logo-dot" aria-hidden="true" />
          <div>
            <div className="auth-title">{title}</div>
            {subtitle && <div className="auth-sub">{subtitle}</div>}
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}
