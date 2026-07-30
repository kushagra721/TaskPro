import { documentHref } from '../api/client.js';
import { DownloadIcon, EyeIcon } from './icons.jsx';

/**
 * View + Download for an invoice or receipt, used by both the user panel's
 * transactions table and the reseller portal's Finance pages.
 *
 * Both point at the same server-rendered document page; **Download** just adds
 * `?print=1`, which makes the page open the browser's print dialog on load so
 * it can be saved as a proper A4 PDF. There is no separate PDF endpoint — the
 * browser does the conversion, and the document stays a shareable URL.
 */
export default function DocumentActions({ doc }) {
  if (!doc) return <span className="muted">—</span>;

  const href = documentHref(doc.path);
  const sep = href.includes('?') ? '&' : '?';
  return (
    <span className="doc-actions">
      <a
        className="icon-btn"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={`View ${doc.number}`}
        aria-label={`View ${doc.number}`}
      >
        <EyeIcon size={15} />
      </a>
      <a
        className="icon-btn"
        href={`${href}${sep}print=1`}
        target="_blank"
        rel="noopener noreferrer"
        title={`Download ${doc.number}`}
        aria-label={`Download ${doc.number}`}
      >
        <DownloadIcon size={15} />
      </a>
    </span>
  );
}
