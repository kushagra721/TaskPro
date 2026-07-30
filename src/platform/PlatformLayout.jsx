import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectPlatformUser, platformLogout } from '../store/slices/platformAuthSlice.js';
import { platformApi } from '../api/client.js';
import PlatformBottomNav from './PlatformBottomNav.jsx';
import { ChevronDownIcon, LogoutIcon, UserIcon } from '../components/icons.jsx';

/** Shared shell for both the Super Admin and Reseller portals — a two-level
 *  nav: `navGroups` ([{ key, label, Icon, children: [{ to, label, key }] }])
 *  render as parent sections down the left sidebar (only the parent is a
 *  sidebar link), and whichever group is active shows its children as a
 *  horizontal tab row above the routed content — same `.groups-tabbar`/`.tab`
 *  pattern as the main app's Hub (Groups/Projects/Clients/Members) tabs, right
 *  down to the `.tab__count` badges (fed by `GET /platform/nav-counts`, keyed
 *  by each child's `key`).
 *
 *  Sign out AND Profile live in the dropdown under the user chip — matching
 *  the reference design's user-chip-with-chevron pattern, extended with a
 *  "Profile" entry per explicit instruction ("add profile at the Top Right
 *  with logout option"). */
export default function PlatformLayout({ title, navGroups, profilePath }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const platformUser = useSelector(selectPlatformUser);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [counts, setCounts] = useState({});
  const menuRef = useRef(null);

  useEffect(() => {
    platformApi.navCounts().then((res) => setCounts(res.counts || {})).catch(() => {});
  }, []);

  const activeGroup =
    navGroups
      .filter((g) => g.children.some((c) => location.pathname.startsWith(c.to)))
      .sort((a, b) => b.children[0].to.length - a.children[0].to.length)[0] || navGroups[0];

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

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
          {navGroups.map((group) => {
            const isActive = group.key === activeGroup?.key;
            return (
              <NavLink
                key={group.key}
                to={group.children[0].to}
                className={`platform-nav__item ${isActive ? 'platform-nav__item--active' : ''}`}
              >
                <group.Icon size={18} />
                <div>
                  <div className="platform-nav__label">{group.label}</div>
                </div>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="platform-main">
        <header className="platform-topbar">
          <div className="platform-topbar__title-block">
            <h1 className="platform-topbar__title">{activeGroup?.label}</h1>
          </div>

          <div className="platform-topbar__user" ref={menuRef}>
            <button
              type="button"
              className="platform-topbar__user-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <span className="org-badge sm">{(platformUser?.name || '?')[0].toUpperCase()}</span>
              <div>
                <div className="platform-topbar__name">{platformUser?.name}</div>
                <div className="platform-topbar__role">{title}</div>
              </div>
              <ChevronDownIcon size={15} className="platform-topbar__chevron" />
            </button>

            {menuOpen && (
              <div className="platform-topbar__menu">
                <button
                  type="button"
                  className="platform-topbar__menu-item platform-topbar__menu-item--muted"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(profilePath);
                  }}
                >
                  <UserIcon size={16} /> Profile
                </button>
                <button
                  type="button"
                  className="platform-topbar__menu-item"
                  onClick={() => dispatch(platformLogout())}
                >
                  <LogoutIcon size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {activeGroup?.children.length > 1 && (
          <div className="groups-tabbar platform-tabbar">
            {activeGroup.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) => `tab ${isActive ? 'tab--active' : ''}`}
              >
                {child.label}
                {child.key && counts[child.key] != null && (
                  <span className="tab__count">{counts[child.key]}</span>
                )}
              </NavLink>
            ))}
          </div>
        )}

        <main className="platform-content">
          <Outlet />
        </main>
      </div>

      <PlatformBottomNav navGroups={navGroups} activeGroupKey={activeGroup?.key} />
    </div>
  );
}
