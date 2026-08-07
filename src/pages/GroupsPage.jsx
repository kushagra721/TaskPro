import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { fetchGroups, selectGroups } from '../store/slices/groupSlice.js';
import { organizationsApi } from '../api/client.js';
import EmptyState from '../components/EmptyState.jsx';
import CreateChannelModal from '../components/CreateChannelModal.jsx';
import Fab from '../components/Fab.jsx';
import CardProgress from '../components/CardProgress.jsx';
import TaskSearchBar from '../components/TaskSearchBar.jsx';
import ProjectFilterDrawer from '../components/ProjectFilterDrawer.jsx';
import ManageProjectsPage from './more/ManageProjectsPage.jsx';
import ManageClientsPage from './more/ManageClientsPage.jsx';
import ManageOrgPage from './more/ManageOrgPage.jsx';
import { useRegisterHeaderActions } from '../layout/HeaderActions.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { GroupsIcon, PlusIcon } from '../components/icons.jsx';
import { isAdminRole, isClientRole } from '../utils/role.js';

/**
 * The Hub's four tabs. The strings are intentionally empty — the heading is
 * rendered by the Topbar (see `AppLayout`'s `HUB_TITLES`), not here. What this
 * object is still FOR is validating the `?tab=` query value below: a key that
 * is not in here falls back to 'groups'. Don't delete it as unused.
 */
const TAB_META = {
  groups: { title: '', subtitle: '' },
  projects: { title: '', subtitle: '' },
  clients: {
    title: '',
    subtitle: '',
  },
  members: { title: '', subtitle: '' },
};

const EMPTY_DATE_FILTERS = { createdFrom: '', createdTo: '' };

export default function GroupsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const groups = useSelector(selectGroups);
  const isAdmin = isAdminRole(org?.role);
  // A CLIENT is an external participant, and everything they came for hangs off
  // their own client's page — so the Hub collapses to the CLIENTS tab alone.
  // The workspace's channels, projects, other clients and member roster are
  // none of their business; the clients endpoint independently returns only the
  // one they were invited for, so this is presentation over a real boundary
  // rather than the boundary itself.
  const isClient = isClientRole(org?.role);
  const [createOpen, setCreateOpen] = useState(false);
  // The selected tab lives in the URL (not local state) so it survives
  // navigating away to a group/project/client detail page and back — local
  // state would reset to 'groups' every time this page remounts.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  // A client is pinned to Clients however they arrived — a bookmarked or
  // hand-typed `?tab=` must not reach a tab that is hidden from them.
  const tab = isClient ? 'clients' : TAB_META[rawTab] ? rawTab : 'groups';
  const setTab = useCallback(
    (t) => setSearchParams(t === 'groups' ? {} : { tab: t }, { replace: true }),
    [setSearchParams]
  );
  // Per-group completion rate, shown inline under each card. `reports` already
  // role-scopes this the same way the rest of the app does.
  const [groupProgress, setGroupProgress] = useState([]);
  // Tab item counts (the "Groups (3)"-style badges below). `reports` already
  // fetches org-wide project/client/member breakdowns for the progress bars,
  // so their `.length` doubles as each tab's total count for free, with the
  // same visibility scoping the tabs themselves already apply (e.g. a regular
  // member's `members` count is co-membership-scoped). Groups uses the live
  // `groups` selector instead of this snapshot, since it's already loaded and
  // kept current by sockets.
  const [tabCounts, setTabCounts] = useState({ projects: 0, clients: 0, members: 0 });
  const orgPageRef = useRef(null);

  // Members tab is admin-only — if role changes away from admin while it's
  // selected (or a non-admin somehow lands here), fall back to Groups.
  useEffect(() => {
    if (tab === 'members' && !isAdmin) setTab('groups');
  }, [tab, isAdmin, setTab]);

  useEffect(() => {
    if (orgId) dispatch(fetchGroups(orgId));
  }, [orgId, dispatch]);

  useEffect(() => {
    if (!orgId) return;
    organizationsApi
      .reports(orgId)
      .then((r) => {
        setGroupProgress(r.groups);
        setTabCounts({ projects: r.projects.length, clients: r.clients.length, members: r.members.length });
      })
      .catch(() => {
        setGroupProgress([]);
        setTabCounts({ projects: 0, clients: 0, members: 0 });
      });
  }, [orgId]);

  if (!org) {
    return (
      <div className="page">
        <EmptyState icon={<GroupsIcon size={30} />} title="No workspace selected" description="Create or pick a workspace to start adding groups." />
      </div>
    );
  }

  return (
    <div className="page">
      {/* No page head. Every `TAB_META` title/subtitle is deliberately empty
          (the Topbar carries the heading, and it now follows the active tab —
          see `AppLayout`'s HUB_TITLES), so this rendered an empty <h1> plus a
          22px margin as a blank strip above the tabs. New group moved into the
          controls row below. */}
      {/* A client sees Clients only — with nothing to switch to, the whole tab
          bar is noise, so it is omitted rather than rendered with one item. */}
      {!isClient && (
        <div className="groups-tabbar">
          <button className={`tab ${tab === 'groups' ? 'tab--active' : ''}`} onClick={() => setTab('groups')}>
            Groups <span className="tab__count">{groups.length}</span>
          </button>
          <button className={`tab ${tab === 'projects' ? 'tab--active' : ''}`} onClick={() => setTab('projects')}>
            Projects <span className="tab__count">{tabCounts.projects}</span>
          </button>
          <button className={`tab ${tab === 'clients' ? 'tab--active' : ''}`} onClick={() => setTab('clients')}>
            Clients Space <span className="tab__count">{tabCounts.clients}</span>
          </button>
          {isAdmin && (
            <button className={`tab ${tab === 'members' ? 'tab--active' : ''}`} onClick={() => setTab('members')}>
              Members <span className="tab__count">{tabCounts.members}</span>
            </button>
          )}
        </div>
      )}

      {tab === 'groups' ? (
        <>
          <GroupsListPanel
            groups={groups}
            progress={groupProgress}
            isAdmin={isAdmin}
            onOpen={(id) => navigate(`/groups/${id}`)}
            onCreate={() => setCreateOpen(true)}
          />

          {/* Groups is a root page — raise the FAB above the bottom nav. */}
          {isAdmin && <Fab raised label="New group" onClick={() => setCreateOpen(true)} />}

          {createOpen && (
            <CreateChannelModal
              onClose={() => setCreateOpen(false)}
              onCreated={(g) => navigate(`/groups/${g.id}`)}
            />
          )}
        </>
      ) : tab === 'projects' ? (
        <ManageProjectsPage raiseFab embedded />
      ) : tab === 'clients' ? (
        <ManageClientsPage raiseFab embedded />
      ) : (
        <>
          <ManageOrgPage ref={orgPageRef} />
          {isAdmin && <Fab raised label="Invite member" onClick={() => orgPageRef.current?.openInvite()} />}
        </>
      )}
    </div>
  );
}

/**
 * The Groups tab's own list + search/filter — pulled out into its own
 * component (rather than inline in GroupsPage) so it can register the mobile
 * header's search/filter icons itself, exactly like the embedded
 * Projects/Clients/Members tabs do — only one tab is ever mounted at a time,
 * so there's no risk of two registrations racing each other.
 */
function GroupsListPanel({ groups, progress, isAdmin, onOpen, onCreate }) {
  // Its own call, not a prop: this is a separate component from `GroupsPage`,
  // so the parent's `isMobile` is not in scope here. The hook is a cheap
  // media-query subscription.
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_DATE_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    const endOfDay = (d) => {
      const dt = new Date(d);
      dt.setHours(23, 59, 59, 999);
      return dt;
    };
    return groups.filter((g) => {
      if (debouncedSearch && !g.name.toLowerCase().includes(debouncedSearch)) return false;
      if (filters.createdFrom && new Date(g.createdAt) < new Date(filters.createdFrom)) return false;
      if (filters.createdTo && new Date(g.createdAt) > endOfDay(filters.createdTo)) return false;
      return true;
    });
  }, [groups, debouncedSearch, filters]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const openFilters = useCallback(() => setDrawerOpen(true), []);
  useRegisterHeaderActions({ search, onSearch: setSearch, onOpenFilters: openFilters, filterCount: activeFilterCount });

  return (
    <>
      {groups.length > 0 && (
        // Search, Filters and New group on ONE row — `.list-controls` is
        // already `space-between`, so the button lands hard right without any
        // new layout. Hidden on mobile, where the FAB carries the same action.
        <div className="list-controls">
          <TaskSearchBar
            search={search}
            onSearch={setSearch}
            onOpenFilters={openFilters}
            activeCount={activeFilterCount}
            placeholder="Search groups by name…"
          />
          {isAdmin && !isMobile && (
            <button className="btn btn--sm" onClick={onCreate}>
              <PlusIcon size={16} /> New group
            </button>
          )}
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState
          icon={<GroupsIcon size={30} />}
          title="No groups yet"
          description={isAdmin ? 'Create your first group to start chatting and tracking tasks.' : 'An admin hasn’t created any groups yet.'}
          action={
            isAdmin && (
              <button className="btn" style={{ width: 'auto', padding: '0 18px' }} onClick={onCreate}>
                <PlusIcon size={16} /> New group
              </button>
            )
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<GroupsIcon size={30} />} title="No groups found" description="Nothing matches your search or filters." />
      ) : (
        <div className="channel-grid">
          {filtered.map((g) => {
            const gp = progress.find((x) => x.id === g.id);
            return (
              <button key={g.id} className="channel-card" onClick={() => onOpen(g.id)}>
                <div className="channel-card__hash">#</div>
                <div className="channel-card__body">
                  <div className="channel-card__name">{g.name}</div>
                  <div className="channel-card__meta">
                    {g.memberCount ?? 0} member{g.memberCount === 1 ? '' : 's'} ·{' '}
                    {g.openTaskCount ?? 0} open task{g.openTaskCount === 1 ? '' : 's'} · {g.messageCount ?? 0} messages
                  </div>
                  {gp && <CardProgress rate={gp.completionRate} />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ProjectFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        value={filters}
        onApply={setFilters}
        onClear={() => setFilters(EMPTY_DATE_FILTERS)}
      />
    </>
  );
}
