import Avatar from './Avatar.jsx';
import { XIcon } from './icons.jsx';
import { relativeDay } from '../utils/time.js';

const AssigneeCell = ({ assignee }) =>
  assignee ? (
    <span className="cell-user">
      <Avatar name={assignee.name} email={assignee.email} size={22} />
      {(assignee.name || assignee.email).split(' ')[0]}
    </span>
  ) : (
    <span className="muted">Unassigned</span>
  );

/**
 * Responsive task list: a table on desktop, vertical cards on mobile.
 * - onOpen(id): navigate to detail
 * - subtitle(task): optional secondary line (description)
 * - statusNode(task): a status pill or an editable <select>
 * - onDelete(task): optional delete action
 */
export default function TaskListView({ tasks, onOpen, subtitle, statusNode, onDelete }) {
  return (
    <>
      <div className="table-wrap task-desktop">
        <table className="task-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Priority</th>
              <th>Created</th>
              <th>Assigned to</th>
              <th>Group</th>
              <th>Status</th>
              {onDelete && <th aria-label="actions" />}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="clickable-row" onClick={() => onOpen(t.id)}>
                <td>
                  <div className="task-table__name">{t.title}</div>
                  {subtitle?.(t) && <div className="task-table__group">{subtitle(t)}</div>}
                </td>
                <td><span className={`prio prio--${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                <td className="nowrap">{relativeDay(t.createdAt)}</td>
                <td><AssigneeCell assignee={t.assignee} /></td>
                <td className="nowrap">{t.group ? `#${t.group.name}` : '—'}</td>
                <td onClick={(e) => e.stopPropagation()}>{statusNode(t)}</td>
                {onDelete && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="task-card__del" onClick={() => onDelete(t)} aria-label="Delete task">
                      <XIcon size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="task-cards">
        {tasks.map((t) => (
          <div key={t.id} className="tcard" onClick={() => onOpen(t.id)}>
            <div className="tcard__row">
              <span className={`prio prio--${t.priority.toLowerCase()}`}>{t.priority}</span>
              <span className="tcard__date">{relativeDay(t.createdAt)}</span>
              {onDelete && (
                <button
                  className="task-card__del tcard__del"
                  onClick={(e) => { e.stopPropagation(); onDelete(t); }}
                  aria-label="Delete task"
                >
                  <XIcon size={15} />
                </button>
              )}
            </div>
            <div className="tcard__title">{t.title}</div>
            {subtitle?.(t) && <div className="tcard__sub">{subtitle(t)}</div>}
            {t.group && <div className="tcard__group">#{t.group.name}</div>}
            <div className="tcard__foot">
              <AssigneeCell assignee={t.assignee} />
              <div onClick={(e) => e.stopPropagation()}>{statusNode(t)}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
