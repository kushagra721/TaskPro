import { Link } from 'react-router-dom';

/** Mobile equivalent of the platform sidebar — one icon per nav group
 *  (parent section), reusing the main app's `.bottom-nav`/`.bottom-nav__item`
 *  classes verbatim so it inherits the exact same fixed-position/icon/active
 *  styling for free. Active state mirrors `PlatformLayout`'s own
 *  `activeGroup` computation (passed in as `activeGroupKey`) rather than
 *  relying on `NavLink`'s single-path matching, since a group's tabs can span
 *  several distinct routes. */
export default function PlatformBottomNav({ navGroups, activeGroupKey }) {
  return (
    <nav className="bottom-nav platform-bottom-nav">
      {navGroups.map((group) => (
        <Link
          key={group.key}
          to={group.children[0].to}
          className={`bottom-nav__item ${group.key === activeGroupKey ? 'bottom-nav__item--active' : ''}`}
        >
          <span className="nav__icon-wrap">
            <group.Icon size={22} />
          </span>
          <span>{group.navLabel || group.label}</span>
        </Link>
      ))}
    </nav>
  );
}
