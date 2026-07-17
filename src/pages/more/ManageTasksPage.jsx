import { useEffect, useMemo, useState } from 'react';
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
import DateRangeControl from '../../components/DateRangeControl.jsx';
import Pagination from '../../components/Pagination.jsx';
import { TaskIcon } from '../../components/icons.jsx';

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
  const [urlParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [period, setPeriod] = useState({ from: '', to: '' });

  // Seed filters from the URL (dashboard deep-links: ?status=OPEN, ?assignee=me).
  // Default status is Open when nothing is specified.
  const initial = {
    status: (urlParams.get('status') || 'OPEN').toUpperCase(),
    assigneeId: urlParams.get('assignee') === 'me' ? user?.id || '' : '',
  };
  const initialPeriod = { from: urlParams.get('from') || '', to: urlParams.get('to') || '' };

  const { search, setSearch, filters, applyFilters, clearFilters, activeFilterCount, page, setPage, params } =
    useTaskQuery(initial);

  // The period control drives the created-date range.
  const effParams = useMemo(
    () => ({ ...params, createdFrom: period.from || undefined, createdTo: period.to || undefined }),
    [params, period]
  );

  // Reset to first page whenever the period changes.
  useEffect(() => {
    setPage(1);
  }, [period, setPage]);

  useEffect(() => {
    if (orgId) {
      dispatch(fetchGroups(orgId));
      dispatch(fetchMembers(orgId));
    }
  }, [orgId, dispatch]);

  useEffect(() => {
    if (orgId) dispatch(fetchMyTasks({ orgId, params: effParams }));
  }, [orgId, effParams, dispatch]);

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
        <div>
          <h1 className="page__title">Manage Tasks</h1>
          <p className="page__subtitle">Tasks across all groups you belong to.</p>
        </div>
        <DateRangeControl onChange={setPeriod} initial={initialPeriod} />
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
      />
    </div>
  );
}
