import { useEffect, useState } from 'react';
import { platformApi } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { PlusIcon, UserIcon } from '../../components/icons.jsx';
import { formatDate } from '../../utils/status.js';

export default function ResellersPage() {
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () => {
    setLoading(true);
    platformApi.resellers
      .list()
      .then((res) => setResellers(res.resellers))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="page">
      <div className="page__head">
        <div className="page__head-text">
          <h1 className="page__title">Resellers</h1>
          <p className="page__subtitle">Create &amp; manage reseller accounts.</p>
        </div>
        <button className="btn" onClick={() => setCreateOpen(true)}>
          <PlusIcon size={16} /> Add reseller
        </button>
      </div>

      {loading ? (
        <div className="screen-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" />
        </div>
      ) : resellers.length === 0 ? (
        <EmptyState
          icon={<UserIcon size={30} />}
          title="No resellers yet"
          description="Create a reseller account — they sign in with mobile + OTP and manage their own clients."
        />
      ) : (
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Reseller</th>
                <th>Login mobile</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {resellers.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="task-table__name">{r.brandName || r.name}</div>
                    {r.brandName && <div className="muted" style={{ fontSize: 12.5 }}>{r.name}</div>}
                  </td>
                  <td className="nowrap">{r.loginMobile}</td>
                  <td>{r.email || '—'}</td>
                  <td><span className="status-pill status-pill--completed">{r.status}</span></td>
                  <td className="nowrap">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <CreateResellerModal
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

const THEME_COLORS = ['#6366f1', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b', '#06b6d4', '#f43f5e'];

function CreateResellerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', loginMobile: '', email: '', brandName: '', themeColor: THEME_COLORS[0] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await platformApi.resellers.create(form);
      onCreated();
    } catch (err) {
      setError(err.message || 'Could not create the reseller');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Create a reseller" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="row2">
          <div className="field">
            <label className="field__label">Reseller name <span className="req">*</span></label>
            <input className="input" autoFocus value={form.name} onChange={up('name')} placeholder="Acme Digital" />
          </div>
          <div className="field">
            <label className="field__label">Login mobile <span className="req">*</span></label>
            <input className="input" value={form.loginMobile} onChange={up('loginMobile')} placeholder="9812345678" />
          </div>
        </div>
        <div className="field">
          <label className="field__label">Email (optional)</label>
          <input className="input" type="email" value={form.email} onChange={up('email')} placeholder="owner@acme.com" />
        </div>
        <div className="field">
          <label className="field__label">Brand name (optional)</label>
          <input className="input" value={form.brandName} onChange={up('brandName')} placeholder="Acme AI" />
        </div>
        <div className="field">
          <label className="field__label">Theme colour</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {THEME_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setForm((f) => ({ ...f, themeColor: c }))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: c,
                  border: form.themeColor === c ? '2px solid var(--text)' : '2px solid transparent',
                  cursor: 'pointer',
                }}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn" type="submit" disabled={busy || !form.name.trim() || !form.loginMobile.trim()}>
            {busy ? <span className="spinner" /> : 'Create reseller'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
