import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import Fab from '../../components/Fab.jsx';
import { PlusIcon, UserIcon, RotateIcon } from '../../components/icons.jsx';
import { formatDate } from '../../utils/status.js';

export default function ResellersPage() {
  const navigate = useNavigate();
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  const load = () => {
    setLoading(true);
    platformApi.resellers
      .list()
      .then((res) => setResellers(res.resellers))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const reload = () => {
    setReloading(true);
    platformApi.resellers
      .list()
      .then((res) => setResellers(res.resellers))
      .finally(() => setReloading(false));
  };

  return (
    <div className="page">
      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <div className="platform-list-card__title-row">
              <h2 className="platform-list-card__title">Resellers</h2>
              {!loading && <span className="tab__count">{resellers.length}</span>}
            </div>
            <p className="platform-list-card__subtitle">
              Create reseller accounts. Each reseller signs in with their email — password if you've set one, otherwise OTP.
            </p>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--ghost btn--sm" onClick={reload} disabled={loading || reloading}>
              <RotateIcon size={15} className={reloading ? 'spin' : ''} /> Reload
            </button>
            <button className="btn btn--sm hide-mobile" onClick={() => navigate('/platform/admin/resellers/new')}>
              <PlusIcon size={16} /> Add reseller
            </button>
          </div>
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : resellers.length === 0 ? (
          <EmptyState
            icon={<UserIcon size={30} />}
            title="No resellers yet"
            description="Create a reseller account — they sign in with email + OTP and manage their own clients."
          />
        ) : (
          <>
            <div className="table-wrap task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Reseller</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {resellers.map((r) => (
                    <tr
                      key={r.id}
                      className="row-clickable"
                      onClick={() => navigate(`/platform/admin/resellers/${r.id}`)}
                    >
                      <td>
                        <div className="reseller-cell">
                          {r.logoUrl ? (
                            <img className="reseller-cell__logo" src={r.logoUrl} alt="" />
                          ) : (
                            <span
                              className="reseller-cell__logo reseller-cell__logo--mark"
                              style={{ background: r.themeColor || 'var(--primary)' }}
                            >
                              {(r.brandName || r.name || '?')[0].toUpperCase()}
                            </span>
                          )}
                          <div>
                            <div className="task-table__name">{r.brandName || r.name}</div>
                            {r.brandName && <div className="muted" style={{ fontSize: 12.5 }}>{r.name}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{r.email}</td>
                      <td className="nowrap">{r.mobile || '—'}</td>
                      <td>
                        {r.plan ? (
                          <span className="status-pill status-pill--open">{r.plan.name}</span>
                        ) : (
                          <span className="status-pill status-pill--neutral">No plan</span>
                        )}
                      </td>
                      <td><span className="status-pill status-pill--completed">{r.status}</span></td>
                      <td className="nowrap">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="task-cards">
              {resellers.map((r) => (
                <div
                  key={r.id}
                  className="tcard row-clickable"
                  onClick={() => navigate(`/platform/admin/resellers/${r.id}`)}
                >
                  <div className="tcard__row">
                    {r.logoUrl ? (
                      <img className="reseller-cell__logo" src={r.logoUrl} alt="" />
                    ) : (
                      <span
                        className="reseller-cell__logo reseller-cell__logo--mark"
                        style={{ background: r.themeColor || 'var(--primary)' }}
                      >
                        {(r.brandName || r.name || '?')[0].toUpperCase()}
                      </span>
                    )}
                    <div className="tcard__title">{r.brandName || r.name}</div>
                    <span className="status-pill status-pill--completed tcard__del">{r.status}</span>
                  </div>
                  <div className="tcard__sub">{r.brandName ? r.name : ' '}</div>
                  <div className="tcard__tags">
                    <span>{r.email}</span>
                    <span className={`status-pill ${r.plan ? 'status-pill--open' : 'status-pill--neutral'}`}>
                      {r.plan ? r.plan.name : 'No plan'}
                    </span>
                    {r.mobile && <span>{r.mobile}</span>}
                  </div>
                  <div className="tcard__foot">
                    <span className="muted">Created</span>
                    <span className="nowrap">{formatDate(r.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Fab onClick={() => navigate('/platform/admin/resellers/new')} label="Add reseller" raised />
    </div>
  );
}
