import { useSelector } from 'react-redux';
import { selectCurrentOrg } from '../store/slices/orgSlice.js';
import { selectGroups } from '../store/slices/groupSlice.js';
import { isAdminRole } from '../utils/role.js';

/**
 * A fresh admin who just created an org has no groups yet — they must create
 * one before anything else is useful. Until then, lock Tasks / Reports / More
 * so only Home and Groups are reachable.
 */
export function useNavGate() {
  const org = useSelector(selectCurrentOrg);
  const groups = useSelector(selectGroups);
  const locked = isAdminRole(org?.role) && groups.length === 0;
  const LOCKED_PATHS = ['/tasks', '/reports', '/more'];
  const isLocked = (to) => locked && LOCKED_PATHS.includes(to);
  return { locked, isLocked };
}
