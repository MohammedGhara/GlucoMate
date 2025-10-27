// src/components/FeatureCard.jsx
export default function FeatureCard({ icon, title, text }) {
  return (
    <div className="feature-card-pro">
      <div className="feature-icon">{icon}</div>
      <h4 className="feature-title">{title}</h4>
      <p className="feature-text">{text}</p>
    </div>
  );
}
