import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Avatar from '../../components/Avatar.jsx';
import { selectUser } from '../../store/slices/authSlice.js';
import { removeGroupMember } from '../../store/slices/groupSlice.js';
import { organizationsApi } from '../../api/client.js';

export default function ChannelMembers({ group, orgId, canManage, onAddMember }) {
  const dispatch = useDispatch();
  const me = useSelector(selectUser);
  const members = group.members || [];
  const [invites, setInvites] = useState([]);

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

  return (
    <div className="channel-members">
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Members ({members.length})</h2>
        </div>
        <ul className="member-list">
          {members.map((m) => (
            <li key={m.id} className="member">
              <Avatar name={m.name} email={m.email} size={38} />
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
      </section>
    </div>
  );
}
