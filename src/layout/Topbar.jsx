import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentOrg,
  selectCurrentOrgId,
  selectOrgs,
  setCurrentOrg,
} from '../store/slices/orgSlice.js';
import { selectUser, logout } from '../store/slices/authSlice.js';
import { ROLE_LABEL } from '../utils/role.js';
import { resetOrgs } from '../store/slices/orgSlice.js';
import { resetProjects } from '../store/slices/projectSlice.js';
import { resetClients } from '../store/slices/clientSlice.js';
import { joinOrgRoom } from '../realtime/socket.js';
import NotificationsBell from './NotificationsBell.jsx';
import Avatar from '../components/Avatar.jsx';
import OrgBadge from '../components/OrgBadge.jsx';
import { useHeaderActions } from './HeaderActions.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import {
  ChevronDownIcon,
  PlusIcon,
  CheckIcon,
  SearchIcon,
  FilterIcon,
  XIcon,
  ArrowLeftIcon,
  LogoutIcon,
  UserIcon,
  KeyIcon,
} from '../components/icons.jsx';

/** The account menu's last card row. Rendered from two branches — inside the
 *  expanded list, and alone when there is no list to expand — so it is a
 *  component rather than duplicated markup. */
function CreateWorkspaceRow({ onClick }) {
  return (
    <button type="button" className="acctmenu__row acctmenu__row--add" onClick={onClick}>
      <span className="org-badge sm ghost"><PlusIcon size={14} /></span>
      <span className="acctmenu__row-text">
        <span className="acctmenu__row-name">Create / find workspace</span>
      </span>
    </button>
  );
}

export default function Topbar({ title, isRoot, onCreateOrg }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // The account menu behind the chevron on the desktop user chip.
  const [userOpen, setUserOpen] = useState(false);
  const org = useSelector(selectCurrentOrg);
  const orgs = useSelector(selectOrgs);
  const user = useSelector(selectUser);
  const currentId = useSelector(selectCurrentOrgId);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // The workspace list inside the account menu can be folded away. It grows
  // with the number of workspaces and sits ABOVE Profile / Change password /
  // Logout, so on an account with many of them the everyday entries get pushed
  // down out of easy reach. Collapsed still names the current workspace, so
  // folding it never costs you the one fact it exists to show.
  const [orgsOpen, setOrgsOpen] = useState(true);

  /* The current workspace now has its own row above the fold, so the list below
     it is everything ELSE. Derived rather than filtered inline so the count in
     the collapsed label and the rows themselves can never disagree. */
  const others = useMemo(() => orgs.filter((o) => o.id !== currentId), [orgs, currentId]);

  const doLogout = () => {
    dispatch(logout());
    dispatch(resetOrgs());
    dispatch(resetProjects());
    dispatch(resetClients());
  };

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
          {isRoot && user?.avatarUrl ? (
            <img
              className="topbar__mobile-brand topbar__mobile-brand--photo"
              src={user.avatarUrl}
              alt={user?.name || user?.email || 'Profile'}
            />
          ) : (
            <span className="topbar__mobile-brand brand__logo-mark">✓</span>
          )}
          <div className="topbar__titles">
            {/* Primary line: the page title (desktop + sub-pages) OR, on mobile
                root pages, the logged-in user. CSS decides which shows. */}
            <div className="topbar__title">{title}</div>
            <div className="topbar__userline">
              <span className="topbar__user-name">{user?.name || user?.email || 'You'}</span>
              {org?.role && <span className={`role-pill role-pill--${org.role.toLowerCase()}`}>{org.role}</span>}
            </div>
            {/* Secondary line: the current workspace.
                On MOBILE this is a plain label — switching happens on the More
                page, which now carries the workspace card. A dropdown here put
                a second, easy-to-mis-tap route to the same action right beside
                the page title, on the breakpoint where mis-taps are most
                likely. Desktop keeps the quick switcher, since the sidebar's
                one moved to More and this is the only one left there. */}
            {isMobile ? (
              <div className="topbar__org">
                <span className="topbar__org-name">{org?.name || 'No workspace'}</span>
              </div>
            ) : (
              <button className="topbar__org topbar__org--btn" onClick={() => setOpen((o) => !o)}>
                <span className="topbar__org-name">{org?.name || 'No workspace'}</span>
                <ChevronDownIcon size={14} />
              </button>
            )}
          </div>

          {open && !isMobile && (
            <>
              <div className="dropdown-backdrop" onClick={() => setOpen(false)} />
              <div className="dropdown topbar__org-menu">
                <div className="dropdown__label">Your workspaces</div>
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
                  <span className="dropdown__item-text">Create / search workspaces</span>
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

          {/* Desktop only — mirrors the old sidebar-footer user block. */}
          <div className="topbar__user hide-mobile">
            <Avatar name={user?.name} email={user?.email} src={user?.avatarUrl} size={32} />
            <div className="topbar__user-info">
              <div className="topbar__user-name-row">{user?.name || 'You'}</div>
              <div className="topbar__user-email">{user?.email}</div>
            </div>
            {org?.role && <span className={`role-pill role-pill--${org.role.toLowerCase()}`}>{org.role}</span>}
            {/* Was a bare logout icon — one destructive action, reachable in a
                single stray click next to the avatar. Now a chevron opening the
                account menu; the chip itself is unchanged.

                Given its own surface (`topbar__user-caret`) rather than the
                plain `icon-btn` treatment: as a borderless glyph at the very
                edge of the header it read as decoration, so people did not
                realise the chip opened anything. It also rotates while the menu
                is open, which is the usual signal that a disclosure is the
                thing holding the panel below it. */}
            <button
              className={`icon-btn topbar__user-caret ${userOpen ? 'topbar__user-caret--open' : ''}`}
              onClick={() => setUserOpen((o) => !o)}
              title="Account"
              aria-label="Account menu"
              aria-expanded={userOpen}
            >
              <ChevronDownIcon size={16} />
            </button>

            {userOpen && (
              <>
                <div className="dropdown-backdrop" onClick={() => setUserOpen(false)} />
                <div className="dropdown topbar__user-menu">
                  {/* ------------------------------------------------------
                      Laid out to the supplied reference (a Google account
                      menu), mapped onto workspaces: the signed-in identity as
                      the small line at the top, then the current workspace as
                      the large image + name, then one primary action, then a
                      fold holding everything you could switch to.

                      The identity line stays because this is still the ACCOUNT
                      menu — Profile, Change password and Logout all act on the
                      person, not the workspace, and with it gone the menu would
                      offer "Logout" with nothing saying whom it logs out.
                      ------------------------------------------------------ */}
                  <div className="acctmenu__top">
                    <span className="acctmenu__email">{user?.email}</span>
                    <button
                      type="button"
                      className="icon-btn acctmenu__close"
                      onClick={() => setUserOpen(false)}
                      aria-label="Close menu"
                    >
                      <XIcon size={16} />
                    </button>
                  </div>

                  <div className="acctmenu__hero">
                    <OrgBadge name={org?.name} icon={org?.icon} photoUrl={org?.photoUrl} size="lg" />
                    <div className="acctmenu__name">{org?.name || 'No workspace'}</div>
                    {/* The reference's outlined pill. Goes to the workspace
                        list rather than a settings dialog, which is where this
                        app's "manage the workspace" surface actually lives. */}
                    <button
                      type="button"
                      className="acctmenu__manage"
                      onClick={() => { setUserOpen(false); navigate('/more/organizations'); }}
                    >
                      Manage workspace
                    </button>
                  </div>

                  {/* The reference's white card: a toggle row whose label flips
                      between Show and Hide, and — only once expanded — the
                      switchable workspaces followed by "Create / find
                      workspace" as the last row.

                      THE CREATE ROW IS PART OF THE EXPANDED LIST, so collapsing
                      puts the card back to a single line. It sits after the
                      scroll area rather than inside it, so it stays on screen
                      no matter how far the list is scrolled.

                      THE ONE EXCEPTION IS AN ACCOUNT WITH NO OTHER WORKSPACE.
                      There is no toggle then and nothing to expand, so gating
                      the row on `orgsOpen` would hide it forever from the
                      person most likely to be creating one. With nothing to
                      collapse, the card is just that row. */}
                  <div className="acctmenu__card">
                    {others.length > 0 ? (
                      <>
                        <button
                          type="button"
                          className="acctmenu__toggle"
                          onClick={() => setOrgsOpen((v) => !v)}
                          aria-expanded={orgsOpen}
                        >
                          <span>{orgsOpen ? 'Hide more workspaces' : 'Show more workspaces'}</span>
                          <span className={`acctmenu__chev ${orgsOpen ? 'is-open' : ''}`}>
                            <ChevronDownIcon size={16} />
                          </span>
                        </button>

                        {orgsOpen && (
                          <>
                            <div className="acctmenu__list">
                              {others.map((o) => (
                                <button
                                  key={o.id}
                                  type="button"
                                  className="acctmenu__row"
                                  onClick={() => { pick(o.id); setUserOpen(false); }}
                                >
                                  <OrgBadge name={o.name} icon={o.icon} photoUrl={o.photoUrl} size="sm" />
                                  <span className="acctmenu__row-text">
                                    <span className="acctmenu__row-name">{o.name}</span>
                                    {o.role && (
                                      <span className="acctmenu__row-sub">{ROLE_LABEL[o.role] || o.role}</span>
                                    )}
                                  </span>
                                </button>
                              ))}
                            </div>
                            <CreateWorkspaceRow onClick={() => { setUserOpen(false); onCreateOrg?.(); }} />
                          </>
                        )}
                      </>
                    ) : (
                      <CreateWorkspaceRow onClick={() => { setUserOpen(false); onCreateOrg?.(); }} />
                    )}
                  </div>

                  <div className="dropdown__sep" />
                  <button className="dropdown__item" onClick={() => { setUserOpen(false); navigate('/more/profile'); }}>
                    <UserIcon size={16} />
                    <span className="dropdown__item-text">Profile</span>
                  </button>
                  {/* Deep-links to the Password card on the profile page —
                      that is where the OTP-confirmed flow already lives, so
                      there is no second implementation of it here. */}
                  <button
                    className="dropdown__item"
                    onClick={() => { setUserOpen(false); navigate('/more/profile#password'); }}
                  >
                    <KeyIcon size={16} />
                    <span className="dropdown__item-text">Change password</span>
                  </button>
                  <div className="dropdown__sep" />
                  <button className="dropdown__item dropdown__item--danger" onClick={doLogout}>
                    <LogoutIcon size={16} />
                    <span className="dropdown__item-text">Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
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
