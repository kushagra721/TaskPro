import OrgBadge from './OrgBadge.jsx';

/**
 * "Which workspace domain are you signing in on?" — the **native app only**.
 *
 * A browser is already on a domain, so `X-App-Host` answers this and the picker
 * never renders there. A Capacitor WebView has no meaningful hostname, and
 * since accounts are keyed by `(email, domainId)` the same address can be
 * several genuinely different accounts. This is where the user says which one.
 *
 * Only shown when there is a real choice: `Login` skips straight past a single
 * domain, so the common case is unchanged and nobody sees an extra screen for a
 * decision with one option.
 */
export default function DomainPicker({ email, domains, onSelect, onBack, busy }) {
  return (
    <div className="domain-picker">
      <h1 className="auth__title">Choose your workspace</h1>
      <p className="auth__subtitle">
        <strong>{email}</strong> has an account on {domains.length} domains. Pick the one you want to
        sign in to.
      </p>

      <ul className="domain-picker__list">
        {domains.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              className="domain-picker__item"
              disabled={busy}
              onClick={() => onSelect(d)}
            >
              <OrgBadge name={d.brandName || d.domain} photoUrl={d.logoUrl} size={40} />
              <span className="domain-picker__text">
                <span className="domain-picker__brand">{d.brandName || d.domain}</span>
                <span className="domain-picker__host">{d.domain}</span>
              </span>
              {/* A domain still awaiting DNS/SSL can be signed into, but it is
                  worth flagging: it is the one that may not load in a browser. */}
              {d.status !== 'LIVE' && <span className="domain-picker__pending">Setup pending</span>}
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="link-btn" onClick={onBack} disabled={busy}>
        ← Use a different email
      </button>
    </div>
  );
}
