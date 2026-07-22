import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchClient,
  deleteClient,
  selectClientDetail,
} from '../store/slices/clientSlice.js';
import { fetchMembers, selectCurrentOrg, selectCurrentOrgId, selectMembers } from '../store/slices/orgSlice.js';
import { fetchGroups, selectGroups } from '../store/slices/groupSlice.js';
import { tasksApi } from '../api/client.js';
import { useTaskQuery } from '../hooks/useTaskQuery.js';
import { useRegisterHeaderActions } from '../layout/HeaderActions.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmNameModal from '../components/ConfirmNameModal.jsx';
import ClientFormModal from '../components/ClientFormModal.jsx';
import TaskListView from '../components/TaskListView.jsx';
import TaskStatusTabs from '../components/TaskStatusTabs.jsx';
import TaskSearchBar from '../components/TaskSearchBar.jsx';
import TaskFilterDrawer from '../components/TaskFilterDrawer.jsx';
import CreateTaskModal from '../components/CreateTaskModal.jsx';
import Pagination from '../components/Pagination.jsx';
import Fab from '../components/Fab.jsx';
import { relativeDay } from '../utils/time.js';
import { STATUS_META } from '../utils/status.js';
import { BuildingIcon, PlusIcon, EditIcon, TrashIcon, TaskIcon } from '../components/icons.jsx';

const emptyCounts = { ALL: 0, OPEN: 0, COMPLETED: 0, CANCELLED: 0 };

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const client = useSelector(selectClientDetail);
  const groups = useSelector(selectGroups);
  const members = useSelector(selectMembers);
  const isAdmin = org?.role === 'ADMIN';

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState(emptyCounts);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState('');

  const { search, setSearch, filters, applyFilters, clearFilters, activeFilterCount, page, setPage, params } =
    useTaskQuery({ status: 'OPEN' });

  const openFilters = useCallback(() => setDrawerOpen(true), []);
  useRegisterHeaderActions({ search, onSearch: setSearch, onOpenFilters: openFilters, filterCount: activeFilterCount });

  useEffect(() => {
    if (orgId && clientId) dispatch(fetchClient({ orgId, clientId }));
  }, [orgId, clientId, dispatch]);

  useEffect(() => {
    if (orgId) {
      dispatch(fetchGroups(orgId));
      dispatch(fetchMembers(orgId));
    }
  }, [orgId, dispatch]);

  const loaded = client && client.id === clientId;

  const reload = useCallback(() => {
    if (!orgId || !loaded) return;
    tasksApi
      .listForOrg(orgId, { ...params, clientId })
      .then((r) => {
        setTasks(r.tasks);
        setPagination(r.pagination);
        setCounts(r.counts || emptyCounts);
      })
      .catch((err) => setError(err.message || 'Could not load tasks'));
  }, [orgId, loaded, clientId, params]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setTab = (t) => applyFilters({ ...filters, status: t === 'ALL' ? '' : t });
  const activeTab = filters.status || 'ALL';

  const doDelete = async () => {
    try {
      await dispatch(deleteClient({ orgId, clientId, confirmName: client.name })).unwrap();
      navigate('/groups');
    } catch (err) {
      setError(err.message || 'Could not delete the client');
      setDeleteOpen(false);
    }
  };

  if (!org) {
    return (
      <div className="page">
        <EmptyState icon={<BuildingIcon size={30} />} title="No organization selected" description="Pick an organization to see this client." />
      </div>
    );
  }

  return (
    <div className="page">
      <button className="link-btn" onClick={() => navigate(-1)}>← Back</button>

      {error && <div className="alert alert--error">{error}</div>}

      {!loaded ? (
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      ) : (
        <>
          <div className="task-detail project-detail__card">
            <div className="task-detail__head">
              <span className="project-card__icon">
                <BuildingIcon size={18} />
              </span>
              <h1 className="task-detail__title">{client.name}</h1>
              <span className="channel__members">
                {client.taskCount} task{client.taskCount === 1 ? '' : 's'}
              </span>
              {isAdmin && (
                <div className="task-detail__actions">
                  <button className="icon-btn" onClick={() => setEditOpen(true)} title="Edit client" aria-label="Edit client">
                    <EditIcon size={15} />
                  </button>
                  <button className="icon-btn icon-btn--danger" onClick={() => setDeleteOpen(true)} title="Delete client" aria-label="Delete client">
                    <TrashIcon size={15} />
                  </button>
                </div>
              )}
            </div>
            <p className="project-detail__meta">
              Created by {client.createdBy?.name || client.createdBy?.email || 'someone'} · {relativeDay(client.createdAt)}
            </p>
            <button className="btn btn--sm project-detail__new-task hide-mobile" onClick={() => setCreateOpen(true)}>
              <PlusIcon size={14} /> New task
            </button>
          </div>

          <div className="list-controls">
            <TaskStatusTabs active={activeTab} counts={counts} onChange={setTab} />
            <TaskSearchBar
              search={search}
              onSearch={setSearch}
              onOpenFilters={openFilters}
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

          {/* Sub-page (no bottom nav) — the FAB sits at the bottom, not raised. */}
          <Fab label="New task" onClick={() => setCreateOpen(true)} />

          {createOpen && (
            <CreateTaskModal
              askGroup
              members={members}
              defaultClientId={clientId}
              onClose={() => setCreateOpen(false)}
              onCreated={reload}
            />
          )}

          {editOpen && (
            <ClientFormModal orgId={orgId} client={client} onClose={() => setEditOpen(false)} onSaved={() => setEditOpen(false)} />
          )}

          {deleteOpen && (
            <ConfirmNameModal
              title="Delete client"
              entityName={client.name}
              onConfirm={doDelete}
              onClose={() => setDeleteOpen(false)}
              confirmLabel={<><TrashIcon size={16} /> Delete client</>}
            >
              <p className="modal__intro">
                Delete <strong>&ldquo;{client.name}&rdquo;</strong>? Its tasks stay, just unassigned from this client.
              </p>
            </ConfirmNameModal>
          )}
        </>
      )}
    </div>
  );
}
