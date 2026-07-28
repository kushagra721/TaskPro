import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectPlatformUser, platformLogout } from '../store/slices/platformAuthSlice.js';
import { ChevronDownIcon, LogoutIcon } from '../components/icons.jsx';

/** Shared shell for both the Super Admin and Reseller portals — a minimal
 *  left nav (no org switcher/bottom-nav, unlike the main app's Sidebar,
 *  since a platform account has no organization concept at all). `navItems`:
 *  [{ to, label, desc, Icon }].
 *
 *  The current section's title/subtitle live in the shared top header, not as
 *  a separate `<h1>` inside each page — matched from `navItems` by longest
 *  `pathname.startsWith(to)` prefix, so a sub-page (e.g. `resellers/new`,
 *  a domain's setup wizard) still shows its parent section's title, exactly
 *  like the reference design keeps "Custom Domains" in the header throughout
 *  the whole Add Domain wizard. Individual pages should NOT render their own
 *  page-level `<h1>`/subtitle any more — that's this header's job now.
 *
 *  Sign out lives in a dropdown under the user chip (not a standalone sidebar
 *  button any more) — per explicit instruction, matching the reference
 *  design's user-chip-with-chevron pattern. */
export default function PlatformLayout({ title, navItems }) {
  const dispatch = useDispatch();
  const platformUser = useSelector(selectPlatformUser);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const current =
    navItems
      .filter((item) => location.pathname.startsWith(item.to))
      .sort((a, b) => b.to.length - a.to.length)[0] || navItems[0];

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
      </aside>

      <div className="platform-main">
        <header className="platform-topbar">
          <div className="platform-topbar__title-block">
            <h1 className="platform-topbar__title">{current?.label}</h1>
            {current?.desc && <p className="platform-topbar__subtitle">{current.desc}</p>}
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
                  className="platform-topbar__menu-item"
                  onClick={() => dispatch(platformLogout())}
                >
                  <LogoutIcon size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="platform-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
