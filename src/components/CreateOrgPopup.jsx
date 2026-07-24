import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch } from 'react-redux';
import { createOrg } from '../store/slices/orgSlice.js';
import { joinOrgRoom } from '../realtime/socket.js';
import { useWorkspaceNameCheck } from '../hooks/useWorkspaceNameCheck.js';
import SignOutLink from './SignOutLink.jsx';
import { PlusIcon, CheckIcon } from './icons.jsx';

/**
 * A non-dismissable overlay shown once after login when the user has no
 * pending invitations and belongs to no workspace yet. A workspace must
 * exist before a group can be created, so this always precedes
 * `CreateGroupPopup` in the post-login popup sequence (see `PostLoginPopups`).
 */
export default function CreateOrgPopup() {
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const nameCheck = useWorkspaceNameCheck(name);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const org = await dispatch(createOrg(name.trim())).unwrap();
      joinOrgRoom(org.id);
    } catch (err) {
      setError(err.message || 'Could not create workspace');
    } finally {
      setCreating(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__head">
          <h3 className="modal__title">Create your workspace</h3>
        </div>
        <div className="modal__body">
          <p className="modal__intro">
            You're not part of any workspace yet. Create one to get started.
          </p>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label className="field__label" htmlFor="new-org-name">Workspace name</label>
              <div className="field__input-status">
                <input
                  id="new-org-name"
                  className={`input ${nameCheck.error ? 'input--error' : ''}`}
                  autoFocus
                  placeholder="Acme"
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
                />
                {nameCheck.checking && <span className="spinner field__input-spinner" />}
                {!nameCheck.checking && nameCheck.available && <CheckIcon size={16} className="field__input-check" />}
              </div>
              {nameCheck.error ? (
                <span className="field__error">{nameCheck.error}</span>
              ) : (
                <span className="field__hint">5-15 characters. Letters and numbers only, no spaces.</span>
              )}
            </div>
            <button className="btn" type="submit" disabled={creating || !nameCheck.available}>
              {creating ? <span className="spinner" /> : (<><PlusIcon size={16} /> Create workspace</>)}
            </button>
          </form>
          <SignOutLink />
        </div>
      </div>
    </div>,
    document.body
  );
}
