import { useCallback, useEffect, useMemo, useState } from 'react';
import { platformApi } from '../../api/client.js';
import { CreditCardIcon, RotateIcon } from '../../components/icons.jsx';
import { formatDate, formatDateTime } from '../../utils/status.js';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const STATUS_DOT = {
  ACTIVE: 'mandate-dot--active',
  PENDING: 'mandate-dot--pending',
  PAUSED: 'mandate-dot--paused',
};

// Windows are resolved to real dates at query time rather than stored, so a
// long-lived tab doesn't drift past midnight.
const RANGES = [
  { key: 'month', label: 'This month' },
  { key: 'today', label: 'Today' },
  { key: '7', label: 'Next 7 days' },
  { key: '30', label: 'Next 30 days' },
];

const windowFor = (key) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  if (key === 'today') return { from: startOfDay, to: endOfDay(now) };
  if (key === '7' || key === '30') {
    const to = new Date(startOfDay);
    to.setDate(to.getDate() + Number(key));
    return { from: startOfDay, to: endOfDay(to) };
  }
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

function StatCard({ label, value }) {
  return (
    <div className="mandate-stat">
      <div className="mandate-stat__label">{label}</div>
      <div className="mandate-stat__value">{value}</div>
    </div>
  );
}

/**
 * Reseller portal → Manage Mandates → **Projections**: what autopay is expected
 * to collect in a window.
 *
 * Sourced entirely from real `Mandate.nextDebitAt` rows — there is no
 * forecasting model here, and there shouldn't be one pretending to predict
 * revenue. "At risk" is the value on mandates that are due but **not ACTIVE**
 * (never authorised, or paused): those are the ones that will silently fail to
 * collect, which is the number worth chasing.
 */
export default function ProjectionsPage() {
  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  const win = useMemo(() => windowFor(range), [range]);

  const load = useCallback(
    (spinner) => {
      spinner(true);
      platformApi.projections
        .get({ from: win.from.toISOString(), to: win.to.toISOString() })
        .then(setData)
        .finally(() => spinner(false));
    },
    [win]
  );

  useEffect(() => load(setLoading), [load]);

  const stats = data?.stats ?? {};
  const dateWise = data?.dateWise ?? [];
  const collections = data?.collections ?? [];

  return (
    <div className="page">
      <div className="mandate-stats">
        <StatCard label="Expected Collection" value={money(stats.expectedCollection)} />
        <StatCard label="Debits Due" value={stats.debitsDue ?? 0} />
        <StatCard label="At Risk" value={money(stats.atRisk)} />
        <StatCard label="Blocked Mandates" value={stats.blockedMandates ?? 0} />
      </div>

      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">Upcoming collections</h2>
            <p className="platform-list-card__subtitle">Auto-debits scheduled against your clients&apos; mandates.</p>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => load(setReloading)} disabled={loading || reloading}>
              <RotateIcon size={15} className={reloading ? 'spin' : ''} /> Reload
            </button>
          </div>
        </div>

        <div className="range-pills">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`range-pill ${range === r.key ? 'range-pill--active' : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="range-note">
          Showing debits due {formatDate(win.from)} to {formatDate(win.to)} (IST).
        </p>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '25vh' }}>
            <span className="spinner" />
          </div>
        ) : (
          <>
            <h3 className="billing-section-title" style={{ fontSize: 15 }}>Date-wise collection</h3>
            <div className="table-wrap platform-list-card__scroll task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Debits due</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                {dateWise.length > 0 && (
                  <tbody>
                    {dateWise.map((d) => (
                      <tr key={d.date}>
                        <td className="nowrap">{formatDate(d.date)}</td>
                        <td>{d.debits}</td>
                        <td className="nowrap">{money(d.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
            {dateWise.length === 0 && <div className="projection-empty">No auto-debits due in this period.</div>}

            <h3 className="billing-section-title" style={{ fontSize: 15, marginTop: 22 }}>Collection list</h3>
            <div className="table-wrap platform-list-card__scroll task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Due on</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                {collections.length > 0 && (
                  <tbody>
                    {collections.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="task-table__name">{c.client.workspace}</div>
                          <div className="muted" style={{ fontSize: 12.5 }}>
                            {c.client.ownerName || c.client.ownerEmail || '—'}
                          </div>
                        </td>
                        <td>{c.planName || '—'}</td>
                        <td className="nowrap">{money(c.amount)}</td>
                        <td className="nowrap">{formatDateTime(c.dueOn)}</td>
                        <td>{c.method?.toUpperCase()}</td>
                        <td>
                          <span className="mandate-status">
                            <span className={`mandate-dot ${STATUS_DOT[c.status] || ''}`} />
                            {c.status.toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
            {collections.length === 0 && <div className="projection-empty">No auto-debits due in this period.</div>}

            {/* Mobile: the two tables above are desktop-only, so give the same
                rows as cards rather than leaving the page blank. */}
            <div className="task-cards">
              {collections.map((c) => (
                <div key={c.id} className="tcard">
                  <div className="tcard__row">
                    <div className="tcard__title">{c.client.workspace}</div>
                    <span className="mandate-status tcard__del">
                      <span className={`mandate-dot ${STATUS_DOT[c.status] || ''}`} />
                      {c.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="tcard__sub">{c.planName || ' '}</div>
                  <div className="tcard__tags">
                    <span>{money(c.amount)}</span>
                    <span>{c.method?.toUpperCase()}</span>
                  </div>
                  <div className="tcard__foot">
                    <span className="muted">Due on</span>
                    <span className="nowrap">{formatDateTime(c.dueOn)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
