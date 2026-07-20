import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTaskDetail, updateTask, deleteTask, selectTaskDetail } from '../store/slices/taskSlice.js';
import { tasksApi } from '../api/client.js';
import Timeline from '../components/Timeline.jsx';
import Modal from '../components/Modal.jsx';
import { fetchGroup, selectGroupDetail } from '../store/slices/groupSlice.js';
import { fetchAllProjects, selectAllProjects } from '../store/slices/projectSlice.js';
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { selectUser } from '../store/slices/authSlice.js';
import { STATUS_META, formatDate } from '../utils/status.js';
import Select from '../components/Select.jsx';
import TaskStatusModal from '../components/TaskStatusModal.jsx';
import { CheckIcon, XIcon, PlusIcon, EditIcon, TrashIcon } from '../components/icons.jsx';

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
  // Editing/deleting is limited to the task's creator or an org admin.
  const canManage = task && (org?.role === 'ADMIN' || task.createdBy?.id === user?.id);
  // Which status-change confirmation modal is open ('complete'|'cancel'|'reopen').
  const [statusAction, setStatusAction] = useState(null);
  const [timeline, setTimeline] = useState([]);
  // Surfaced rather than swallowed — an empty timeline and a failed request
  // look identical otherwise, which hid a 404 against a stale backend.
  const [timelineError, setTimelineError] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tab, setTab] = useState('details');
  // Only members of the task's group can be assigned. Guard against the initial
  // render where both are null (undefined === undefined would be truthy).
  const members = groupDetail && groupDetail.id === task?.groupId ? groupDetail.members || [] : [];

  useEffect(() => {
    dispatch(fetchTaskDetail(taskId));
  }, [taskId, dispatch]);

  // Load the task's group (for its member list) once the group is known.
  useEffect(() => {
    if (task?.groupId) dispatch(fetchGroup(task.groupId));
  }, [task?.groupId, dispatch]);

  useEffect(() => {
    if (orgId) dispatch(fetchAllProjects(orgId));
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
  const setDueDate = (value) =>
    dispatch(updateTask({
      taskId: task.id,
      groupId: task.groupId,
      dueDate: value ? new Date(value).toISOString() : null,
    }));
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
        {task.description && <p className="task-detail__desc">{task.description}</p>}

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
              <Timeline items={timeline} />
            )}
          </div>
        ) : (
        <>
        <div className="task-detail__grid">
          <div className="kv"><span className="kv__k">Group</span><span className="kv__v">#{task.group?.name}</span></div>
          <div className="kv"><span className="kv__k">Project</span><span className="kv__v">{task.project?.name || 'No project'}</span></div>
          <div className="kv"><span className="kv__k">Assigned to</span><span className="kv__v">{task.assignee ? task.assignee.name || task.assignee.email : 'Unassigned'}</span></div>
          <div className="kv"><span className="kv__k">Created by</span><span className="kv__v">{task.createdBy ? task.createdBy.name || task.createdBy.email : '—'}</span></div>
          <div className="kv"><span className="kv__k">Created</span><span className="kv__v">{formatDate(task.createdAt)}</span></div>
          <div className="kv"><span className="kv__k">Due date</span><span className="kv__v">{formatDate(task.dueDate)}</span></div>
          {task.remarks && (
            <div className="kv kv--full">
              <span className="kv__k">Latest remark</span>
              <span className="kv__v">{task.remarks}</span>
            </div>
          )}
        </div>

        {/* Assignee / project / due date are editable only while the task is
            open; once completed or cancelled they're read-only (shown above). */}
        {task.status === 'OPEN' && (
        <div className="task-detail__controls">
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
            <input
              id="due"
              className="input"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
              onChange={(e) => setDueDate(e.target.value)}
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
          projects={projects}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); loadTimeline(); }}
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
      {createPortal(
        <div className="task-actionbar">
          <div className="task-actionbar__inner">
            {task.status === 'OPEN' ? (
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

/** Edit a task's title, description and project (creator/admin only). */
function EditTaskModal({ task, projects, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [projectId, setProjectId] = useState(task.project?.id || '');
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
          description: description.trim(),
          projectId: projectId || null,
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
          <textarea
            className="input textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more detail…"
          />
        </div>
        <div className="field">
          <label className="field__label">Project</label>
          <Select
            value={projectId}
            onChange={setProjectId}
            placeholder="No project"
            options={[
              { value: '', label: 'No project' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
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
