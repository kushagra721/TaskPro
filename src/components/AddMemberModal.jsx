import { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import { selectMembers, selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { selectGroupDetail, addGroupMember } from '../store/slices/groupSlice.js';
import { organizationsApi } from '../api/client.js';
import { SearchIcon, PlusIcon, MailIcon, XIcon } from './icons.jsx';

/**
 * "Add member" popup for a group.
 * - Lists every organization member: those already in the group show "Joined",
 *   the rest get an "Add" button.
 * - Admins can also invite someone by email directly into this group; the
 *   invitee shows as "Invited" until they accept (then they appear as a member).
 */
export default function AddMemberModal({ groupId, onClose }) {
  const dispatch = useDispatch();
  const org = useSelector(selectCurrentOrg);
  const orgId = useSelector(selectCurrentOrgId);
  const orgMembers = useSelector(selectMembers);
  const detail = useSelector(selectGroupDetail);
  const isAdmin = org?.role === 'ADMIN';
  const [tab, setTab] = useState('search'); // 'search' | 'invite'

  const groupMemberIds = useMemo(
    () => new Set((detail?.id === groupId ? detail.members || [] : []).map((m) => m.id)),
    [detail, groupId]
  );

  const [query, setQuery] = useState('');
  const [invites, setInvites] = useState([]); // pending invitations for this group
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);

  // Only admins can read/create invitations.
  const loadInvites = () => {
    if (!orgId || !isAdmin) return;
    organizationsApi
      .listInvitations(orgId)
      .then((r) =>
        setInvites(r.invitations.filter((i) => i.status === 'PENDING' && i.groupId === groupId))
      )
      .catch(() => setInvites([]));
  };

  useEffect(loadInvites, [orgId, isAdmin, groupId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgMembers;
    return orgMembers.filter(
      (m) => (m.name || '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [orgMembers, query]);

  const invitedEmails = new Set(invites.map((i) => i.email.toLowerCase()));

  const revoke = async () => {
    if (!cancelTarget) return;
    setError('');
    try {
      await organizationsApi.cancelInvitation(orgId, cancelTarget.id);
      setCancelTarget(null);
      loadInvites();
    } catch (err) {
      setError(err.message || 'Could not cancel the invitation');
    }
  };

  const invite = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    try {
      await organizationsApi.invite(orgId, { email: value, role: 'MEMBER', groupId });
      setMessage(`Invitation sent to ${value}`);
      setEmail('');
      loadInvites();
    } catch (err) {
      setError(err.message || 'Could not send the invitation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Add member" onClose={onClose}>
      {isAdmin && (
        <div className="seg-tabs">
          <button className={`seg-tab ${tab === 'search' ? 'seg-tab--active' : ''}`} onClick={() => setTab('search')}>
            Search & Add
          </button>
          <button className={`seg-tab ${tab === 'invite' ? 'seg-tab--active' : ''}`} onClick={() => setTab('invite')}>
            Invite New
          </button>
        </div>
      )}

      {error && <div className="alert alert--error">{error}</div>}
      {message && <div className="alert alert--info">{message}</div>}

      {tab === 'search' ? (
        <>
          <div className="search-box" style={{ width: '100%', marginBottom: 12 }}>
            <SearchIcon size={16} />
            <input
              className="search-box__input"
              style={{ width: '100%' }}
              autoFocus
              placeholder="Search members…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <ul className="member-list member-list--scroll">
            {filtered.length === 0 && <li className="dropdown__empty">No members match.</li>}
            {filtered.map((m) => {
              const joined = groupMemberIds.has(m.id);
              return (
                <li key={m.id} className="member">
                  <Avatar name={m.name} email={m.email} size={36} />
                  <div className="member__info">
                    <div className="member__name">
                      <span className="member__name-text">{m.name || m.email}</span>
                    </div>
                    <div className="member__email">{m.email}</div>
                  </div>
                  {joined ? (
                    <span className="tag tag--success">Joined</span>
                  ) : (
                    <button
                      className="mini-btn mini-btn--primary"
                      onClick={() => dispatch(addGroupMember({ groupId, userId: m.id }))}
                    >
                      <PlusIcon size={13} /> Add
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          {/* Pending email invitations into this group. */}
          {invites.length > 0 && (
            <ul className="member-list" style={{ marginBottom: 12 }}>
              {invites.map((i) => (
                <li key={i.id} className="member">
                  <span className="org-badge sm ghost">@</span>
                  <div className="member__info">
                    <div className="member__name">{i.email}</div>
                    <div className="member__email">Invited to this group</div>
                  </div>
                  <span className="tag">Invited</span>
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
          )}

          <form onSubmit={invite}>
            <div className="field">
              <label className="field__label">
                <MailIcon size={13} /> Invite by email
              </label>
              <input
                className="input"
                type="email"
                autoFocus
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button className="btn" type="submit" disabled={busy || !email.trim()}>
              {busy ? <span className="spinner" /> : 'Invite'}
            </button>
          </form>
        </>
      )}

      {cancelTarget && (
        <Modal title="Cancel invitation" onClose={() => setCancelTarget(null)}>
          <p className="modal__intro">
            Cancel the invitation to <strong>{cancelTarget.email}</strong>? They won&apos;t be able to join with this invite anymore.
          </p>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setCancelTarget(null)}>Keep invitation</button>
            <button className="btn btn--danger" onClick={revoke}>
              <XIcon size={16} /> Cancel invitation
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
