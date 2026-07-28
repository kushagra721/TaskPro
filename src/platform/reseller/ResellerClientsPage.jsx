import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import PlatformPager from '../PlatformPager.jsx';
import { UserIcon, SearchIcon, RotateIcon, BuildingIcon, TaskIcon, GroupsIcon } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

const STAT_CARDS = [
  { key: 'totalClients', label: 'Total Clients', Icon: BuildingIcon },
  { key: 'totalMembers', label: 'Total Members', Icon: UserIcon },
  { key: 'openTasks', label: 'Open Tasks', Icon: TaskIcon },
  { key: 'totalGroups', label: 'Total Groups', Icon: GroupsIcon },
];

/** "Clients" — one row per client signup, labeled by the *person* (the
 *  workspace owner) rather than the workspace itself; the workspace name is
 *  a muted subtitle. Read-only — creating a workspace lives on the sibling
 *  "Workspace Management" tab (`ResellerWorkspacesPage.jsx`), since that's
 *  the action that actually happens (an Organization gets created). */
export default function ResellerClientsPage() {
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    platformApi.clients.stats().then(setStats);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, createdFrom, createdTo]);

  const load = (spinner) => {
    spinner(true);
    platformApi.clients
      .list({ q: debouncedSearch || undefined, createdFrom: createdFrom || undefined, createdTo: createdTo || undefined, page, limit: 20 })
      .then((res) => {
        setClients(res.clients);
        setPagination(res.pagination);
      })
      .finally(() => spinner(false));
  };

  useEffect(() => {
    load(setLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, createdFrom, createdTo, page]);

  const reloadAll = () => {
    platformApi.clients.stats().then(setStats);
    load(setReloading);
  };

  return (
    <div className="page">
      {stats && (
        <div className="platform-stats">
          {STAT_CARDS.map(({ key, label, Icon }) => (
            <div className="platform-stat" key={key}>
              <span className="platform-stat__icon">
                <Icon size={18} />
              </span>
              <div>
                <div className="platform-stat__label">{label}</div>
                <div className="platform-stat__value">{stats[key]}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">Clients</h2>
            <p className="platform-list-card__subtitle">
              {pagination.total} client{pagination.total === 1 ? '' : 's'} · showing page {pagination.page} of{' '}
              {pagination.totalPages}
            </p>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--ghost btn--sm" onClick={reloadAll} disabled={loading || reloading}>
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
          <input
            type="date"
            className="input"
            style={{ maxWidth: 160 }}
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            aria-label="Registered from"
          />
          <input
            type="date"
            className="input"
            style={{ maxWidth: 160 }}
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            aria-label="Registered to"
          />
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState icon={<UserIcon size={30} />} title="No clients found" description="Clients appear here once you add a workspace for them from Workspace Management." />
        ) : (
          <>
            <div className="table-wrap platform-list-card__scroll">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="reseller-cell">
                          <span className="reseller-cell__logo reseller-cell__logo--mark" style={{ background: 'var(--primary)' }}>
                            {(c.owner?.name || c.owner?.email || '?')[0].toUpperCase()}
                          </span>
                          <div>
                            <div className="task-table__name">{c.owner?.name || c.owner?.email || '—'}</div>
                            <div className="muted" style={{ fontSize: 12.5 }}>{c.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>{c.owner?.email || '—'}</td>
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
