import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectInvitations,
  acceptInvitation,
  declineInvitation,
} from '../store/slices/invitationSlice.js';
import { fetchMyOrgs, setCurrentOrg } from '../store/slices/orgSlice.js';
import { joinOrgRoom } from '../realtime/socket.js';
import OrgBadge from './OrgBadge.jsx';
import { CheckIcon, XIcon } from './icons.jsx';
import { timeAgo } from '../utils/time.js';

/**
 * A non-dismissable overlay that blocks the app whenever the user has pending
 * invitations — they must accept or decline every one before it goes away.
 * No close button, no backdrop/Escape dismiss, by design.
 */
export default function PendingInvitesGate() {
  const dispatch = useDispatch();
  const invitations = useSelector(selectInvitations);
  const [busyId, setBusyId] = useState(null);

  if (invitations.length === 0) return null;

  const accept = async (inv) => {
    setBusyId(inv.id);
    try {
      const res = await dispatch(acceptInvitation(inv.id)).unwrap();
      await dispatch(fetchMyOrgs());
      dispatch(setCurrentOrg(res.organization.id));
      joinOrgRoom(res.organization.id);
    } catch {
      // leave the invite in the list so the user can retry
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (inv) => {
    setBusyId(inv.id);
    try {
      await dispatch(declineInvitation(inv.id)).unwrap();
    } catch {
      // leave the invite in the list so the user can retry
    } finally {
      setBusyId(null);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__head">
          <h3 className="modal__title">Pending invitation{invitations.length > 1 ? 's' : ''}</h3>
        </div>
        <div className="modal__body">
          <p className="modal__intro">
            Accept or decline {invitations.length > 1 ? 'each invitation' : 'this invitation'} below to continue.
          </p>
          <ul className="invite-list">
            {invitations.map((inv) => (
              <li key={inv.id} className="invite-card">
                <OrgBadge name={inv.organization.name} icon={inv.organization.icon} photoUrl={inv.organization.photoUrl} size="lg" />
                <div className="invite-card__info">
                  <div className="invite-card__name">{inv.organization.name}</div>
                  <div className="invite-card__meta">
                    Invited as {inv.role.toLowerCase()} by{' '}
                    {inv.invitedBy?.name || inv.invitedBy?.email || 'someone'} · {timeAgo(inv.createdAt)}
                  </div>
                </div>
                <div className="invite-card__actions">
                  <button
                    className="btn"
                    style={{ width: 'auto', padding: '0 16px', height: 40 }}
                    disabled={busyId === inv.id}
                    onClick={() => accept(inv)}
                  >
                    {busyId === inv.id ? <span className="spinner" /> : (<><CheckIcon size={16} /> Accept</>)}
                  </button>
                  <button
                    className="btn btn--ghost"
                    style={{ width: 'auto', padding: '0 16px', height: 40 }}
                    disabled={busyId === inv.id}
                    onClick={() => decline(inv)}
                  >
                    <XIcon size={16} /> Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
}
