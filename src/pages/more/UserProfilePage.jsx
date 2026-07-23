import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice.js';
import { selectCurrentOrg, selectCurrentOrgId, fetchMembers } from '../../store/slices/orgSlice.js';
import { organizationsApi } from '../../api/client.js';
import Avatar from '../../components/Avatar.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Modal from '../../components/Modal.jsx';
import { formatDate } from '../../utils/status.js';
import { prettySize } from '../../utils/fileSize.js';
import { BuildingIcon, ShieldIcon, TrashIcon } from '../../components/icons.jsx';

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const me = useSelector(selectUser);
  const org = useSelector(selectCurrentOrg);
  const orgId = useSelector(selectCurrentOrgId);
  const isAdmin = org?.role === 'ADMIN';
  const isSelf = userId === me?.id;

  const [member, setMember] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleTarget, setRoleTarget] = useState(null); // 'ADMIN' | 'MEMBER' when confirming
  const [removeOpen, setRemoveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!orgId || !userId) return;
    setLoading(true);
    organizationsApi
      .memberProfile(orgId, userId)
      .then((r) => {
        setMember(r.member);
        setError('');
      })
      .catch((err) => setError(err.message || 'Could not load this member'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [orgId, userId]);

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
        <EmptyState icon={<BuildingIcon size={30} />} title="No organization selected" description="Pick an organization to see this member." />
      </div>
    );
  }

  return (
    <div className="page page--narrow">
      <button className="link-btn" onClick={() => navigate(-1)}>← Back</button>

      {error && <div className="alert alert--error">{error}</div>}

      {loading || !member ? (
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      ) : (
        <>
          <div className="user-profile__card">
            <Avatar name={member.name} email={member.email} src={member.avatarUrl} size={64} viewable />
            <h1 className="user-profile__name">{member.name || member.email}</h1>
            <p className="user-profile__email">{member.email}</p>
            <div className="user-profile__tags">
              <span className={`role-pill role-pill--${member.role.toLowerCase()}`}>{member.role}</span>
              {isSelf && <span className="tag">You</span>}
            </div>
            <p className="user-profile__meta">Member since {formatDate(member.joinedAt)}</p>
          </div>

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

          {isAdmin && !isSelf && (
            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Admin actions</h2>
              </div>
              <div className="modal__actions" style={{ marginTop: 0 }}>
                <button
                  className="btn btn--ghost"
                  onClick={() => setRoleTarget(member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                >
                  <ShieldIcon size={15} /> {member.role === 'ADMIN' ? 'Make member' : 'Make admin'}
                </button>
                <button className="btn btn--danger" onClick={() => setRemoveOpen(true)}>
                  <TrashIcon size={15} /> Remove from organization
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {roleTarget && (
        <Modal title="Change role" onClose={() => !busy && setRoleTarget(null)}>
          <p className="modal__intro">
            {roleTarget === 'ADMIN'
              ? `Make ${member.name || member.email} an admin? They'll be able to manage members, invitations and every group.`
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
