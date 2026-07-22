import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentOrg, selectCurrentOrgId, selectMembers, fetchMembers } from '../../store/slices/orgSlice.js';
import { selectUser } from '../../store/slices/authSlice.js';
import { fetchGroups, selectGroups } from '../../store/slices/groupSlice.js';
import { fetchMyTasks, selectMyTasks, selectMyTasksPagination, selectMyTasksCounts } from '../../store/slices/taskSlice.js';
import { STATUS_META } from '../../utils/status.js';
import { useTaskQuery } from '../../hooks/useTaskQuery.js';
import EmptyState from '../../components/EmptyState.jsx';
import TaskListView from '../../components/TaskListView.jsx';
import TaskStatusTabs from '../../components/TaskStatusTabs.jsx';
import TaskSearchBar from '../../components/TaskSearchBar.jsx';
import TaskFilterDrawer from '../../components/TaskFilterDrawer.jsx';
import CreateTaskModal from '../../components/CreateTaskModal.jsx';
import Pagination from '../../components/Pagination.jsx';
import Fab from '../../components/Fab.jsx';
import { fetchAllProjects, selectAllProjects } from '../../store/slices/projectSlice.js';
import { fetchAllClients, selectAllClients } from '../../store/slices/clientSlice.js';
import { useRegisterHeaderActions } from '../../layout/HeaderActions.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { TaskIcon, PlusIcon } from '../../components/icons.jsx';

export default function ManageTasksPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const user = useSelector(selectUser);
  const tasks = useSelector(selectMyTasks);
  const pagination = useSelector(selectMyTasksPagination);
  const counts = useSelector(selectMyTasksCounts);
  const groups = useSelector(selectGroups);
  const members = useSelector(selectMembers);
  const projects = useSelector(selectAllProjects);
  const clients = useSelector(selectAllClients);
  const [urlParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const isMobile = useIsMobile();

  // Seed filters from the URL (dashboard deep-links: ?status=OPEN, ?assignee=me).
  // Default status is Open when nothing is specified.
  const initial = {
    status: (urlParams.get('status') || 'OPEN').toUpperCase(),
    assigneeId: urlParams.get('assignee') === 'me' ? user?.id || '' : '',
    createdFrom: urlParams.get('from') || '',
    createdTo: urlParams.get('to') || '',
  };

  const { search, setSearch, filters, applyFilters, clearFilters, activeFilterCount, page, setPage, params } =
    useTaskQuery(initial);

  useEffect(() => {
    if (orgId) {
      dispatch(fetchGroups(orgId));
      dispatch(fetchMembers(orgId));
      dispatch(fetchAllProjects(orgId));
      dispatch(fetchAllClients(orgId));
    }
  }, [orgId, dispatch]);

  const reload = useCallback(() => {
    if (orgId) dispatch(fetchMyTasks({ orgId, params }));
  }, [orgId, params, dispatch]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Mirror search + filters into the mobile header.
  const openFilters = useCallback(() => setDrawerOpen(true), []);
  useRegisterHeaderActions({
    search,
    onSearch: setSearch,
    onOpenFilters: openFilters,
    filterCount: activeFilterCount,
  });

  const setTab = (t) => applyFilters({ ...filters, status: t === 'ALL' ? '' : t });
  const activeTab = filters.status || 'ALL';

  if (!org) {
    return (
      <div className="page">
        <EmptyState icon={<TaskIcon size={30} />} title="No organization selected" description="Pick an organization to see its tasks." />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Manage Tasks</h1>
          <p className="page__subtitle">Tasks across all groups you belong to.</p>
        </div>
        {/* Desktop keeps the inline button; mobile uses the FAB below. */}
        {!isMobile && (
          <div className="head-actions">
            <button className="btn btn--sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon size={16} /> New task
            </button>
          </div>
        )}
      </div>

      <div className="list-controls">
        <TaskStatusTabs active={activeTab} counts={counts} onChange={setTab} />
        <TaskSearchBar
          search={search}
          onSearch={setSearch}
          onOpenFilters={() => setDrawerOpen(true)}
          activeCount={activeFilterCount}
        />
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={<TaskIcon size={30} />} title="No tasks found" description="Nothing matches your search or filters." />
      ) : (
        <>
          <TaskListView
            tasks={tasks}
            onOpen={(id) => navigate(`/tasks/${id}`)}
            statusNode={(t) => (
              <span className={`status-pill status-pill--${t.status.toLowerCase()}`}>{STATUS_META[t.status].label}</span>
            )}
          />
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />
        </>
      )}

      <TaskFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        value={filters}
        onApply={applyFilters}
        onClear={clearFilters}
        groups={groups}
        members={members}
        projects={projects}
        clients={clients}
      />

      {/* Manage Tasks is a root page — raise the FAB above the bottom nav. */}
      <Fab raised label="New task" onClick={() => setCreateOpen(true)} />

      {/* Created outside any one channel, so the modal asks which group it goes to. */}
      {createOpen && (
        <CreateTaskModal askGroup members={members} onClose={() => setCreateOpen(false)} onCreated={reload} />
      )}
    </div>
  );
}
