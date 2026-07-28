import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  UserIcon,
  BuildingIcon,
  MailIcon,
  ActivityIcon,
  DatabaseIcon,
  ReportsIcon,
  LogoutIcon,
  ChevronRightIcon,
} from '../../components/icons.jsx';
import { selectInvitationCount } from '../../store/slices/invitationSlice.js';
import { selectCurrentOrg, resetOrgs } from '../../store/slices/orgSlice.js';
import { logout } from '../../store/slices/authSlice.js';
import { resetProjects } from '../../store/slices/projectSlice.js';
import { resetClients } from '../../store/slices/clientSlice.js';
import { isAdminRole } from '../../utils/role.js';

export default function MorePage() {
  const dispatch = useDispatch();
  const invitationCount = useSelector(selectInvitationCount);
  const org = useSelector(selectCurrentOrg);
  const isAdmin = isAdminRole(org?.role);

  const doLogout = () => {
    dispatch(logout());
    dispatch(resetOrgs());
    dispatch(resetProjects());
    dispatch(resetClients());
  };

  const items = [
    { to: '/more/profile', label: 'My Profile', desc: 'Your name and account', Icon: UserIcon },
    {
      to: '/more/organizations',
      // The current workspace's own name, not a generic "Workspace" label —
      // falls back to the generic label only in the split second before
      // `org` has loaded.
      label: org?.name || 'Workspace',
      desc: 'Details & settings for your current workspace',
      Icon: BuildingIcon,
    },
    { to: '/more/activities', label: 'All Activities', desc: 'Recent activity in your workspace', Icon: ActivityIcon },
    { to: '/more/reports', label: 'Reports', desc: 'Progress across your workspace', Icon: ReportsIcon },
    // Storage report is admin-only. Member management moved to the Groups
    // page's Members tab (also admin-only).
    ...(isAdmin
      ? [{ to: '/more/storage', label: 'Storage', desc: 'Media uploaded by every member', Icon: DatabaseIcon }]
      : []),
    {
      to: '/more/invitations',
      label: 'Pending Approvals',
      desc: 'Invitations waiting for you',
      Icon: MailIcon,
      badge: invitationCount,
    },
  ];

  return (
    <div className="page">
      <div className="menu-list">
        {items.map(({ to, label, desc, Icon, badge }) => (
          <Link key={to} to={to} className="menu-item">
            <span className="menu-item__icon">
              <Icon size={20} />
            </span>
            <span className="menu-item__text">
              <span className="menu-item__label">{label}</span>
              <span className="menu-item__desc">{desc}</span>
            </span>
            {badge > 0 && <span className="menu-item__badge">{badge}</span>}
            <ChevronRightIcon size={18} />
          </Link>
        ))}

        {/* The sidebar owns logout on desktop; mobile needs it here. */}
        <button className="menu-item menu-item--danger" onClick={doLogout}>
          <span className="menu-item__icon">
            <LogoutIcon size={20} />
          </span>
          <span className="menu-item__text">
            <span className="menu-item__label">Log out</span>
            <span className="menu-item__desc">Sign out of Task Pro on this device</span>
          </span>
        </button>
      </div>
    </div>
  );
}
