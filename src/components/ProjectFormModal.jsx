import { useState } from 'react';
import { useDispatch } from 'react-redux';
import Modal from './Modal.jsx';
import { createProject, updateProject } from '../store/slices/projectSlice.js';

/** Create/edit form — the same fields either way. Pass `project` to edit, omit to create. */
export default function ProjectFormModal({ orgId, project, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { name: name.trim(), description: description.trim() };
      if (project) await dispatch(updateProject({ orgId, projectId: project.id, ...payload })).unwrap();
      else await dispatch(createProject({ orgId, ...payload })).unwrap();
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the project');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="field">
          <label className="field__label">Name</label>
          <input
            className="input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website revamp"
          />
        </div>
        <div className="field">
          <label className="field__label">Description (optional)</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
          />
        </div>
        <button className="btn" type="submit" disabled={busy || name.trim().length < 2}>
          {busy ? <span className="spinner" /> : project ? 'Save changes' : 'Create project'}
        </button>
      </form>
    </Modal>
  );
}
