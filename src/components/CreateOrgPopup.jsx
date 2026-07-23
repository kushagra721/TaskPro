import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { createOrg } from '../store/slices/orgSlice.js';
import { joinOrgRoom } from '../realtime/socket.js';
import { PlusIcon } from './icons.jsx';

/**
 * A non-dismissable overlay shown once after login when the user has no
 * pending invitations and belongs to no organization yet. An organization
 * must exist before a group can be created, so this always precedes
 * `CreateGroupPopup` in the post-login popup sequence (see `PostLoginPopups`).
 */
export default function CreateOrgPopup() {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const org = await dispatch(createOrg(name.trim())).unwrap();
      joinOrgRoom(org.id);
    } catch (err) {
      setError(err.message || 'Could not create organization');
    } finally {
      setCreating(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__head">
          <h3 className="modal__title">Create your organization</h3>
        </div>
        <div className="modal__body">
          <p className="modal__intro">
            You're not part of any organization yet. Create one to get started.
          </p>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label className="field__label" htmlFor="new-org-name">Organization name</label>
              <input
                id="new-org-name"
                className="input"
                autoFocus
                placeholder="Acme"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
              />
              <span className="field__hint">No spaces. Must be unique.</span>
            </div>
            <button className="btn" type="submit" disabled={creating || name.trim().length < 2}>
              {creating ? <span className="spinner" /> : (<><PlusIcon size={16} /> Create organization</>)}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
