import { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import { selectMembers, selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { selectGroupDetail, addGroupMember } from '../store/slices/groupSlice.js';
import { organizationsApi } from '../api/client.js';
import { SearchIcon, PlusIcon, MailIcon } from './icons.jsx';

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
      {error && <div className="alert alert--error">{error}</div>}
      {message && <div className="alert alert--info">{message}</div>}

      <div className="search-box" style={{ width: '100%', marginBottom: 12 }}>
        <SearchIcon size={16} />
        <input
          className="search-box__input"
          style={{ width: '100%' }}
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

      {/* Pending email invitations into this group. */}
      {invites.length > 0 && (
        <ul className="member-list" style={{ marginTop: 8 }}>
          {invites.map((i) => (
            <li key={i.id} className="member">
              <span className="org-badge sm ghost">@</span>
              <div className="member__info">
                <div className="member__name">{i.email}</div>
                <div className="member__email">Invited to this group</div>
              </div>
              <span className="tag">Invited</span>
            </li>
          ))}
        </ul>
      )}

      {/* Admins can invite someone who isn't in the org yet. */}
      {isAdmin && (
        <form className="invite-inline" onSubmit={invite}>
          <div className="field" style={{ marginBottom: 8 }}>
            <label className="field__label">
              <MailIcon size={13} /> Invite by email
            </label>
            <div className="invite-inline__row">
              <input
                className="input"
                type="email"
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn btn--sm" type="submit" disabled={busy || !email.trim()}>
                {busy ? <span className="spinner" /> : 'Invite'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
