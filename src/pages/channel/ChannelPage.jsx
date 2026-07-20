import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGroup, selectGroupDetail } from '../../store/slices/groupSlice.js';
import { fetchMembers, selectCurrentOrg, selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { selectUser } from '../../store/slices/authSlice.js';
import { joinGroupRoom, leaveGroupRoom } from '../../realtime/socket.js';
import ChannelChat from './ChannelChat.jsx';
import ChannelTasks from './ChannelTasks.jsx';
import ChannelMembers from './ChannelMembers.jsx';
import AddMemberModal from '../../components/AddMemberModal.jsx';
import CreateTaskModal from '../../components/CreateTaskModal.jsx';
import Fab from '../../components/Fab.jsx';
import { PlusIcon } from '../../components/icons.jsx';

export default function ChannelPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const group = useSelector(selectGroupDetail);
  const org = useSelector(selectCurrentOrg);
  const orgId = useSelector(selectCurrentOrgId);
  const user = useSelector(selectUser);
  const [tab, setTab] = useState('chat');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

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
        </div>
        {loaded && group.description && <p className="channel__desc">{group.description}</p>}

        <div className="channel__tabbar">
          <div className="channel__tabs">
            <button className={`tab ${tab === 'chat' ? 'tab--active' : ''}`} onClick={() => setTab('chat')}>Chat</button>
            <button className={`tab ${tab === 'tasks' ? 'tab--active' : ''}`} onClick={() => setTab('tasks')}>Tasks</button>
            <button className={`tab ${tab === 'members' ? 'tab--active' : ''}`} onClick={() => setTab('members')}>Members</button>
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
        <ChannelMembers group={group} canManage={canManage} onAddMember={() => setAddMemberOpen(true)} />
      )}

      {/* Mobile: floating New task. Hidden on the chat tab so it never covers
          the message composer. */}
      {loaded && tab !== 'chat' && (
        <Fab label="New task" onClick={() => setCreateTaskOpen(true)} />
      )}

      {addMemberOpen && <AddMemberModal groupId={groupId} onClose={() => setAddMemberOpen(false)} />}
      {createTaskOpen && <CreateTaskModal groupId={groupId} onClose={() => setCreateTaskOpen(false)} />}
    </div>
  );
}
