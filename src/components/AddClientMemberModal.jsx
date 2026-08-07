import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import { selectMembers, selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { isClientRole } from '../utils/role.js';
import { organizationsApi, clientsApi } from '../api/client.js';
import { SearchIcon, PlusIcon } from './icons.jsx';

/**
 * Add someone to a client space, two ways — deliberately the same markup and
 * classes as `AddMemberModal` (`.search-box`, `.member-list`, `.member`,
 * `.mini-btn`), so the two dialogs are visually identical.
 *
 * An earlier version invented its own class names, none of which existed in the
 * stylesheet — the list rendered as raw `<li>` bullets with the avatar, name and
 * button stacked. If this markup changes, change it to match `AddMemberModal`,
 * not to something new.
 *
 *   Search & Add — someone who is ALREADY a client in this workspace. Only
 *                  CLIENT-role members are listed: this dialog moves people
 *                  between client spaces, it does not turn staff into clients.
 *                  Someone new arrives through Invite New.
 *   Invite New   — an email invitation. Role and client come from the page; the
 *                  group is resolved server-side.
 *
 * A CLIENT sees ONLY Invite New. Search & Add lists the workspace's other
 * client-role members, which would show one customer the names and email
 * addresses of every other customer — so the tab is withheld from them
 * entirely rather than merely returning an empty list. They can still bring a
 * colleague in by email, which is the thing they actually need.
 *
 * `roster` is the workspace's members, passed in by the client-space page from
 * its single page-bundle response. It falls back to `orgSlice` for any caller
 * that still populates that the old way — without the prop, the page's move to
 * one combined request would leave this list silently empty.
 */
export default function AddClientMemberModal({ clientId, clientName, existingIds, roster, onClose, onChanged }) {
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const sliceMembers = useSelector(selectMembers);
  const orgMembers = roster?.length ? roster : sliceMembers;
  const isClient = isClientRole(org?.role);

  const [tab, setTab] = useState(isClient ? 'invite' : 'search'); // 'search' | 'invite'
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const already = useMemo(() => new Set(existingIds || []), [existingIds]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orgMembers
      .filter((m) => m.role === 'CLIENT' && !already.has(m.id))
      .filter(
        (m) => !q || (m.name || '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
  }, [orgMembers, query, already]);

  useEffect(() => {
    setError('');
    setMessage('');
  }, [tab]);

  const add = async (userId) => {
    setBusy(userId);
    setError('');
    try {
      await clientsApi.addMember(orgId, clientId, userId);
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Could not add them');
    } finally {
      setBusy('');
    }
  };

  const invite = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError('Enter an email address');
      return;
    }
    setBusy('invite');
    setError('');
    try {
      await organizationsApi.invite(orgId, { email: value, role: 'CLIENT', clientId });
      setMessage(`Invitation sent to ${value}`);
      setEmail('');
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Could not send the invitation');
    } finally {
      setBusy('');
    }
  };

  return (
    <Modal title="Add client" onClose={onClose}>
      {/* One tab is not a tab bar — a client gets the invite form directly. */}
      {!isClient && (
        <div className="seg-tabs">
          <button
            className={`seg-tab ${tab === 'search' ? 'seg-tab--active' : ''}`}
            onClick={() => setTab('search')}
          >
            Search &amp; Add
          </button>
          <button
            className={`seg-tab ${tab === 'invite' ? 'seg-tab--active' : ''}`}
            onClick={() => setTab('invite')}
          >
            Invite New
          </button>
        </div>
      )}

      {error && <div className="alert alert--error">{error}</div>}
      {message && <div className="alert alert--info">{message}</div>}

      {tab === 'search' && !isClient ? (
        <>
          <div className="search-box" style={{ width: '100%', marginBottom: 12 }}>
            <SearchIcon size={16} />
            <input
              className="search-box__input"
              style={{ width: '100%' }}
              autoFocus
              placeholder="Search clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <ul className="member-list member-list--scroll">
            {candidates.length === 0 && (
              <li className="dropdown__empty">
                {query.trim()
                  ? 'No clients match.'
                  : 'No other clients yet — use Invite New to add one by email.'}
              </li>
            )}
            {candidates.map((m) => (
              <li key={m.id} className="member">
                <Avatar name={m.name} email={m.email} src={m.avatarUrl} size={36} />
                <div className="member__info">
                  <div className="member__name">
                    <span className="member__name-text">{m.name || m.email}</span>
                  </div>
                  <div className="member__email">{m.email}</div>
                </div>
                <button
                  className="mini-btn mini-btn--primary"
                  disabled={!!busy}
                  onClick={() => add(m.id)}
                >
                  {busy === m.id ? <span className="spinner" /> : <><PlusIcon size={13} /> Add</>}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <form onSubmit={invite}>
          <p className="modal__intro">
            They will join as a client of <strong>{clientName}</strong> and see only this
            space&apos;s work.
          </p>
          <div className="field">
            <label className="field__label">Email</label>
            <input
              className="input"
              type="email"
              autoFocus
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={!!busy}>
              Cancel
            </button>
            <button className="btn" type="submit" disabled={!!busy || !email.trim()}>
              {busy === 'invite' ? <span className="spinner" /> : 'Send invitation'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
