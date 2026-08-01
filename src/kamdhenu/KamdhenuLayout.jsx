import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  kamdhenuLogout,
  selectKamdhenuAdmin,
  selectKamdhenuRole,
} from '../store/slices/kamdhenuAuthSlice.js';
import { KamdhenuToastProvider } from './components/KamdhenuToast.jsx';
import {
  HomeIcon,
  TaskIcon,
  BuildingIcon,
  ActivityIcon,
  GroupsIcon,
  ReceiptIcon,
  DatabaseIcon,
  ReportsIcon,
  SettingsIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  ListIcon,
  LogoutIcon,
} from '../components/icons.jsx';

const SIDEBAR_KEY = 'kamdhenu_sidebar'; // '1' = collapsed
const THEME_KEY = 'kamdhenu_theme'; // 'dark' | 'light'

const ALL = ['ADMIN', 'SUPERVISOR', 'MEMBER'];

/** Sidebar definition — `roles` gates each entry; groups drop hidden children
 *  and disappear entirely when none remain. */
const NAV = [
  { type: 'link', to: '/kamdhenu/dashboard', label: 'Dashboard', Icon: HomeIcon, roles: ALL },
  { type: 'link', to: '/kamdhenu/job-works', label: 'Job Work', Icon: TaskIcon, roles: ['ADMIN', 'SUPERVISOR'] },
  { type: 'section', label: 'Admin', roles: ALL },
  { type: 'link', to: '/kamdhenu/sites', label: 'Sites', Icon: BuildingIcon, roles: ['ADMIN'] },
  { type: 'link', to: '/kamdhenu/equipment', label: 'Equipment', Icon: ActivityIcon, roles: ['ADMIN'] },
  { type: 'link', to: '/kamdhenu/members', label: 'Members', Icon: GroupsIcon, roles: ['ADMIN'] },
  {
    type: 'group',
    key: 'po',
    label: 'Purchase Orders',
    Icon: ReceiptIcon,
    roles: ['ADMIN'],
    children: [
      { to: '/kamdhenu/purchase-orders/new', label: 'Add PO', roles: ['ADMIN'] },
      { to: '/kamdhenu/purchase-orders', label: 'PO Details', roles: ['ADMIN'], end: true },
    ],
  },
  {
    type: 'group',
    key: 'material',
    label: 'Material Management',
    Icon: DatabaseIcon,
    roles: ALL,
    children: [
      { to: '/kamdhenu/materials', label: 'Material Master', roles: ['ADMIN'] },
      { to: '/kamdhenu/material-in', label: 'Material IN', roles: ['ADMIN', 'SUPERVISOR'] },
      { to: '/kamdhenu/stock', label: 'Material Stock', roles: ALL },
    ],
  },
  { type: 'link', to: '/kamdhenu/reports', label: 'Reports', Icon: ReportsIcon, roles: ['ADMIN', 'SUPERVISOR'] },
  { type: 'link', to: '/kamdhenu/settings', label: 'Settings', Icon: SettingsIcon, roles: ['ADMIN'] },
];

/** Filters NAV for a role: gates leaves, prunes group children, drops empty
 *  groups, and drops a section label with nothing visible under it. */
const navForRole = (role) => {
  const items = [];
  NAV.forEach((item) => {
    if (item.type === 'link') {
      if (item.roles.includes(role)) items.push(item);
    } else if (item.type === 'group') {
      const children = item.children.filter((c) => c.roles.includes(role));
      if (children.length) items.push({ ...item, children });
    } else {
      items.push(item); // section label — pruned below if empty
    }
  });
  return items.filter((item, i) => {
    if (item.type !== 'section') return true;
    const rest = items.slice(i + 1);
    const next = rest.findIndex((x) => x.type === 'section');
    const span = next === -1 ? rest : rest.slice(0, next);
    return span.length > 0;
  });
};

const CRUMB_LABELS = {
  dashboard: 'Dashboard',
  'job-works': 'Job Work',
  sites: 'Sites',
  equipment: 'Equipment',
  members: 'Members',
  'purchase-orders': 'Purchase Orders',
  materials: 'Material Master',
  'material-in': 'Material IN',
  stock: 'Material Stock',
  reports: 'Reports',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
};

const crumbsFromPath = (pathname) => {
  const segments = pathname.split('/').filter(Boolean).filter((s) => s !== 'kamdhenu');
  return segments.map((seg) => CRUMB_LABELS[seg] || 'Details');
};

export default function KamdhenuLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const admin = useSelector(selectKamdhenuAdmin);
  const role = useSelector(selectKamdhenuRole) || 'ADMIN';

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  const items = navForRole(role);
  const crumbs = crumbsFromPath(location.pathname);

  // Auto-expand whichever group owns the current route; close the mobile
  // drawer on every navigation.
  useEffect(() => {
    setMobileOpen(false);
    const owner = NAV.find(
      (item) => item.type === 'group' && item.children.some((c) => location.pathname.startsWith(c.to))
    );
    if (owner) setOpenGroups((prev) => ({ ...prev, [owner.key]: true }));
  }, [location.pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      return next;
    });
  };

  const toggleTheme = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  const toggleGroup = (key) => {
    if (collapsed) {
      // Expanding a submenu makes no sense icon-only — open the rail first.
      setCollapsed(false);
      localStorage.setItem(SIDEBAR_KEY, '0');
      setOpenGroups((prev) => ({ ...prev, [key]: true }));
      return;
    }
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const logout = () => {
    dispatch(kamdhenuLogout());
    navigate('/kamdhenu/login', { replace: true });
  };

  return (
    <KamdhenuToastProvider>
      <div className={`kerp-shell ${collapsed ? 'kerp-shell--collapsed' : ''} ${dark ? 'kerp-dark' : ''}`}>
        <aside className={`kerp-sidebar ${mobileOpen ? 'kerp-sidebar--open' : ''}`}>
          <div className="kerp-sidebar__brand">
            <span className="brand__logo-mark">✓</span>
            <span className="kerp-sidebar__brand-name">Kamdhenu ERP</span>
            <button
              type="button"
              className="kerp-collapse-btn"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRightIcon size={16} /> : <ArrowLeftIcon size={16} />}
            </button>
          </div>

          <nav className="kerp-nav">
            {items.map((item) => {
              if (item.type === 'section') {
                return (
                  <div key={`section-${item.label}`} className="kerp-nav__section">
                    {item.label}
                  </div>
                );
              }
              if (item.type === 'link') {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={({ isActive }) =>
                      `kerp-nav__item ${isActive ? 'kerp-nav__item--active' : ''}`
                    }
                  >
                    <item.Icon size={18} />
                    <span className="kerp-nav__label">{item.label}</span>
                  </NavLink>
                );
              }
              const open = !!openGroups[item.key];
              const groupActive = item.children.some((c) => location.pathname.startsWith(c.to));
              return (
                <div key={item.key} className="kerp-nav__group">
                  <button
                    type="button"
                    title={item.label}
                    className={`kerp-nav__item kerp-nav__group-btn ${
                      groupActive ? 'kerp-nav__item--active' : ''
                    }`}
                    onClick={() => toggleGroup(item.key)}
                    aria-expanded={open}
                  >
                    <item.Icon size={18} />
                    <span className="kerp-nav__label">{item.label}</span>
                    <span className={`kerp-nav__chevron ${open ? 'kerp-nav__chevron--open' : ''}`}>
                      <ChevronDownIcon size={14} />
                    </span>
                  </button>
                  {open && !collapsed && (
                    <div className="kerp-nav__sub">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end={child.end}
                          className={({ isActive }) =>
                            `kerp-nav__subitem ${isActive ? 'kerp-nav__subitem--active' : ''}`
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {mobileOpen && (
          <div className="kerp-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        )}

        <div className="kerp-main">
          <header className="kerp-topbar">
            <button
              type="button"
              className="kerp-hamburger"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <ListIcon size={20} />
            </button>

            <nav className="kerp-crumbs" aria-label="Breadcrumb">
              {crumbs.map((label, i) => (
                <span key={`${label}-${i}`} className="kerp-crumbs__item">
                  {i > 0 && <span className="kerp-crumbs__sep">/</span>}
                  {label}
                </span>
              ))}
            </nav>

            <div className="kerp-topbar__spacer" />

            <button
              type="button"
              className="kerp-theme-btn"
              onClick={toggleTheme}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? '☀' : '☾'}
            </button>

            <div className="kerp-userchip">
              <span className="org-badge sm">{(admin?.name || admin?.email || '?')[0].toUpperCase()}</span>
              <span className="kerp-userchip__name">{admin?.name || admin?.email}</span>
              <span className={`role-pill ${role === 'ADMIN' ? 'role-pill--admin' : 'role-pill--member'}`}>
                {role}
              </span>
            </div>

            <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
              <LogoutIcon size={15} /> Logout
            </button>
          </header>

          <main className="kerp-content">
            <Outlet />
          </main>
        </div>
      </div>
    </KamdhenuToastProvider>
  );
}
