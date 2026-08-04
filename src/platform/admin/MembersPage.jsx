import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import Select from '../../components/Select.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PlatformPager from '../PlatformPager.jsx';
import { UserIcon, SearchIcon, RotateIcon } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

/** Super Admin's "Members" tab — one row per person, aggregated across every
 *  workspace they belong to (workspace/group counts, and the reseller/domain
 *  of the earliest workspace they joined). Sibling of `WorkspacesPage.jsx`,
 *  which shows the same underlying data organized per-org instead. */
export default function MembersPage() {
  const [members, setMembers] = useState([]);
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
    platformApi.members
      .list({ resellerId: resellerId || undefined, q: debouncedSearch || undefined, page, limit: 10 })
      .then((res) => {
        setMembers(res.members);
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
            <h2 className="platform-list-card__title">Members</h2>
            <p className="platform-list-card__subtitle">
              Every person across all workspaces, with how many they belong to.
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
          <Select
            value={resellerId}
            onChange={setResellerId}
            placeholder="All resellers"
            options={[{ value: '', label: 'All resellers' }, ...resellers.map((r) => ({ value: r.id, label: r.brandName || r.name }))]}
          />
        </div>

        <div className="platform-list-card__sub-head">
          <h3 className="platform-list-card__sub-title">All members</h3>
          <p className="platform-list-card__sub-note">
            {pagination.total} member{pagination.total === 1 ? '' : 's'} matching the filters.
          </p>
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : members.length === 0 ? (
          <EmptyState icon={<UserIcon size={30} />} title="No members found" description="Members appear here once they join a workspace." />
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
                    <th>Brand</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="task-table__name">{m.name || '—'}</td>
                      <td>{m.email || '—'}</td>
                      <td>{m.workspaceCount}</td>
                      <td>{m.groupCount}</td>
                      <td>{m.domain || '—'}</td>
                      <td>
                        {m.reseller ? (
                          <span className="status-pill status-pill--completed">{m.reseller.name}</span>
                        ) : (
                          <span className="status-pill status-pill--neutral">House / Direct</span>
                        )}
                      </td>
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
                    <div className="tcard__title">{m.name || '—'}</div>
                    <span className="status-pill status-pill--completed tcard__del">Active</span>
                  </div>
                  <div className="tcard__sub">{m.email || '—'}</div>
                  <div className="tcard__tags">
                    <span>{m.workspaceCount} workspace{m.workspaceCount === 1 ? '' : 's'}</span>
                    <span>{m.groupCount} group{m.groupCount === 1 ? '' : 's'}</span>
                    {/* <span>{m.domain || 'No domain'}</span> */}
                    {m.reseller ? (
                      <span className="status-pill status-pill--completed">{m.reseller.name}</span>
                    ) : (
                      <span className="status-pill status-pill--neutral">House / Direct</span>
                    )}
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
