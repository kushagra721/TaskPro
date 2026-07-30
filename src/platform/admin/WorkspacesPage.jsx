import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import Select from '../../components/Select.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PlatformPager from '../PlatformPager.jsx';
import { BuildingIcon, SearchIcon, RotateIcon } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

/** Super Admin's "Workspaces" tab — one row per client Organization, across
 *  every reseller (and house/direct signups). Sibling of `MembersPage.jsx`,
 *  which shows the same underlying orgs aggregated per-user instead. */
export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([]);
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
        setWorkspaces(res.clients);
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
            <h2 className="platform-list-card__title">Workspaces</h2>
            <p className="platform-list-card__subtitle">
              Every client workspace and which reseller/domain it belongs to.
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
          <Select
            value={resellerId}
            onChange={setResellerId}
            placeholder="All resellers"
            options={[{ value: '', label: 'All resellers' }, ...resellers.map((r) => ({ value: r.id, label: r.brandName || r.name }))]}
          />
        </div>

        <div className="platform-list-card__sub-head">
          <h3 className="platform-list-card__sub-title">All workspaces</h3>
          <p className="platform-list-card__sub-note">
            {pagination.total} workspace{pagination.total === 1 ? '' : 's'} matching the filters.
          </p>
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : workspaces.length === 0 ? (
          <EmptyState icon={<BuildingIcon size={30} />} title="No workspaces found" description="Workspaces appear here once a client signs up (directly, or through a reseller's custom domain)." />
        ) : (
          <>
            <div className="table-wrap platform-list-card__scroll task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Workspace</th>
                    <th>Owner</th>
                    <th>Domain</th>
                    <th>Reseller</th>
                    <th>Members</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((w) => (
                    <tr key={w.id}>
                      <td className="task-table__name">{w.name}</td>
                      <td>
                        <div>{w.owner?.name || '—'}</div>
                        <div className="muted" style={{ fontSize: 12.5 }}>{w.owner?.email}</div>
                      </td>
                      <td>{w.domain || '—'}</td>
                      <td>
                        {w.reseller ? (
                          <span className="status-pill status-pill--completed">{w.reseller.name}</span>
                        ) : (
                          <span className="status-pill status-pill--neutral">House / Direct</span>
                        )}
                      </td>
                      <td>{w.memberCount}</td>
                      <td><span className="status-pill status-pill--neutral">Free</span></td>
                      <td><span className="status-pill status-pill--completed">Active</span></td>
                      <td className="nowrap">{formatDateTime(w.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="task-cards">
              {workspaces.map((w) => (
                <div key={w.id} className="tcard">
                  <div className="tcard__row">
                    <div className="tcard__title">{w.name}</div>
                    <span className="status-pill status-pill--completed tcard__del">Active</span>
                  </div>
                  <div className="tcard__sub">{w.owner?.name || '—'} · {w.owner?.email}</div>
                  <div className="tcard__tags">
                    <span>{w.domain || 'No domain'}</span>
                    {w.reseller ? (
                      <span className="status-pill status-pill--completed">{w.reseller.name}</span>
                    ) : (
                      <span className="status-pill status-pill--neutral">House / Direct</span>
                    )}
                    <span>{w.memberCount} member{w.memberCount === 1 ? '' : 's'}</span>
                    <span className="status-pill status-pill--neutral">Free</span>
                  </div>
                  <div className="tcard__foot">
                    <span className="muted">Joined</span>
                    <span className="nowrap">{formatDateTime(w.createdAt)}</span>
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
