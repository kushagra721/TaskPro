import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  UserIcon,
  BuildingIcon,
  MailIcon,
  TaskIcon,
  ActivityIcon,
  ChevronRightIcon,
} from '../../components/icons.jsx';
import { selectInvitationCount } from '../../store/slices/invitationSlice.js';
import { selectCurrentOrg } from '../../store/slices/orgSlice.js';

export default function MorePage() {
  const invitationCount = useSelector(selectInvitationCount);
  const org = useSelector(selectCurrentOrg);
  const isAdmin = org?.role === 'ADMIN';

  const items = [
    { to: '/more/profile', label: 'My Profile', desc: 'Your name and account', Icon: UserIcon },
    { to: '/more/tasks', label: 'Manage Tasks', desc: 'All your tasks across groups', Icon: TaskIcon },
    { to: '/more/activities', label: 'All Activities', desc: 'Recent activity in your organization', Icon: ActivityIcon },
    // Manage Members is admin-only.
    ...(isAdmin
      ? [{ to: '/more/members', label: 'Manage Members', desc: 'Members, roles and invitations', Icon: BuildingIcon }]
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
      </div>
    </div>
  );
}
