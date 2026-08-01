import { useEffect, useState } from 'react';
import { kamdhenuApi } from '../../api/client.js';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtDate } from '../components/kamdhenuFormat.js';
import { exportCsv, printTable } from '../components/kamdhenuExport.js';

const REPORT_TYPES = [
  { value: 'site-progress', label: 'Site Wise Progress Report' },
  { value: 'po-progress', label: 'Work Order Progress Report' },
  { value: 'material-stock', label: 'Material Stock Report' },
  { value: 'material-consumption', label: 'Material Consumption Report' },
  { value: 'job-work', label: 'Job Work Report' },
  { value: 'manpower-hours', label: 'Manpower Hours Report' },
  { value: 'pending-po', label: 'Pending Work Order Report' },
  { value: 'low-stock', label: 'Low Stock Report' },
];

const DATE_KEYS = new Set(['poDate', 'inDate', 'workDate', 'entryDate', 'deliveryDate']);

const cell = (row, key) => {
  const v = row[key];
  if (v === null || v === undefined || v === '') return '—';
  if (DATE_KEYS.has(key)) return fmtDate(v);
  return String(v);
};

export default function KamdhenuReportsPage() {
  const toast = useKamdhenuToast();

  const [sites, setSites] = useState([]);
  const [pos, setPos] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [type, setType] = useState('site-progress');
  const [siteId, setSiteId] = useState('');
  const [poId, setPoId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [report, setReport] = useState(null); // {title, columns, rows, summary?}
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, poRes, mRes] = await Promise.all([
          kamdhenuApi.sites.listAll(),
          kamdhenuApi.purchaseOrders.listAll(),
          kamdhenuApi.materials.listAll(),
        ]);
        if (cancelled) return;
        setSites(sRes.sites || []);
        setPos(poRes.purchaseOrders || []);
        setMaterials(mRes.materials || []);
      } catch {
        /* filter dropdowns just stay empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async () => {
    setRunning(true);
    try {
      const res = await kamdhenuApi.report(type, { siteId, poId, materialId, from, to });
      setReport(res);
    } catch (err) {
      toast.error(err.message || 'Could not run the report');
    } finally {
      setRunning(false);
    }
  };

  const exportColumns = report
    ? report.columns.map((c) => ({ key: c.key, label: c.label, value: (r) => cell(r, c.key) }))
    : [];

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <h1 className="page__title">Reports</h1>
          <p className="page__subtitle">Run, print and export ERP reports.</p>
        </div>
      </div>

      <div className="panel">
        <div className="kerp-filter-bar">
          <div className="field">
            <label className="field__label">Report</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label">Site</label>
            <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label">Work Order</label>
            <select className="input" value={poId} onChange={(e) => setPoId(e.target.value)}>
              <option value="">All work orders</option>
              {pos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.poNumber} — {p.siteName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label">Material</label>
            <select className="input" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
              <option value="">All materials</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.materialName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label">From</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">To</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button type="button" className="btn btn--sm" onClick={run} disabled={running}>
            {running ? <span className="spinner" /> : 'Run report'}
          </button>
        </div>
        <p className="kerp-stock-hint">Filters that a report doesn't use are simply ignored by the server.</p>
      </div>

      {running && !report && (
        <div className="panel">
          <div className="panel__empty">
            <span className="spinner" /> Running report…
          </div>
        </div>
      )}

      {report && (
        <div className="panel">
          <div className="panel__head">
            <h2 className="panel__title">{report.title}</h2>
            <div className="kerp-head-actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={report.rows.length === 0}
                onClick={() =>
                  exportCsv(report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), exportColumns, report.rows)
                }
              >
                Export Excel
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={report.rows.length === 0}
                onClick={() => printTable(report.title, exportColumns, report.rows)}
              >
                Print / PDF
              </button>
            </div>
          </div>

          {report.rows.length === 0 ? (
            <div className="panel__empty">No data for this report with the chosen filters.</div>
          ) : (
            <div className="table-wrap">
              <table className="task-table">
                <thead>
                  <tr>
                    {report.columns.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, i) => (
                    <tr key={i} className="kerp-table__row--static">
                      {report.columns.map((c) => (
                        <td key={c.key}>{cell(row, c.key)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(report.summary) && report.summary.length > 0 && (
            <div className="kerp-report-summary">
              {report.summary.map((s) => (
                <span key={s.label} className="tag">
                  {s.label}: {s.value}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!report && !running && (
        <div className="panel">
          <div className="panel__empty">Pick a report type and filters, then run the report.</div>
        </div>
      )}
    </div>
  );
}
