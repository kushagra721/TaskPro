import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUser } from '../../store/slices/authSlice.js';
import { usersApi } from '../../api/client.js';
import Avatar from '../../components/Avatar.jsx';

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await usersApi.updateMe({ name: name.trim() });
      dispatch(setUser({ ...user, name: res.user.name }));
      setMessage('Profile updated');
    } catch (err) {
      setError(err.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page page--narrow">
      <div className="profile-head">
        <Avatar name={user?.name} email={user?.email} size={64} />
        <div>
          <div className="profile-head__name">{user?.name || 'You'}</div>
          <div className="profile-head__email">{user?.email}</div>
        </div>
      </div>

      <form className="card-form" onSubmit={save}>
        {message && <div className="alert alert--info">{message}</div>}
        {error && <div className="alert alert--error">{error}</div>}

        <div className="field">
          <label className="field__label" htmlFor="name">Full name</label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="email">Email</label>
          <input id="email" className="input" value={user?.email || ''} disabled />
        </div>

        <button className="btn" type="submit" disabled={saving || name.trim().length < 2}>
          {saving ? <span className="spinner" /> : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
