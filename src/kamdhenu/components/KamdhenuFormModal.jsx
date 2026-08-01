import Modal from '../../components/Modal.jsx';

/**
 * Add/Edit modal shared by every master-data page — wraps the app's Modal with
 * a <form>, an error alert and Cancel/Submit footer buttons.
 */
export default function KamdhenuFormModal({
  title,
  open,
  onClose,
  onSubmit,
  submitting,
  error,
  children,
  submitLabel = 'Save',
}) {
  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {error && <div className="alert alert--error">{error}</div>}
        {children}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn--sm" disabled={submitting}>
            {submitting ? <span className="spinner" /> : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
