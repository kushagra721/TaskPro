import { useEffect, useState } from 'react';
import { kamdhenuApi } from '../../api/client.js';
import KamdhenuDataTable from '../components/KamdhenuDataTable.jsx';
import KamdhenuFormModal from '../components/KamdhenuFormModal.jsx';
import KamdhenuConfirmDialog from '../components/KamdhenuConfirmDialog.jsx';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtDate } from '../components/kamdhenuFormat.js';
import { PlusIcon, EditIcon, TrashIcon } from '../../components/icons.jsx';

export default function KamdhenuSitesPage() {
  const toast = useKamdhenuToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');

  const [modal, setModal] = useState(null); // null | { site? }
  const [siteName, setSiteName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null); // site row
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Debounced server-side search.
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
      const res = await kamdhenuApi.sites.list({ page, q });
      setRows(res.sites || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.message || 'Could not load sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  const openAdd = () => {
    setSiteName('');
    setFormError('');
    setModal({});
  };

  const openEdit = (site) => {
    setSiteName(site.siteName || '');
    setFormError('');
    setModal({ site });
  };

  const submit = async () => {
    setSaving(true);
    setFormError('');
    try {
      if (modal.site) {
        await kamdhenuApi.sites.update(modal.site.id, { siteName });
        toast.success('Site updated');
      } else {
        await kamdhenuApi.sites.create({ siteName });
        toast.success('Site created');
      }
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.message || 'Could not save the site');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await kamdhenuApi.sites.remove(deleting.id);
      toast.success('Site deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the site');
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    { key: 'siteName', label: 'Site Name', render: (r) => <span className="task-table__name">{r.siteName}</span> },
    { key: 'createdAt', label: 'Created', render: (r) => fmtDate(r.createdAt) },
  ];

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Sites</h1>
          <p className="page__subtitle">Construction sites.</p>
        </div>
        <button type="button" className="btn btn--sm" onClick={openAdd}>
          <PlusIcon size={15} /> Add Site
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
        searchPlaceholder="Search sites…"
        emptyText="No sites yet — add the first one."
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
        title={modal?.site ? 'Edit Site' : 'Add Site'}
        open={!!modal}
        onClose={() => setModal(null)}
        onSubmit={submit}
        submitting={saving}
        error={formError}
        submitLabel={modal?.site ? 'Save changes' : 'Create site'}
      >
        <div className="field">
          <label className="field__label">Site name</label>
          <input className="input" value={siteName} onChange={(e) => setSiteName(e.target.value)} autoFocus />
        </div>
      </KamdhenuFormModal>

      <KamdhenuConfirmDialog
        open={!!deleting}
        title="Delete site"
        message={`Delete "${deleting?.siteName}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
