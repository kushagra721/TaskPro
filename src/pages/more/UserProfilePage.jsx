import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice.js';
import { selectCurrentOrg, selectCurrentOrgId, selectMembers, fetchMembers } from '../../store/slices/orgSlice.js';
import { selectGroups } from '../../store/slices/groupSlice.js';
import { organizationsApi } from '../../api/client.js';
import { useTaskQuery } from '../../hooks/useTaskQuery.js';
import { useRegisterHeaderActions } from '../../layout/HeaderActions.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import TaskListView from '../../components/TaskListView.jsx';
import TaskStatusTabs from '../../components/TaskStatusTabs.jsx';
import TaskSearchBar from '../../components/TaskSearchBar.jsx';
import TaskFilterDrawer from '../../components/TaskFilterDrawer.jsx';
import Pagination from '../../components/Pagination.jsx';
import { formatDate, STATUS_META } from '../../utils/status.js';
import { prettySize } from '../../utils/fileSize.js';
import { BuildingIcon, ShieldIcon, TrashIcon, TaskIcon } from '../../components/icons.jsx';
import { isAdminRole, isClientRole, ASSIGNABLE_ROLES, ROLE_LABEL } from '../../utils/role.js';

const emptyCounts = { ALL: 0, OPEN: 0, COMPLETED: 0, CANCELLED: 0 };

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const me = useSelector(selectUser);
  const org = useSelector(selectCurrentOrg);
  const orgId = useSelector(selectCurrentOrgId);
  const groups = useSelector(selectGroups);
  const members = useSelector(selectMembers);
  const isAdmin = isAdminRole(org?.role);
  const isMobile = useIsMobile();
  const isSelf = userId === me?.id;

  const [member, setMember] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleTarget, setRoleTarget] = useState(null); // 'ADMIN' | 'MEMBER' | 'CLIENT' when confirming
  const [removeOpen, setRemoveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // 'tasks' | 'profile' — the two halves of a person's page, mirroring the
  // channel and client-space pages. Tasks leads because it is what someone
  // opening a colleague's page is nearly always after.
  const [section, setSection] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState(emptyCounts);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { search, setSearch, filters, applyFilters, clearFilters, activeFilterCount, page, setPage, params } =
    // Open by default, matching Manage Tasks. What someone wants to know about
    // a colleague is what is still on their plate; a list led by months of
    // finished work buries it. `''` is the "All" tab, so this is a real change
    // of landing tab, not just a sort.
    useTaskQuery({ status: 'OPEN' });

  const openFilters = useCallback(() => setDrawerOpen(true), []);
  // Only the Tasks tab has anything to search or filter, so the Topbar's icons
  // are withheld on the Profile tab rather than opening a drawer that would
  // filter a list nobody is looking at.
  useRegisterHeaderActions(
    section === 'tasks'
      ? { search, onSearch: setSearch, onOpenFilters: openFilters, filterCount: activeFilterCount }
      : {},
  );

  /**
   * ONE request for the whole page.
   *
   * The profile and this person's task list arrive together — adding a Tasks
   * tab the obvious way would have meant a second call on every open, and the
   * two would have had to agree about paging anyway. `params` is the Tasks
   * tab's query, so a filter change re-runs exactly this same call.
   */
  const load = useCallback(() => {
    if (!orgId || !userId) return;
    setLoading(true);
    organizationsApi
      .memberProfile(orgId, userId, params)
      .then((r) => {
        setMember(r.member);
        setTasks(r.tasks || []);
        if (r.pagination) setPagination(r.pagination);
        setCounts(r.counts || emptyCounts);
        setError('');
      })
      .catch((err) => setError(err.message || 'Could not load this member'))
      .finally(() => setLoading(false));
  }, [orgId, userId, params]);

  useEffect(load, [load]);

  // The filter drawer's assignee picker needs the workspace roster, which no
  // other part of this page uses. Fetched only when the drawer is actually
  // opened, and only if the slice is empty — so the common case (open the
  // page, read it, leave) still costs exactly one request.
  useEffect(() => {
    if (drawerOpen && orgId && members.length === 0) dispatch(fetchMembers(orgId));
  }, [drawerOpen, orgId, members.length, dispatch]);

  const setTab = (t) => applyFilters({ ...filters, status: t === 'ALL' ? '' : t });
  const activeTab = filters.status || 'ALL';

  const applyRoleChange = async () => {
    setBusy(true);
    try {
      await organizationsApi.changeRole(orgId, userId, roleTarget);
      setRoleTarget(null);
      load();
      dispatch(fetchMembers(orgId));
    } catch (err) {
      setError(err.message || 'Could not change the role');
    } finally {
      setBusy(false);
    }
  };

  const applyRemove = async () => {
    setBusy(true);
    try {
      await organizationsApi.removeMember(orgId, userId);
      dispatch(fetchMembers(orgId));
      navigate('/more/members');
    } catch (err) {
      setError(err.message || 'Could not remove this member');
      setBusy(false);
      setRemoveOpen(false);
    }
  };

  if (!org) {
    return (
      <div className="page">
        <EmptyState icon={<BuildingIcon size={30} />} title="No workspace selected" description="Pick a workspace to see this member." />
      </div>
    );
  }

  const targetIsClient = member ? isClientRole(member.role) : false;

  /**
   * Which roles this person may be moved to.
   *
   * A CLIENT is an EXTERNAL party, not a junior teammate, so "Make admin" and
   * "Make member" are withheld entirely — promoting a customer into the
   * workspace's staff is not a one-click action on their profile page, and
   * offering it invites exactly the mis-click that would hand them another
   * client's data. Removing them from the workspace stays available, since
   * that is the legitimate way to end the relationship.
   */
  const roleOptions = targetIsClient ? [] : ASSIGNABLE_ROLES.filter((r) => r !== member?.role);
  const canManage = isAdmin && !isSelf && member?.role !== 'OWNER';

  return (
    // `.channel`, not `.page` — this page now wears the group/project detail
    // shell: one card holding the identity row and the tabs, with the content
    // below it. See `.channel`'s note about keeping its width in step.
    <div className="channel">
      <button className="link-btn channel__back" onClick={() => navigate(-1)}>← Back</button>

      {error && <div className="alert alert--error">{error}</div>}

      {!member ? (
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      ) : (
        <>
          <div className="channel__header">
            <div className="channel__title-row">
              <Avatar name={member.name} email={member.email} src={member.avatarUrl} size={40} viewable />
              <h1 className="channel__title">{member.name || member.email}</h1>
              <span className={`role-pill role-pill--${member.role.toLowerCase()}`}>{member.role}</span>
              {isSelf && <span className="tag">You</span>}
              <span className="channel__members">
                {member.taskCount} task{member.taskCount === 1 ? '' : 's'}
              </span>

              {/* Inline, beside the person it acts on — the same slot the other
                  detail pages give Edit/Delete. There is nothing to "edit"
                  about a member, so removal is the only icon here. */}
              {canManage && (
                <div className="task-detail__actions task-detail__actions--inline">
                  <button
                    className="icon-btn icon-btn--danger"
                    onClick={() => setRemoveOpen(true)}
                    title="Remove from workspace"
                    aria-label="Remove from workspace"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              )}

              {/* The page's actions, pinned right. One button per role rather
                  than a toggle: with three assignable roles there is no single
                  "other" state to flip to. A CLIENT gets none — see
                  `roleOptions`. */}
              {canManage && roleOptions.length > 0 && (
                <div className="detail-head__actions hide-mobile">
                  {roleOptions.map((r) => (
                    <button key={r} className="btn btn--ghost btn--sm" onClick={() => setRoleTarget(r)}>
                      <ShieldIcon size={14} /> Make {ROLE_LABEL[r].toLowerCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="channel__tabbar">
              <div className="channel__tabs">
                <button
                  className={`tab ${section === 'tasks' ? 'tab--active' : ''}`}
                  onClick={() => setSection('tasks')}
                >
                  Tasks <span className="tab__count">{member.taskCount}</span>
                </button>
                <button
                  className={`tab ${section === 'profile' ? 'tab--active' : ''}`}
                  onClick={() => setSection('profile')}
                >
                  Profile
                </button>
              </div>
            </div>
          </div>

          {section === 'tasks' && (
            <>
              <div className="list-controls">
                <TaskStatusTabs active={activeTab} counts={counts} onChange={setTab} />
                <TaskSearchBar
                  search={search}
                  onSearch={setSearch}
                  onOpenFilters={openFilters}
                  activeCount={activeFilterCount}
                />
              </div>

              {loading && tasks.length === 0 ? (
                <div className="screen-center" style={{ minHeight: '20vh' }}>
                  <span className="spinner" />
                </div>
              ) : tasks.length === 0 ? (
                <EmptyState
                  icon={<TaskIcon size={30} />}
                  title="No tasks found"
                  description={
                    activeFilterCount || search
                      ? 'Nothing matches your search or filters.'
                      : 'Nothing is assigned to this person yet.'
                  }
                />
              ) : (
                <>
                  <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />
                  <TaskListView
                    tasks={tasks}
                    // The assignee column would repeat this person's name on
                    // every single row — the list is defined by it.
                    hide={['assignee']}
                    onOpen={(id) => navigate(`/tasks/${id}`)}
                    statusNode={(t) => (
                      <span className={`status-pill status-pill--${t.status.toLowerCase()}`}>{STATUS_META[t.status].label}</span>
                    )}
                  />
                </>
              )}

              <TaskFilterDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                value={filters}
                onApply={applyFilters}
                onClear={clearFilters}
                groups={groups}
                members={members}
              />
            </>
          )}

          {section === 'profile' && (
            <>
              {/* Email and join date moved off the head row — it now carries
                  name, role and the actions, and adding two more lines to it
                  would have pushed the tabs down. They belong on the Profile
                  tab anyway, which is what that tab is for. */}
              <section className="panel">
                <div className="panel__head">
                  <h2 className="panel__title">Details</h2>
                </div>
                <div className="task-detail__grid">
                  <div className="kv"><span className="kv__k">Email</span><span className="kv__v">{member.email}</span></div>
                  <div className="kv"><span className="kv__k">Member since</span><span className="kv__v">{formatDate(member.joinedAt)}</span></div>
                </div>
              </section>

              <div className="stat-grid stat-grid--3">
                <div className="stat-card stat-card--indigo">
                  <div className="stat-card__value">{member.groups.length}</div>
                  <div className="stat-card__label">Groups joined</div>
                </div>
                <div className="stat-card stat-card--violet">
                  <div className="stat-card__value">{member.taskCount}</div>
                  <div className="stat-card__label">Tasks assigned</div>
                </div>
                <div className="stat-card stat-card--amber">
                  <div className="stat-card__value">{prettySize(member.storage.totalBytes)}</div>
                  <div className="stat-card__label">Storage used ({member.storage.totalFiles} files)</div>
                </div>
              </div>

              <section className="panel">
                <div className="panel__head">
                  <h2 className="panel__title">Groups</h2>
                </div>
                {member.groups.length === 0 ? (
                  <div className="panel__empty">Not in any group yet.</div>
                ) : (
                  <ul className="member-list">
                    {member.groups.map((g) => (
                      <li key={g.id} className="member member--link" onClick={() => navigate(`/groups/${g.id}`)}>
                        <span className="channel-card__hash">#</span>
                        <div className="member__info">
                          <div className="member__name-text">{g.name}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* MOBILE ONLY. The same role buttons live in the head row, but
                  that copy is `hide-mobile` — without this panel a phone would
                  have no way to change anyone's role. Rendering both on desktop
                  would just be the same two buttons twice. */}
              {canManage && isMobile && (
                <section className="panel">
                  <div className="panel__head">
                    <h2 className="panel__title">Admin actions</h2>
                  </div>
                  {/* One button per role rather than a toggle: with three
                      assignable roles there is no longer a single "other" state
                      for a toggle to flip to. The member's current role is
                      omitted — offering it would be a no-op — and a CLIENT gets
                      no role buttons at all (see `roleOptions`). */}
                  <div className="modal__actions" style={{ marginTop: 0 }}>
                    {roleOptions.map((r) => (
                      <button key={r} className="btn btn--ghost" onClick={() => setRoleTarget(r)}>
                        <ShieldIcon size={15} /> Make {ROLE_LABEL[r].toLowerCase()}
                      </button>
                    ))}
                    <button className="btn btn--danger" onClick={() => setRemoveOpen(true)}>
                      <TrashIcon size={15} /> Remove from workspace
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {roleTarget && (
        <Modal title="Change role" onClose={() => !busy && setRoleTarget(null)}>
          <p className="modal__intro">
            {roleTarget === 'ADMIN'
              ? `Make ${member.name || member.email} an admin? They'll be able to manage members, invitations and every group.`
              : roleTarget === 'CLIENT'
                ? `Make ${member.name || member.email} a client? They'll be added to the client channel and will only see the client space they belong to.`
                : `Make ${member.name || member.email} a regular member? They'll lose admin access.`}
          </p>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setRoleTarget(null)} disabled={busy}>Cancel</button>
            <button className="btn" onClick={applyRoleChange} disabled={busy}>
              {busy ? <span className="spinner" /> : 'Confirm'}
            </button>
          </div>
        </Modal>
      )}

      {removeOpen && (
        <Modal title="Remove member" onClose={() => !busy && setRemoveOpen(false)}>
          <p className="modal__intro">
            Remove <strong>{member.name || member.email}</strong> from {org.name}? They&apos;ll lose access to every group and task here.
          </p>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setRemoveOpen(false)} disabled={busy}>Cancel</button>
            <button className="btn btn--danger" onClick={applyRemove} disabled={busy}>
              {busy ? <span className="spinner" /> : (<><TrashIcon size={16} /> Remove</>)}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
