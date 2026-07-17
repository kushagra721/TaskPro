import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { BellIcon, CheckIcon, XIcon } from '../components/icons.jsx';
import {
  selectNotifications,
  selectUnreadCount,
  markAllNotificationsRead,
} from '../store/slices/notificationSlice.js';
import { selectInvitations, acceptInvitation, declineInvitation } from '../store/slices/invitationSlice.js';
import {
  selectIncomingJoinRequests,
  approveJoinRequest,
  declineJoinRequest,
} from '../store/slices/joinRequestSlice.js';
import { fetchMyOrgs, fetchMembers, setCurrentOrg } from '../store/slices/orgSlice.js';
import { joinOrgRoom } from '../realtime/socket.js';
import { timeAgo } from '../utils/time.js';

export default function NotificationsBell() {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const notifications = useSelector(selectNotifications);
  const unread = useSelector(selectUnreadCount);
  const invitations = useSelector(selectInvitations);
  const joinRequests = useSelector(selectIncomingJoinRequests);

  // Unread + pending action count drives the badge.
  const badgeCount = unread + invitations.length + joinRequests.length;

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next && unread > 0) dispatch(markAllNotificationsRead());
      return next;
    });
  };

  const accept = async (inv) => {
    const res = await dispatch(acceptInvitation(inv.id)).unwrap();
    await dispatch(fetchMyOrgs());
    dispatch(setCurrentOrg(res.organization.id));
    joinOrgRoom(res.organization.id);
  };

  const approveJoin = async (r) => {
    await dispatch(approveJoinRequest(r.id)).unwrap();
    dispatch(fetchMembers(r.organizationId));
  };

  const empty = invitations.length === 0 && joinRequests.length === 0 && notifications.length === 0;

  return (
    <div className="bell">
      <button className="icon-btn bell__btn" onClick={toggle} aria-label="Notifications">
        <BellIcon size={20} />
        {badgeCount > 0 && <span className="bell__badge">{badgeCount > 9 ? '9+' : badgeCount}</span>}
      </button>

      {open && (
        <>
          <div className="dropdown-backdrop" onClick={() => setOpen(false)} />
          <div className="dropdown bell__menu">
            <div className="dropdown__label">Notifications</div>
            {empty && <div className="dropdown__empty">You&apos;re all caught up 🎉</div>}

            {joinRequests.map((r) => (
              <div key={r.id} className="notif notif--invite">
                <div className="notif__text">
                  <strong>{r.user.name || r.user.email}</strong> wants to join
                  <div className="notif__sub">{r.organizationName}</div>
                </div>
                <div className="notif__actions">
                  <button className="mini-btn mini-btn--primary" onClick={() => approveJoin(r)}>
                    <CheckIcon size={14} /> Accept
                  </button>
                  <button
                    className="mini-btn"
                    onClick={() => dispatch(declineJoinRequest(r.id))}
                    aria-label="Reject"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              </div>
            ))}

            {invitations.map((inv) => (
              <div key={inv.id} className="notif notif--invite">
                <div className="notif__text">
                  <strong>{inv.organization.name}</strong> invitation
                  <div className="notif__sub">
                    from {inv.invitedBy?.name || inv.invitedBy?.email || 'someone'}
                  </div>
                </div>
                <div className="notif__actions">
                  <button className="mini-btn mini-btn--primary" onClick={() => accept(inv)}>
                    <CheckIcon size={14} /> Accept
                  </button>
                  <button
                    className="mini-btn"
                    onClick={() => dispatch(declineInvitation(inv.id))}
                    aria-label="Decline"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              </div>
            ))}

            {notifications.map((n) => (
              <div key={n.id} className={`notif ${n.read ? '' : 'notif--unread'}`}>
                <div className="notif__text">
                  {n.title}
                  {n.body && <div className="notif__sub">{n.body}</div>}
                  <div className="notif__time">{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
