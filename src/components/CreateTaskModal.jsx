import { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Modal from './Modal.jsx';
import QuotaGate from './QuotaGate.jsx';
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
import { isAdminRole, isClientRole } from '../utils/role.js';
import { sanitizeHtml, htmlToText } from '../utils/sanitizeHtml.js';
import { DEFAULT_GROUP_NAME } from '../utils/defaultGroup.js';

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
  /**
   * Fields the caller has already decided, shown as read-only statements
   * instead of pickers: `{ group, client, assignee }`.
   *
   * Used by a client's detail page, where all three follow from *where* the
   * task is being raised — the default client channel, that client, and nobody
   * assigned yet. A disabled picker would still imply a choice exists; stating
   * the value says plainly that it does not.
   */
  lock: lockProp = {},
  onClose,
  onCreated,
}) {
  const dispatch = useDispatch();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const isAdmin = isAdminRole(org?.role);

  /**
   * A CLIENT never chooses a group, an assignee or a client — whichever screen
   * they raise the task from.
   *
   * Enforced HERE rather than at each call site so no entry point can forget:
   * the Tasks page, a client space's page and anything added later all inherit
   * it. The values are the only ones that make sense for them — the default
   * client channel, their own space, and nobody assigned yet, since deciding
   * who does the work is the supplier's call.
   */
  const isClient = isClientRole(org?.role);
  const lock = isClient ? { group: true, client: true, assignee: true } : lockProp;
  const detail = useSelector(selectGroupDetail);
  const myGroups = useSelector(selectGroups);
  const projects = useSelector(selectAllProjects);
  const clients = useSelector(selectAllClients);

  const [pickedGroupId, setPickedGroupId] = useState(groupId || '');
  // The workspace's default channel, resolved by name — the same channel the
  // server puts invited clients into. Matched case-insensitively because it is
  // a user-editable name, and a workspace that renamed it simply falls back to
  // the ordinary picker rather than breaking.
  const defaultGroup = useMemo(
    () => myGroups.find((g) => (g.name || '').trim().toLowerCase() === DEFAULT_GROUP_NAME.toLowerCase()),
    [myGroups]
  );
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM', assigneeId: '',
    // Due date defaults to tomorrow.
    dueDate: tomorrow(),
    projectId: defaultProjectId,
    // A client's space wins over whatever the caller supplied — from the Tasks
    // page there is no `defaultClientId` at all, and it is the only client they
    // could legitimately file against.
    clientId: (isClientRole(org?.role) && org?.clientId) || defaultClientId,
  });
  // The locked client's name, for display. Declared AFTER `form` — its deps
  // array reads `form.clientId`, which is evaluated during render, so placing
  // it above the `useState` throws "Cannot access 'form' before initialization"
  // at runtime while every build and lint step stays green.
  const lockedClientName = useMemo(
    () => (lock.client ? clients.find((c) => c.id === form.clientId)?.name : null),
    [lock.client, clients, form.clientId]
  );

  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');
  // Set when the API refuses on quota — swaps the form for the upgrade dialog.
  const [quotaInfo, setQuotaInfo] = useState(null);
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
  // With the group locked, pick the default channel as soon as the group list
  // has loaded — the caller cannot supply the id because only this component
  // knows which channel is the default one.
  useEffect(() => {
    if (lock.group && !pickedGroupId && defaultGroup) setPickedGroupId(defaultGroup.id);
  }, [lock.group, pickedGroupId, defaultGroup]);

  useEffect(() => {
    if (pickedGroupId) dispatch(fetchGroup(pickedGroupId));
    // Always cleared on a group change — and with the assignee locked it stays
    // cleared, which is exactly the "Unassigned" the caller asked for.
    setForm((f) => (f.assigneeId ? { ...f, assigneeId: '' } : f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedGroupId, dispatch]);

  const members = detail?.id === pickedGroupId ? detail.members || [] : [];

  /**
   * The client this channel is dedicated to, if it has one.
   *
   * When set, the task's client is decided by the channel and the picker is
   * replaced by a read-only line naming it — asking would imply a choice that
   * does not exist, and `task.service.js#createTask` overrides the submitted
   * value anyway. Read from the loaded detail rather than the group list, so it
   * is only trusted once the *picked* group's own record has arrived.
   */
  const channelClient = detail?.id === pickedGroupId ? detail.client : null;

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
      // 402 + `quotaExceeded` = the workspace is out of plan quota. That's a
      // billing problem with its own call to action, not a form error, so it
      // gets the upgrade dialog rather than a red line under the fields.
      if (err?.status === 402 && err?.fields?.quotaExceeded) {
        setQuotaInfo(err.fields);
        return;
      }
      setError(err.message || 'Could not create task');
    } finally {
      setLoading(false);
    }
  };

  // Rendered over the form so the user's input survives — closing the gate
  // returns them to the filled-in task, ready to retry after upgrading.
  if (quotaInfo) return <QuotaGate info={quotaInfo} onClose={onClose} />;

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
            <label className="field__label">
              Group {!lock.group && <span className="req">*</span>}
            </label>
            {lock.group ? (
              <div className="field__static">
                {defaultGroup ? `#${defaultGroup.name}` : 'Loading…'}
              </div>
            ) : (
              <Select
                value={pickedGroupId}
                onChange={setPickedGroupId}
                placeholder={myGroups.length ? 'Choose a group' : 'You are not in any group yet'}
                options={myGroups.map((g) => ({ value: g.id, label: `#${g.name}` }))}
                // Only admins can create groups.
                onCreateNew={isAdmin ? (query) => setNewGroupName(query) : undefined}
              />
            )}
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

          {/* Two ways the client stops being a question, with different
              reasons: the channel owns one (the server would overrule any other
              value), or the caller raised this task from a client's own page.
              Both render a statement of fact rather than a picker. */}
          {channelClient || lock.client ? (
            <div className="field">
              <label className="field__label">Client</label>
              <div className="field__static">
                {channelClient?.name || lockedClientName || '—'}
              </div>
              <p className="field__hint">
                {channelClient
                  ? 'Set by this group — every task here is filed under it.'
                  : 'This task belongs to the client whose page you opened it from.'}
              </p>
            </div>
          ) : (
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
          )}
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
            {lock.assignee ? (
              <div className="field__static">Unassigned</div>
            ) : (
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
            )}
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
