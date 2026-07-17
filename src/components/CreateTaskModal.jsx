import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from './Modal.jsx';
import Select from './Select.jsx';
import { createTask } from '../store/slices/taskSlice.js';
import { selectGroupDetail } from '../store/slices/groupSlice.js';

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'].map((p) => ({ value: p, label: p }));

export default function CreateTaskModal({ groupId, onClose }) {
  const dispatch = useDispatch();
  const detail = useSelector(selectGroupDetail);
  // Only members of the current group can be assigned.
  const members = detail?.id === groupId ? detail.members || [] : [];
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await dispatch(
        createTask({
          groupId,
          title: form.title.trim(),
          description: form.description,
          priority: form.priority,
          assigneeId: form.assigneeId || null,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        })
      ).unwrap();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="New task" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="field">
          <label className="field__label">Title</label>
          <input className="input" autoFocus value={form.title} onChange={up('title')} placeholder="What needs doing?" />
        </div>
        <div className="field">
          <label className="field__label">Description (optional)</label>
          <input className="input" value={form.description} onChange={up('description')} />
        </div>
        <div className="row2">
          <div className="field">
            <label className="field__label">Priority</label>
            <Select value={form.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
          </div>
          <div className="field">
            <label className="field__label">Assignee</label>
            <Select
              value={form.assigneeId}
              onChange={set('assigneeId')}
              placeholder="Unassigned"
              options={[
                { value: '', label: 'Unassigned' },
                ...members.map((m) => ({ value: m.id, label: m.name || m.email })),
              ]}
            />
          </div>
        </div>
        <div className="field">
          <label className="field__label">Due date (optional)</label>
          <input className="input" type="date" value={form.dueDate} onChange={up('dueDate')} />
        </div>
        <button className="btn" type="submit" disabled={loading || form.title.trim().length < 1}>
          {loading ? <span className="spinner" /> : 'Create task'}
        </button>
      </form>
    </Modal>
  );
}
