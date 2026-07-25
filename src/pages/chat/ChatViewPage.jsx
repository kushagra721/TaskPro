import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGroup, selectGroupDetail } from '../../store/slices/groupSlice.js';
import { selectMessages } from '../../store/slices/messageSlice.js';
import { markChatRead } from '../../store/slices/chatSlice.js';
import { selectCurrentOrg } from '../../store/slices/orgSlice.js';
import { selectUser } from '../../store/slices/authSlice.js';
import { joinGroupRoom, leaveGroupRoom } from '../../realtime/socket.js';
import ChannelChat from '../channel/ChannelChat.jsx';
import { isAdminRole } from '../../utils/role.js';

/** The Chats tab's conversation view — a focused, chat-only counterpart to
 *  ChannelPage's Tasks/Members/Chat tabs, reusing the same `ChannelChat`
 *  message list + composer. */
export default function ChatViewPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const group = useSelector(selectGroupDetail);
  const org = useSelector(selectCurrentOrg);
  const user = useSelector(selectUser);
  const messages = useSelector(selectMessages(groupId));

  useEffect(() => {
    dispatch(fetchGroup(groupId));
    joinGroupRoom(groupId);
    return () => leaveGroupRoom(groupId);
  }, [groupId, dispatch]);

  // Actively viewing the chat counts as reading it — mark read on open, and
  // again whenever a new message arrives while still on this page.
  useEffect(() => {
    dispatch(markChatRead(groupId));
  }, [groupId, dispatch, messages.length]);

  const loaded = group && group.id === groupId;
  const canManage = isAdminRole(org?.role) || group?.createdById === user?.id;

  return (
    <div className="channel">
      <button className="link-btn channel__back" onClick={() => navigate('/chats')}>← Chats</button>
      <div className="channel__header">
        <div className="channel__title-row">
          <h1 className="channel__title">#{loaded ? group.name : '…'}</h1>
          {loaded && <span className="channel__members">{group.members?.length ?? 0} members</span>}
        </div>
      </div>

      {!loaded ? (
        <div className="screen-center" style={{ minHeight: '40vh' }}>
          <span className="spinner" />
        </div>
      ) : (
        <ChannelChat groupId={groupId} canManage={canManage} />
      )}
    </div>
  );
}
