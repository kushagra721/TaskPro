import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Avatar from '../../components/Avatar.jsx';
import TaskSearchBar from '../../components/TaskSearchBar.jsx';
import ProjectFilterDrawer from '../../components/ProjectFilterDrawer.jsx';
import { useRegisterHeaderActions } from '../../layout/HeaderActions.jsx';
import { selectUser } from '../../store/slices/authSlice.js';
import { removeGroupMember } from '../../store/slices/groupSlice.js';
import { organizationsApi } from '../../api/client.js';

const EMPTY_FILTERS = { createdFrom: '', createdTo: '' };

export default function ChannelMembers({ group, orgId, canManage, onAddMember }) {
  const dispatch = useDispatch();
  const me = useSelector(selectUser);
  const members = group.members || [];
  const [invites, setInvites] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Pending invitations into this group — only admins/creators can read the
  // invitation list (the endpoint is admin-only), so other members just won't
  // see this section.
  useEffect(() => {
    if (!canManage || !orgId || !group?.id) {
      setInvites([]);
      return;
    }
    organizationsApi
      .listInvitations(orgId)
      .then((r) => setInvites(r.invitations.filter((i) => i.status === 'PENDING' && i.groupId === group.id)))
      .catch(() => setInvites([]));
  }, [canManage, orgId, group?.id]);

  const visibleMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const endOfDay = (d) => {
      const dt = new Date(d);
      dt.setHours(23, 59, 59, 999);
      return dt;
    };
    return members.filter((m) => {
      if (q && !(m.name || '').toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
      if (filters.createdFrom && m.joinedAt && new Date(m.joinedAt) < new Date(filters.createdFrom)) return false;
      if (filters.createdTo && m.joinedAt && new Date(m.joinedAt) > endOfDay(filters.createdTo)) return false;
      return true;
    });
  }, [members, search, filters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const openFilters = useCallback(() => setDrawerOpen(true), []);
  useRegisterHeaderActions({ search, onSearch: setSearch, onOpenFilters: openFilters, filterCount: activeFilterCount });

  return (
    <div className="channel-members">
      <div className="list-controls">
        <TaskSearchBar
          search={search}
          onSearch={setSearch}
          onOpenFilters={openFilters}
          activeCount={activeFilterCount}
          placeholder="Search members by name…"
        />
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Members ({visibleMembers.length})</h2>
        </div>
        {visibleMembers.length === 0 && invites.length === 0 ? (
          <div className="panel__empty">Nothing matches your search or filters.</div>
        ) : (
          <ul className="member-list">
            {visibleMembers.map((m) => (
              <li key={m.id} className="member">
                <Avatar name={m.name} email={m.email} src={m.avatarUrl} size={38} viewable />
                <div className="member__info">
                  <div className="member__name">
                    <span className="member__name-text">{m.name || m.email}</span>
                    {m.id === group.createdById && <span className="tag">Creator</span>}
                    {m.id === me?.id && <span className="tag">You</span>}
                  </div>
                  <div className="member__email">{m.email}</div>
                </div>
                {canManage && m.id !== group.createdById && (
                  <div className="member__actions">
                    <button
                      className="mini-btn mini-btn--danger"
                      onClick={() => dispatch(removeGroupMember({ groupId: group.id, userId: m.id }))}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            ))}
            {invites.map((i) => (
              <li key={i.id} className="member">
                <span className="org-badge sm ghost">@</span>
                <div className="member__info">
                  <div className="member__name">{i.email}</div>
                  <div className="member__email">Invited to this group</div>
                </div>
                <span className="tag tag--pending">Pending</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ProjectFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        value={filters}
        onApply={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />
    </div>
  );
}
