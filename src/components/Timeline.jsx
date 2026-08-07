import { CheckIcon, PlusIcon, XIcon, ActivityIcon, MailIcon } from './icons.jsx';

/**
 * Maps an activity to its timeline badge + dot colour. Status changes take
 * their colour from the status they moved *to*.
 */
const descriptor = (a) => {
  const to = a.data?.toStatus;
  if (a.type === 'task.status') {
    if (to === 'COMPLETED') return { label: 'COMPLETED', tone: 'success', Icon: CheckIcon };
    if (to === 'CANCELLED') return { label: 'CANCELLED', tone: 'danger', Icon: XIcon };
    return { label: 'REOPENED', tone: 'info', Icon: ActivityIcon };
  }
  if (a.type === 'task.created') return { label: 'ADDED', tone: 'info', Icon: PlusIcon };
  if (a.type === 'task.updated') return { label: 'EDITED', tone: 'neutral', Icon: ActivityIcon };
  if (a.type === 'task.message') return { label: 'MESSAGE', tone: 'neutral', Icon: MailIcon };
  if (a.type.startsWith('project.')) return { label: 'PROJECT', tone: 'info', Icon: ActivityIcon };
  if (a.type.startsWith('group.')) return { label: 'GROUP', tone: 'info', Icon: ActivityIcon };
  if (a.type.startsWith('member.') || a.type.startsWith('invitation.') || a.type.startsWith('join.')) {
    return { label: 'MEMBER', tone: 'neutral', Icon: ActivityIcon };
  }
  return { label: 'UPDATE', tone: 'neutral', Icon: ActivityIcon };
};

const fullDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Vertical timeline of activities.
 * - items: [{ id, type, summary, actor, createdAt, taskId, data }]
 * - onView(taskId): optional — renders a "View" link on task-related entries.
 * - actorLabel: optional — replaces every entry's actor name with this one
 *   string. Set to the WORKSPACE name when the viewer is a CLIENT: which
 *   individual member of the supplier moved a task along is internal detail,
 *   and to the customer the whole team acts as one party. Passed in rather
 *   than decided here, because the same component also renders the internal
 *   activity feed, where the person's name is the entire point.
 */
export default function Timeline({ items, onView, actorLabel }) {
  return (
    <ol className="timeline">
      {items.map((a) => {
        const { label, tone, Icon } = descriptor(a);
        return (
          <li key={a.id} className="timeline__item">
            <span className={`timeline__dot timeline__dot--${tone}`}>
              <Icon size={15} />
            </span>
            <div className="timeline__card">
              <div className="timeline__head">
                <span className={`timeline__badge timeline__badge--${tone}`}>{label}</span>
                {onView && a.taskId && (
                  <button className="timeline__view" onClick={() => onView(a.taskId)}>
                    View
                  </button>
                )}
              </div>
              <p className="timeline__text">{a.summary}</p>
              <div className="timeline__meta">
                <span className="timeline__date">{fullDate(a.createdAt)}</span>
                <span className="timeline__sep">|</span>
                <span className="timeline__actor">{actorLabel || a.actor}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
