import { useState } from 'react';
import Modal from './Modal.jsx';

/**
 * "Type the name to confirm" destructive-action modal — used for deleting an
 * organization/group/project/client, or leaving an organization. The caller
 * owns the actual API call and its busy/error state; this just gates the
 * confirm button behind an exact-match text input and renders the warning
 * copy passed as `children`.
 */
export default function ConfirmNameModal({
  title,
  entityName,
  confirmLabel = 'Delete',
  danger = true,
  busy = false,
  error = '',
  // Extra gate on top of the exact-name match, for callers that need one more
  // condition met before confirming (e.g. picking a successor before an
  // owner can leave). Defaults to true — no effect on other callers.
  extraValid = true,
  onConfirm,
  onClose,
  children,
}) {
  const [value, setValue] = useState('');
  const matches = value === entityName;

  const submit = (e) => {
    e.preventDefault();
    if (matches && extraValid && !busy) onConfirm();
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        {children}
        <div className="field">
          <label className="field__label">
            Type <strong>&ldquo;{entityName}&rdquo;</strong> to confirm
          </label>
          <input
            className="input"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={entityName}
            autoComplete="off"
          />
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn--danger' : ''}`} type="submit" disabled={!matches || !extraValid || busy}>
            {busy ? <span className="spinner" /> : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
