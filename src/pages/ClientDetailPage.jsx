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
import { tasksApi, clientsApi } from '../api/client.js';
import { useTaskQuery } from '../hooks/useTaskQuery.js';
import { useRegisterHeaderActions } from '../layout/HeaderActions.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import ConfirmNameModal from '../components/ConfirmNameModal.jsx';
import ClientFormModal from '../components/ClientFormModal.jsx';
import TaskListView from '../components/TaskListView.jsx';
import TaskStatusTabs from '../components/TaskStatusTabs.jsx';
import TaskSearchBar from '../components/TaskSearchBar.jsx';
import TaskFilterDrawer from '../components/TaskFilterDrawer.jsx';
import CreateTaskModal from '../components/CreateTaskModal.jsx';
import AddClientMemberModal from '../components/AddClientMemberModal.jsx';
import Pagination from '../components/Pagination.jsx';
import Fab from '../components/Fab.jsx';
import { relativeDay } from '../utils/time.js';
import { STATUS_META } from '../utils/status.js';
import { BuildingIcon, PlusIcon, EditIcon, TrashIcon, TaskIcon } from '../components/icons.jsx';
import { isAdminRole, isClientRole } from '../utils/role.js';

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
  const isAdmin = isAdminRole(org?.role);
  const isClient = isClientRole(org?.role);

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState(emptyCounts);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  // 'tasks' | 'clients' — the two halves of a client space.
  const [section, setSection] = useState('tasks');
  // The people in THIS SPACE — distinct from `members` above, which is the
  // workspace's whole roster (the filter drawer's assignee list). Loaded here
  // rather than inside the panel so the tab's count and the "already added"
  // set are both available to the header.
  const [spaceMembers, setSpaceMembers] = useState([]);
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

  /** The people in this client space. Re-run after an add or an invite so the
   *  tab count and the "already added" set stay honest without a page reload. */
  const loadMembers = useCallback(() => {
    if (!orgId || !clientId) return;
    clientsApi
      .members(orgId, clientId)
      .then((r) => setSpaceMembers(r.members || []))
      .catch(() => setSpaceMembers([]));
  }, [orgId, clientId]);

  useEffect(loadMembers, [loadMembers]);

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
        <EmptyState icon={<BuildingIcon size={30} />} title="No workspace selected" description="Pick a workspace to see this client." />
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
              {/* Right-hand column: the icon row, and the page's two actions
                  stacked directly beneath it. Both live here so everything that
                  ACTS on this space sits together, away from the tabs, which
                  only change what is being looked at. */}
              <div className="client-detail__side">
                {isAdmin && (
                  <div className="task-detail__actions">
                    <button className="icon-btn" onClick={() => setEditOpen(true)} title="Edit client space" aria-label="Edit client space">
                      <EditIcon size={15} />
                    </button>
                    <button className="icon-btn icon-btn--danger" onClick={() => setDeleteOpen(true)} title="Delete client space" aria-label="Delete client space">
                      <TrashIcon size={15} />
                    </button>
                  </div>
                )}
                <div className="client-detail__actions hide-mobile">
                  <button className="btn btn--sm" onClick={() => setCreateOpen(true)}>
                    <PlusIcon size={14} /> New task
                  </button>
                  {/* A CLIENT may bring in their own colleagues, so this is not
                      admin-only — the space is theirs to populate. */}
                  {(isAdmin || isClient) && (
                    <button className="btn btn--sm btn--ghost" onClick={() => setInviteOpen(true)}>
                      <PlusIcon size={14} /> Invite client
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="project-detail__meta">
              Created by {client.createdBy?.name || client.createdBy?.email || 'someone'} · {relativeDay(client.createdAt)}
            </p>
            {/* Tabs alone now — the actions moved into the header's right-hand
                column above, beside Edit/Delete. */}
            <div className="channel__bar">
              <div className="channel__tabs">
                <button
                  className={`tab ${section === 'tasks' ? 'tab--active' : ''}`}
                  onClick={() => setSection('tasks')}
                >
                  Tasks <span className="tab__count">{client.taskCount}</span>
                </button>
                <button
                  className={`tab ${section === 'clients' ? 'tab--active' : ''}`}
                  onClick={() => setSection('clients')}
                >
                  Clients <span className="tab__count">{spaceMembers.length}</span>
                </button>
              </div>
            </div>
          </div>

          {section === 'tasks' && (
          <>
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
              <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onChange={setPage} />
              <TaskListView
                tasks={tasks}
                hide={isClient ? ['assignee', 'group'] : []}
                onOpen={(id) => navigate(`/tasks/${id}`)}
                statusNode={(t) => (
                  <span className={`status-pill status-pill--${t.status.toLowerCase()}`}>{STATUS_META[t.status].label}</span>
                )}
              />
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
          </>
          )}

          {/* The people who can see this space's work. */}
          {section === 'clients' && (
            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Clients in this space</h2>
                {(isAdmin || isClient) && (
                  <button className="btn btn--sm" onClick={() => setInviteOpen(true)}>
                    <PlusIcon size={14} /> Add client
                  </button>
                )}
              </div>
              {spaceMembers.length === 0 ? (
                <div className="panel__empty">
                  No one here yet — add a client so they can see this space.
                </div>
              ) : (
                <ul className="member-list">
                  {spaceMembers.map((m) => (
                    <li key={m.id} className="member">
                      <Avatar name={m.name} email={m.email} src={m.avatarUrl} size={34} />
                      <div className="member__info">
                        <div className="member__name-text">{m.name || m.email}</div>
                        <div className="member__email">{m.email}</div>
                      </div>
                      <span className={`role-pill role-pill--${m.role.toLowerCase()}`}>{m.role}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Sub-page (no bottom nav) — the FAB sits at the bottom, not raised. */}
          <Fab label="New task" onClick={() => setCreateOpen(true)} />

          {/* Everything about this task is already decided by where it is being
              raised from, so the form states the three fields rather than
              asking: the default client channel, this client, and nobody
              assigned. See `CreateTaskModal`'s `lock` prop. */}
          {createOpen && (
            <CreateTaskModal
              askGroup
              defaultClientId={clientId}
              lock={{ group: true, client: true, assignee: true }}
              onClose={() => setCreateOpen(false)}
              onCreated={reload}
            />
          )}

          {inviteOpen && (
            <AddClientMemberModal
              clientId={clientId}
              clientName={client.name}
              existingIds={spaceMembers.map((m) => m.id)}
              onClose={() => setInviteOpen(false)}
              onChanged={loadMembers}
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
