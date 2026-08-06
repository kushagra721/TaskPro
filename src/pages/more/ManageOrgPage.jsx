import { useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice.js';
import {
  selectCurrentOrg,
  selectCurrentOrgId,
  selectMembers,
  fetchMembers,
} from '../../store/slices/orgSlice.js';
import { fetchGroups, selectGroups } from '../../store/slices/groupSlice.js';
import { organizationsApi } from '../../api/client.js';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Select from '../../components/Select.jsx';
import Modal from '../../components/Modal.jsx';
import OrgBadge from '../../components/OrgBadge.jsx';
import CardProgress from '../../components/CardProgress.jsx';
import TaskSearchBar from '../../components/TaskSearchBar.jsx';
import MemberFilterDrawer from '../../components/MemberFilterDrawer.jsx';
import { useRegisterHeaderActions } from '../../layout/HeaderActions.jsx';
import { BuildingIcon, PlusIcon, XIcon } from '../../components/icons.jsx';
import { isAdminRole, ASSIGNABLE_ROLES, ROLE_LABEL } from '../../utils/role.js';

const EMPTY_FILTERS = { role: '' };

/** `ref.current.openInvite()` lets the Groups page's mobile FAB (Members tab)
 *  open the invite modal without lifting all of this page's state up. */
const ManageOrgPage = forwardRef(function ManageOrgPage(_props, ref) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const org = useSelector(selectCurrentOrg);
  const orgId = useSelector(selectCurrentOrgId);
  const members = useSelector(selectMembers);
  const groups = useSelector(selectGroups);
  const isAdmin = isAdminRole(org?.role);

  const [invites, setInvites] = useState([]);
  const [cancelledInvites, setCancelledInvites] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [groupId, setGroupId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null); // invitation being confirmed for cancel
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [progress, setProgress] = useState([]);

  useImperativeHandle(ref, () => ({ openInvite: () => setInviteOpen(true) }), []);

  const loadInvites = useCallback(async () => {
    if (!orgId || !isAdmin) return;
    try {
      const res = await organizationsApi.listInvitations(orgId);
      setInvites(res.invitations.filter((i) => i.status === 'PENDING'));
      setCancelledInvites(res.invitations.filter((i) => i.status === 'CANCELLED'));
    } catch {
      /* ignore */
    }
  }, [orgId, isAdmin]);

  const loadJoinRequests = useCallback(async () => {
    if (!orgId || !isAdmin) return;
    try {
      const res = await organizationsApi.listJoinRequests(orgId);
      setJoinRequests(res.requests);
    } catch {
      /* ignore */
    }
  }, [orgId, isAdmin]);

  useEffect(() => {
    if (orgId) {
      dispatch(fetchMembers(orgId));
      dispatch(fetchGroups(orgId));
    }
    loadInvites();
    loadJoinRequests();
  }, [orgId, dispatch, loadInvites, loadJoinRequests]);

  // Per-member completion rate, shown inline under each row. `reports` already
  // role-scopes this the same way the rest of the app does.
  useEffect(() => {
    if (!orgId) return;
    organizationsApi
      .reports(orgId)
      .then((r) => setProgress(r.members))
      .catch(() => setProgress([]));
  }, [orgId]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const openFilters = useCallback(() => setDrawerOpen(true), []);
  useRegisterHeaderActions({ search, onSearch: setSearch, onOpenFilters: openFilters, filterCount: activeFilterCount });

  const visibleMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (filters.role && m.role !== filters.role) return false;
      if (q && !(m.name || '').toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, search, filters]);

  const cancelInvite = async () => {
    if (!cancelTarget) return;
    try {
      await organizationsApi.cancelInvitation(orgId, cancelTarget.id);
      setCancelTarget(null);
      loadInvites();
    } catch (err) {
      setError(err.message || 'Could not cancel the invitation');
    }
  };

  const respondJoin = async (reqId, approve) => {
    try {
      if (approve) await organizationsApi.approveJoinRequest(orgId, reqId);
      else await organizationsApi.declineJoinRequest(orgId, reqId);
      loadJoinRequests();
      dispatch(fetchMembers(orgId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!org) {
    return (
      <div className="page">
        <EmptyState
          icon={<BuildingIcon size={30} />}
          title="No workspace selected"
          description="Create or select a workspace to manage its members."
        />
      </div>
    );
  }

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!groupId) {
      setError('Please choose a group for the invitee');
      return;
    }
    setBusy(true);
    try {
      await organizationsApi.invite(orgId, { email: email.trim(), role, groupId });
      setMessage(`Invitation sent to ${email.trim()}`);
      setEmail('');
      setGroupId('');
      setRole('MEMBER');
      setInviteOpen(false);
      loadInvites();
    } catch (err) {
      setError(err.message || 'Could not send invitation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      {/* <div className="org-header org-header--row">
        <div className="org-header__left">
          <OrgBadge name={org.name} icon={org.icon} photoUrl={org.photoUrl} size="lg" />
          <div>
            <div className="org-header__name">{org.name}</div>
            <div className="org-header__meta">
              {members.length} member{members.length === 1 ? '' : 's'} · You are {org.role.toLowerCase()}
            </div>
          </div>
        </div>
        <div className="head-actions">
          {isAdmin && (
            <button className="btn btn--sm" onClick={() => setInviteOpen(true)}>
              <PlusIcon size={16} /> Invite member
            </button>
          )}
        </div>
      </div> */}

      {error && <div className="alert alert--error">{error}</div>}
      {message && <div className="alert alert--info">{message}</div>}

      {isAdmin && inviteOpen && (
        <Modal title="Invite a member" onClose={() => setInviteOpen(false)}>
          <form onSubmit={invite}>
            <div className="field">
              <label className="field__label">Email</label>
              <input
                className="input"
                type="email"
                autoFocus
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field__label">Group <span className="req">*</span></label>
              <Select
                value={groupId}
                onChange={setGroupId}
                placeholder={groups.length ? 'Choose a group' : 'Create a group first'}
                options={groups.map((g) => ({ value: g.id, label: `#${g.name}` }))}
              />
            </div>

            <div className="field">
              <label className="field__label">Role</label>
              <div className="radio-group">
                {ASSIGNABLE_ROLES.map((r) => (
                  <button
                    type="button"
                    key={r}
                    className={`radio-pill ${role === r ? 'radio-pill--active' : ''}`}
                    onClick={() => setRole(r)}
                  >
                    <span className="radio-pill__dot" />
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn" type="submit" disabled={busy || !email.trim() || !groupId}>
              {busy ? <span className="spinner" /> : (<><PlusIcon size={16} /> Send invitation</>)}
            </button>
          </form>
        </Modal>
      )}

      {isAdmin && joinRequests.length > 0 && (
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Join requests ({joinRequests.length})</h2>
          </div>
          <ul className="member-list">
            {joinRequests.map((r) => (
              <li key={r.id} className="member">
                <Avatar name={r.user.name} email={r.user.email} src={r.user.avatarUrl} size={38} />
                <div className="member__info">
                  <div className="member__name">{r.user.name || r.user.email}</div>
                  <div className="member__email">{r.user.email}</div>
                </div>
                <div className="member__actions">
                  <button className="mini-btn mini-btn--primary" onClick={() => respondJoin(r.id, true)}>Approve</button>
                  <button className="mini-btn mini-btn--danger" onClick={() => respondJoin(r.id, false)}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
          <h2 className="panel__title">Members</h2>
        </div>
        {visibleMembers.length === 0 ? (
          <div className="panel__empty">Nothing matches your search or filters.</div>
        ) : (
          <div className="channel-grid">
            {visibleMembers.map((m) => {
              const mp = progress.find((x) => x.id === m.id);
              return (
                <button key={m.id} className="channel-card" onClick={() => navigate(`/more/members/${m.id}`)}>
                  <Avatar name={m.name} email={m.email} src={m.avatarUrl} size={42} viewable />
                  <div className="channel-card__body">
                    <div className="channel-card__name">
                      {m.name || m.email} {m.id === user?.id && <span className="tag">You</span>}
                    </div>
                    <div className="channel-card__meta">
                      {mp?.groupCount ?? 0} group{mp?.groupCount === 1 ? '' : 's'} ·{' '}
                      {mp?.open ?? 0} open task{mp?.open === 1 ? '' : 's'}
                    </div>
                    {mp && <CardProgress rate={mp.completionRate} />}
                  </div>
                  <span className={`role-pill role-pill--${m.role.toLowerCase()}`}>{m.role}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <MemberFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        value={filters}
        onApply={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      {isAdmin && invites.length > 0 && (
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Pending invitations</h2>
          </div>
          <ul className="member-list">
            {invites.map((i) => (
              <li key={i.id} className="member">
                <span className="org-badge sm ghost">@</span>
                <div className="member__info">
                  <div className="member__name">{i.email}</div>
                  <div className="member__email">Invited as {i.role.toLowerCase()}</div>
                </div>
                <span className="role-pill role-pill--pending">PENDING</span>
                <button
                  className="icon-btn icon-btn--danger"
                  onClick={() => setCancelTarget(i)}
                  title="Cancel invitation"
                  aria-label="Cancel invitation"
                >
                  <XIcon size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && cancelledInvites.length > 0 && (
        <></>
        // <section className="panel">
        //   <div className="panel__head">
        //     <h2 className="panel__title">Cancelled invitations</h2>
        //   </div>
        //   <ul className="member-list">
        //     {cancelledInvites.map((i) => (
        //       <li key={i.id} className="member">
        //         <span className="org-badge sm ghost">@</span>
        //         <div className="member__info">
        //           <div className="member__name">{i.email}</div>
        //           <div className="member__email">Invited as {i.role.toLowerCase()}</div>
        //         </div>
        //         <span className="role-pill role-pill--cancelled">CANCELLED</span>
        //       </li>
        //     ))}
        //   </ul>
        // </section>
      )}

      {cancelTarget && (
        <Modal title="Cancel invitation" onClose={() => setCancelTarget(null)}>
          <p className="modal__intro">
            Cancel the invitation to <strong>{cancelTarget.email}</strong>? They won&apos;t be able to join with this invite anymore.
          </p>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setCancelTarget(null)}>Keep invitation</button>
            <button className="btn btn--danger" onClick={cancelInvite}>
              <XIcon size={16} /> Cancel invitation
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
});

export default ManageOrgPage;
