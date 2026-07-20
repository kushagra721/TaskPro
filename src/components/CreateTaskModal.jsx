import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from './Modal.jsx';
import Select from './Select.jsx';
import { createTask } from '../store/slices/taskSlice.js';
import { selectGroupDetail, selectGroups } from '../store/slices/groupSlice.js';
import { fetchAllProjects, selectAllProjects } from '../store/slices/projectSlice.js';
import { selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { groupsApi } from '../api/client.js';

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'].map((p) => ({ value: p, label: p }));

/**
 * New-task form.
 * - Inside a channel, pass `groupId` — the group is fixed.
 * - From the Tasks page, pass `askGroup` — the user picks one of the groups they
 *   belong to, and the assignee list follows that choice.
 * `onCreated` lets the caller refresh a list the slice can't update on its own.
 */
export default function CreateTaskModal({ groupId, askGroup, onClose, onCreated }) {
  const dispatch = useDispatch();
  const orgId = useSelector(selectCurrentOrgId);
  const detail = useSelector(selectGroupDetail);
  const myGroups = useSelector(selectGroups);
  const projects = useSelector(selectAllProjects);

  const [pickedGroupId, setPickedGroupId] = useState(groupId || '');
  // Members of the picked group, loaded on demand in askGroup mode.
  const [pickedMembers, setPickedMembers] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM', assigneeId: '', dueDate: '', projectId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  // A due date can't be in the past.
  const today = new Date().toISOString().slice(0, 10);

  // The project list is org-wide; make sure it's loaded when opened directly.
  useEffect(() => {
    if (orgId && projects.length === 0) dispatch(fetchAllProjects(orgId));
  }, [orgId, projects.length, dispatch]);

  // In channel mode the detail slice already holds the members.
  useEffect(() => {
    if (!askGroup) return undefined;
    if (!pickedGroupId) {
      setPickedMembers([]);
      return undefined;
    }
    let cancelled = false;
    groupsApi
      .get(pickedGroupId)
      .then((res) => {
        if (!cancelled) setPickedMembers(res.group.members || []);
      })
      .catch(() => {
        if (!cancelled) setPickedMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [askGroup, pickedGroupId]);

  // Changing the group invalidates the chosen assignee.
  const changeGroup = (v) => {
    setPickedGroupId(v);
    setForm((f) => ({ ...f, assigneeId: '' }));
  };

  const members = askGroup ? pickedMembers : (detail?.id === groupId ? detail.members || [] : []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!pickedGroupId) {
      setError('Please choose a group');
      return;
    }
    setLoading(true);
    try {
      await dispatch(
        createTask({
          groupId: pickedGroupId,
          title: form.title.trim(),
          description: form.description,
          priority: form.priority,
          assigneeId: form.assigneeId || null,
          projectId: form.projectId || null,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        })
      ).unwrap();
      onCreated?.();
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

        {askGroup && (
          <div className="field">
            <label className="field__label">Group <span className="req">*</span></label>
            <Select
              value={pickedGroupId}
              onChange={changeGroup}
              placeholder={myGroups.length ? 'Choose a group' : 'You are not in any group yet'}
              options={myGroups.map((g) => ({ value: g.id, label: `#${g.name}` }))}
            />
          </div>
        )}

        <div className="field">
          <label className="field__label">Project</label>
          <Select
            value={form.projectId}
            onChange={set('projectId')}
            placeholder={projects.length ? 'No project' : 'No projects yet'}
            options={[
              { value: '', label: 'No project' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
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
          <input className="input" type="date" min={today} value={form.dueDate} onChange={up('dueDate')} />
        </div>

        <button className="btn" type="submit" disabled={loading || !form.title.trim() || !pickedGroupId}>
          {loading ? <span className="spinner" /> : 'Create task'}
        </button>
      </form>
    </Modal>
  );
}
