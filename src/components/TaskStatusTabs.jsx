import { TASK_STATUSES, STATUS_META } from '../utils/status.js';

// Order: Open, Completed, Cancelled, All.
const TABS = [...TASK_STATUSES, 'ALL'];

/** Status filter tabs with live counts, e.g. "Open (5)". */
export default function TaskStatusTabs({ active, counts, onChange }) {
  return (
    <div className="filter-tabs">
      {TABS.map((t) => {
        const label = t === 'ALL' ? 'All' : STATUS_META[t].label;
        const count = counts?.[t];
        return (
          <button
            key={t}
            className={`filter-tab ${active === t ? 'filter-tab--active' : ''}`}
            onClick={() => onChange(t)}
          >
            {label}
            {count !== undefined && <span className="filter-tab__count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
