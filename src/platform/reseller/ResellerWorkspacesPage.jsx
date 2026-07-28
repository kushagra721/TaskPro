import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PlatformPager from '../PlatformPager.jsx';
import { PlusIcon, BuildingIcon, SearchIcon, RotateIcon } from '../../components/icons.jsx';
import { formatDateTime } from '../../utils/status.js';

/** "Workspace Management" — one row per client workspace (Organization),
 *  the sibling of the person-oriented "Clients" tab (`ResellerClientsPage.jsx`).
 *  Creating a new client lives here, since that action really is "create an
 *  Organization" — matches the reference design's second tab. */
export default function ResellerWorkspacesPage() {
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = (spinner) => {
    spinner(true);
    platformApi.clients
      .list({ q: debouncedSearch || undefined, page, limit: 20 })
      .then((res) => {
        setClients(res.clients);
        setPagination(res.pagination);
      })
      .finally(() => spinner(false));
  };

  useEffect(() => {
    load(setLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page]);

  return (
    <div className="page">
      <div className="panel platform-list-card">
        <div className="platform-list-card__head">
          <div className="platform-list-card__head-text">
            <h2 className="platform-list-card__title">Workspace Management</h2>
            <p className="platform-list-card__subtitle">
              {pagination.total} workspace{pagination.total === 1 ? '' : 's'} · showing page {pagination.page} of{' '}
              {pagination.totalPages}
            </p>
          </div>
          <div className="platform-list-card__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => load(setReloading)} disabled={loading || reloading}>
              <RotateIcon size={15} className={reloading ? 'spin' : ''} /> Reload
            </button>
            <button className="btn btn--sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon size={16} /> Add client
            </button>
          </div>
        </div>

        <div className="list-controls">
          <div className="search-box task-toolbar">
            <SearchIcon className="search-box__icon" size={16} />
            <input
              className="search-box__input"
              placeholder="Search by workspace or owner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="screen-center" style={{ minHeight: '30vh' }}>
            <span className="spinner" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyState icon={<BuildingIcon size={30} />} title="No workspaces yet" description="Add your first client — they'll get a workspace they can sign into with their email." action={
            <button className="btn" style={{ width: 'auto', padding: '0 18px' }} onClick={() => setCreateOpen(true)}>
              <PlusIcon size={16} /> Add client
            </button>
          } />
        ) : (
          <>
            <div className="table-wrap platform-list-card__scroll">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Workspace</th>
                    <th>Owner</th>
                    <th>Owner email</th>
                    <th>Members</th>
                    <th>Groups</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td className="task-table__name">{c.name}</td>
                      <td>{c.owner?.name || '—'}</td>
                      <td>{c.owner?.email || '—'}</td>
                      <td>{c.memberCount}</td>
                      <td>{c.groupCount}</td>
                      <td className="nowrap">{formatDateTime(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PlatformPager page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>

      {createOpen && (
        <AddClientModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load(setLoading);
          }}
        />
      )}
    </div>
  );
}

function AddClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ orgName: '', ownerName: '', ownerEmail: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await platformApi.clients.create(form);
      onCreated();
    } catch (err) {
      setError(err.message || 'Could not add the client');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Add a client" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="field">
          <label className="field__label">Workspace name <span className="req">*</span></label>
          <input className="input" autoFocus value={form.orgName} onChange={up('orgName')} placeholder="Client's Company" />
        </div>
        <div className="field">
          <label className="field__label">Owner's name <span className="req">*</span></label>
          <input className="input" value={form.ownerName} onChange={up('ownerName')} placeholder="Jane Doe" />
        </div>
        <div className="field">
          <label className="field__label">Owner's email <span className="req">*</span></label>
          <input className="input" type="email" value={form.ownerEmail} onChange={up('ownerEmail')} placeholder="jane@client.com" />
        </div>
        <p className="field__hint">They'll sign in with this email using the normal login flow — an OTP is emailed to verify it the first time.</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" type="submit" disabled={busy || !form.orgName.trim() || !form.ownerName.trim() || !form.ownerEmail.trim()}>
            {busy ? <span className="spinner" /> : 'Create client'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
