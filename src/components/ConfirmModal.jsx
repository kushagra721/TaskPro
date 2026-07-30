import Modal from './Modal.jsx';

/**
 * Plain yes/no confirmation for a destructive action — the lighter sibling of
 * `ConfirmNameModal` (which makes you type the entity's exact name). Use this
 * where the action is reversible-ish or low-blast-radius (removing a mapped
 * domain, deleting a plan); reach for `ConfirmNameModal` when the delete
 * cascades over real user data (an organization, group, project, client).
 *
 * The caller owns the API call plus its busy/error state, same contract as
 * `ConfirmNameModal`.
 */
export default function ConfirmModal({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  danger = true,
  busy = false,
  error = '',
  onConfirm,
  onClose,
  children,
}) {
  return (
    <Modal title={title} onClose={onClose}>
      {error && <div className="alert alert--error">{error}</div>}
      {message && <p className="modal__intro">{message}</p>}
      {children}
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn--danger' : ''}`}
          onClick={onConfirm}
          disabled={busy}
          autoFocus
        >
          {busy ? <span className="spinner" /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
