import { useSelector, useDispatch } from 'react-redux';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import { selectMembers } from '../store/slices/orgSlice.js';
import { selectGroupDetail, addGroupMember } from '../store/slices/groupSlice.js';

/**
 * Shared, responsive "Add member" popup. Lists organization members who are not
 * yet in the group and lets an admin/creator add them. The list shrinks live as
 * members are added (group detail updates in the store).
 */
export default function AddMemberModal({ groupId, onClose }) {
  const dispatch = useDispatch();
  const orgMembers = useSelector(selectMembers);
  const detail = useSelector(selectGroupDetail);

  const members = detail?.id === groupId ? detail.members || [] : [];
  const memberIds = new Set(members.map((m) => m.id));
  const addable = orgMembers.filter((m) => !memberIds.has(m.id));

  return (
    <Modal title="Add member" onClose={onClose}>
      {addable.length === 0 ? (
        <div className="dropdown__empty">Everyone in the organization is already in this group.</div>
      ) : (
        <ul className="member-list member-list--scroll">
          {addable.map((m) => (
            <li key={m.id} className="member">
              <Avatar name={m.name} email={m.email} size={36} />
              <div className="member__info">
                <div className="member__name">{m.name || m.email}</div>
                <div className="member__email">{m.email}</div>
              </div>
              <button
                className="mini-btn mini-btn--primary"
                onClick={() => dispatch(addGroupMember({ groupId, userId: m.id }))}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
