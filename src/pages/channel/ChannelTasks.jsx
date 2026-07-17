import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchGroupTasks,
  updateTask,
  deleteTask,
  selectGroupTasks,
  selectGroupTasksPagination,
  selectGroupTasksCounts,
} from '../../store/slices/taskSlice.js';
import { selectGroupDetail } from '../../store/slices/groupSlice.js';
import TaskListView from '../../components/TaskListView.jsx';
import TaskStatusTabs from '../../components/TaskStatusTabs.jsx';
import TaskSearchBar from '../../components/TaskSearchBar.jsx';
import TaskFilterDrawer from '../../components/TaskFilterDrawer.jsx';
import DateRangeControl from '../../components/DateRangeControl.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useTaskQuery } from '../../hooks/useTaskQuery.js';
import { STATUS_META } from '../../utils/status.js';

export default function ChannelTasks({ groupId }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tasks = useSelector(selectGroupTasks(groupId));
  const pagination = useSelector(selectGroupTasksPagination(groupId));
  const counts = useSelector(selectGroupTasksCounts(groupId));
  const detail = useSelector(selectGroupDetail);
  const members = detail?.id === groupId ? detail.members || [] : [];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [period, setPeriod] = useState({ from: '', to: '' });

  const { search, setSearch, filters, applyFilters, clearFilters, activeFilterCount, page, setPage, params } =
    useTaskQuery({ status: 'OPEN' });

  const effParams = useMemo(
    () => ({ ...params, createdFrom: period.from || undefined, createdTo: period.to || undefined }),
    [params, period]
  );

  useEffect(() => {
    setPage(1);
  }, [period, setPage]);

  useEffect(() => {
    dispatch(fetchGroupTasks({ groupId, params: effParams }));
  }, [groupId, effParams, dispatch]);

  const setTab = (t) => applyFilters({ ...filters, status: t === 'ALL' ? '' : t });
  const activeTab = filters.status || 'ALL';

  const statusNode = (t) => (
    <span className={`status-pill status-pill--${t.status.toLowerCase()}`}>{STATUS_META[t.status].label}</span>
  );

  return (
    <div className="tasks">
      <div className="tasks__period">
        <DateRangeControl onChange={setPeriod} />
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
        <div className="panel">
          <div className="panel__empty">No tasks match your search or filters.</div>
        </div>
      ) : (
        <>
          <TaskListView
            tasks={tasks}
            onOpen={(id) => navigate(`/tasks/${id}`)}
            subtitle={(t) => t.description || null}
            statusNode={statusNode}
            onDelete={(t) => dispatch(deleteTask({ taskId: t.id, groupId }))}
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
        members={members}
      />
    </div>
  );
}
