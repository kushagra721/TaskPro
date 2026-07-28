import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import { PlusIcon, UserIcon } from '../../components/icons.jsx';
import { formatDate } from '../../utils/status.js';

export default function ResellersPage() {
  const navigate = useNavigate();
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    platformApi.resellers
      .list()
      .then((res) => setResellers(res.resellers))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <h1 className="page__title">Resellers</h1>
          <p className="page__subtitle">Create &amp; manage reseller accounts.</p>
        </div>
        <button className="btn" onClick={() => navigate('/platform/admin/resellers/new')}>
          <PlusIcon size={16} /> Add reseller
        </button>
      </div>

      {loading ? (
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      ) : resellers.length === 0 ? (
        <EmptyState
          icon={<UserIcon size={30} />}
          title="No resellers yet"
          description="Create a reseller account — they sign in with mobile + OTP and manage their own clients."
        />
      ) : (
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Reseller</th>
                <th>Login mobile</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {resellers.map((r) => (
                <tr key={r.id}>
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
                  <td className="nowrap">{r.loginMobile}</td>
                  <td>{r.email || '—'}</td>
                  <td><span className="status-pill status-pill--completed">{r.status}</span></td>
                  <td className="nowrap">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
