import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import KamdhenuDataTable from '../components/KamdhenuDataTable.jsx';
import KamdhenuConfirmDialog from '../components/KamdhenuConfirmDialog.jsx';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtDate, fmtQty } from '../components/kamdhenuFormat.js';
import Modal from '../../components/Modal.jsx';
import { PlusIcon, EyeIcon, EditIcon, TrashIcon } from '../../components/icons.jsx';

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
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [viewing, setViewing] = useState(null); // full JW (materials + members)
  const [viewLoading, setViewLoading] = useState(false);
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
      const res = await kamdhenuApi.jobWorks.list({ page, q, siteId, poId, from, to });
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
  }, [page, q, siteId, poId, from, to]);

  const openView = async (row) => {
    setViewLoading(true);
    setViewing(row);
    try {
      const res = await kamdhenuApi.jobWorks.get(row.id);
      setViewing(res.jobWork || row);
    } catch (err) {
      toast.error(err.message || 'Could not load the job work entry');
    } finally {
      setViewLoading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await kamdhenuApi.jobWorks.remove(deleting.id);
      toast.success('Job work entry deleted — consumed stock restored');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the job work entry');
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    { key: 'jwNumber', label: 'JW No.', render: (r) => <span className="task-table__name">{r.jwNumber}</span> },
    { key: 'workDate', label: 'Date', render: (r) => fmtDate(r.workDate) },
    { key: 'siteName', label: 'Site' },
    { key: 'poNumber', label: 'PO No.' },
    { key: 'equipmentName', label: 'Equipment' },
    { key: 'doneQty', label: 'Done Qty', render: (r) => fmtQty(r.doneQty) },
    { key: 'totalHours', label: 'Hours', render: (r) => fmtQty(r.totalHours) },
  ];

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Job Work</h1>
          <p className="page__subtitle">Daily work entries — done quantity, materials used and manpower hours.</p>
        </div>
        <button type="button" className="btn btn--sm" onClick={() => navigate('/kamdhenu/job-works/new')}>
          <PlusIcon size={15} /> New Job Work
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
          <label className="field__label">PO</label>
          <select
            className="input"
            value={poId}
            onChange={(e) => {
              setPoId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All POs</option>
            {pos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.poNumber} — {p.siteName}
              </option>
            ))}
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
            <button type="button" className="icon-btn" title="View" onClick={() => openView(row)}>
              <EyeIcon size={15} />
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Edit"
              onClick={() => navigate(`/kamdhenu/job-works/${row.id}/edit`)}
            >
              <EditIcon size={15} />
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

      {viewing && (
        <Modal title={`Job Work ${viewing.jwNumber}`} onClose={() => setViewing(null)}>
          <div className="kerp-detail-grid">
            <div>
              <div className="field__label">Date</div>
              <div>{fmtDate(viewing.workDate)}</div>
            </div>
            <div>
              <div className="field__label">Site</div>
              <div>{viewing.siteName || '—'}</div>
            </div>
            <div>
              <div className="field__label">PO No.</div>
              <div>{viewing.poNumber || '—'}</div>
            </div>
            <div>
              <div className="field__label">Equipment</div>
              <div>{viewing.equipmentName || '—'}</div>
            </div>
            <div>
              <div className="field__label">Done quantity</div>
              <div>{fmtQty(viewing.doneQty)}</div>
            </div>
            <div>
              <div className="field__label">Total hours</div>
              <div>{fmtQty(viewing.totalHours)}</div>
            </div>
          </div>
          {viewLoading ? (
            <div className="panel__empty">
              <span className="spinner" /> Loading details…
            </div>
          ) : (
            <>
              <div className="table-wrap kerp-mini-table" style={{ marginTop: 14 }}>
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Material used</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.materials || []).length === 0 ? (
                      <tr className="kerp-table__row--static">
                        <td colSpan={2}>No materials recorded.</td>
                      </tr>
                    ) : (
                      viewing.materials.map((m, i) => (
                        <tr key={i} className="kerp-table__row--static">
                          <td className="task-table__name">{m.materialName}</td>
                          <td>{fmtQty(m.quantity)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-wrap kerp-mini-table" style={{ marginTop: 14 }}>
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.members || []).length === 0 ? (
                      <tr className="kerp-table__row--static">
                        <td colSpan={3}>No members recorded.</td>
                      </tr>
                    ) : (
                      viewing.members.map((m, i) => (
                        <tr key={i} className="kerp-table__row--static">
                          <td className="task-table__name">{m.memberName}</td>
                          <td>{m.role || '—'}</td>
                          <td>{fmtQty(m.hours)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Modal>
      )}

      <KamdhenuConfirmDialog
        open={!!deleting}
        title="Delete job work entry"
        message={`Delete ${deleting?.jwNumber}? Its material consumption is returned to stock. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
