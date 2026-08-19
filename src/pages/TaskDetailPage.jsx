import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTaskDetail, updateTask, deleteTask, selectTaskDetail } from '../store/slices/taskSlice.js';
import { tasksApi } from '../api/client.js';
import Timeline from '../components/Timeline.jsx';
import Modal from '../components/Modal.jsx';
import ProjectFormModal from '../components/ProjectFormModal.jsx';
import ClientFormModal from '../components/ClientFormModal.jsx';
import { fetchGroup, selectGroupDetail, selectGroups } from '../store/slices/groupSlice.js';
import { fetchAllProjects, selectAllProjects } from '../store/slices/projectSlice.js';
import { fetchAllClients, selectAllClients } from '../store/slices/clientSlice.js';
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { selectUser } from '../store/slices/authSlice.js';
import { STATUS_META, formatDate, formatDateTime } from '../utils/status.js';
import Select from '../components/Select.jsx';
import DateField from '../components/DateField.jsx';
import TaskStatusModal from '../components/TaskStatusModal.jsx';
import RichTextEditor from '../components/RichTextEditor.jsx';
import AttachmentPicker from '../components/AttachmentPicker.jsx';
import { CheckIcon, XIcon, PlusIcon, EditIcon, TrashIcon, DownloadIcon } from '../components/icons.jsx';
import DocIcon from '../components/DocIcon.jsx';
import { sanitizeHtml, htmlToText } from '../utils/sanitizeHtml.js';
import { isAdminRole, isClientRole } from '../utils/role.js';
import { DEFAULT_GROUP_NAME } from '../utils/defaultGroup.js';

/**
 * The priorities this page can SET — the four ranked ones plus `RETURNED`.
 *
 * `RETURNED` is offered HERE ONLY, deliberately. `CreateTaskModal` keeps the
 * four: nothing can be handed back before it has been worked on, so a
 * brand-new task cannot honestly be in that state. The API enforces the same
 * split (`editablePriority` in `task.validator.js`), so this is the shape of a
 * real rule rather than a field merely hidden from one form.
 *
 * It is also absent from `TaskFilterDrawer` — filtering was not asked for, and
 * a filter value nothing can be created at is worth adding on purpose rather
 * than by copy-paste.
 */
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'RETURNED'].map((p) => ({ value: p, label: p }));

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const task = useSelector(selectTaskDetail);
  const groupDetail = useSelector(selectGroupDetail);
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const user = useSelector(selectUser);
  const projects = useSelector(selectAllProjects);
  const clients = useSelector(selectAllClients);
  // Admins/owners can move a task into any group in the org; a regular
  // creator only into a group they're themselves a member of — `selectGroups`
  // already mirrors that exact admin-bypass scoping (see groupSlice/listGroups).
  const groups = useSelector(selectGroups);
  // Editing/deleting is limited to the task's creator or an org admin.
  const isClient = isClientRole(org?.role);
  // A client may create a task in their own space, which would otherwise make
  // them its "creator" and unlock the inline controls below. Group, project,
  // assignee and client are the supplier's to decide — a client changing which
  // channel their work sits in, or handing it to a named member of staff, is
  // not a call they should be making. Excluded explicitly rather than relying
  // on the creator test.
  /**
   * Is this task in a CLIENT CHANNEL?
   *
   * Declared HERE, above `canManage`, because that reads it — this is a plain
   * `const`, so referencing it from further up the body would be a temporal
   * dead zone error at render (the same class of bug as the hook-deps one the
   * TDZ check now guards). `canAccept` below reuses it.
   */
  const inClientChannel =
    Boolean(task?.group?.clientId) ||
    (task?.group?.name || '').trim().toLowerCase() === DEFAULT_GROUP_NAME.toLowerCase();

  /**
   * A CLIENT CHANNEL is shared ground: work raised there is a conversation
   * between the customer and whoever picks it up, not one person's record, so
   * everyone who can see the task can act on it — including the client. The
   * server applies the same rule (`assertCanManageTask`), so these controls
   * cannot offer anything it would refuse.
   *
   * Everywhere else the original rule stands, and still excludes a CLIENT
   * explicitly: they may create a task in their own space, which would
   * otherwise make them its "creator" and unlock group/assignee — decisions
   * that are the supplier's to make.
   */
  const canManage =
    task && (inClientChannel || (!isClient && (isAdminRole(org?.role) || task.createdBy?.id === user?.id)));

  /**
   * A CLIENT gets EDIT and DELETE — and nothing else.
   *
   * They keep those two because the request is theirs: correcting what they
   * asked for, or withdrawing it, is the customer's call. Everything else on
   * this page decides how the supplier will *do* the work — who it goes to,
   * which channel it sits in, what priority it carries, and whether it is
   * finished or cancelled. Those are not the customer's to set, so the inline
   * field controls and the whole status action bar are withheld.
   *
   * This is narrower than `canManage`, which a client legitimately satisfies in
   * a client channel — that flag still drives the Edit/Delete icons.
   */
  const canRunTask = canManage && !isClient;
  // Which status-change confirmation modal is open ('complete'|'cancel'|'reopen').
  const [statusAction, setStatusAction] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [timeline, setTimeline] = useState([]);
  // Surfaced rather than swallowed — an empty timeline and a failed request
  // look identical otherwise, which hid a 404 against a stale backend.
  const [timelineError, setTimelineError] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tab, setTab] = useState('details');
  const [editingAttachments, setEditingAttachments] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [newProjectName, setNewProjectName] = useState(null);
  const [newClientName, setNewClientName] = useState(null);
  // Only members of the task's group can be assigned. Guard against the initial
  // render where both are null (undefined === undefined would be truthy).
  const members = groupDetail && groupDetail.id === task?.groupId ? groupDetail.members || [] : [];

  useEffect(() => {
    dispatch(fetchTaskDetail(taskId));
  }, [taskId, dispatch]);

  // Load the task's group (for its member list) once the group is known.
  // Not for a CLIENT: the list only feeds the assignee picker they never get,
  // and their space's tasks live in groups they aren't members of — the fetch
  // would just be a guaranteed 403.
  useEffect(() => {
    if (task?.groupId && !isClient) dispatch(fetchGroup(task.groupId));
  }, [task?.groupId, isClient, dispatch]);

  useEffect(() => {
    if (orgId) dispatch(fetchAllProjects(orgId));
  }, [orgId, dispatch]);

  useEffect(() => {
    if (orgId) dispatch(fetchAllClients(orgId));
  }, [orgId, dispatch]);

  // The timeline is local state (not Redux) — it's only ever shown here.
  const loadTimeline = useCallback(() => {
    if (!taskId) return;
    tasksApi
      .activities(taskId)
      .then((r) => {
        setTimeline(r.activities);
        setTimelineError('');
      })
      .catch((err) => {
        setTimeline([]);
        setTimelineError(err.message || 'Could not load the timeline');
      });
  }, [taskId]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  if (!task || task.id !== taskId) {
    return (
      <div className="screen-center" style={{ minHeight: '40vh' }}>
        <span className="spinner" />
      </div>
    );
  }

  const setAssignee = (assigneeId) =>
    dispatch(updateTask({ taskId: task.id, groupId: task.groupId, assigneeId: assigneeId || null }));
  // Changing the group clears the assignee (they may not belong to the new
  // group) — the server also enforces this, but resetting it here keeps the
  // UI in sync immediately instead of waiting for the response.
  const setGroup = (newGroupId) =>
    dispatch(updateTask({ taskId: task.id, groupId: newGroupId, assigneeId: null }));
  const setDueDate = (value) =>
    dispatch(updateTask({
      taskId: task.id,
      groupId: task.groupId,
      dueDate: value ? new Date(value).toISOString() : null,
    }));
  const setPriority = (priority) => dispatch(updateTask({ taskId: task.id, groupId: task.groupId, priority }));
  const setProject = (projectId) =>
    dispatch(updateTask({ taskId: task.id, groupId: task.groupId, projectId: projectId || null }));
  const setClient = (clientId) =>
    dispatch(updateTask({ taskId: task.id, groupId: task.groupId, clientId: clientId || null }));
  const addAttachments = async (newFiles) => {
    setAttachError('');
    try {
      await tasksApi.addAttachments(task.id, newFiles);
      dispatch(fetchTaskDetail(task.id));
    } catch (err) {
      setAttachError(err.message || 'Could not add the attachment');
    }
  };
  const removeAttachment = async (attachmentId) => {
    setAttachError('');
    try {
      await tasksApi.removeAttachment(task.id, attachmentId);
      dispatch(fetchTaskDetail(task.id));
    } catch (err) {
      setAttachError(err.message || 'Could not remove the attachment');
    }
  };
  /**
   * Is this an unclaimed request from a client that the viewer could take on?
   *
   * Mirrors `task.service.js#isUnclaimedClientRequest` — a channel dedicated to
   * one client (`group.clientId`) or the workspace's shared client channel,
   * with nobody assigned. A CLIENT is excluded: they are the party who asked
   * for the work, and their own view hides the assignee entirely. The server
   * re-checks all of it, so this only decides which button to draw.
   */
  const canAccept = Boolean(task) && task.status === 'OPEN' && !task.assignee && inClientChannel && !isClient;

  // The status modal returns { status, remarks, dueDate? }; unwrap so it can
  // surface errors and only close on success.
  const applyStatus = async (payload) => {
    await dispatch(updateTask({ taskId: task.id, groupId: task.groupId, ...payload })).unwrap();
    loadTimeline(); // the status change just added a timeline entry
  };
  const doDelete = async () => {
    await dispatch(deleteTask({ taskId: task.id, groupId: task.groupId })).unwrap();
    navigate(-1);
  };

  /**
   * Claim an unassigned client request.
   *
   * Goes through its own endpoint rather than a task PATCH: `updateTask` gates
   * assignee changes behind creator-or-admin, so a regular member taking work
   * off the client channel would be refused there.
   */
  const doAccept = async () => {
    setAccepting(true);
    setAcceptError('');
    try {
      await tasksApi.accept(task.id);
      dispatch(fetchTaskDetail(task.id));
      loadTimeline();
    } catch (err) {
      setAcceptError(err.message || 'Could not accept this task');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="page page--narrow">
      <button className="link-btn" onClick={() => navigate(-1)}>← Back</button>

      <div className="task-detail">
        <div className="task-detail__head">
          <span className={`prio prio--${task.priority.toLowerCase()}`}>{task.priority}</span>
          <span className={`status-pill status-pill--${task.status.toLowerCase()}`}>{STATUS_META[task.status].label}</span>
          {canManage && (
            <div className="task-detail__actions">
              <button className="icon-btn" onClick={() => setEditOpen(true)} title="Edit task" aria-label="Edit task">
                <EditIcon size={16} />
              </button>
              <button className="icon-btn icon-btn--danger" onClick={() => setDeleteOpen(true)} title="Delete task" aria-label="Delete task">
                <TrashIcon size={16} />
              </button>
            </div>
          )}
        </div>

        <h1 className="task-detail__title">{task.title}</h1>
        {htmlToText(task.description) && (
          <div className="task-detail__desc" dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.description) }} />
        )}

        {/* Same tab pattern as the channel page. */}
        <div className="channel__tabbar task-detail__tabbar">
          <div className="channel__tabs">
            <button
              className={`tab ${tab === 'details' ? 'tab--active' : ''}`}
              onClick={() => setTab('details')}
            >
              Details
            </button>
            <button
              className={`tab ${tab === 'timeline' ? 'tab--active' : ''}`}
              onClick={() => setTab('timeline')}
            >
              Timeline{timeline.length ? ` (${timeline.length})` : ''}
            </button>
          </div>
          {tab === 'timeline' && (
            <div className="channel__actions">
              <button className="btn btn--sm" onClick={() => setMessageOpen(true)}>
                <PlusIcon size={14} /> Add Message
              </button>
            </div>
          )}
        </div>

        {tab === 'timeline' ? (
          <div className="task-detail__timeline">
            {timelineError && <div className="alert alert--error">{timelineError}</div>}
            {!timelineError && timeline.length === 0 ? (
              <div className="panel__empty">No activity on this task yet.</div>
            ) : (
              <Timeline items={timeline} actorLabel={isClient ? org?.name : undefined} />
            )}
          </div>
        ) : (
        <>
        <div className="task-detail__grid">
          {/* Group and Assigned to are internal facts, withheld from a CLIENT.
              Which channel a supplier discusses the work in, and which of their
              staff picked it up, are not the customer's business — and the
              channel is one a client is not a member of anyway. The same two
              are already hidden from their task LIST (`hide` on
              `TaskListView`); hiding them here keeps the detail view honest
              with the list that led to it. */}
          {(!isClient || inClientChannel) && (
            <div className="kv"><span className="kv__k">Group</span><span className="kv__v">#{task.group?.name}</span></div>
          )}
          <div className="kv"><span className="kv__k">Project</span><span className="kv__v">{task.project?.name || 'No project'}</span></div>
          <div className="kv"><span className="kv__k">Client</span><span className="kv__v">{task.client?.name || 'No client'}</span></div>
          {(!isClient || inClientChannel) && (
            <div className="kv"><span className="kv__k">Assigned to</span><span className="kv__v">{task.assignee ? task.assignee.name || task.assignee.email : 'Unassigned'}</span></div>
          )}
          <div className="kv"><span className="kv__k">Created by</span><span className="kv__v">{task.createdBy ? task.createdBy.name || task.createdBy.email : '—'}</span></div>
          <div className="kv"><span className="kv__k">Created</span><span className="kv__v">{formatDateTime(task.createdAt)}</span></div>
          <div className="kv"><span className="kv__k">Due date</span><span className="kv__v">{formatDate(task.dueDate)}</span></div>
          {task.remarks && (
            <div className="kv kv--full">
              <span className="kv__k">Latest remark</span>
              <span className="kv__v">{task.remarks}</span>
            </div>
          )}
        </div>

        <div className="attach-view">
          <div className="attach-view__head">
            <span className="kv__k">Attachments{task.attachments?.length ? ` (${task.attachments.length})` : ''}</span>
            {canManage && task.attachments?.length > 0 && (
              <button className="mini-btn" onClick={() => setEditingAttachments((v) => !v)}>
                <EditIcon size={12} /> {editingAttachments ? 'Done' : 'Edit attachments'}
              </button>
            )}
          </div>

          {attachError && <div className="alert alert--error">{attachError}</div>}

          {task.attachments?.length > 0 && (
            <div className="attach-view__grid">
              {task.attachments.map((a) => (
                <div key={a.id} className="attach-view__wrap">
                  <a
                    className="attach-view__item"
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={a.kind === 'document' ? a.fileName : undefined}
                  >
                    {a.kind === 'image' ? (
                      <img className="attach-view__thumb" src={a.url} alt={a.fileName} />
                    ) : a.kind === 'video' ? (
                      <video className="attach-view__thumb" src={a.url} muted />
                    ) : (
                      <span className="attach-view__icon">
                        <DocIcon fileName={a.fileName} mimeType={a.mimeType} />
                      </span>
                    )}
                    <span className="attach-view__name">{a.fileName}</span>
                    {a.kind === 'document' && <DownloadIcon size={14} />}
                  </a>
                  {editingAttachments && (
                    <button
                      type="button"
                      className="attach-view__remove"
                      onClick={() => removeAttachment(a.id)}
                      aria-label="Remove attachment"
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Any group member can add more attachments. */}
          <div className="attach-view__add">
            <AttachmentPicker value={[]} onChange={addAttachments} />
          </div>
        </div>

        {/* Assignee/due date/priority/project are editable only while the task
            is open, and only by the creator or an org admin — same rule as
            editing the title/description. Everyone else just sees the
            read-only values above. */}
        {task.status === 'OPEN' && canRunTask && (
        <div className="task-detail__controls">
          <div className="field">
            <label className="field__label">Group</label>
            <Select
              value={task.group?.id || task.groupId || ''}
              onChange={setGroup}
              placeholder="Choose a group"
              options={groups.map((g) => ({ value: g.id, label: `#${g.name}` }))}
            />
          </div>
          <div className="field">
            <label className="field__label">Assignee</label>
            <Select
              value={task.assignee?.id || ''}
              onChange={setAssignee}
              placeholder="Unassigned"
              options={[
                { value: '', label: 'Unassigned' },
                ...members.map((m) => ({ value: m.id, label: m.name || m.email })),
              ]}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="due">Due date</label>
            <DateField
              id="due"
              min={new Date().toISOString().slice(0, 10)}
              value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
              onChange={setDueDate}
            />
          </div>
          <div className="field">
            <label className="field__label">Priority</label>
            <Select value={task.priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
          </div>
          <div className="field">
            <label className="field__label">Project</label>
            <Select
              value={task.project?.id || ''}
              onChange={setProject}
              placeholder="No project"
              options={[
                { value: '', label: 'No project' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              onCreateNew={(query) => setNewProjectName(query)}
            />
          </div>
          <div className="field">
            <label className="field__label">Client</label>
            <Select
              value={task.client?.id || ''}
              onChange={setClient}
              placeholder="No client"
              options={[
                { value: '', label: 'No client' },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
              onCreateNew={(query) => setNewClientName(query)}
            />
          </div>
        </div>
        )}
        </>
        )}
      </div>

      {messageOpen && (
        <AddMessageModal
          taskId={task.id}
          onClose={() => setMessageOpen(false)}
          onAdded={loadTimeline}
        />
      )}

      {editOpen && (
        <EditTaskModal
          task={task}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); loadTimeline(); }}
        />
      )}

      {newProjectName !== null && (
        <ProjectFormModal
          orgId={orgId}
          initialName={newProjectName}
          onClose={() => setNewProjectName(null)}
          onSaved={(project) => {
            setProject(project.id);
            setNewProjectName(null);
          }}
        />
      )}

      {newClientName !== null && (
        <ClientFormModal
          orgId={orgId}
          initialName={newClientName}
          onClose={() => setNewClientName(null)}
          onSaved={(client) => {
            setClient(client.id);
            setNewClientName(null);
          }}
        />
      )}

      {deleteOpen && (
        <Modal title="Delete task" onClose={() => setDeleteOpen(false)}>
          <p className="modal__intro">
            Delete <strong>&ldquo;{task.title}&rdquo;</strong>? This can&apos;t be undone.
          </p>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn btn--danger" onClick={doDelete}>
              <TrashIcon size={16} /> Delete task
            </button>
          </div>
        </Modal>
      )}

      {/* Fixed footer action bar. Portaled to body so `.page`'s transform can't
          trap the fixed positioning (same reason the FAB is portaled). */}
      {/* The action bar is withheld from a CLIENT with ONE exception: a
          completed task, where they get Reopen and nothing else.

          Completing, cancelling and accepting are the supplier's calls on their
          own work — a customer raises a request and is told the outcome, they
          do not close it themselves. Reopening is the opposite: "this is not
          actually done" is the customer's judgement, and it is the only status
          move that hands work BACK rather than settling it on the supplier's
          behalf. The API enforces exactly this split (`updateTask` allows a
          client COMPLETED → OPEN and refuses everything else), so the bar can
          never offer a client something the server would reject.

          A CANCELLED task shows nothing: that is the supplier having declined
          the work, and re-raising it is a new request, not a status flip. */}
      {(!isClient || task.status === 'COMPLETED') && createPortal(
        <div className="task-actionbar">
          <div className="task-actionbar__inner">
            {acceptError && <div className="alert alert--error">{acceptError}</div>}
            {/* An unclaimed client request leads with Accept, not with
                Complete/Cancel. Nobody owns it yet, so "mark as complete" is
                the wrong first move — the useful action is to take it. Once
                accepted the ordinary buttons come back, because the task then
                has an owner who can finish or cancel it. */}
            {canAccept ? (
              <button className="btn btn--success" onClick={doAccept} disabled={accepting}>
                {accepting ? <span className="spinner" /> : (<><CheckIcon size={16} /> Accept task</>)}
              </button>
            ) : task.status === 'OPEN' ? (
              <>
                <button className="btn btn--success" onClick={() => setStatusAction('complete')}>
                  <CheckIcon size={16} /> Mark as complete
                </button>
                <button className="btn btn--danger" onClick={() => setStatusAction('cancel')}>
                  <XIcon size={16} /> Cancel task
                </button>
              </>
            ) : (
              <button className="btn" onClick={() => setStatusAction('reopen')}>
                Reopen task
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {statusAction && (
        <TaskStatusModal
          type={statusAction}
          currentDueDate={task.dueDate}
          onConfirm={applyStatus}
          onClose={() => setStatusAction(null)}
        />
      )}
    </div>
  );
}

/** Edit a task's title and description (creator/admin only). Priority and
 *  project are edited inline on the page instead — see task-detail__controls. */
function EditTaskModal({ task, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await dispatch(
        updateTask({
          taskId: task.id,
          groupId: task.groupId,
          title: title.trim(),
          description: htmlToText(description) ? sanitizeHtml(description) : '',
        })
      ).unwrap();
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not update the task');
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit task" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="field">
          <label className="field__label">Title</label>
          <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Description</label>
          <RichTextEditor defaultValue={description} onChange={setDescription} placeholder="Add more detail…" />
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={busy || title.trim().length < 1}>
            {busy ? <span className="spinner" /> : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Adds a free-text note to the task's timeline. */
function AddMessageModal({ taskId, onClose, onAdded }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await tasksApi.addMessage(taskId, message.trim());
      onAdded?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not add the message');
      setBusy(false);
    }
  };

  return (
    <Modal title="Add message" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="field">
          <label className="field__label">Message</label>
          <textarea
            className="input textarea"
            rows={3}
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note to this task's timeline…"
          />
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={busy || !message.trim()}>
            {busy ? <span className="spinner" /> : 'Add message'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
