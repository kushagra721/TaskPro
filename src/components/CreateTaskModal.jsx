import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from './Modal.jsx';
import Select from './Select.jsx';
import DateField from './DateField.jsx';
import AttachmentPicker from './AttachmentPicker.jsx';
import RichTextEditor from './RichTextEditor.jsx';
import ProjectFormModal from './ProjectFormModal.jsx';
import ClientFormModal from './ClientFormModal.jsx';
import CreateChannelModal from './CreateChannelModal.jsx';
import { createTask } from '../store/slices/taskSlice.js';
import { fetchGroup, selectGroupDetail, selectGroups } from '../store/slices/groupSlice.js';
import { fetchAllProjects, selectAllProjects } from '../store/slices/projectSlice.js';
import { fetchAllClients, selectAllClients } from '../store/slices/clientSlice.js';
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { isAdminRole } from '../utils/role.js';
import { sanitizeHtml, htmlToText } from '../utils/sanitizeHtml.js';

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => ({ value: p, label: p }));

// YYYY-MM-DD for tomorrow (default due date).
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * New-task form.
 * - Inside a channel, pass `groupId` — the group is fixed.
 * - From the Tasks page (and Project/Client detail pages), pass `askGroup` —
 *   the user picks one of the groups they belong to first. The assignee list
 *   is always that *picked* group's actual members (fetched via `fetchGroup`),
 *   not an org-wide roster — a task's assignee must be someone who can
 *   actually see the group/channel it lives in. Assignee stays disabled until
 *   a group is chosen, and resets whenever the picked group changes (a prior
 *   assignee may not belong to the newly picked group).
 * `onCreated` lets the caller refresh a list the slice can't update on its own.
 */
export default function CreateTaskModal({
  groupId,
  askGroup,
  defaultProjectId = '',
  defaultClientId = '',
  onClose,
  onCreated,
}) {
  const dispatch = useDispatch();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const isAdmin = isAdminRole(org?.role);
  const detail = useSelector(selectGroupDetail);
  const myGroups = useSelector(selectGroups);
  const projects = useSelector(selectAllProjects);
  const clients = useSelector(selectAllClients);

  const [pickedGroupId, setPickedGroupId] = useState(groupId || '');
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM', assigneeId: '',
    // Due date defaults to tomorrow.
    dueDate: tomorrow(), projectId: defaultProjectId, clientId: defaultClientId,
  });
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // "+ Add <query>" from the Project/Client/Group dropdowns opens these inline.
  const [newProjectName, setNewProjectName] = useState(null);
  const [newClientName, setNewClientName] = useState(null);
  const [newGroupName, setNewGroupName] = useState(null);

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  // A due date can't be in the past.
  const today = new Date().toISOString().slice(0, 10);

  // The project/client lists are org-wide; make sure they're loaded when opened directly.
  useEffect(() => {
    if (orgId && projects.length === 0) dispatch(fetchAllProjects(orgId));
  }, [orgId, projects.length, dispatch]);

  useEffect(() => {
    if (orgId && clients.length === 0) dispatch(fetchAllClients(orgId));
  }, [orgId, clients.length, dispatch]);

  // Assignee options must be the *selected* group's actual members, not the
  // org-wide list passed in for the group picker itself — load that group's
  // detail (for its members[]) whenever the picked group changes, and drop
  // any previously chosen assignee since they may not belong to the new group.
  useEffect(() => {
    if (pickedGroupId) dispatch(fetchGroup(pickedGroupId));
    setForm((f) => (f.assigneeId ? { ...f, assigneeId: '' } : f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedGroupId, dispatch]);

  const members = detail?.id === pickedGroupId ? detail.members || [] : [];

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
          description: htmlToText(form.description) ? sanitizeHtml(form.description) : '',
          priority: form.priority,
          assigneeId: form.assigneeId || null,
          projectId: form.projectId || null,
          clientId: form.clientId || null,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          attachments,
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
              onChange={setPickedGroupId}
              placeholder={myGroups.length ? 'Choose a group' : 'You are not in any group yet'}
              options={myGroups.map((g) => ({ value: g.id, label: `#${g.name}` }))}
              // Only admins can create groups.
              onCreateNew={isAdmin ? (query) => setNewGroupName(query) : undefined}
            />
          </div>
        )}

        <div className="row2">
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
              onCreateNew={(query) => setNewProjectName(query)}
            />
          </div>

          <div className="field">
            <label className="field__label">Client (optional)</label>
            <Select
              value={form.clientId}
              onChange={set('clientId')}
              placeholder={clients.length ? 'No client' : 'No clients yet'}
              options={[
                { value: '', label: 'No client' },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
              onCreateNew={(query) => setNewClientName(query)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field__label">Description (optional)</label>
          <RichTextEditor onChange={set('description')} placeholder="Add more detail…" />
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
              disabled={askGroup && !pickedGroupId}
              placeholder={askGroup && !pickedGroupId ? 'Choose a group first' : 'Unassigned'}
              options={[
                { value: '', label: 'Unassigned' },
                ...members.map((m) => ({ value: m.id, label: m.name || m.email })),
              ]}
            />
          </div>
        </div>

        <div className="field">
          <label className="field__label">Due date (optional)</label>
          <DateField min={today} value={form.dueDate} onChange={set('dueDate')} />
        </div>

        <div className="field">
          <label className="field__label">Attachments (optional)</label>
          <AttachmentPicker value={attachments} onChange={setAttachments} />
        </div>

        <button className="btn" type="submit" disabled={loading || !form.title.trim() || !pickedGroupId}>
          {loading ? <span className="spinner" /> : 'Create task'}
        </button>
      </form>

      {newProjectName !== null && (
        <ProjectFormModal
          orgId={orgId}
          initialName={newProjectName}
          onClose={() => setNewProjectName(null)}
          onSaved={(project) => {
            set('projectId')(project.id);
            setNewProjectName(null);
          }}
        />
      )}

      {newClientName !== null && (
        <ClientFormModal
          orgId={orgId}
          initialName={newClientName}
          onClose={() => setNewClientName(null)}
          onSaved={(client) => {
            set('clientId')(client.id);
            setNewClientName(null);
          }}
        />
      )}

      {newGroupName !== null && (
        <CreateChannelModal
          initialName={newGroupName}
          onClose={() => setNewGroupName(null)}
          onCreated={(group) => {
            setPickedGroupId(group.id);
            setNewGroupName(null);
          }}
        />
      )}
    </Modal>
  );
}
