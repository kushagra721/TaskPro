import { SearchIcon } from '../../components/icons.jsx';

const SKELETON_ROWS = 5;

/**
 * Server-driven list table for the ERP pages — search box, horizontal-scroll
 * table, shimmer skeleton while loading and a prev/next pagination footer.
 *
 * `columns`: [{ key, label, render?(row) }] — `render` wins over `row[key]`.
 * `actions(row)`: optional trailing cell (buttons); row `onRowClick` skips
 * clicks that started inside it.
 */
export default function KamdhenuDataTable({
  columns,
  rows,
  loading,
  page,
  totalPages,
  onPageChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  actions,
  onRowClick,
  emptyText = 'Nothing here yet.',
}) {
  const colCount = columns.length + (actions ? 1 : 0);

  return (
    <div className="kerp-table">
      {onSearchChange && (
        <div className="kerp-table__toolbar">
          <div className="kerp-table__search">
            <SearchIcon size={15} />
            <input
              className="input kerp-table__search-input"
              type="search"
              value={searchValue}
              placeholder={searchPlaceholder}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="table-wrap kerp-table__wrap">
        <table className="task-table kerp-table__table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              {actions && <th className="kerp-table__actions-head" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={`skel-${i}`} className="kerp-table__skel-row">
                  {Array.from({ length: colCount }).map((__, j) => (
                    <td key={j}>
                      <span className="kerp-skel" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr className="kerp-table__empty-row">
                <td colSpan={colCount}>
                  <div className="panel__empty">{emptyText}</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={onRowClick ? '' : 'kerp-table__row--static'}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>
                  ))}
                  {actions && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="table-actions">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && totalPages > 1 && (
        <div className="kerp-table__foot">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={loading || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span className="kerp-table__page">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
