import Modal from '../../components/Modal.jsx';

/** Confirmation dialog (delete etc.) shared by the ERP pages. */
export default function KamdhenuConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
  busy = false,
}) {
  if (!open) return null;

  return (
    <Modal title={title} onClose={onClose}>
      <p className="modal__intro">{message}</p>
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn btn--sm ${danger ? 'btn--danger' : ''}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? <span className="spinner" /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
