import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUser } from '../../store/slices/authSlice.js';
import { selectCurrentOrg, selectCurrentOrgId } from '../../store/slices/orgSlice.js';
import { usersApi, organizationsApi, authApi } from '../../api/client.js';
import Avatar from '../../components/Avatar.jsx';
import PhotoPicker from '../../components/PhotoPicker.jsx';
import BillingDetailsModal from '../../components/BillingDetailsModal.jsx';
import { isAdminRole } from '../../utils/role.js';
import { formatDate } from '../../utils/status.js';
import { prettySize } from '../../utils/fileSize.js';

export default function ProfilePage() {
  const { hash } = useLocation();

  /**
   * Scroll to the Password card when arrived at via `/more/profile#password`.
   *
   * React Router does NOT honour a fragment on a client-side navigation — the
   * browser only scrolls to one on a full page load — so without this the
   * Topbar's "Change password" would land at the top of a long profile page
   * and look like it had done nothing. `requestAnimationFrame` waits for the
   * section to be laid out; scrolling before that measures the wrong offset.
   */
  useEffect(() => {
    if (hash !== '#password') return undefined;
    const raf = requestAnimationFrame(() => {
      document.getElementById('password')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [hash]);

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

  // Workspace billing details (admin/owner only — the API is requireOrgAdmin).
  const isOrgAdmin = isAdminRole(org?.role);
  const [billingDetails, setBillingDetails] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [editingBilling, setEditingBilling] = useState(false);

  useEffect(() => {
    if (!orgId || !isOrgAdmin) return;
    setBillingLoading(true);
    organizationsApi
      .billing(orgId)
      .then((res) => setBillingDetails(res.billing.billingDetails))
      .catch((err) => setBillingError(err.message || 'Could not load billing details'))
      .finally(() => setBillingLoading(false));
  }, [orgId, isOrgAdmin]);

  const hasBillingDetails =
    !!billingDetails &&
    Object.entries(billingDetails).some(([, v]) => !!v);

  const saveBillingDetails = async (form) => {
    setBillingSaving(true);
    setBillingError('');
    try {
      const res = await organizationsApi.updateBillingDetails(orgId, form);
      setBillingDetails(res.billingDetails);
      setEditingBilling(false);
    } catch (err) {
      setBillingError(err.message || 'Could not save the billing details');
    } finally {
      setBillingSaving(false);
    }
  };

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

      {/* Billing details are **workspace**-scoped, not personal — the same
          person can own two workspaces billed to two different companies — so
          this card is labelled with the workspace name and only shown to an
          admin/owner, matching `requireOrgAdmin` on the API. It shares
          `BillingDetailsModal` with the Plans & Billing page so the two entry
          points can't drift. */}
      {isOrgAdmin && (
        <div className="card-form" style={{ marginTop: 20 }}>
          <h3 className="field__label" style={{ fontSize: 15, marginBottom: 4 }}>
            Billing details · {org?.name}
          </h3>
          <p className="field__hint" style={{ marginBottom: 16 }}>
            These appear on this workspace&apos;s GST invoices. Each workspace has its own.
          </p>

          {billingError && <div className="alert alert--error">{billingError}</div>}

          {billingLoading ? (
            <span className="spinner" />
          ) : (
            <>
              <div className="billing-details__text" style={{ marginBottom: 14 }}>
                {hasBillingDetails ? (
                  <>
                    <strong>{billingDetails.businessName || '—'}</strong>
                    <span>{[billingDetails.addressLine1, billingDetails.addressLine2].filter(Boolean).join(', ')}</span>
                    <span>{[billingDetails.city, billingDetails.pincode].filter(Boolean).join(', ')}</span>
                    <span>{billingDetails.state}</span>
                    {billingDetails.gstin && <span className="muted">GSTIN {billingDetails.gstin}</span>}
                  </>
                ) : (
                  <span className="muted">Not added yet.</span>
                )}
              </div>
              <button className="btn btn--ghost" type="button" onClick={() => setEditingBilling(true)}>
                {hasBillingDetails ? 'Edit billing details' : 'Add billing details'}
              </button>
            </>
          )}
        </div>
      )}

      {editingBilling && (
        <BillingDetailsModal
          details={billingDetails}
          busy={billingSaving}
          error={billingError}
          onSave={saveBillingDetails}
          onClose={() => setEditingBilling(false)}
        />
      )}

      {/* `id` is the deep-link target for the Topbar account menu's
          "Change password" — that entry navigates to /more/profile#password
          rather than duplicating this OTP-confirmed flow anywhere else. */}
      <div className="card-form" id="password" style={{ marginTop: 20 }}>
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
