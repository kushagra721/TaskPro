import { useEffect, useState } from 'react';
import { kamdhenuApi } from '../../api/client.js';
import KamdhenuDataTable from '../components/KamdhenuDataTable.jsx';
import KamdhenuFormModal from '../components/KamdhenuFormModal.jsx';
import KamdhenuConfirmDialog from '../components/KamdhenuConfirmDialog.jsx';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtDate } from '../components/kamdhenuFormat.js';
import { PlusIcon, EditIcon, TrashIcon } from '../../components/icons.jsx';

/** Equipment = a WORK TYPE (Shuttering, Plaster, Flooring, Painting…) that
 *  POs order quantities of and job works record done quantity against. */
export default function KamdhenuEquipmentPage() {
  const toast = useKamdhenuToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');

  const [modal, setModal] = useState(null); // null | { equipment? }
  const [equipmentName, setEquipmentName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
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
      const res = await kamdhenuApi.equipment.list({ page, q });
      setRows(res.equipment || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.message || 'Could not load equipment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  const openAdd = () => {
    setEquipmentName('');
    setFormError('');
    setModal({});
  };

  const openEdit = (equipment) => {
    setEquipmentName(equipment.equipmentName || '');
    setFormError('');
    setModal({ equipment });
  };

  const submit = async () => {
    setSaving(true);
    setFormError('');
    try {
      if (modal.equipment) {
        await kamdhenuApi.equipment.update(modal.equipment.id, { equipmentName });
        toast.success('Equipment updated');
      } else {
        await kamdhenuApi.equipment.create({ equipmentName });
        toast.success('Equipment created');
      }
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.message || 'Could not save the equipment');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await kamdhenuApi.equipment.remove(deleting.id);
      toast.success('Equipment deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the equipment');
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    {
      key: 'equipmentName',
      label: 'Name',
      render: (r) => <span className="task-table__name">{r.equipmentName}</span>,
    },
    { key: 'createdAt', label: 'Created', render: (r) => fmtDate(r.createdAt) },
  ];

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Equipment</h1>
          <p className="page__subtitle">Work types (Shuttering, Plaster, Flooring, Painting…) used on work orders.</p>
        </div>
        <button type="button" className="btn btn--sm" onClick={openAdd}>
          <PlusIcon size={15} /> Add Equipment
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
        searchPlaceholder="Search equipment…"
        emptyText="No equipment yet — add the first one."
        actions={(row) => (
          <>
            <button type="button" className="icon-btn" title="Edit" onClick={() => openEdit(row)}>
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

      <KamdhenuFormModal
        title={modal?.equipment ? 'Edit Equipment' : 'Add Equipment'}
        open={!!modal}
        onClose={() => setModal(null)}
        onSubmit={submit}
        submitting={saving}
        error={formError}
        submitLabel={modal?.equipment ? 'Save changes' : 'Create equipment'}
      >
        <div className="field">
          <label className="field__label">Equipment name</label>
          <input
            className="input"
            value={equipmentName}
            onChange={(e) => setEquipmentName(e.target.value)}
            placeholder="e.g. Shuttering"
            autoFocus
          />
        </div>
      </KamdhenuFormModal>

      <KamdhenuConfirmDialog
        open={!!deleting}
        title="Delete equipment"
        message={`Delete "${deleting?.equipmentName}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
