import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { PlusIcon, UserIcon } from '../../components/icons.jsx';
import { formatDate } from '../../utils/status.js';

export default function ResellerClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () => {
    setLoading(true);
    platformApi.clients
      .list()
      .then((res) => setClients(res.clients))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <h1 className="page__title">Clients</h1>
          <p className="page__subtitle">Your clients — add new ones and keep track of them here.</p>
        </div>
        <button className="btn" onClick={() => setCreateOpen(true)}>
          <PlusIcon size={16} /> Add client
        </button>
      </div>

      {loading ? (
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState icon={<UserIcon size={30} />} title="No clients yet" description="Add your first client — they'll get a workspace they can sign into with their email." />
      ) : (
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Owner</th>
                <th>Owner email</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="task-table__name">{c.name}</td>
                  <td>{c.owner?.name || '—'}</td>
                  <td>{c.owner?.email || '—'}</td>
                  <td className="nowrap">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <AddClientModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
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
