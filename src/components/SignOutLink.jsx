import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice.js';
import { resetOrgs } from '../store/slices/orgSlice.js';
import { resetProjects } from '../store/slices/projectSlice.js';
import { resetClients } from '../store/slices/clientSlice.js';
import { LogoutIcon } from './icons.jsx';

/**
 * Escape hatch on the non-dismissable post-login popups (pending invites,
 * create workspace, create group) — lets a user stuck behind one of these
 * (e.g. logged into the wrong account) sign out instead of being trapped.
 */
export default function SignOutLink() {
  const dispatch = useDispatch();

  const doLogout = () => {
    dispatch(logout());
    dispatch(resetOrgs());
    dispatch(resetProjects());
    dispatch(resetClients());
  };

  return (
    <button type="button" className="link-btn sign-out-link" onClick={doLogout}>
      <LogoutIcon size={14} /> Sign out instead
    </button>
  );
}
