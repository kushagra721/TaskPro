import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchGroupTasks,
  selectGroupTasks,
  selectGroupTasksPagination,
  selectGroupTasksCounts,
} from '../../store/slices/taskSlice.js';
import { selectGroupDetail } from '../../store/slices/groupSlice.js';
import TaskListView from '../../components/TaskListView.jsx';
import TaskStatusTabs from '../../components/TaskStatusTabs.jsx';
import TaskSearchBar from '../../components/TaskSearchBar.jsx';
import TaskFilterDrawer from '../../components/TaskFilterDrawer.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useTaskQuery } from '../../hooks/useTaskQuery.js';
import { useRegisterHeaderActions } from '../../layout/HeaderActions.jsx';
import { selectAllProjects } from '../../store/slices/projectSlice.js';
import { selectAllClients } from '../../store/slices/clientSlice.js';
import { STATUS_META } from '../../utils/status.js';
import { htmlToText } from '../../utils/sanitizeHtml.js';

export default function ChannelTasks({ groupId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tasks = useSelector(selectGroupTasks(groupId));
  const pagination = useSelector(selectGroupTasksPagination(groupId));
  const counts = useSelector(selectGroupTasksCounts(groupId));
  const detail = useSelector(selectGroupDetail);
  const members = detail?.id === groupId ? detail.members || [] : [];
  const projects = useSelector(selectAllProjects);
  const clients = useSelector(selectAllClients);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { search, setSearch, filters, applyFilters, clearFilters, activeFilterCount, page, setPage, params } =
    useTaskQuery({ status: 'OPEN' });

  useEffect(() => {
    dispatch(fetchGroupTasks({ groupId, params }));
  }, [groupId, params, dispatch]);

  const openFilters = useCallback(() => setDrawerOpen(true), []);
  useRegisterHeaderActions({
    search,
    onSearch: setSearch,
    onOpenFilters: openFilters,
    filterCount: activeFilterCount,
  });

  const setTab = (t) => applyFilters({ ...filters, status: t === 'ALL' ? '' : t });
  const activeTab = filters.status || 'ALL';

  const statusNode = (t) => (
    <span className={`status-pill status-pill--${t.status.toLowerCase()}`}>{STATUS_META[t.status].label}</span>
  );

  return (
    <div className="tasks">
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
        <div className="panel">
          <div className="panel__empty">No tasks match your search or filters.</div>
        </div>
      ) : (
        <>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />
          <TaskListView
            tasks={tasks}
            onOpen={(id) => navigate(`/tasks/${id}`)}
            subtitle={(t) => htmlToText(t.description) || null}
            statusNode={statusNode}
          />
        </>
      )}

      <TaskFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        value={filters}
        onApply={applyFilters}
        onClear={clearFilters}
        members={members}
        projects={projects}
        clients={clients}
      />
    </div>
  );
}
