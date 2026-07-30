import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { platformApi } from '../../api/client.js';
import EmptyState from '../../components/EmptyState.jsx';
import PlatformPager from '../PlatformPager.jsx';
import DocumentActions from '../../components/DocumentActions.jsx';
import { ReceiptIcon, RotateIcon, SearchIcon } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const COPY = {
  invoice: {
    title: 'All invoices',
    subtitle: 'Tax invoices raised against your client workspaces.',
    numberCol: 'Invoice no.',
    dateCol: 'Raised on',
    empty: 'Invoices appear here as soon as a client is billed for a plan or a top-up.',
    search: 'Search by invoice number',
  },
  receipt: {
    title: 'All receipts',
    subtitle: 'Payments received from your client workspaces.',
    numberCol: 'Receipt no.',
    dateCol: 'Paid on',
    empty: 'Receipts appear here once a client payment succeeds.',
    search: 'Search by receipt number',
  },
};

/**
 * Reseller portal → Finance → **Invoices** / **Receipts**. One component for
 * both: the two lists differ only in wording and which endpoint they read, and
 * the row shape is identical. Which one is decided by the route, the same
 * pattern `plansBase.js` uses for the shared Plans pages.
 *
 * The PDF column links to the server-rendered document page, whose URL is
 * signed per row on every read — see `document.routes.js`. There's no
 * client-side PDF generation: the document page's own "Print / Save as PDF"
 * produces a correct A4 PDF from the browser.
 */
export default function DocumentsPage() {
  const { pathname } = useLocation();
  const kind = pathname.endsWith('/receipts') ? 'receipt' : 'invoice';
  const copy = COPY[kind];

  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debounced, kind]);
  // Switching tabs reuses this component, so clear the previous list rather
  // than showing invoices under the Receipts heading for a frame.
  useEffect(() => {
    setDocuments([]);
    setLoading(true);
  }, [kind]);

  const load = useCallback(
    (spinner) => {
      spinner(true);
      const api = kind === 'invoice' ? platformApi.invoices : platformApi.receipts;
      api
        .list({ q: debounced || undefined, page, limit: 20 })
        .then((res) => {
          setDocuments(res.documents);
          setPagination(res.pagination);
        })
        .finally(() => spinner(false));
    },
    [kind, debounced, page]
  );

  useEffect(() => load(setLoading), [load]);

  return (
    <div className="page">
      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <div className="platform-list-card__title-row">
              <h2 className="platform-list-card__title">{copy.title}</h2>
              {!loading && <span className="tab__count">{pagination.total}</span>}
            </div>
            <p className="platform-list-card__subtitle">{copy.subtitle}</p>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => load(setReloading)} disabled={loading || reloading}>
              <RotateIcon size={15} className={reloading ? 'spin' : ''} /> Reload
            </button>
          </div>
        </div>

        <div className="list-controls">
          <div className="search-box">
            <SearchIcon className="search-box__icon" size={16} />
            <input
              className="search-box__input"
              placeholder={copy.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState icon={<ReceiptIcon size={30} />} title={`No ${kind}s yet`} description={copy.empty} />
        ) : (
          <>
            <div className="table-wrap platform-list-card__scroll task-desktop">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>{copy.numberCol}</th>
                    <th>Client</th>
                    <th>For</th>
                    <th>Amount</th>
                    <th>Transaction</th>
                    <th>{copy.dateCol}</th>
                    <th>Document</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td className="task-table__name nowrap">{d.number}</td>
                      <td>
                        <div>{d.client || '—'}</div>
                        <div className="muted" style={{ fontSize: 12.5 }}>{d.workspace}</div>
                      </td>
                      <td>{d.description || '—'}</td>
                      <td className="nowrap">{money(d.amount)}</td>
                      <td className="txn-ref">{d.reference || '—'}</td>
                      <td className="nowrap">{formatDateTime(d.date)}</td>
                      <td><DocumentActions doc={d} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="task-cards">
              {documents.map((d) => (
                <div key={d.id} className="tcard">
                  <div className="tcard__row">
                    <div className="tcard__title">{d.number}</div>
                    <span className="tcard__del"><DocumentActions doc={d} /></span>
                  </div>
                  <div className="tcard__sub">{d.client || d.workspace || ' '}</div>
                  <div className="tcard__tags">
                    <span>{money(d.amount)}</span>
                    <span>{d.description || '—'}</span>
                  </div>
                  <div className="tcard__foot">
                    <span className="muted">{copy.dateCol}</span>
                    <span className="nowrap">{formatDateTime(d.date)}</span>
                  </div>
                </div>
              ))}
            </div>

            <PlatformPager page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
