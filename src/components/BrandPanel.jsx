const points = [
  'Passwordless email verification',
  'Organise tasks, projects & deadlines',
  'Fast, secure and works on any device',
];

export default function BrandPanel() {
  return (
    <aside className="auth__brand">
      <div className="brand__logo">
        <span className="brand__logo-mark">✓</span>
        Task&nbsp;Pro
      </div>

      <div className="brand__hero">
        <h1>Get more done, with less friction.</h1>
        <p>
          Sign in securely with a one-time code sent straight to your inbox — no
          passwords to remember, no fuss.
        </p>
      </div>

      <div className="brand__points">
        {points.map((p) => (
          <div className="brand__point" key={p}>
            <span className="check">✓</span>
            {p}
          </div>
        ))}
      </div>
    </aside>
  );
}
