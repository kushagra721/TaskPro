import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectInvitations,
  fetchMyInvitations,
  acceptInvitation,
  declineInvitation,
} from '../../store/slices/invitationSlice.js';
import { fetchMyOrgs, setCurrentOrg } from '../../store/slices/orgSlice.js';
import { joinOrgRoom } from '../../realtime/socket.js';
import EmptyState from '../../components/EmptyState.jsx';
import { MailIcon, CheckIcon, XIcon } from '../../components/icons.jsx';
import { timeAgo } from '../../utils/time.js';

export default function InvitationsPage() {
  const dispatch = useDispatch();
  const invitations = useSelector(selectInvitations);

  useEffect(() => {
    dispatch(fetchMyInvitations());
  }, [dispatch]);

  const accept = async (inv) => {
    const res = await dispatch(acceptInvitation(inv.id)).unwrap();
    await dispatch(fetchMyOrgs());
    dispatch(setCurrentOrg(res.organization.id));
    joinOrgRoom(res.organization.id);
  };

  if (invitations.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon={<MailIcon size={30} />}
          title="No pending invitations"
          description="When someone invites you to an organization, it'll show up here."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <ul className="invite-list">
        {invitations.map((inv) => (
          <li key={inv.id} className="invite-card">
            <span className="org-badge lg">{inv.organization.name[0].toUpperCase()}</span>
            <div className="invite-card__info">
              <div className="invite-card__name">{inv.organization.name}</div>
              <div className="invite-card__meta">
                Invited as {inv.role.toLowerCase()} by{' '}
                {inv.invitedBy?.name || inv.invitedBy?.email || 'someone'} · {timeAgo(inv.createdAt)}
              </div>
            </div>
            <div className="invite-card__actions">
              <button className="btn" style={{ width: 'auto', padding: '0 16px', height: 40 }} onClick={() => accept(inv)}>
                <CheckIcon size={16} /> Accept
              </button>
              <button
                className="btn btn--ghost"
                style={{ width: 'auto', padding: '0 16px', height: 40 }}
                onClick={() => dispatch(declineInvitation(inv.id))}
              >
                <XIcon size={16} /> Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
