import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { HomeIcon, GroupsIcon, TaskIcon, ReportsIcon, MoreIcon, LogoutIcon } from '../components/icons.jsx';
import OrgSwitcher from './OrgSwitcher.jsx';
import Avatar from '../components/Avatar.jsx';
import { selectUser, logout } from '../store/slices/authSlice.js';
import { resetOrgs, selectCurrentOrg } from '../store/slices/orgSlice.js';
import { resetProjects } from '../store/slices/projectSlice.js';

const NAV = [
  { to: '/dashboard', label: 'Home', Icon: HomeIcon },
  { to: '/groups', label: 'Groups', Icon: GroupsIcon },
  { to: '/tasks', label: 'Tasks', Icon: TaskIcon },
  { to: '/reports', label: 'Reports', Icon: ReportsIcon },
  { to: '/more', label: 'More', Icon: MoreIcon },
];

export default function Sidebar({ onCreateOrg }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const org = useSelector(selectCurrentOrg);

  const doLogout = () => {
    dispatch(logout());
    dispatch(resetOrgs());
    dispatch(resetProjects());
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="brand__logo-mark">✓</span> Task&nbsp;Pro
      </div>

      <OrgSwitcher onCreate={onCreateOrg} />

      <nav className="nav">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav__item ${isActive ? 'nav__item--active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__foot">
        <div className="sidebar__user">
          <Avatar name={user?.name} email={user?.email} size={34} />
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{user?.name || 'You'}</div>
            <div className="sidebar__user-email">{user?.email}</div>
            {org && <div className="sidebar__user-role">{org.role}</div>}
          </div>
        </div>
        <button className="icon-btn" onClick={doLogout} title="Log out" aria-label="Log out">
          <LogoutIcon size={18} />
        </button>
      </div>
    </aside>
  );
}
