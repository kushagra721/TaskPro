import { useCallback, useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PlatformPager from '../PlatformPager.jsx';
import Select from '../../components/Select.jsx';
import { CreditCardIcon, RotateIcon, SearchIcon, XIcon } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const STATUS_LABEL = {
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};
const STATUS_DOT = {
  PENDING: 'mandate-dot--pending',
  ACTIVE: 'mandate-dot--active',
  PAUSED: 'mandate-dot--paused',
  CANCELLED: 'mandate-dot--cancelled',
  FAILED: 'mandate-dot--failed',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.keys(STATUS_LABEL).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

function StatCard({ label, value }) {
  return (
    <div className="mandate-stat">
      <div className="mandate-stat__label">{label}</div>
      <div className="mandate-stat__value">{value}</div>
    </div>
  );
}

/**
 * Reseller portal → Manage Mandates → **Mandates**: every autopay authorisation
 * across this reseller's client workspaces. A mandate is created when a
 * workspace subscribes to one of their plans (`billing.service.js#changePlan`)
 * and withdrawn when the plan is cancelled.
 *
 * Everything sits at **pending** today because a mandate can only be authorised
 * by a payment provider and none is wired up yet — that's a real state, not a
 * placeholder, so it's shown as-is rather than faked to "active".
 */
export default function MandatesPage() {
  const [mandates, setMandates] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debounced, status]);

  const load = useCallback(
    (spinner) => {
      spinner(true);
      platformApi.mandates
        .list({ status: status || undefined, q: debounced || undefined, page, limit: 10 })
        .then((res) => {
          setMandates(res.mandates);
          setStats(res.stats);
          setPagination(res.pagination);
        })
        .finally(() => spinner(false));
    },
    [status, debounced, page]
  );

  useEffect(() => load(setLoading), [load]);

  const cancel = async () => {
    setBusy(true);
    setError('');
    try {
      await platformApi.mandates.cancel(target.id);
      setTarget(null);
      load(setReloading);
    } catch (err) {
      setError(err.message || 'Could not cancel the mandate');
    } finally {
      setBusy(false);
    }
  };

  const Status = ({ m }) => (
    <>
      <span className="mandate-status">
        <span className={`mandate-dot ${STATUS_DOT[m.status]}`} />
        {STATUS_LABEL[m.status]}
      </span>
      {m.status === 'CANCELLED' && m.cancelledBy && (
        <div className="mandate-substatus">Cancelled by {m.cancelledBy}.</div>
      )}
    </>
  );

  return (
    <div className="page">
      <div className="mandate-stats">
        <StatCard label="Active Mandates" value={stats.active ?? 0} />
        <StatCard label="Total Mandates" value={stats.total ?? 0} />
        <StatCard label="Pending Authorization" value={stats.pending ?? 0} />
        <StatCard label="Cancelled" value={stats.cancelled ?? 0} />
      </div>

      <div className="mandate-chips">
        <span className="mandate-chip">
          Failed <strong>{stats.failed ?? 0}</strong>
        </span>
        <span className="mandate-chip">
          Paused <strong>{stats.paused ?? 0}</strong>
        </span>
        <span className="mandate-chip">
          Active via UPI <strong>{stats.activeViaUpi ?? 0}</strong>
        </span>
      </div>

      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">All mandates</h2>
            <p className="platform-list-card__subtitle">
              Autopay authorisations taken from your client workspaces.
            </p>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => load(setReloading)} disabled={loading || reloading}>
              <RotateIcon size={15} className={reloading ? 'spin' : ''} /> Reload
            </button>
          </div>
        </div>

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
        ) : mandates.length === 0 ? (
          <EmptyState
            icon={<CreditCardIcon size={30} />}
            title="No mandates yet"
            description="A mandate is created when one of your client workspaces subscribes to a plan."
          />
        ) : (
          <>
            <div className="table-wrap platform-list-card__scroll task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Plan</th>
                    <th>Max / cycle</th>
                    <th>Debits</th>
                    <th>Taken on</th>
                    <th>Cancelled on</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mandates.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="task-table__name">{m.client.workspace}</div>
                        <div className="muted" style={{ fontSize: 12.5 }}>
                          {m.client.ownerName || m.client.ownerEmail || '—'}
                        </div>
                      </td>
                      <td>
                        <Status m={m} />
                      </td>
                      <td>{m.method}</td>
                      <td>
                        <div>{m.planName || '—'}</div>
                        {m.nextDebitAt && m.status !== 'CANCELLED' && (
                          <div className="muted" style={{ fontSize: 12 }}>
                            Renews {formatDateTime(m.nextDebitAt)}
                          </div>
                        )}
                      </td>
                      <td className="nowrap">{money(m.maxAmount)}</td>
                      <td>
                        <div>{m.debitCount}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {m.lastDebitAt ? `Last success · ${formatDateTime(m.lastDebitAt)}` : 'No debits yet'}
                        </div>
                      </td>
                      <td className="nowrap">{formatDateTime(m.takenOn)}</td>
                      <td className="nowrap">
                        {m.cancelledAt ? (
                          <>
                            <div>{formatDateTime(m.cancelledAt)}</div>
                            {m.cancelledBy && (
                              <div className="muted" style={{ fontSize: 12 }}>by {m.cancelledBy}</div>
                            )}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="table-actions">
                        {m.status !== 'CANCELLED' && (
                          <button className="btn btn--danger btn--sm" onClick={() => setTarget(m)}>
                            <XIcon size={14} /> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="task-cards">
              {mandates.map((m) => (
                <div key={m.id} className="tcard">
                  <div className="tcard__row">
                    <div className="tcard__title">{m.client.workspace}</div>
                    <span className="mandate-status tcard__del">
                      <span className={`mandate-dot ${STATUS_DOT[m.status]}`} />
                      {STATUS_LABEL[m.status]}
                    </span>
                  </div>
                  <div className="tcard__sub">{m.client.ownerName || m.client.ownerEmail || ' '}</div>
                  <div className="tcard__tags">
                    <span>{m.planName || 'No plan'}</span>
                    <span>{money(m.maxAmount)}</span>
                    <span>{m.method}</span>
                  </div>
                  <div className="tcard__foot">
                    <span className="nowrap muted">{formatDateTime(m.takenOn)}</span>
                    {m.status !== 'CANCELLED' && (
                      <button className="btn btn--danger btn--sm" onClick={() => setTarget(m)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <PlatformPager page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>

      {target && (
        <ConfirmModal
          title="Cancel this mandate?"
          confirmLabel="Cancel mandate"
          message={`${target.client.workspace}'s autopay authorisation will be withdrawn, so no further cycles can be debited automatically. Their plan itself is unaffected — they can re-authorise at any time.`}
          busy={busy}
          error={error}
          onConfirm={cancel}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}
