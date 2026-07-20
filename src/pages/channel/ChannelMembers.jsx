import { useSelector, useDispatch } from 'react-redux';
import Avatar from '../../components/Avatar.jsx';
import { selectUser } from '../../store/slices/authSlice.js';
import { removeGroupMember } from '../../store/slices/groupSlice.js';
import { PlusIcon } from '../../components/icons.jsx';

export default function ChannelMembers({ group, canManage, onAddMember }) {
  const dispatch = useDispatch();
  const me = useSelector(selectUser);
  const members = group.members || [];

  return (
    <div className="channel-members">
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Members ({members.length})</h2>
          {/* {canManage && (
            <button className="mini-btn mini-btn--primary" onClick={onAddMember}>
              <PlusIcon size={14} /> Add member
            </button>
          )} */}
        </div>
        <ul className="member-list">
          {members.map((m) => (
            <li key={m.id} className="member">
              <Avatar name={m.name} email={m.email} size={38} />
              <div className="member__info">
                <div className="member__name">
                  <span className="member__name-text">{m.name || m.email}</span>
                  {m.id === group.createdById && <span className="tag">Creator</span>}
                  {m.id === me?.id && <span className="tag">You</span>}
                </div>
                <div className="member__email">{m.email}</div>
              </div>
              {canManage && m.id !== group.createdById && (
                <div className="member__actions">
                  <button
                    className="mini-btn mini-btn--danger"
                    onClick={() => dispatch(removeGroupMember({ groupId: group.id, userId: m.id }))}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
