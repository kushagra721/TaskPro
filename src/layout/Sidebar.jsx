import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HomeIcon, GroupsIcon, TaskIcon, ChatIcon, MoreIcon } from '../components/icons.jsx';
import { selectTotalUnread } from '../store/slices/chatSlice.js';
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
// The workspace switcher used to sit under the brand here. It moved to the
// More page (see `MorePage`'s "Workspace" card): switching is an occasional
// account action, not a navigation destination, and it was the widest thing in
// this column — the sidebar narrowed once it left.
export default function Sidebar() {
  const { isLocked, isHidden } = useNavGate();
  const unread = useSelector(selectTotalUnread);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="brand__logo-mark">✓</span> Task&nbsp;Pro
      </div>

      <nav className="nav">
        {NAV.filter(({ to }) => !isHidden(to)).map(({ to, label, Icon }) =>
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
