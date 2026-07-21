import { useState } from 'react';
import Modal from './Modal.jsx';
import DateField from './DateField.jsx';

// Per-action copy. `reopen` also collects a new due date.
const ACTIONS = {
  complete: {
    title: 'Mark task as complete',
    intro: 'Add a remark about how this was resolved.',
    confirm: 'Mark as complete',
    btnClass: 'btn btn--success',
    status: 'COMPLETED',
    withDueDate: false,
  },
  cancel: {
    title: 'Cancel task',
    intro: 'Add a remark about why this task is being cancelled.',
    confirm: 'Cancel task',
    btnClass: 'btn btn--danger',
    status: 'CANCELLED',
    withDueDate: false,
  },
  reopen: {
    title: 'Reopen task',
    intro: 'Add a remark and set a new due date for the reopened task.',
    confirm: 'Reopen task',
    btnClass: 'btn',
    status: 'OPEN',
    withDueDate: true,
  },
};

/**
 * Confirmation dialog for a task status change. `type` is 'complete' | 'cancel'
 * | 'reopen'. Calls onConfirm({ status, remarks, dueDate? }) then closes.
 */
export default function TaskStatusModal({ type, currentDueDate, onConfirm, onClose }) {
  const cfg = ACTIONS[type];
  const [remarks, setRemarks] = useState('');
  const [dueDate, setDueDate] = useState(
    cfg.withDueDate && currentDueDate ? currentDueDate.slice(0, 10) : ''
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { status: cfg.status, remarks: remarks.trim() };
      if (cfg.withDueDate) payload.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
      await onConfirm(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not update the task');
      setBusy(false);
    }
  };

  return (
    <Modal title={cfg.title} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <p className="modal__intro">{cfg.intro}</p>

        <div className="field">
          <label className="field__label">Remarks{type === 'reopen' ? '' : ' (optional)'}</label>
          <textarea
            className="input textarea"
            rows={3}
            autoFocus
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add a note…"
          />
        </div>

        {cfg.withDueDate && (
          <div className="field">
            <label className="field__label">New due date</label>
            <DateField min={today} value={dueDate} onChange={setDueDate} />
          </div>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Back
          </button>
          <button className={cfg.btnClass} type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : cfg.confirm}
          </button>
        </div>
      </form>
    </Modal>
  );
}
