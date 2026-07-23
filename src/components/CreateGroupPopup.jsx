import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createGroup } from '../store/slices/groupSlice.js';
import { selectCurrentOrg, selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { joinGroupRoom } from '../realtime/socket.js';
import { PlusIcon } from './icons.jsx';

/**
 * A non-dismissable overlay shown once after login when the (admin) user has
 * no pending invitations, already belongs to an organization, but that
 * organization has no groups yet — mirrors `useNavGate`'s existing "fresh
 * admin with 0 groups" rule, so only admins ever see this (a non-admin
 * member has no permission to create a group and would just hit a 403).
 */
export default function CreateGroupPopup() {
  const dispatch = useDispatch();
  const orgId = useSelector(selectCurrentOrgId);
  const org = useSelector(selectCurrentOrg);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const group = await dispatch(createGroup({ orgId, name: name.trim() })).unwrap();
      joinGroupRoom(group.id);
    } catch (err) {
      setError(err.message || 'Could not create group');
    } finally {
      setCreating(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__head">
          <h3 className="modal__title">Create your first group</h3>
        </div>
        <div className="modal__body">
          <p className="modal__intro">
            {org?.name} doesn't have any groups yet. Create one to start chatting and tracking tasks with your team.
          </p>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label className="field__label" htmlFor="new-group-name">Group name</label>
              <input
                id="new-group-name"
                className="input"
                autoFocus
                placeholder="general"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button className="btn" type="submit" disabled={creating || name.trim().length < 1}>
              {creating ? <span className="spinner" /> : (<><PlusIcon size={16} /> Create group</>)}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
