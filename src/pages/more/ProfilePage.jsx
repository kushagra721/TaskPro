import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUser } from '../../store/slices/authSlice.js';
import { selectCurrentOrg, selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { usersApi, organizationsApi, authApi } from '../../api/client.js';
import Avatar from '../../components/Avatar.jsx';
import PhotoPicker from '../../components/PhotoPicker.jsx';
import { formatDate } from '../../utils/status.js';
import { prettySize } from '../../utils/fileSize.js';

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const org = useSelector(selectCurrentOrg);
  const orgId = useSelector(selectCurrentOrgId);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [photoError, setPhotoError] = useState('');

  // Set/update password — OTP-confirmed, no current-password step.
  const [pwStage, setPwStage] = useState('idle'); // 'idle' | 'otp'
  const [pwSending, setPwSending] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwDevCode, setPwDevCode] = useState('');
  const [pwForm, setPwForm] = useState({ code: '', newPassword: '', confirmNewPassword: '' });

  const updatePwForm = (key) => (e) => setPwForm((f) => ({ ...f, [key]: e.target.value }));

  const requestPasswordOtp = async () => {
    setPwError('');
    setPwMessage('');
    setPwSending(true);
    try {
      const res = await authApi.requestPasswordChange();
      setPwDevCode(res.devCode || '');
      setPwStage('otp');
    } catch (err) {
      setPwError(err.message || 'Could not send verification code');
    } finally {
      setPwSending(false);
    }
  };

  const confirmPasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwMessage('');
    setPwSaving(true);
    try {
      await authApi.confirmPasswordChange(pwForm);
      setPwMessage('Password updated successfully');
      setPwStage('idle');
      setPwForm({ code: '', newPassword: '', confirmNewPassword: '' });
      setPwDevCode('');
    } catch (err) {
      setPwError(err.message || 'Could not update password');
    } finally {
      setPwSaving(false);
    }
  };

  const cancelPasswordChange = () => {
    setPwStage('idle');
    setPwError('');
    setPwForm({ code: '', newPassword: '', confirmNewPassword: '' });
    setPwDevCode('');
  };

  useEffect(() => {
    if (!orgId || !user?.id) return;
    organizationsApi
      .memberProfile(orgId, user.id)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [orgId, user?.id]);
  const member = profile?.member;

  const saveAvatar = async (avatarUrl) => {
    setPhotoError('');
    try {
      const res = await usersApi.updateMe({ avatarUrl });
      dispatch(setUser({ ...user, avatarUrl: res.user.avatarUrl }));
    } catch (err) {
      setPhotoError(err.message || 'Could not update your photo');
    }
  };

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
        <PhotoPicker onUploaded={saveAvatar}>
          <Avatar name={user?.name} email={user?.email} src={user?.avatarUrl} size={64} viewable />
        </PhotoPicker>
        <div>
          <div className="profile-head__name">{user?.name || 'You'}</div>
          <div className="profile-head__email">{user?.email}</div>
        </div>
      </div>
      {photoError && <div className="alert alert--error">{photoError}</div>}

      {member && (
        <>
          <div className="user-profile__tags" style={{ marginTop: -8, marginBottom: 18 }}>
            <span className={`role-pill role-pill--${member.role.toLowerCase()}`}>{member.role}</span>
            <span className="user-profile__meta" style={{ marginTop: 0 }}>
              Member of {org?.name} since {formatDate(member.joinedAt)}
            </span>
          </div>

          <div className="stat-grid stat-grid--3">
            <div className="stat-card stat-card--indigo">
              <div className="stat-card__value">{member.groups.length}</div>
              <div className="stat-card__label">Groups joined</div>
            </div>
            <div className="stat-card stat-card--violet">
              <div className="stat-card__value">{member.taskCount}</div>
              <div className="stat-card__label">Tasks assigned</div>
            </div>
            <div className="stat-card stat-card--amber">
              <div className="stat-card__value">{prettySize(member.storage.totalBytes)}</div>
              <div className="stat-card__label">Storage used ({member.storage.totalFiles} files)</div>
            </div>
          </div>
        </>
      )}

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

      <div className="card-form" style={{ marginTop: 20 }}>
        <h3 className="field__label" style={{ fontSize: 15, marginBottom: 4 }}>Password</h3>
        <p className="field__hint" style={{ marginBottom: 16 }}>
          {pwStage === 'idle'
            ? "Set or update your password by verifying a code sent to your email."
            : `Enter the code sent to ${user?.email} and choose a new password.`}
        </p>

        {pwMessage && <div className="alert alert--info">{pwMessage}</div>}
        {pwError && <div className="alert alert--error">{pwError}</div>}

        {pwStage === 'idle' ? (
          <button className="btn btn--ghost" type="button" onClick={requestPasswordOtp} disabled={pwSending}>
            {pwSending ? <span className="spinner" /> : 'Set / update password'}
          </button>
        ) : (
          <form onSubmit={confirmPasswordChange}>
            {pwDevCode && <div className="alert alert--info">Dev mode code: {pwDevCode}</div>}

            <div className="field">
              <label className="field__label" htmlFor="pw-code">Verification code</label>
              <input
                id="pw-code"
                className="input"
                inputMode="numeric"
                placeholder="Enter the code"
                autoFocus
                value={pwForm.code}
                onChange={updatePwForm('code')}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="pw-new">New password</label>
              <input
                id="pw-new"
                className="input"
                type="password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                value={pwForm.newPassword}
                onChange={updatePwForm('newPassword')}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="pw-confirm">Re-enter new password</label>
              <input
                id="pw-confirm"
                className="input"
                type="password"
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                value={pwForm.confirmNewPassword}
                onChange={updatePwForm('confirmNewPassword')}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn"
                type="submit"
                disabled={pwSaving || !pwForm.code.trim() || pwForm.newPassword.length < 6}
              >
                {pwSaving ? <span className="spinner" /> : 'Update password'}
              </button>
              <button className="btn btn--ghost" type="button" onClick={cancelPasswordChange}>
                Cancel
              </button>
            </div>

            <button
              type="button"
              className="link-btn"
              style={{ marginTop: 12 }}
              onClick={requestPasswordOtp}
              disabled={pwSending}
            >
              {pwSending ? 'Sending…' : 'Resend code'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
