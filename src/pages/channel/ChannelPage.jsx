import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGroup, updateGroup, selectGroupDetail } from '../../store/slices/groupSlice.js';
import { fetchMembers, selectCurrentOrg, selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { selectUser } from '../../store/slices/authSlice.js';
import { joinGroupRoom, leaveGroupRoom } from '../../realtime/socket.js';
import ChannelChat from './ChannelChat.jsx';
import ChannelTasks from './ChannelTasks.jsx';
import ChannelMembers from './ChannelMembers.jsx';
import AddMemberModal from '../../components/AddMemberModal.jsx';
import CreateTaskModal from '../../components/CreateTaskModal.jsx';
import Modal from '../../components/Modal.jsx';
import Fab from '../../components/Fab.jsx';
import { PlusIcon, EditIcon } from '../../components/icons.jsx';

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

  useEffect(() => {
    dispatch(fetchGroup(groupId));
    joinGroupRoom(groupId);
    if (orgId) dispatch(fetchMembers(orgId));
    return () => leaveGroupRoom(groupId);
  }, [groupId, orgId, dispatch]);

  const loaded = group && group.id === groupId;
  const canManage = org?.role === 'ADMIN' || group?.createdById === user?.id;

  return (
    <div className="channel">
      <div className="channel__header">
        {/* Back link + description are hidden on mobile (the header already
            shows the org, and the bottom nav is gone on this drill-down). */}
        <button className="link-btn channel__back" onClick={() => navigate('/groups')}>← Groups</button>
        <div className="channel__title-row">
          <h1 className="channel__title">#{loaded ? group.name : '…'}</h1>
          {loaded && <span className="channel__members">{group.members?.length || 0} members</span>}
          {loaded && canManage && (
            <button className="icon-btn" onClick={() => setEditGroupOpen(true)} title="Edit channel" aria-label="Edit channel">
              <EditIcon size={15} />
            </button>
          )}
        </div>
        {loaded && group.description && <p className="channel__desc">{group.description}</p>}

        <div className="channel__tabbar">
          <div className="channel__tabs">
            <button className={`tab ${tab === 'tasks' ? 'tab--active' : ''}`} onClick={() => setTab('tasks')}>Tasks</button>
            <button className={`tab ${tab === 'members' ? 'tab--active' : ''}`} onClick={() => setTab('members')}>Members</button>
            <button className={`tab ${tab === 'chat' ? 'tab--active' : ''}`} onClick={() => setTab('chat')}>
              Chat{loaded && group.messageCount != null ? ` (${group.messageCount})` : ''}
            </button>
          </div>
          <div className="channel__actions">
            {/* New task is inline on desktop; on mobile it's the FAB below. */}
            <button className="btn btn--sm hide-mobile" onClick={() => setCreateTaskOpen(true)}>
              <PlusIcon size={14} /> New task
            </button>
            {canManage && (
              <button className="btn btn--ghost btn--sm" onClick={() => setAddMemberOpen(true)}>
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
        <ChannelChat groupId={groupId} />
      ) : tab === 'tasks' ? (
        <ChannelTasks groupId={groupId} />
      ) : (
        <ChannelMembers group={group} orgId={orgId} canManage={canManage} onAddMember={() => setAddMemberOpen(true)} />
      )}

      {/* Mobile: floating New task. Hidden on the chat tab so it never covers
          the message composer. */}
      {loaded && tab !== 'chat' && (
        <Fab label="New task" onClick={() => setCreateTaskOpen(true)} />
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
    </div>
  );
}

/** Edit a channel's name/description (creator/admin only). */
function EditGroupModal({ group, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [name, setName] = useState(group.name || '');
  const [description, setDescription] = useState(group.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await dispatch(
        updateGroup({ groupId: group.id, name: name.trim(), description: description.trim() })
      ).unwrap();
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not update the channel');
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit channel" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="field">
          <label className="field__label">Channel name</label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Description</label>
          <textarea
            className="input textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this channel for?"
          />
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
