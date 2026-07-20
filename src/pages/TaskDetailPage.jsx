import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTaskDetail, updateTask, selectTaskDetail } from '../store/slices/taskSlice.js';
import { fetchGroup, selectGroupDetail } from '../store/slices/groupSlice.js';
import { fetchAllProjects, selectAllProjects } from '../store/slices/projectSlice.js';
import { selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { STATUS_META, formatDate } from '../utils/status.js';
import Select from '../components/Select.jsx';
import TaskStatusModal from '../components/TaskStatusModal.jsx';
import { CheckIcon, XIcon } from '../components/icons.jsx';

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const task = useSelector(selectTaskDetail);
  const groupDetail = useSelector(selectGroupDetail);
  const orgId = useSelector(selectCurrentOrgId);
  const projects = useSelector(selectAllProjects);
  // Which status-change confirmation modal is open ('complete'|'cancel'|'reopen').
  const [statusAction, setStatusAction] = useState(null);
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

  if (!task || task.id !== taskId) {
    return (
      <div className="screen-center" style={{ minHeight: '40vh' }}>
        <span className="spinner" />
      </div>
    );
  }

  const setAssignee = (assigneeId) =>
    dispatch(updateTask({ taskId: task.id, groupId: task.groupId, assigneeId: assigneeId || null }));
  const setProject = (projectId) =>
    dispatch(updateTask({ taskId: task.id, groupId: task.groupId, projectId: projectId || null }));
  const setDueDate = (value) =>
    dispatch(updateTask({
      taskId: task.id,
      groupId: task.groupId,
      dueDate: value ? new Date(value).toISOString() : null,
    }));
  // The status modal returns { status, remarks, dueDate? }; unwrap so it can
  // surface errors and only close on success.
  const applyStatus = (payload) =>
    dispatch(updateTask({ taskId: task.id, groupId: task.groupId, ...payload })).unwrap();

  return (
    <div className="page page--narrow">
      <button className="link-btn" onClick={() => navigate(-1)}>← Back</button>

      <div className="task-detail">
        <div className="task-detail__head">
          <span className={`prio prio--${task.priority.toLowerCase()}`}>{task.priority}</span>
          <span className={`status-pill status-pill--${task.status.toLowerCase()}`}>{STATUS_META[task.status].label}</span>
        </div>

        <h1 className="task-detail__title">{task.title}</h1>
        {task.description && <p className="task-detail__desc">{task.description}</p>}

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
            <label className="field__label">Project</label>
            <Select
              value={task.project?.id || ''}
              onChange={setProject}
              placeholder="No project"
              options={[
                { value: '', label: 'No project' },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
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
      </div>

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
