import { useEffect, useState } from 'react';
import { SearchIcon } from '../../components/icons.jsx';

const SKELETON_ROWS = 5;
const MOBILE_QUERY = '(max-width: 720px)';

/** True below 720px — the ERP lists swap their tables for stacked cards there.
 *  Exported for pages (e.g. Stock) that render their own tables. */
export function useKerpIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

/**
 * Server-driven list table for the ERP pages — search box, horizontal-scroll
 * table, shimmer skeleton while loading and a prev/next pagination footer.
 * Below 720px each row renders as a stacked "label: value" card instead of a
 * table row (no horizontal scrolling on phones); desktop is unchanged.
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
  const isMobile = useKerpIsMobile();

  const cellValue = (c, row) => (c.render ? c.render(row) : row[c.key] ?? '—');

  const body = isMobile ? (
    // --- Mobile: card per row ---
    loading ? (
      <div className="kerp-cards">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div key={`skel-${i}`} className="kerp-card">
            <span className="kerp-skel" />
            <span className="kerp-skel" style={{ maxWidth: 90 }} />
          </div>
        ))}
      </div>
    ) : rows.length === 0 ? (
      <div className="panel__empty">{emptyText}</div>
    ) : (
      <div className="kerp-cards">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`kerp-card ${onRowClick ? 'kerp-card--click' : ''}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((c) => (
              <div key={c.key} className="kerp-card__row">
                <span className="kerp-card__label">{c.label}</span>
                <span className="kerp-card__value">{cellValue(c, row)}</span>
              </div>
            ))}
            {actions && (
              <div className="kerp-card__actions" onClick={(e) => e.stopPropagation()}>
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  ) : (
    // --- Desktop: unchanged table ---
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
                  <td key={c.key}>{cellValue(c, row)}</td>
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
  );

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

      {body}

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
