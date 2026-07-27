import { NavLink, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectPlatformUser, platformLogout } from '../store/slices/platformAuthSlice.js';
import { LogoutIcon } from '../components/icons.jsx';

/** Shared shell for both the Super Admin and Reseller portals — a minimal
 *  left nav (no org switcher/bottom-nav, unlike the main app's Sidebar,
 *  since a platform account has no organization concept at all). `navItems`:
 *  [{ to, label, desc, Icon }]. */
export default function PlatformLayout({ title, navItems }) {
  const dispatch = useDispatch();
  const platformUser = useSelector(selectPlatformUser);

  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="platform-brand">
          <span className="brand__logo-mark">✓</span>
          <div>
            <div className="platform-brand__name">Task Pro</div>
            <div className="platform-brand__tag">{title}</div>
          </div>
        </div>
        <nav className="platform-nav">
          {navItems.map(({ to, label, desc, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `platform-nav__item ${isActive ? 'platform-nav__item--active' : ''}`}>
              <Icon size={18} />
              <div>
                <div className="platform-nav__label">{label}</div>
                <div className="platform-nav__desc">{desc}</div>
              </div>
            </NavLink>
          ))}
        </nav>
        <button className="platform-signout" onClick={() => dispatch(platformLogout())}>
          <LogoutIcon size={16} /> Sign out
        </button>
      </aside>

      <div className="platform-main">
        <header className="platform-topbar">
          <div />
          <div className="platform-topbar__user">
            <span className="org-badge sm">{(platformUser?.name || '?')[0].toUpperCase()}</span>
            <div>
              <div className="platform-topbar__name">{platformUser?.name}</div>
              <div className="platform-topbar__role">{title}</div>
            </div>
          </div>
        </header>
        <main className="platform-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
