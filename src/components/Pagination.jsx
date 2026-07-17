import { ChevronRightIcon } from './icons.jsx';

/** Compact pager: Prev / page indicator / Next. Hidden when only one page. */
export default function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <span className="pagination__info">{total} task{total === 1 ? '' : 's'}</span>
      <div className="pagination__controls">
        <button
          className="pager-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronRightIcon size={16} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span className="pagination__page">Page {page} of {totalPages}</span>
        <button
          className="pager-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  );
}
