import { useSelector } from 'react-redux';
import { selectCurrentOrg } from '../store/slices/orgSlice.js';
import { selectGroups } from '../store/slices/groupSlice.js';
import { isAdminRole, isClientRole } from '../utils/role.js';

/**
 * What the navigation offers, and what it withholds.
 *
 * TWO DIFFERENT MECHANISMS, deliberately, because they answer different
 * questions:
 *
 * - **Locked** — "not yet". A fresh admin who just created a workspace has no
 *   groups, so Tasks / Chats / More would all dead-end. They render as inert
 *   items so the user can see the app has more to it once they create a group.
 *
 * - **Hidden** — "not for you". A CLIENT has no use for the org-wide task list;
 *   it is not a step they have yet to unlock, so showing it greyed out would
 *   just be a permanent tease. It is removed from the nav entirely.
 */
export function useNavGate() {
  const org = useSelector(selectCurrentOrg);
  const groups = useSelector(selectGroups);

  const locked = isAdminRole(org?.role) && groups.length === 0;
  const LOCKED_PATHS = ['/tasks', '/chats', '/more'];
  const isLocked = (to) => locked && LOCKED_PATHS.includes(to);

  // A client GETS Tasks — the list is scoped server-side to their own client
  // space, so it shows their work and nothing else (see
  // `task.service.js#taskScopeFor`). Chats is hidden instead: channels are the
  // supplier's internal conversation, and a client is not a channel member.
  const HIDDEN_FOR_CLIENT = ['/chats'];
  const isHidden = (to) => isClientRole(org?.role) && HIDDEN_FOR_CLIENT.includes(to);

  return { locked, isLocked, isHidden };
}
