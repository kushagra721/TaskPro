import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentOrg,
  selectCurrentOrgId,
  selectOrgs,
  setCurrentOrg,
} from '../store/slices/orgSlice.js';
import { selectUser } from '../store/slices/authSlice.js';
import { joinOrgRoom } from '../realtime/socket.js';
import NotificationsBell from './NotificationsBell.jsx';
import Avatar from '../components/Avatar.jsx';
import OrgBadge from '../components/OrgBadge.jsx';
import { useHeaderActions } from './HeaderActions.jsx';
import {
  ChevronDownIcon,
  PlusIcon,
  CheckIcon,
  SearchIcon,
  FilterIcon,
  XIcon,
  ArrowLeftIcon,
} from '../components/icons.jsx';

export default function Topbar({ title, isRoot, onCreateOrg }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const org = useSelector(selectCurrentOrg);
  const orgs = useSelector(selectOrgs);
  const user = useSelector(selectUser);
  const currentId = useSelector(selectCurrentOrgId);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Search/filter handlers published by the current page (mobile header only).
  const actions = useHeaderActions();
  const canSearch = Boolean(actions?.onSearch);
  const canFilter = Boolean(actions?.onOpenFilters);

  // Collapse the search row when navigating to a page that has no search.
  useEffect(() => {
    if (!canSearch) setSearchOpen(false);
  }, [canSearch]);

  const pick = (id) => {
    dispatch(setCurrentOrg(id));
    joinOrgRoom(id);
    setOpen(false);
  };

  return (
    <header className={`topbar ${isRoot ? 'topbar--root' : ''}`}>
      <div className="topbar__bar">
        <div className="topbar__left">
          {/* Sub-pages hide the bottom nav, so the header carries the back action. */}
          {!isRoot && (
            <button className="topbar__back" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeftIcon size={20} />
            </button>
          )}
          <span className="topbar__mobile-brand brand__logo-mark">✓</span>
          <div className="topbar__titles">
            {/* Primary line: the page title (desktop + sub-pages) OR, on mobile
                root pages, the logged-in user. CSS decides which shows. */}
            <div className="topbar__title">{title}</div>
            <div className="topbar__userline">
              <span className="topbar__user-name">{user?.name || user?.email || 'You'}</span>
              {org?.role && <span className={`role-pill role-pill--${org.role.toLowerCase()}`}>{org.role}</span>}
            </div>
            {/* Secondary line: the organisation (a switcher button on mobile). */}
            <button className="topbar__org topbar__org--btn" onClick={() => setOpen((o) => !o)}>
              <span className="topbar__org-name">{org?.name || 'No organization'}</span>
              <ChevronDownIcon size={14} />
            </button>
          </div>

          {open && (
            <>
              <div className="dropdown-backdrop" onClick={() => setOpen(false)} />
              <div className="dropdown topbar__org-menu">
                <div className="dropdown__label">Your organizations</div>
                {orgs.length === 0 && <div className="dropdown__empty">None yet</div>}
                {orgs.map((o) => (
                  <button key={o.id} className="dropdown__item" onClick={() => pick(o.id)}>
                    <OrgBadge name={o.name} icon={o.icon} photoUrl={o.photoUrl} size="sm" />
                    <span className="dropdown__item-text">{o.name}</span>
                    {o.id === currentId && <CheckIcon size={16} />}
                  </button>
                ))}
                <div className="dropdown__sep" />
                <button
                  className="dropdown__item"
                  onClick={() => {
                    setOpen(false);
                    onCreateOrg?.();
                  }}
                >
                  <span className="org-badge sm ghost">
                    <PlusIcon size={14} />
                  </span>
                  <span className="dropdown__item-text">Create / search organizations</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="topbar__right">
          {canSearch && (
            <button
              className={`icon-btn topbar__action ${searchOpen ? 'icon-btn--active' : ''}`}
              onClick={() => setSearchOpen((s) => !s)}
              aria-label="Search"
            >
              {searchOpen ? <XIcon size={18} /> : <SearchIcon size={18} />}
            </button>
          )}
          {canFilter && (
            <button
              className="icon-btn topbar__action topbar__action--filter"
              onClick={actions.onOpenFilters}
              aria-label="Filters"
            >
              <FilterIcon size={18} />
              {actions.filterCount > 0 && <span className="topbar__action-count">{actions.filterCount}</span>}
            </button>
          )}
          <NotificationsBell />
        </div>
      </div>

      {/* Mobile row 2: the search field when searching, otherwise — on inner
          pages (which show the page title, not the user, up top) — a user +
          role strip so you can still see who you're signed in as. */}
      {searchOpen && canSearch ? (
        <div className="topbar__search">
          <SearchIcon size={16} />
          <input
            className="topbar__search-input"
            autoFocus
            placeholder="Search…"
            value={actions.search || ''}
            onChange={(e) => actions.onSearch(e.target.value)}
          />
          {actions.search && (
            <button className="icon-btn" onClick={() => actions.onSearch('')} aria-label="Clear search">
              <XIcon size={14} />
            </button>
          )}
        </div>
      ) : (
        !isRoot && (
          <div className="topbar__userstrip">
            <Avatar name={user?.name} email={user?.email} src={user?.avatarUrl} size={22} />
            <span className="topbar__user-name">{user?.name || user?.email || 'You'}</span>
            {org?.role && <span className={`role-pill role-pill--${org.role.toLowerCase()}`}>{org.role}</span>}
          </div>
        )
      )}
    </header>
  );
}
