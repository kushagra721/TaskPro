import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import BrandPanel from '../components/BrandPanel.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { authApi } from '../api/client.js';
import { setCredentials } from '../store/slices/authSlice.js';

/**
 * Forgot password — two steps in one page.
 *
 * Step 1 takes the email and sends a code; step 2 takes the code and the new
 * password. One component rather than two routes because the second step is
 * meaningless without the first: landing on it directly, or refreshing into it,
 * would leave a form with no email to act on.
 *
 * ENDING SIGNED IN is deliberate. `/auth/password/reset/confirm` returns a token
 * for the same reason `/auth/verify` does — the caller has just proved control
 * of the address by consuming a code sent to it. Bouncing them to the login
 * screen to type the password they set ten seconds ago adds a step and no
 * safety.
 *
 * The reset is scoped to the request's domain on the server, like every other
 * lookup by email here, so this page never has to think about which tenant it
 * is on.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { state } = useLocation();

  const [step, setStep] = useState('email'); // 'email' → 'reset'
  // Prefilled from the login form when the user came from "Forgot password?",
  // so the address is not typed twice.
  const [email, setEmail] = useState(state?.email || '');
  const [form, setForm] = useState({ code: '', newPassword: '', confirmNewPassword: '' });
  const [devCode, setDevCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
  };

  const run = async (fn) => {
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      // The API reports per-field problems (weak password, mismatch) the same
      // way the signup form already consumes them.
      if (err.fields) {
        const map = {};
        err.fields.forEach((f) => (map[f.field] = f.message));
        setFieldErrors(map);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const requestCode = (e) => {
    e.preventDefault();
    return run(async () => {
      const res = await authApi.requestPasswordReset({ email });
      setDevCode(res.devCode || '');
      setStep('reset');
    });
  };

  const confirmReset = (e) => {
    e.preventDefault();
    return run(async () => {
      const res = await authApi.confirmPasswordReset({ email, ...form });
      dispatch(setCredentials({ token: res.token, user: res.user }));
      navigate('/dashboard', { replace: true });
    });
  };

  return (
    <div className="auth">
      <BrandPanel />
      <div className="auth__panel">
        <form className="auth__card" onSubmit={step === 'email' ? requestCode : confirmReset} noValidate>
          <div className="auth__mobile-logo">
            <span className="brand__logo-mark">✓</span> Task&nbsp;Pro
          </div>

          <h2 className="auth__title">
            {step === 'email' ? 'Reset your password' : 'Set a new password'}
          </h2>
          <p className="auth__subtitle">
            {step === 'email'
              ? "Enter your email and we'll send you a code to reset your password."
              : <>We sent a code to <strong>{email}</strong>. Enter it below with your new password.</>}
          </p>

          {error && <div className="alert alert--error">{error}</div>}

          {step === 'email' ? (
            <div className="field">
              <label className="field__label" htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                className={`input ${fieldErrors.email ? 'input--error' : ''}`}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors({}); }}
              />
              {fieldErrors.email && <div className="field__error">{fieldErrors.email}</div>}
            </div>
          ) : (
            <>
              {/* Shown in every environment, exactly like the verify screen —
                  the API returns the raw code by product decision, so email
                  delivery is never what blocks a reset. */}
              {devCode && <div className="alert">Your code: <strong>{devCode}</strong></div>}

              <div className="field">
                <label className="field__label" htmlFor="reset-code">Verification code</label>
                <input
                  id="reset-code"
                  className={`input ${fieldErrors.code ? 'input--error' : ''}`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="4-digit code"
                  value={form.code}
                  onChange={update('code')}
                />
                {fieldErrors.code && <div className="field__error">{fieldErrors.code}</div>}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="new-password">New password</label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  placeholder="Your new password"
                  value={form.newPassword}
                  onChange={update('newPassword')}
                  invalid={Boolean(fieldErrors.newPassword)}
                />
                {fieldErrors.newPassword && <div className="field__error">{fieldErrors.newPassword}</div>}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="confirm-password">Confirm new password</label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  value={form.confirmNewPassword}
                  onChange={update('confirmNewPassword')}
                  invalid={Boolean(fieldErrors.confirmNewPassword)}
                />
                {fieldErrors.confirmNewPassword && (
                  <div className="field__error">{fieldErrors.confirmNewPassword}</div>
                )}
              </div>
            </>
          )}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : step === 'email' ? 'Send code' : 'Update password'}
          </button>

          {step === 'reset' && (
            <p className="auth__foot">
              <button
                type="button"
                className="link-btn"
                onClick={() => { setStep('email'); setError(''); setFieldErrors({}); }}
              >
                ← Change email
              </button>
            </p>
          )}

          <p className="auth__foot">
            Remembered it? <Link className="link" to="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
