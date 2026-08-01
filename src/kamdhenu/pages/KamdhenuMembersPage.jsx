import { useEffect, useState } from 'react';
import { kamdhenuApi } from '../../api/client.js';
import KamdhenuDataTable from '../components/KamdhenuDataTable.jsx';
import KamdhenuFormModal from '../components/KamdhenuFormModal.jsx';
import KamdhenuConfirmDialog from '../components/KamdhenuConfirmDialog.jsx';
import { useKamdhenuToast } from '../components/KamdhenuToast.jsx';
import { PlusIcon, EditIcon, TrashIcon } from '../../components/icons.jsx';

const ROLE_SUGGESTIONS = ['Supervisor', 'Painter', 'Mason', 'Helper', 'Carpenter', 'Electrician'];

const EMPTY_FORM = {
  name: '',
  mobile: '',
  role: '',
  siteId: '',
  email: '',
  password: '',
};

export default function KamdhenuMembersPage() {
  const toast = useKamdhenuToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');

  const [sites, setSites] = useState([]);

  const [modal, setModal] = useState(null); // null | { member? }
  const [form, setForm] = useState(EMPTY_FORM);
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
      const res = await kamdhenuApi.members.list({ page, q });
      setRows(res.members || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.message || 'Could not load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q]);

  useEffect(() => {
    (async () => {
      try {
        const res = await kamdhenuApi.sites.listAll();
        setSites(res.sites || []);
      } catch (err) {
        toast.error(err.message || 'Could not load sites');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setModal({});
  };

  const openEdit = (member) => {
    setForm({
      name: member.name || '',
      mobile: member.mobile || '',
      role: member.role || '',
      siteId: member.siteId || '',
      email: member.email || '',
      password: '',
    });
    setFormError('');
    setModal({ member });
  };

  const submit = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name,
        mobile: form.mobile || undefined,
        role: form.role,
        siteId: form.siteId,
        email: form.email || undefined,
        password: form.password || undefined,
      };
      if (modal.member) {
        await kamdhenuApi.members.update(modal.member.id, payload);
        toast.success('Member updated');
      } else {
        await kamdhenuApi.members.create(payload);
        toast.success('Member created');
      }
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.message || 'Could not save the member');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await kamdhenuApi.members.remove(deleting.id);
      toast.success('Member deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not delete the member');
    } finally {
      setDeleteBusy(false);
    }
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="task-table__name">{r.name}</span> },
    { key: 'mobile', label: 'Mobile', render: (r) => r.mobile || '—' },
    { key: 'role', label: 'Role' },
    { key: 'siteName', label: 'Site', render: (r) => r.siteName || '—' },
  ];

  return (
    <div className="page">
      <div className="page__head page__head--row">
        <div className="page__head-text">
          <h1 className="page__title">Members</h1>
          <p className="page__subtitle">Site manpower — supervisors, painters, masons, helpers…</p>
        </div>
        <button type="button" className="btn btn--sm" onClick={openAdd}>
          <PlusIcon size={15} /> Add Member
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
        searchPlaceholder="Search members…"
        emptyText="No members yet — add the first one."
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
        title={modal?.member ? 'Edit Member' : 'Add Member'}
        open={!!modal}
        onClose={() => setModal(null)}
        onSubmit={submit}
        submitting={saving}
        error={formError}
        submitLabel={modal?.member ? 'Save changes' : 'Create member'}
      >
        <div className="field">
          <label className="field__label">Name</label>
          <input className="input" value={form.name} onChange={setField('name')} autoFocus />
        </div>
        <div className="kerp-form-row">
          <div className="field">
            <label className="field__label">Mobile</label>
            <input className="input" value={form.mobile} onChange={setField('mobile')} />
          </div>
          <div className="field">
            <label className="field__label">Role</label>
            <input
              className="input"
              list="kerp-member-roles"
              placeholder="e.g. Supervisor, Painter…"
              value={form.role}
              onChange={setField('role')}
            />
            <datalist id="kerp-member-roles">
              {ROLE_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="field">
          <label className="field__label">Site (required)</label>
          <select className="input" value={form.siteId} onChange={setField('siteId')}>
            <option value="">— Select site —</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.siteName}
              </option>
            ))}
          </select>
        </div>
        <div className="kerp-login-access">
          <div className="kerp-login-access__label">Login access (optional)</div>
          <div className="kerp-form-row">
            <div className="field">
              <input
                className="input"
                type="email"
                placeholder="Email"
                autoComplete="off"
                value={form.email}
                onChange={setField('email')}
              />
            </div>
            <div className="field">
              <input
                className="input"
                type="password"
                placeholder="Password"
                autoComplete="new-password"
                value={form.password}
                onChange={setField('password')}
              />
            </div>
          </div>
          {modal?.member && (
            <p className="field__hint">Leave the password blank to keep the current one unchanged.</p>
          )}
        </div>
      </KamdhenuFormModal>

      <KamdhenuConfirmDialog
        open={!!deleting}
        title="Delete member"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
