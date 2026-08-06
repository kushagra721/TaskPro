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

export default function BottomNav() {
  const { isLocked, isHidden } = useNavGate();
  const unread = useSelector(selectTotalUnread);

  return (
    <nav className="bottom-nav">
      {NAV.filter(({ to }) => !isHidden(to)).map(({ to, label, Icon }) =>
        isLocked(to) ? (
          <span
            key={to}
            className="bottom-nav__item bottom-nav__item--locked"
            title="Create a group first"
            aria-disabled="true"
          >
            <span className="nav__icon-wrap"><Icon size={22} /></span>
            <span>{label}</span>
          </span>
        ) : (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="nav__icon-wrap">
              <Icon size={22} />
              {to === '/chats' && unread > 0 && (
                <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        )
      )}
    </nav>
  );
}
