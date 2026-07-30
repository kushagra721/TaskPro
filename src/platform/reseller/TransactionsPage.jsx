import { useCallback, useEffect, useMemo, useState } from 'react';
import { platformApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import PlatformPager from '../PlatformPager.jsx';
import Select from '../../components/Select.jsx';
import { DownloadIcon, ReceiptIcon, RotateIcon, SearchIcon } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const STATUS_LABEL = { PAID: 'Paid', NOT_COMPLETED: 'Not completed', FAILED: 'Failed' };
const STATUS_DOT = {
  PAID: 'mandate-dot--active',
  NOT_COMPLETED: 'mandate-dot--pending',
  FAILED: 'mandate-dot--failed',
};
const KIND_LABEL = { PLAN_CHANGE: 'Plan', TOPUP: 'Top-up', PLAN_CANCEL: 'Cancellation' };

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

// Date presets. `days: null` = all time; the value is resolved to a real cutoff
// at query time rather than stored, so a long-lived tab doesn't drift.
const RANGES = [
  { key: 'all', label: 'All time', days: null },
  { key: 'today', label: 'Today', days: 0 },
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: 'month', label: 'This month', days: 'month' },
];

const cutoffFor = (days) => {
  if (days === null) return undefined;
  const d = new Date();
  if (days === 'month') return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  d.setHours(0, 0, 0, 0);
  if (days) d.setDate(d.getDate() - days);
  return d.toISOString();
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
 * Reseller portal → Manage Mandates → **Transactions**: every billing event
 * across this reseller's client workspaces (plan changes, top-ups,
 * cancellations), sourced from `BillingTransaction`.
 *
 * The four stat totals describe the **whole selected date range** and are
 * deliberately not narrowed by the status/search filters — those narrow only
 * the list. The note under the range pills says so, matching the reference.
 */
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [range, setRange] = useState('all');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debounced, status, range]);

  const from = useMemo(() => cutoffFor(RANGES.find((r) => r.key === range)?.days ?? null), [range]);

  const load = useCallback(
    (spinner) => {
      spinner(true);
      platformApi.transactions
        .list({ status: status || undefined, q: debounced || undefined, from, page, limit: 10 })
        .then((res) => {
          setTransactions(res.transactions);
          setStats(res.stats);
          setPagination(res.pagination);
        })
        .finally(() => spinner(false));
    },
    [status, debounced, from, page]
  );

  useEffect(() => load(setLoading), [load]);

  return (
    <div className="page">
      <div className="mandate-stats">
        <StatCard label="Collected" value={money(stats.collected)} />
        <StatCard label="Successful Payments" value={stats.successful ?? 0} />
        <StatCard label="Not Completed" value={stats.notCompleted ?? 0} />
        <StatCard label="Failed" value={stats.failed ?? 0} />
      </div>

      <div className="mandate-chips">
        <span className="mandate-chip">
          Attempts <strong>{stats.attempts ?? 0}</strong>
        </span>
        <span className="mandate-chip">
          Failed value <strong>{money(stats.failedValue)}</strong>
        </span>
        <span className="mandate-chip">
          Abandoned value <strong>{money(stats.abandonedValue)}</strong>
        </span>
      </div>

      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">All payments</h2>
            <p className="platform-list-card__subtitle">Plan changes and top-ups across your client workspaces.</p>
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
          Dates filter on when the payment was started. The totals above cover the whole selected period; the status and
          search filters narrow only the list.
        </p>

        <div className="list-controls">
          <div className="search-box">
            <SearchIcon className="search-box__icon" size={16} />
            <input
              className="search-box__input"
              placeholder="Search by workspace or owner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onChange={setStatus} placeholder="All statuses" options={STATUS_OPTIONS} />
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon size={30} />}
            title="No payments in this period"
            description="Plan purchases and top-ups from your client workspaces show up here."
          />
        ) : (
          <>
            <div className="table-wrap platform-list-card__scroll task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Transaction</th>
                    <th>Started on</th>
                    <th>Paid on</th>
                    <th>Invoice</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="task-table__name">{t.client.workspace}</div>
                        <div className="muted" style={{ fontSize: 12.5 }}>
                          {t.client.ownerName || t.client.ownerEmail || '—'}
                        </div>
                      </td>
                      <td>
                        <div>{KIND_LABEL[t.kind]}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {t.kind === 'TOPUP' ? `${t.tasksDelta} tasks` : t.planName || '—'}
                        </div>
                      </td>
                      <td className="nowrap">{money(t.amount)}</td>
                      <td>{t.method.toUpperCase()}</td>
                      <td>
                        <span className="mandate-status">
                          <span className={`mandate-dot ${STATUS_DOT[t.status]}`} />
                          {STATUS_LABEL[t.status]}
                        </span>
                      </td>
                      <td>
                        <div className="txn-ref">{t.reference}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {t.gatewayRef || 'No gateway id'}
                        </div>
                      </td>
                      <td className="nowrap">{formatDateTime(t.createdAt)}</td>
                      <td className="nowrap">{t.paidAt ? formatDateTime(t.paidAt) : '-'}</td>
                      {/* Documents aren't generated yet — rendered as "-" rather
                          than a dead icon, same as the reference's older rows. */}
                      <td>{t.invoiceUrl ? <DocLink url={t.invoiceUrl} /> : '-'}</td>
                      <td>{t.receiptUrl ? <DocLink url={t.receiptUrl} /> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="task-cards">
              {transactions.map((t) => (
                <div key={t.id} className="tcard">
                  <div className="tcard__row">
                    <div className="tcard__title">{t.client.workspace}</div>
                    <span className="mandate-status tcard__del">
                      <span className={`mandate-dot ${STATUS_DOT[t.status]}`} />
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                  <div className="tcard__sub">{t.description}</div>
                  <div className="tcard__tags">
                    <span>{money(t.amount)}</span>
                    <span>{KIND_LABEL[t.kind]}</span>
                    <span>{t.method.toUpperCase()}</span>
                  </div>
                  <div className="tcard__foot">
                    <span className="muted">Started</span>
                    <span className="nowrap">{formatDateTime(t.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            <PlatformPager page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

function DocLink({ url }) {
  return (
    <a className="icon-btn" href={url} target="_blank" rel="noopener noreferrer" aria-label="Download">
      <DownloadIcon size={15} />
    </a>
  );
}
