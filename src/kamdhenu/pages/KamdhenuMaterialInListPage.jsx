import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { kamdhenuApi } from '../../api/client.js';
import KamdhenuDataTable from '../components/KamdhenuDataTable.jsx';
import KamdhenuConfirmDialog from '../components/KamdhenuConfirmDialog.jsx';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtDate, fmtQty } from '../components/kamdhenuFormat.js';
import Modal from '../../components/Modal.jsx';
import { PlusIcon, EyeIcon, EditIcon, TrashIcon } from '../../components/icons.jsx';

export default function KamdhenuMaterialInListPage() {
  const navigate = useNavigate();
  const toast = useKamdhenuToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');

  const [viewing, setViewing] = useState(null); // full voucher (with items)
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

  const load = async () => {
    setLoading(true);
    try {
      const res = await kamdhenuApi.materialIn.list({ page, q });
      setRows(res.materialIns || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.message || 'Could not load material IN vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  const openView = async (row) => {
    setViewLoading(true);
    setViewing(row);
    try {
      const res = await kamdhenuApi.materialIn.get(row.id);
      setViewing(res.materialIn || row);
    } catch (err) {
      toast.error(err.message || 'Could not load the voucher');
    } finally {
      setViewLoading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await kamdhenuApi.materialIn.remove(deleting.id);
      toast.success('Voucher deleted — stock reduced accordingly');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the voucher');
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    {
      key: 'voucherNumber',
      label: 'Voucher',
      render: (r) => <span className="task-table__name">{r.voucherNumber}</span>,
    },
    { key: 'inDate', label: 'Date', render: (r) => fmtDate(r.inDate) },
    { key: 'poNumber', label: 'PO No.', render: (r) => r.poNumber || '—' },
    { key: 'siteName', label: 'Site' },
    { key: 'items', label: 'Items', render: (r) => (r.items || []).length },
  ];

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Material IN</h1>
          <p className="page__subtitle">Inward material against a PO — each voucher adds to the PO site's stock.</p>
        </div>
        <button type="button" className="btn btn--sm" onClick={() => navigate('/kamdhenu/material-in/new')}>
          <PlusIcon size={15} /> New IN Voucher
        </button>
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
        searchPlaceholder="Search voucher number…"
        emptyText="No material IN vouchers yet."
        actions={(row) => (
          <>
            <button type="button" className="icon-btn" title="View items" onClick={() => openView(row)}>
              <EyeIcon size={15} />
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Edit"
              onClick={() => navigate(`/kamdhenu/material-in/${row.id}/edit`)}
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
        <Modal title={`Voucher ${viewing.voucherNumber}`} onClose={() => setViewing(null)}>
          <div className="kerp-detail-grid">
            <div>
              <div className="field__label">Date</div>
              <div>{fmtDate(viewing.inDate)}</div>
            </div>
            <div>
              <div className="field__label">Site</div>
              <div>{viewing.siteName || '—'}</div>
            </div>
            <div>
              <div className="field__label">PO No.</div>
              <div>{viewing.poNumber || '—'}</div>
            </div>
          </div>
          {viewLoading ? (
            <div className="panel__empty">
              <span className="spinner" /> Loading items…
            </div>
          ) : (
            <div className="table-wrap kerp-mini-table" style={{ marginTop: 14 }}>
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewing.items || []).map((it, i) => (
                    <tr key={i} className="kerp-table__row--static">
                      <td className="task-table__name">{it.materialName}</td>
                      <td>{fmtQty(it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      <KamdhenuConfirmDialog
        open={!!deleting}
        title="Delete IN voucher"
        message={`Delete ${deleting?.voucherNumber}? Stock at ${deleting?.siteName} will be reduced accordingly. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
