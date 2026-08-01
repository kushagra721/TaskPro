import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { kamdhenuApi } from '../../api/client.js';
import { selectKamdhenuAdmin } from '../../store/slices/kamdhenuAuthSlice.js';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtQty } from '../components/kamdhenuFormat.js';
import { exportCsv, printTable } from '../components/kamdhenuExport.js';

const STOCK_TAG = {
  OK: 'tag--success',
  LOW: 'kerp-tag--warn',
  OUT_OF_STOCK: 'kerp-tag--danger',
};

const EXPORT_COLUMNS = [
  { key: 'materialName', label: 'Material' },
  { key: 'materialCode', label: 'Code' },
  { key: 'siteName', label: 'Site', value: (r) => r.siteName || 'All sites' },
  { key: 'inQty', label: 'IN Qty' },
  { key: 'outQty', label: 'OUT Qty' },
  { key: 'currentQty', label: 'Stock Qty' },
  { key: 'minQty', label: 'Min Stock' },
  { key: 'status', label: 'Status' },
];

export default function KamdhenuStockPage() {
  const toast = useKamdhenuToast();
  const admin = useSelector(selectKamdhenuAdmin);
  const isStaff = admin?.role && admin.role !== 'ADMIN';

  const [sites, setSites] = useState([]);
  const [pos, setPos] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [siteId, setSiteId] = useState(isStaff ? admin?.siteId || '' : '');
  const [poId, setPoId] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, poRes] = await Promise.all([
          kamdhenuApi.sites.listAll(),
          kamdhenuApi.purchaseOrders.listAll(),
        ]);
        if (cancelled) return;
        setSites(sRes.sites || []);
        setPos(poRes.purchaseOrders || []);
      } catch {
        /* the filter dropdowns just stay empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await kamdhenuApi.stock({ siteId, poId, q, lowOnly: lowOnly ? 1 : undefined });
        if (!cancelled) setRows(res.stock || []);
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Could not load stock');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, poId, q, lowOnly]);

  const showSiteColumn = !siteId && !poId;
  const lowRows = rows.filter((r) => r.status !== 'OK');

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Material Stock</h1>
          <p className="page__subtitle">Live stock position — Material IN adds, job works consume.</p>
        </div>
        <div className="kerp-head-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={rows.length === 0}
            onClick={() => exportCsv('material-stock', EXPORT_COLUMNS, rows)}
          >
            Export Excel
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={rows.length === 0}
            onClick={() => printTable('Material Stock', EXPORT_COLUMNS, rows)}
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="kerp-filter-bar">
        <div className="field">
          <label className="field__label">Site</label>
          <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)} disabled={isStaff}>
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.siteName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label">PO</label>
          <select className="input" value={poId} onChange={(e) => setPoId(e.target.value)}>
            <option value="">All POs</option>
            {pos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.poNumber} — {p.siteName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label">Search</label>
          <input
            className="input"
            type="search"
            placeholder="Material name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="kerp-filter-bar__check">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {!loading && lowRows.length > 0 && (
        <div className="kerp-low-banner" role="alert">
          <span className="kerp-low-banner__title">Low Stock Warning</span>
          <span className="kerp-low-banner__names">
            {lowRows
              .map((r) => `${r.materialName}${r.siteName ? ` (${r.siteName})` : ''}`)
              .join(', ')}
          </span>
        </div>
      )}

      <div className="panel">
        {loading ? (
          <div className="panel__empty">
            <span className="spinner" /> Loading stock…
          </div>
        ) : rows.length === 0 ? (
          <div className="panel__empty">No stock rows match these filters.</div>
        ) : (
          <div className="table-wrap">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Code</th>
                  {showSiteColumn && <th>Site</th>}
                  <th>IN Qty</th>
                  <th>OUT Qty</th>
                  <th>Stock Quantity</th>
                  <th>Minimum Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.materialId}-${r.siteId || 'all'}`} className="kerp-table__row--static">
                    <td className="task-table__name">{r.materialName}</td>
                    <td>{r.materialCode || '—'}</td>
                    {showSiteColumn && <td>{r.siteName || 'All sites'}</td>}
                    <td>{fmtQty(r.inQty)}</td>
                    <td>{fmtQty(r.outQty)}</td>
                    <td>{fmtQty(r.currentQty)}</td>
                    <td>{fmtQty(r.minQty)}</td>
                    <td>
                      <span className={`tag ${STOCK_TAG[r.status] || ''}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
