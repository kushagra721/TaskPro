import { CheckIcon } from '../components/icons.jsx';

/** Live preview of a reseller's white-labeled marketing home page — a scaled-down
 *  recreation of the app's own landing page (`pages/HomeLanding.jsx`) inside a
 *  browser-window frame, re-themed with the reseller's brand name / colour / logo.
 *  Purely presentational: it never fetches anything, it just mirrors whatever the
 *  Create-reseller form currently holds. */
export default function BrandPreview({ brandName, themeColor, logoUrl, domain }) {
  const brand = brandName?.trim() || 'Brand name';
  const color = themeColor || '#6366f1';
  const host = domain?.trim() || 'yourbrand.com';

  return (
    <div className="bp">
      <div className="bp__chrome">
        <span className="bp__dot" style={{ background: '#f87171' }} />
        <span className="bp__dot" style={{ background: '#fbbf24' }} />
        <span className="bp__dot" style={{ background: '#34d399' }} />
        <div className="bp__url">🔒 {host}</div>
      </div>

      <div className="bp__site">
        <div className="bp__header">
          <div className="bp__brand">
            {logoUrl ? (
              <img className="bp__logo" src={logoUrl} alt="" />
            ) : (
              <span className="bp__logo bp__logo--mark" style={{ background: color }}>
                <CheckIcon size={9} />
              </span>
            )}
            <span className="bp__brand-name">{brand}</span>
          </div>
          <div className="bp__nav">
            <span style={{ color, borderBottom: `1.5px solid ${color}` }}>Home</span>
            <span>About</span>
            <span>Product</span>
            <span>Pricing</span>
          </div>
          <span className="bp__cta" style={{ background: color }}>
            My Workspace
          </span>
        </div>

        <div className="bp__hero">
          <div className="bp__hero-text">
            <span
              className="bp__pill"
              style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
            >
              Now with real-time chat &amp; task tracking
            </span>
            <h3 className="bp__title">
              Turn your team into a <span style={{ color }}>task-crushing</span> workspace.
            </h3>
            <p className="bp__sub">
              {brand} brings workspaces, groups, chat and tasks into one place — invite your team,
              assign work, and watch it move in real time.
            </p>
            <div className="bp__btns">
              <span className="bp__btn" style={{ background: color }}>
                Get started free
              </span>
              <span className="bp__btn bp__btn--ghost">See how it works</span>
            </div>
            <div className="bp__ticks">
              {['No credit card', 'Live in minutes', 'Free to start'].map((t) => (
                <span key={t}>
                  <CheckIcon size={8} style={{ color }} /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Miniature of the product screenshot the real landing hero shows. */}
          <div className="bp__shot">
            <div className="bp__shot-bar">
              <span className="bp__shot-avatar" style={{ background: color }} />
              <span className="bp__shot-line" style={{ width: 46 }} />
            </div>
            <div className="bp__shot-stats">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bp__shot-stat">
                  <span className="bp__shot-num" style={{ color }}>
                    {[6, 3, 4, 2][i]}
                  </span>
                  <span className="bp__shot-line" style={{ width: '70%' }} />
                </div>
              ))}
            </div>
            <div className="bp__shot-body">
              <div className="bp__shot-chart">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                  <polyline
                    points="0,32 14,20 26,26 38,8 52,24 66,12 80,22 100,6"
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
              <div className="bp__shot-rows">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bp__shot-row">
                    <span className="bp__shot-tick" style={{ background: color }} />
                    <span className="bp__shot-line" style={{ flex: 1 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
