import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  UserIcon,
  BuildingIcon,
  MailIcon,
  ActivityIcon,
  DatabaseIcon,
  LogoutIcon,
  ChevronRightIcon,
} from '../../components/icons.jsx';
import { selectInvitationCount } from '../../store/slices/invitationSlice.js';
import { selectCurrentOrg, resetOrgs } from '../../store/slices/orgSlice.js';
import { logout } from '../../store/slices/authSlice.js';
import { resetProjects } from '../../store/slices/projectSlice.js';
import { resetClients } from '../../store/slices/clientSlice.js';

export default function MorePage() {
  const dispatch = useDispatch();
  const invitationCount = useSelector(selectInvitationCount);
  const org = useSelector(selectCurrentOrg);
  const isAdmin = org?.role === 'ADMIN';

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
      label: 'Manage Organizations',
      desc: 'Organizations you belong to',
      Icon: BuildingIcon,
    },
    { to: '/more/activities', label: 'All Activities', desc: 'Recent activity in your organization', Icon: ActivityIcon },
    // Storage report is admin-only. Member management moved to the Groups
    // page's Members tab (also admin-only).
    ...(isAdmin
      ? [{ to: '/more/storage', label: 'Storage', desc: 'Media uploaded by every member', Icon: DatabaseIcon }]
      : []),
    {
      to: '/more/invitations',
      label: 'Invitation Requests',
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
