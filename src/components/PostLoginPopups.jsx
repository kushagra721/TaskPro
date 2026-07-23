import { useSelector } from 'react-redux';
import { selectInvitations, selectInvitationsLoaded } from '../store/slices/invitationSlice.js';
import { selectOrgs, selectOrgsLoaded, selectCurrentOrg } from '../store/slices/orgSlice.js';
import { selectGroups, selectGroupsLoaded } from '../store/slices/groupSlice.js';
import PendingInvitesGate from './PendingInvitesGate.jsx';
import CreateOrgPopup from './CreateOrgPopup.jsx';
import CreateGroupPopup from './CreateGroupPopup.jsx';

/**
 * Sequences the three post-login blocking popups so at most one is ever shown
 * at a time (never stacked):
 *   1. Pending invitations — resolve every one before anything else.
 *   2. No organizations — create one (a group can't exist without an org).
 *   3. Org exists but has no groups yet (admin only, mirrors `useNavGate`).
 * Each gate waits on its slice's `loaded` flag so it doesn't flash open
 * before the underlying data has actually arrived from the API.
 */
export default function PostLoginPopups() {
  const invitations = useSelector(selectInvitations);
  const invitationsLoaded = useSelector(selectInvitationsLoaded);
  const orgs = useSelector(selectOrgs);
  const orgsLoaded = useSelector(selectOrgsLoaded);
  const currentOrg = useSelector(selectCurrentOrg);
  const groups = useSelector(selectGroups);
  const groupsLoaded = useSelector(selectGroupsLoaded);

  if (!invitationsLoaded || !orgsLoaded) return null;

  if (invitations.length > 0) return <PendingInvitesGate />;

  if (orgs.length === 0) return <CreateOrgPopup />;

  if (currentOrg?.role === 'ADMIN' && groupsLoaded && groups.length === 0) {
    return <CreateGroupPopup />;
  }

  return null;
}
