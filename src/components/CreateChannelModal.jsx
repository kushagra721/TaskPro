import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Modal from './Modal.jsx';
import { createGroup } from '../store/slices/groupSlice.js';
import { selectCurrentOrgId } from '../store/slices/orgSlice.js';
import { joinGroupRoom } from '../realtime/socket.js';

export default function CreateChannelModal({ onClose, onCreated }) {
  const dispatch = useDispatch();
  const orgId = useSelector(selectCurrentOrgId);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const group = await dispatch(createGroup({ orgId, name: name.trim() })).unwrap();
      joinGroupRoom(group.id);
      onClose();
      onCreated?.(group);
    } catch (err) {
      setError(err.message || 'Could not create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create a group" onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="field">
          <label className="field__label" htmlFor="ch-name">Group name</label>
          <input
            id="ch-name"
            className="input"
            autoFocus
            placeholder="general"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button className="btn" type="submit" disabled={loading || name.trim().length < 1}>
          {loading ? <span className="spinner" /> : 'Create group'}
        </button>
      </form>
    </Modal>
  );
}
