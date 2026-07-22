import { useState } from 'react';
import { useDispatch } from 'react-redux';
import Modal from './Modal.jsx';
import { createClient, updateClient } from '../store/slices/clientSlice.js';

/** Create/edit form — the same fields either way. Pass `client` to edit, omit
 *  to create (optionally with `initialName` to prefill, e.g. from a search
 *  query that didn't match any existing client). `onSaved` receives the
 *  created/updated client. */
export default function ClientFormModal({ orgId, client, initialName = '', onClose, onSaved }) {
  const dispatch = useDispatch();
  const [name, setName] = useState(client?.name || initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { name: name.trim() };
      const saved = client
        ? await dispatch(updateClient({ orgId, clientId: client.id, ...payload })).unwrap()
        : await dispatch(createClient({ orgId, ...payload })).unwrap();
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the client');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={client ? 'Edit client' : 'New client'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="field">
          <label className="field__label">Name</label>
          <input
            className="input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Corp"
          />
        </div>
        <button className="btn" type="submit" disabled={busy || name.trim().length < 2}>
          {busy ? <span className="spinner" /> : client ? 'Save changes' : 'Create client'}
        </button>
      </form>
    </Modal>
  );
}
