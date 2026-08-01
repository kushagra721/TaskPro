import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import KamdhenuDataTable from '../components/KamdhenuDataTable.jsx';
import KamdhenuProgress from '../components/KamdhenuProgress.jsx';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtDate } from '../components/kamdhenuFormat.js';
import { PlusIcon } from '../../components/icons.jsx';

export default function KamdhenuPoListPage() {
  const navigate = useNavigate();
  const toast = useKamdhenuToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState('');

  // Debounced server-side search (matches PO number).
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await kamdhenuApi.sites.listAll();
        if (!cancelled) setSites(res.sites || []);
      } catch {
        /* the site filter just stays empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await kamdhenuApi.purchaseOrders.list({ page, q, siteId });
        if (cancelled) return;
        setRows(res.purchaseOrders || []);
        setTotalPages(res.pagination?.totalPages || 1);
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Could not load work orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, siteId]);

  const columns = [
    { key: 'poNumber', label: 'WO No', render: (r) => <span className="task-table__name">{r.poNumber}</span> },
    { key: 'siteName', label: 'Site' },
    { key: 'poDate', label: 'WO Date', render: (r) => fmtDate(r.poDate) },
    { key: 'deliveryDate', label: 'Delivery Date', render: (r) => fmtDate(r.deliveryDate) },
    { key: 'donePercent', label: 'Progress', render: (r) => <KamdhenuProgress percent={r.donePercent} /> },
  ];

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Work Orders</h1>
          <p className="page__subtitle">Work-type orders per site — progress comes from job work entries.</p>
        </div>
        <button type="button" className="btn btn--sm" onClick={() => navigate('/kamdhenu/purchase-orders/new')}>
          <PlusIcon size={15} /> Create Work Order
        </button>
      </div>

      <div className="kerp-filter-bar">
        <div className="field">
          <label className="field__label">Site</label>
          <select
            className="input"
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.siteName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <KamdhenuDataTable
        columns={columns}
        rows={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search WO number…"
        onRowClick={(row) => navigate(`/kamdhenu/purchase-orders/${row.id}`)}
        emptyText="No work orders found."
      />
    </div>
  );
}
