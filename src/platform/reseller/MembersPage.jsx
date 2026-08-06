import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import PlatformPager from '../PlatformPager.jsx';
import { UserIcon, SearchIcon, RotateIcon } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

/** Reseller's "Members" tab — one row per person across this reseller's
 *  workspaces, with how many workspaces/groups they belong to. Sibling of
 *  `ResellerWorkspacesPage.jsx`, which shows the same underlying orgs
 *  organized per-workspace instead. */
export default function MembersPage() {
  const [members, setMembers] = useState([]);
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
    platformApi.members
      .list({ q: debouncedSearch || undefined, page, limit: 20 })
      .then((res) => {
        setMembers(res.members);
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
            <h2 className="platform-list-card__title">Members</h2>
            <p className="platform-list-card__subtitle">
              {pagination.total} member{pagination.total === 1 ? '' : 's'} · showing page {pagination.page} of{' '}
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
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : members.length === 0 ? (
          <EmptyState icon={<UserIcon size={30} />} title="No members found" description="Members appear here once they join one of your client workspaces." />
        ) : (
          <>
            <div className="table-wrap platform-list-card__scroll task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Workspaces</th>
                    <th>Groups</th>
                    <th>Domain</th>
                    {/* <th>Reseller</th> */}
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="reseller-cell">
                          <span className="reseller-cell__logo reseller-cell__logo--mark" style={{ background: 'var(--primary)' }}>
                            {(m.name || m.email || '?')[0].toUpperCase()}
                          </span>
                          <div className="task-table__name">{m.name || m.email || '—'}</div>
                        </div>
                      </td>
                      <td>{m.email || '—'}</td>
                      <td>{m.workspaceCount}</td>
                      <td>{m.groupCount}</td>
                      <td>{m.domain || '—'}</td>
                      {/* <td>
                        {m.reseller ? (
                          <span className="status-pill status-pill--completed">{m.reseller.name}</span>
                        ) : (
                          <span className="status-pill status-pill--neutral">House / Direct</span>
                        )}
                      </td> */}
                      <td><span className="status-pill status-pill--completed">Active</span></td>
                      <td className="nowrap">{formatDateTime(m.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="task-cards">
              {members.map((m) => (
                <div key={m.id} className="tcard">
                  <div className="tcard__row">
                    <span className="reseller-cell__logo reseller-cell__logo--mark" style={{ background: 'var(--primary)' }}>
                      {(m.name || m.email || '?')[0].toUpperCase()}
                    </span>
                    <div className="tcard__title">{m.name || m.email || '—'}</div>
                    <span className="status-pill status-pill--completed tcard__del">Active</span>
                  </div>
                  <div className="tcard__sub">{m.email || '—'}</div>
                  <div className="tcard__tags">
                    <span>{m.workspaceCount} workspace{m.workspaceCount === 1 ? '' : 's'}</span>
                    <span>{m.groupCount} group{m.groupCount === 1 ? '' : 's'}</span>
                    {/* <span>{m.domain || 'No domain'}</span> */}
                    {/* {m.reseller ? (
                      <span className="status-pill status-pill--completed">{m.reseller.name}</span>
                    ) : (
                      <span className="status-pill status-pill--neutral">House / Direct</span>
                    )} */}
                  </div>
                  <div className="tcard__foot">
                    <span className="muted">Joined</span>
                    <span className="nowrap">{formatDateTime(m.joinedAt)}</span>
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
