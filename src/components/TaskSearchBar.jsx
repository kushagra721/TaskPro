import { XIcon } from './icons.jsx';

const FilterIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16M7 12h10M10 19h4" />
  </svg>
);

/**
 * Search input + Filters button (with active-count badge).
 *
 * `action` renders BETWEEN the two, which is the whole reason it exists: the
 * Tasks page wants search → New task → Filters, and the primary action reads
 * as stranded if it sits after the filter control. Callers that pass nothing
 * are unchanged.
 */
export default function TaskSearchBar({
  search,
  onSearch,
  onOpenFilters,
  activeCount,
  action = null,
  placeholder = 'Search tasks by name…',
}) {
  return (
    <div className="task-toolbar">
      <div className="search-box">
        <svg className="search-box__icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          className="search-box__input"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {search && (
          <button className="search-box__clear" onClick={() => onSearch('')} aria-label="Clear search">
            <XIcon size={14} />
          </button>
        )}
      </div>
      {action}
      <button className="btn btn--ghost btn--sm filters-btn" onClick={onOpenFilters}>
        <FilterIcon size={15} /> Filters
        {activeCount > 0 && <span className="filters-btn__count">{activeCount}</span>}
      </button>
    </div>
  );
}
