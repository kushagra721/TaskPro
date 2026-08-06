import { useState } from 'react';
import Modal from './Modal.jsx';
import { organizationsApi } from '../api/client.js';

/**
 * Invite someone on behalf of ONE client. Email is the only question.
 *
 * WHAT IS DELIBERATELY NOT ASKED, and why:
 *   role   — always CLIENT. This dialog only exists on a client's own page, so
 *            offering a role picker would invite an admin to be created from a
 *            screen about a customer.
 *   client — the page's own client. It is the whole reason this dialog is here.
 *   group  — resolved by the SERVER from the workspace's default channel. The
 *            client-detail page has no business knowing which channel clients
 *            belong in, and hardcoding the name here would break the moment it
 *            changed. `invitation.service.js#createInvitation` looks it up.
 *
 * Role is still sent explicitly rather than left to the API's `MEMBER` default:
 * an invite from this screen must never silently create an internal member.
 */
export default function InviteClientModal({ orgId, clientId, clientName, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setError('Enter an email address');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await organizationsApi.invite(orgId, { email: value, role: 'CLIENT', clientId });
      onInvited?.(value);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not send the invitation');
      setBusy(false);
    }
  };

  return (
    <Modal title="Invite member" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <p className="modal__intro">
          They will join as a client of <strong>{clientName}</strong> and see only this client&apos;s
          work.
        </p>
        <div className="field">
          <label className="field__label">Email</label>
          <input
            className="input"
            type="email"
            autoFocus
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={busy || !email.trim()}>
            {busy ? <span className="spinner" /> : 'Send invitation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
