import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  clientLoaded,
  deleteClient,
  selectClientDetail,
} from '../store/slices/clientSlice.js';
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { selectGroups } from '../store/slices/groupSlice.js';
import { clientsApi } from '../api/client.js';
import { useTaskQuery } from '../hooks/useTaskQuery.js';
import { useRegisterHeaderActions } from '../layout/HeaderActions.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import ConfirmNameModal from '../components/ConfirmNameModal.jsx';
import Modal from '../components/Modal.jsx';
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
  // The workspace roster for the filter drawer's assignee picker. It arrives in
  // the page bundle rather than from `orgSlice`, which is what removed this
  // page's separate `fetchMembers` call.
  const [members, setMembers] = useState([]);
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
  // The space member awaiting removal confirmation (null when none).
  const [removeMember, setRemoveMember] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState('');

  const { search, setSearch, filters, applyFilters, clearFilters, activeFilterCount, page, setPage, params } =
    useTaskQuery({ status: 'OPEN' });

  const openFilters = useCallback(() => setDrawerOpen(true), []);
  useRegisterHeaderActions({ search, onSearch: setSearch, onOpenFilters: openFilters, filterCount: activeFilterCount });

  /**
   * ONE request for the whole page.
   *
   * This used to be FIVE on every open — the client, the workspace's groups,
   * the workspace's members, this space's own members, and the task list. The
   * groups call was pure duplication (`AppLayout` already fetches them
   * workspace-wide, and `selectGroups` above reads that); the other four are
   * now assembled server-side in parallel by `getClientSpacePage`.
   *
   * `params` is the Tasks tab's query, so a filter change re-runs exactly this
   * same call rather than needing a second shape of request. The client detail
   * is pushed into `clientSlice` as well, because the edit and delete modals
   * read it from there.
   */
  const reload = useCallback(() => {
    if (!orgId || !clientId) return;
    clientsApi
      .page(orgId, clientId, params)
      .then((r) => {
        dispatch(clientLoaded(r.client));
        setSpaceMembers(r.members || []);
        setMembers(r.roster || []);
        setTasks(r.tasks || []);
        if (r.pagination) setPagination(r.pagination);
        setCounts(r.counts || emptyCounts);
        setError('');
      })
      .catch((err) => setError(err.message || 'Could not load this client space'));
  }, [orgId, clientId, params, dispatch]);

  useEffect(() => {
    reload();
  }, [reload]);

  const loaded = client && client.id === clientId;

  /** Kept as a named alias so the add/invite/remove flows read clearly — they
   *  all need the same full refresh, since changing who is in the space also
   *  changes the tab count. */
  const loadMembers = reload;

  const setTab = (t) => applyFilters({ ...filters, status: t === 'ALL' ? '' : t });
  const activeTab = filters.status || 'ALL';

  /**
   * Take someone out of this client space.
   *
   * The API returns them to MEMBER rather than deleting their membership — a
   * mis-click here must never evict anyone from the workspace — so the dialog
   * says exactly that. `reload()` refreshes the tab count and the "already
   * added" set in the same pass.
   */
  const doRemoveMember = async () => {
    setRemoving(true);
    try {
      await clientsApi.removeMember(orgId, clientId, removeMember.id);
      setRemoveMember(null);
      reload();
    } catch (err) {
      setError(err.message || 'Could not remove them from this space');
    } finally {
      setRemoving(false);
    }
  };

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
                      {/* Same permission as Add — whoever may put someone in
                          this space may take them out again. */}
                      {(isAdmin || isClient) && (
                        <button
                          className="mini-btn mini-btn--danger"
                          onClick={() => setRemoveMember(m)}
                          aria-label={`Remove ${m.name || m.email} from this space`}
                        >
                          <TrashIcon size={14} /> Remove
                        </button>
                      )}
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
              roster={members}
              onClose={() => setInviteOpen(false)}
              onChanged={loadMembers}
            />
          )}

          {removeMember && (
            <Modal title="Remove from this space" onClose={() => !removing && setRemoveMember(null)}>
              <p className="modal__intro">
                Remove <strong>{removeMember.name || removeMember.email}</strong> from {client.name}?
                They&apos;ll stay in this workspace as a regular member — they just won&apos;t see
                this space&apos;s work any more.
              </p>
              <div className="modal__actions">
                <button className="btn btn--ghost" onClick={() => setRemoveMember(null)} disabled={removing}>
                  Cancel
                </button>
                <button className="btn btn--danger" onClick={doRemoveMember} disabled={removing}>
                  {removing ? <span className="spinner" /> : (<><TrashIcon size={16} /> Remove</>)}
                </button>
              </div>
            </Modal>
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
