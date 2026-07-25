import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HomeIcon, GroupsIcon, TaskIcon, ChatIcon, MoreIcon } from '../components/icons.jsx';
import { selectTotalUnread } from '../store/slices/chatSlice.js';
import OrgSwitcher from './OrgSwitcher.jsx';
import { useNavGate } from '../hooks/useNavGate.js';

const NAV = [
  { to: '/dashboard', label: 'Home', Icon: HomeIcon },
  { to: '/groups', label: 'Hub', Icon: GroupsIcon },
  { to: '/tasks', label: 'Tasks', Icon: TaskIcon },
  { to: '/chats', label: 'Chats', Icon: ChatIcon },
  { to: '/more', label: 'More', Icon: MoreIcon },
];

// The user-info + logout block that used to live at the bottom of the
// sidebar now lives in Topbar.jsx's top-right corner (desktop only) —
// see Topbar.jsx's `topbar__user` block.
export default function Sidebar({ onCreateOrg }) {
  const { isLocked } = useNavGate();
  const unread = useSelector(selectTotalUnread);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="brand__logo-mark">✓</span> Task&nbsp;Pro
      </div>

      <OrgSwitcher onCreate={onCreateOrg} />

      <nav className="nav">
        {NAV.map(({ to, label, Icon }) =>
          isLocked(to) ? (
            <span key={to} className="nav__item nav__item--locked" title="Create a group first" aria-disabled="true">
              <span className="nav__icon-wrap"><Icon size={20} /></span>
              <span>{label}</span>
            </span>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav__item ${isActive ? 'nav__item--active' : ''}`}
            >
              <span className="nav__icon-wrap">
                <Icon size={20} />
                {to === '/chats' && unread > 0 && (
                  <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>
                )}
              </span>
              <span>{label}</span>
            </NavLink>
          )
        )}
      </nav>
    </aside>
  );
}
