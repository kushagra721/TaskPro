import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGroup, updateGroup, deleteGroup, selectGroupDetail } from '../../store/slices/groupSlice.js';
import { fetchMembers, selectCurrentOrg, selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { selectUser } from '../../store/slices/authSlice.js';
import { joinGroupRoom, leaveGroupRoom } from '../../realtime/socket.js';
import ChannelChat from './ChannelChat.jsx';
import ChannelTasks from './ChannelTasks.jsx';
import ChannelMembers from './ChannelMembers.jsx';
import AddMemberModal from '../../components/AddMemberModal.jsx';
import CreateTaskModal from '../../components/CreateTaskModal.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmNameModal from '../../components/ConfirmNameModal.jsx';
import Select from '../../components/Select.jsx';
import Fab from '../../components/Fab.jsx';
import { fetchAllClients, selectAllClients } from '../../store/slices/clientSlice.js';
import { PlusIcon, EditIcon, TrashIcon } from '../../components/icons.jsx';
import { isAdminRole } from '../../utils/role.js';

export default function ChannelPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const group = useSelector(selectGroupDetail);
  const org = useSelector(selectCurrentOrg);
  const orgId = useSelector(selectCurrentOrgId);
  const user = useSelector(selectUser);
  const [tab, setTab] = useState('tasks');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    dispatch(fetchGroup(groupId));
    joinGroupRoom(groupId);
    if (orgId) dispatch(fetchMembers(orgId));
    return () => leaveGroupRoom(groupId);
  }, [groupId, orgId, dispatch]);

  const loaded = group && group.id === groupId;
  const canManage = isAdminRole(org?.role) || group?.createdById === user?.id;

  const doDeleteGroup = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await dispatch(deleteGroup({ groupId, confirmName: group.name })).unwrap();
      navigate('/groups');
    } catch (err) {
      setDeleteError(err.message || 'Could not delete the channel');
      setDeleting(false);
    }
  };

  return (
    <div className="channel">
      {/* Hidden on mobile (the header already shows the org, and the bottom
          nav is gone on this drill-down). */}
      <button className="link-btn channel__back" onClick={() => navigate('/groups')}>← Groups</button>
      <div className="channel__header">
        <div className="channel__title-row">
          <h1 className="channel__title">#{loaded ? group.name : '…'}</h1>
          {loaded && <span className="channel__members">{group.members?.length || 0} members</span>}
          {loaded && canManage && (
            <div className="task-detail__actions">
              <button className="icon-btn" onClick={() => setEditGroupOpen(true)} title="Edit group" aria-label="Edit group">
                <EditIcon size={15} />
              </button>
              <button className="icon-btn icon-btn--danger" onClick={() => setDeleteGroupOpen(true)} title="Delete group" aria-label="Delete group">
                <TrashIcon size={15} />
              </button>
            </div>
          )}
        </div>

        <div className="channel__tabbar">
          <div className="channel__tabs">
            <button className={`tab ${tab === 'tasks' ? 'tab--active' : ''}`} onClick={() => setTab('tasks')}>Tasks</button>
            <button className={`tab ${tab === 'members' ? 'tab--active' : ''}`} onClick={() => setTab('members')}>Members</button>
            <button className={`tab ${tab === 'chat' ? 'tab--active' : ''}`} onClick={() => setTab('chat')}>
              Chat{loaded && group.messageCount != null ? ` (${group.messageCount})` : ''}
            </button>
          </div>
          <div className="channel__actions">
            {/* New task/Add member are inline on desktop; on mobile the FAB
                below does whichever action fits the selected tab. */}
            <button className="btn btn--sm channel__new-task hide-mobile" onClick={() => setCreateTaskOpen(true)}>
              <PlusIcon size={14} /> New task
            </button>
            {canManage && (
              <button className="btn btn--ghost btn--sm hide-mobile" onClick={() => setAddMemberOpen(true)}>
                <PlusIcon size={14} /> Add member
              </button>
            )}
          </div>
        </div>
      </div>

      {!loaded ? (
        <div className="screen-center" style={{ minHeight: '40vh' }}>
          <span className="spinner" />
        </div>
      ) : tab === 'chat' ? (
        <ChannelChat groupId={groupId} canManage={canManage} group={group} />
      ) : tab === 'tasks' ? (
        <ChannelTasks groupId={groupId} />
      ) : (
        <ChannelMembers group={group} orgId={orgId} canManage={canManage} onAddMember={() => setAddMemberOpen(true)} />
      )}

      {/* Mobile: the floating button does whichever action fits the selected
          tab (New task / Add member) — hidden entirely on the chat tab so it
          never covers the message composer. */}
      {loaded && tab === 'tasks' && (
        <Fab label="New task" onClick={() => setCreateTaskOpen(true)} />
      )}
      {loaded && tab === 'members' && canManage && (
        <Fab label="Add member" onClick={() => setAddMemberOpen(true)} />
      )}

      {addMemberOpen && <AddMemberModal groupId={groupId} onClose={() => setAddMemberOpen(false)} />}
      {createTaskOpen && <CreateTaskModal groupId={groupId} onClose={() => setCreateTaskOpen(false)} />}
      {editGroupOpen && (
        <EditGroupModal
          group={group}
          onClose={() => setEditGroupOpen(false)}
          onSaved={() => setEditGroupOpen(false)}
        />
      )}

      {deleteGroupOpen && (
        <ConfirmNameModal
          title="Delete group"
          entityName={group?.name}
          busy={deleting}
          error={deleteError}
          onConfirm={doDeleteGroup}
          onClose={() => !deleting && setDeleteGroupOpen(false)}
          confirmLabel={<><TrashIcon size={16} /> Delete group</>}
        >
          <p className="modal__intro">
            Delete <strong>&ldquo;#{group?.name}&rdquo;</strong>? This permanently deletes:
          </p>
          <ul className="modal__list">
            <li>All tasks under this channel</li>
            <li>All chat messages in this channel</li>
            <li>All timeline activity for those tasks</li>
          </ul>
          <p className="modal__intro">This can&apos;t be undone.</p>
        </ConfirmNameModal>
      )}
    </div>
  );
}

/**
 * Edit a channel's name and the client it belongs to (creator/admin only).
 *
 * Description is deliberately not offered: it was never shown anywhere in the
 * product, so the field only invited people to write text nobody would read.
 * Existing descriptions are left untouched in the database — this form simply
 * does not send the key, and the API still accepts it for anything that does.
 */
function EditGroupModal({ group, onClose, onSaved }) {
  const dispatch = useDispatch();
  const orgId = useSelector(selectCurrentOrgId);
  const clients = useSelector(selectAllClients);
  const [name, setName] = useState(group.name || '');
  const [clientId, setClientId] = useState(group.clientId || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The picker needs the org's clients; this modal can be the first thing
  // opened in a session, so it cannot assume another page already loaded them.
  useEffect(() => {
    if (orgId && clients.length === 0) dispatch(fetchAllClients(orgId));
  }, [orgId, clients.length, dispatch]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await dispatch(updateGroup({ groupId: group.id, name: name.trim(), clientId })).unwrap();
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not update the channel');
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit group" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="field">
          <label className="field__label">Channel name</label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Assign client</label>
          <Select
            value={clientId}
            onChange={setClientId}
            placeholder={clients.length ? 'No client' : 'No clients yet'}
            options={[
              { value: '', label: 'No client' },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <p className="field__hint">
            Every task raised in this channel is filed under this client automatically, and the
            task form stops asking.
          </p>
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={busy || name.trim().length < 1}>
            {busy ? <span className="spinner" /> : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
