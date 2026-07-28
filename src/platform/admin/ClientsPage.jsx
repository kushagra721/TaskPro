import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import Select from '../../components/Select.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PlatformPager from '../PlatformPager.jsx';
import { UserIcon, SearchIcon, RotateIcon } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [resellers, setResellers] = useState([]);
  const [resellerId, setResellerId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    platformApi.resellers.list().then((r) => setResellers(r.resellers));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, resellerId]);

  const load = (spinner) => {
    spinner(true);
    platformApi.clients
      .list({ resellerId: resellerId || undefined, q: debouncedSearch || undefined, page, limit: 10 })
      .then((res) => {
        setClients(res.clients);
        setPagination(res.pagination);
      })
      .finally(() => spinner(false));
  };

  useEffect(() => {
    load(setLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resellerId, debouncedSearch, page]);

  return (
    <div className="page">
      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">Clients</h2>
            <p className="platform-list-card__subtitle">
              Every client and the reseller they belong to (set from the domain they signed up on).
            </p>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => load(setReloading)} disabled={loading || reloading}>
              <RotateIcon size={15} className={reloading ? 'spin' : ''} /> Reload
            </button>
          </div>
        </div>

        <div className="list-controls">
          <div className="search-box task-toolbar">
            <SearchIcon className="search-box__icon" size={16} />
            <input
              className="search-box__input"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={resellerId}
            onChange={setResellerId}
            placeholder="All resellers"
            options={[{ value: '', label: 'All resellers' }, ...resellers.map((r) => ({ value: r.id, label: r.brandName || r.name }))]}
          />
        </div>

        <div className="platform-list-card__sub-head">
          <h3 className="platform-list-card__sub-title">All clients</h3>
          <p className="platform-list-card__sub-note">
            {pagination.total} client{pagination.total === 1 ? '' : 's'} matching the filters.
          </p>
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState icon={<UserIcon size={30} />} title="No clients found" description="Clients appear here once they sign up (directly, or through a reseller's custom domain)." />
        ) : (
          <>
            <div className="table-wrap platform-list-card__scroll">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Owner email</th>
                    <th>Reseller</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="task-table__name">{c.owner?.name || c.owner?.email || '—'}</div>
                        <div className="muted" style={{ fontSize: 12.5 }}>{c.name}</div>
                      </td>
                      <td>{c.owner?.email || '—'}</td>
                      <td>
                        {c.reseller ? (
                          <span className="status-pill status-pill--completed">{c.reseller.name}</span>
                        ) : (
                          <span className="status-pill status-pill--neutral">House / Direct</span>
                        )}
                      </td>
                      <td><span className="status-pill status-pill--completed">Active</span></td>
                      <td className="nowrap">{formatDateTime(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PlatformPager page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
