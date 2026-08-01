import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import KamdhenuDataTable from '../components/KamdhenuDataTable.jsx';
import KamdhenuConfirmDialog from '../components/KamdhenuConfirmDialog.jsx';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtDate, fmtQty } from '../components/kamdhenuFormat.js';
import { PlusIcon, EyeIcon, TrashIcon } from '../../components/icons.jsx';

const statusTag = (status) =>
  status === 'DONE' ? (
    <span className="tag tag--success">Done</span>
  ) : (
    <span className="tag kerp-tag--warn">In Progress</span>
  );

export default function KamdhenuJobWorkListPage() {
  const navigate = useNavigate();
  const toast = useKamdhenuToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');

  const [sites, setSites] = useState([]);
  const [pos, setPos] = useState([]);
  const [siteId, setSiteId] = useState('');
  const [poId, setPoId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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

  const load = async () => {
    setLoading(true);
    try {
      const res = await kamdhenuApi.jobWorks.list({ page, q, siteId, poId, status, from, to });
      setRows(res.jobWorks || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.message || 'Could not load job works');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, siteId, poId, status, from, to]);

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await kamdhenuApi.jobWorks.remove(deleting.id);
      toast.success('Job work entry deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the job work entry');
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    { key: 'jwNumber', label: 'JW No', render: (r) => <span className="task-table__name">{r.jwNumber}</span> },
    { key: 'workDate', label: 'Date', render: (r) => fmtDate(r.workDate) },
    { key: 'siteName', label: 'Site' },
    { key: 'poNumber', label: 'Work Order No' },
    { key: 'equipmentName', label: 'Equipment' },
    { key: 'startQty', label: 'Start Qty', render: (r) => fmtQty(r.startQty) },
    { key: 'doneQty', label: 'Done Qty', render: (r) => fmtQty(r.doneQty) },
    { key: 'pendingQty', label: 'Pending Qty', render: (r) => fmtQty(r.pendingQty) },
    {
      key: 'units',
      label: 'Units',
      render: (r) => `${fmtQty(r.unitsDone ?? r.doneQty)}/${fmtQty(r.unitsTotal ?? r.startQty)} done`,
    },
    { key: 'doneDate', label: 'Done Date', render: (r) => (r.doneDate ? fmtDate(r.doneDate) : '—') },
    { key: 'days', label: 'Days' },
    { key: 'status', label: 'Status', render: (r) => statusTag(r.status) },
  ];

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Job Work</h1>
          <p className="page__subtitle">
            Job work entries — started quantity, workers and before/after pictures.
          </p>
        </div>
        <button type="button" className="btn btn--sm" onClick={() => navigate('/kamdhenu/job-works/new')}>
          <PlusIcon size={15} /> Create Job Work
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
        <div className="field">
          <label className="field__label">Work Order</label>
          <select
            className="input"
            value={poId}
            onChange={(e) => {
              setPoId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All work orders</option>
            {pos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.poNumber} — {p.siteName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label">Status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label">From</label>
          <input
            className="input"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="field">
          <label className="field__label">To</label>
          <input
            className="input"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
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
        searchPlaceholder="Search JW number…"
        emptyText="No job work entries yet."
        actions={(row) => (
          <>
            <button
              type="button"
              className="icon-btn"
              title="View"
              onClick={() => navigate(`/kamdhenu/job-works/${row.id}`)}
            >
              <EyeIcon size={15} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              title="Delete"
              onClick={() => setDeleting(row)}
            >
              <TrashIcon size={15} />
            </button>
          </>
        )}
      />

      <KamdhenuConfirmDialog
        open={!!deleting}
        title="Delete job work entry"
        message={`Delete ${deleting?.jwNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
