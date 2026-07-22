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

const TAB_META = {
  groups: { title: 'Groups', subtitle: 'Chat and manage tasks with your team.' },
  projects: { title: 'Projects', subtitle: 'Organize tasks into projects. Anyone can add one.' },
  clients: { title: 'Clients', subtitle: 'Group tasks by client. Anyone can add one.' },
  members: { title: 'Members', subtitle: 'Members, roles and invitations for this organization.' },
};

const EMPTY_DATE_FILTERS = { createdFrom: '', createdTo: '' };

export default function GroupsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const groups = useSelector(selectGroups);
  const isAdmin = org?.role === 'ADMIN';
  const [createOpen, setCreateOpen] = useState(false);
  // The selected tab lives in the URL (not local state) so it survives
  // navigating away to a group/project/client detail page and back — local
  // state would reset to 'groups' every time this page remounts.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab = TAB_META[rawTab] ? rawTab : 'groups'; // 'groups' | 'projects' | 'clients' | 'members'
  const setTab = useCallback(
    (t) => setSearchParams(t === 'groups' ? {} : { tab: t }, { replace: true }),
    [setSearchParams]
  );
  // Per-group completion rate, shown inline under each card. `reports` already
  // role-scopes this the same way the rest of the app does.
  const [groupProgress, setGroupProgress] = useState([]);
  const isMobile = useIsMobile();
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
      .then((r) => setGroupProgress(r.groups))
      .catch(() => setGroupProgress([]));
  }, [orgId]);

  if (!org) {
    return (
      <div className="page">
        <EmptyState icon={<GroupsIcon size={30} />} title="No organization selected" description="Create or pick an organization to start adding groups." />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">{TAB_META[tab].title}</h1>
          <p className="page__subtitle">{TAB_META[tab].subtitle}</p>
        </div>
        {/* Desktop keeps the inline button; mobile uses the FAB below. */}
        {tab === 'groups' && isAdmin && !isMobile && (
          <div className="head-actions">
            <button className="btn btn--sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon size={16} /> New group
            </button>
          </div>
        )}
      </div>

      <div className="groups-tabbar">
        <button className={`tab ${tab === 'groups' ? 'tab--active' : ''}`} onClick={() => setTab('groups')}>
          Groups
        </button>
        <button className={`tab ${tab === 'projects' ? 'tab--active' : ''}`} onClick={() => setTab('projects')}>
          Projects
        </button>
        <button className={`tab ${tab === 'clients' ? 'tab--active' : ''}`} onClick={() => setTab('clients')}>
          Clients
        </button>
        {isAdmin && (
          <button className={`tab ${tab === 'members' ? 'tab--active' : ''}`} onClick={() => setTab('members')}>
            Members
          </button>
        )}
      </div>

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
        <div className="list-controls">
          <TaskSearchBar
            search={search}
            onSearch={setSearch}
            onOpenFilters={openFilters}
            activeCount={activeFilterCount}
            placeholder="Search groups by name…"
          />
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
