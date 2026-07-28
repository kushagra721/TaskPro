/** Prev/Next pager for the platform Clients pages — deliberately not the
 *  shared `components/Pagination.jsx`, which hardcodes "N task(s)" wording
 *  that doesn't fit a client list. Hidden when there's only one page. */
export default function PlatformPager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="platform-pager">
      <span className="platform-pager__info">
        Page {page} of {totalPages}
      </span>
      <div className="platform-pager__btns">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Prev
        </button>
        <button
          type="button"
          className="btn btn--sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
