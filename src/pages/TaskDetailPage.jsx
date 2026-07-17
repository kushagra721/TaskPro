import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTaskDetail, updateTask, selectTaskDetail } from '../store/slices/taskSlice.js';
import { fetchGroup, selectGroupDetail } from '../store/slices/groupSlice.js';
import { TASK_STATUSES, STATUS_META, formatDate } from '../utils/status.js';
import Select from '../components/Select.jsx';

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const task = useSelector(selectTaskDetail);
  const groupDetail = useSelector(selectGroupDetail);
  // Only members of the task's group can be assigned.
  const members = groupDetail?.id === task?.groupId ? groupDetail.members || [] : [];

  useEffect(() => {
    dispatch(fetchTaskDetail(taskId));
  }, [taskId, dispatch]);

  // Load the task's group (for its member list) once the group is known.
  useEffect(() => {
    if (task?.groupId) dispatch(fetchGroup(task.groupId));
  }, [task?.groupId, dispatch]);

  if (!task || task.id !== taskId) {
    return (
      <div className="screen-center" style={{ minHeight: '40vh' }}>
        <span className="spinner" />
      </div>
    );
  }

  const setStatus = (status) => dispatch(updateTask({ taskId: task.id, groupId: task.groupId, status }));
  const setAssignee = (assigneeId) =>
    dispatch(updateTask({ taskId: task.id, groupId: task.groupId, assigneeId: assigneeId || null }));
  const setDueDate = (value) =>
    dispatch(updateTask({
      taskId: task.id,
      groupId: task.groupId,
      dueDate: value ? new Date(value).toISOString() : null,
    }));

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
          <div className="kv"><span className="kv__k">Assigned to</span><span className="kv__v">{task.assignee ? task.assignee.name || task.assignee.email : 'Unassigned'}</span></div>
          <div className="kv"><span className="kv__k">Created by</span><span className="kv__v">{task.createdBy ? task.createdBy.name || task.createdBy.email : '—'}</span></div>
          <div className="kv"><span className="kv__k">Created</span><span className="kv__v">{formatDate(task.createdAt)}</span></div>
          <div className="kv"><span className="kv__k">Due date</span><span className="kv__v">{formatDate(task.dueDate)}</span></div>
        </div>

        <div className="task-detail__status">
          <span className="field__label">Change status</span>
          <div className="status-choices">
            {TASK_STATUSES.map((s) => (
              <button
                key={s}
                className={`status-choice ${task.status === s ? 'status-choice--active' : ''}`}
                onClick={() => setStatus(s)}
                style={task.status === s ? { borderColor: STATUS_META[s].color, color: STATUS_META[s].color } : undefined}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>

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
              value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
