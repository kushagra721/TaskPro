import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import PlatformPager from '../PlatformPager.jsx';
import { BuildingIcon, SearchIcon, RotateIcon } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

/** Reseller's "Workspaces" tab — one row per client workspace (Organization)
 *  under this reseller. Read-only: a reseller can no longer create workspaces
 *  from the portal (that's a Super Admin action now), so there's no "Add"
 *  affordance here any more. Sibling of `MembersPage.jsx`, which shows the
 *  same underlying orgs aggregated per-user instead. */
export default function ResellerWorkspacesPage() {
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = (spinner) => {
    spinner(true);
    platformApi.clients
      .list({ q: debouncedSearch || undefined, page, limit: 20 })
      .then((res) => {
        setClients(res.clients);
        setPagination(res.pagination);
      })
      .finally(() => spinner(false));
  };

  useEffect(() => {
    load(setLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page]);

  return (
    <div className="page">
      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">Workspaces</h2>
            <p className="platform-list-card__subtitle">
              {pagination.total} workspace{pagination.total === 1 ? '' : 's'} · showing page {pagination.page} of{' '}
              {pagination.totalPages}
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
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState icon={<BuildingIcon size={30} />} title="No workspaces yet" description="Workspaces you're assigned appear here once the Super Admin creates one for you." />
        ) : (
          <>
            <div className="table-wrap platform-list-card__scroll task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Workspace</th>
                    <th>Owner</th>
                    {/* <th>Domain</th> */}
                    {/* <th>Reseller</th> */}
                    <th>Members</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td className="task-table__name">{c.name}</td>
                      <td>
                        <div>{c.owner?.name || '—'}</div>
                        {/* <div className="muted" style={{ fontSize: 12.5 }}>{c.owner?.email}</div> */}
                      </td>
                      {/* <td>{c.domain || '—'}</td> */}
                      {/* <td>
                        {c.reseller ? (
                          <span className="status-pill status-pill--completed">{c.reseller.name}</span>
                        ) : (
                          <span className="status-pill status-pill--neutral">House / Direct</span>
                        )}
                      </td> */}
                      <td>{c.memberCount}</td>
                      <td><span className="status-pill status-pill--neutral">Free</span></td>
                      <td><span className="status-pill status-pill--completed">Active</span></td>
                      <td className="nowrap">{formatDateTime(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="task-cards">
              {clients.map((c) => (
                <div key={c.id} className="tcard">
                  <div className="tcard__row">
                    <div className="tcard__title">{c.name}</div>
                    <span className="status-pill status-pill--completed tcard__del">Active</span>
                  </div>
                  <div className="tcard__sub">{c.owner?.name || '—'} · {c.owner?.email}</div>
                  <div className="tcard__tags">
                    {/* <span>{c.domain || 'No domain'}</span> */}
                    {/* {c.reseller ? (
                      <span className="status-pill status-pill--completed">{c.reseller.name}</span>
                    ) : (
                      <span className="status-pill status-pill--neutral">House / Direct</span>
                    )} */}
                    <span>{c.memberCount} member{c.memberCount === 1 ? '' : 's'}</span>
                    <span className="status-pill status-pill--neutral">Free</span>
                  </div>
                  <div className="tcard__foot">
                    <span className="muted">Joined</span>
                    <span className="nowrap">{formatDateTime(c.createdAt)}</span>
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
