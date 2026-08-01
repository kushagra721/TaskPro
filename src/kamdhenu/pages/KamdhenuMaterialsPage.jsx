import { useEffect, useState } from 'react';
import { kamdhenuApi } from '../../api/client.js';
import KamdhenuDataTable from '../components/KamdhenuDataTable.jsx';
import KamdhenuFormModal from '../components/KamdhenuFormModal.jsx';
import KamdhenuConfirmDialog from '../components/KamdhenuConfirmDialog.jsx';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { fmtQty } from '../components/kamdhenuFormat.js';
import Modal from '../../components/Modal.jsx';
import { PlusIcon, EditIcon, TrashIcon } from '../../components/icons.jsx';

const EMPTY_FORM = {
  materialName: '',
  materialCode: '',
  categoryId: '',
  minStock: '',
};

export default function KamdhenuMaterialsPage() {
  const toast = useKamdhenuToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');

  const [categories, setCategories] = useState([]);

  const [modal, setModal] = useState(null); // null | { material? }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Inline "+ new category" inside the Add/Edit modal.
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);

  // Category management modal.
  const [manageOpen, setManageOpen] = useState(false);
  const [categoryDeleting, setCategoryDeleting] = useState(null);
  const [categoryDeleteBusy, setCategoryDeleteBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadCategories = async () => {
    try {
      const res = await kamdhenuApi.categories.list();
      setCategories(res.categories || []);
    } catch (err) {
      toast.error(err.message || 'Could not load categories');
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await kamdhenuApi.materials.list({ page, q });
      setRows(res.materials || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.message || 'Could not load materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowNewCategory(false);
    setNewCategoryName('');
    setModal({});
  };

  const openEdit = (material) => {
    setForm({
      materialName: material.materialName || '',
      materialCode: material.materialCode || '',
      categoryId: material.categoryId || '',
      minStock: material.minStock ?? '',
    });
    setFormError('');
    setShowNewCategory(false);
    setNewCategoryName('');
    setModal({ material });
  };

  const submit = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId || null,
        minStock: form.minStock === '' ? 0 : Number(form.minStock),
      };
      if (modal.material) {
        await kamdhenuApi.materials.update(modal.material.id, payload);
        toast.success('Material updated');
      } else {
        await kamdhenuApi.materials.create(payload);
        toast.success('Material created');
      }
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.message || 'Could not save the material');
    } finally {
      setSaving(false);
    }
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCategorySaving(true);
    try {
      const res = await kamdhenuApi.categories.create({ name });
      toast.success('Category created');
      setNewCategoryName('');
      setShowNewCategory(false);
      await loadCategories();
      if (res.category?.id) setForm((f) => ({ ...f, categoryId: res.category.id }));
    } catch (err) {
      toast.error(err.message || 'Could not create the category');
    } finally {
      setCategorySaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await kamdhenuApi.materials.remove(deleting.id);
      toast.success('Material deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the material');
    } finally {
      setDeleteBusy(false);
    }
  };

  const confirmCategoryDelete = async () => {
    setCategoryDeleteBusy(true);
    try {
      await kamdhenuApi.categories.remove(categoryDeleting.id);
      toast.success('Category deleted');
      setCategoryDeleting(null);
      loadCategories();
      load(); // category names on material rows may have changed
    } catch (err) {
      toast.error(err.message || 'Could not delete the category');
    } finally {
      setCategoryDeleteBusy(false);
    }
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const columns = [
    {
      key: 'materialName',
      label: 'Name',
      render: (r) => <span className="task-table__name">{r.materialName}</span>,
    },
    { key: 'materialCode', label: 'Code' },
    { key: 'categoryName', label: 'Category', render: (r) => r.categoryName || '—' },
    { key: 'minStock', label: 'Min Stock', render: (r) => fmtQty(r.minStock) },
  ];

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Material Master</h1>
          <p className="page__subtitle">Materials, codes, categories and minimum stock levels.</p>
        </div>
        <div className="kerp-head-actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setManageOpen(true)}>
            Manage Categories
          </button>
          <button type="button" className="btn btn--sm" onClick={openAdd}>
            <PlusIcon size={15} /> Add Material
          </button>
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
        searchPlaceholder="Search materials…"
        emptyText="No materials yet — add the first one."
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
        title={modal?.material ? 'Edit Material' : 'Add Material'}
        open={!!modal}
        onClose={() => setModal(null)}
        onSubmit={submit}
        submitting={saving}
        error={formError}
        submitLabel={modal?.material ? 'Save changes' : 'Create material'}
      >
        <div className="field">
          <label className="field__label">Material name</label>
          <input className="input" value={form.materialName} onChange={setField('materialName')} autoFocus />
        </div>
        <div className="field">
          <label className="field__label">Material code</label>
          <input className="input" value={form.materialCode} onChange={setField('materialCode')} />
        </div>
        <div className="field">
          <label className="field__label">Category</label>
          <select className="input" value={form.categoryId} onChange={setField('categoryId')}>
            <option value="">— No category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {showNewCategory ? (
            <div className="kerp-inline-add">
              <input
                className="input"
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button
                type="button"
                className="btn btn--sm"
                disabled={categorySaving || !newCategoryName.trim()}
                onClick={createCategory}
              >
                {categorySaving ? <span className="spinner" /> : 'Add'}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowNewCategory(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="link-btn" onClick={() => setShowNewCategory(true)}>
              + New category
            </button>
          )}
        </div>
        <div className="field">
          <label className="field__label">Minimum stock</label>
          <input
            className="input"
            type="number"
            min="0"
            step="any"
            value={form.minStock}
            onChange={setField('minStock')}
          />
        </div>
      </KamdhenuFormModal>

      {manageOpen && (
        <Modal title="Material Categories" onClose={() => setManageOpen(false)}>
          {categories.length === 0 ? (
            <div className="panel__empty">No categories yet.</div>
          ) : (
            <ul className="kerp-cat-list">
              {categories.map((c) => (
                <li key={c.id} className="kerp-cat-list__item">
                  <span className="kerp-cat-list__name">{c.name}</span>
                  <span className="tag">{c.materialCount} materials</span>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    title="Delete category"
                    onClick={() => setCategoryDeleting(c)}
                  >
                    <TrashIcon size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      <KamdhenuConfirmDialog
        open={!!deleting}
        title="Delete material"
        message={`Delete "${deleting?.materialName}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      <KamdhenuConfirmDialog
        open={!!categoryDeleting}
        title="Delete category"
        message={`Delete category "${categoryDeleting?.name}"?`}
        confirmLabel="Delete"
        danger
        busy={categoryDeleteBusy}
        onConfirm={confirmCategoryDelete}
        onClose={() => setCategoryDeleting(null)}
      />
    </div>
  );
}
