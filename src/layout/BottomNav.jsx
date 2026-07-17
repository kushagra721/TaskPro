import { NavLink } from 'react-router-dom';
import { HomeIcon, GroupsIcon, TaskIcon, ReportsIcon, MoreIcon } from '../components/icons.jsx';

const NAV = [
  { to: '/dashboard', label: 'Home', Icon: HomeIcon },
  { to: '/groups', label: 'Groups', Icon: GroupsIcon },
  { to: '/tasks', label: 'Tasks', Icon: TaskIcon },
  { to: '/reports', label: 'Reports', Icon: ReportsIcon },
  { to: '/more', label: 'More', Icon: MoreIcon },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
