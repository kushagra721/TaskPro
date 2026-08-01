import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import OtpInput from '../components/OtpInput.jsx';
import {
  loginKamdhenuWithPassword,
  requestKamdhenuOtp,
  verifyKamdhenuOtp,
} from '../store/slices/kamdhenuAuthSlice.js';

const RESEND_SECONDS = 30;
const OTP_LENGTH = 4;

/** Mirrors `PlatformLogin`'s brand panel (same `.auth__brand`/`.brand__*`
 *  classes) — Kamdhenu's own branding only, no Task Pro header. */
function KamdhenuBrandPanel() {
  return (
    <aside className="auth__brand">
      <div className="brand__logo">
        <span className="brand__logo-mark">✓</span>
        Kamdhenu&nbsp;ERP
      </div>
      <div className="brand__hero">
        <h1>Kamdhenu admin</h1>
        <p>Sign in with your email — password or a one-time code, your choice.</p>
      </div>
    </aside>
  );
}

/** Mirrors `PlatformLogin.jsx` exactly (password-by-default, "Login with OTP
 *  instead" toggle, same OTP step/UI) for the fully separate Kamdhenu portal
 *  credential lane. No signup — the one admin account is seeded. */
export default function KamdhenuLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [step, setStep] = useState('start'); // 'start' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (step !== 'otp' || cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, cooldown]);

  const switchMode = (next) => {
    setMode(next);
    setStep('start');
    setError('');
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await dispatch(loginKamdhenuWithPassword({ email: email.trim(), password })).unwrap();
      navigate('/kamdhenu/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  const requestCode = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await dispatch(requestKamdhenuOtp(email.trim())).unwrap();
      setCooldown(RESEND_SECONDS);
      setCode('');
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Could not send the code');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (finalCode) => {
    setError('');
    setLoading(true);
    try {
      await dispatch(verifyKamdhenuOtp({ email: email.trim(), code: finalCode })).unwrap();
      navigate('/kamdhenu/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Incorrect code');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (next) => {
    setCode(next);
    setError('');
    if (next.length === OTP_LENGTH) verify(next);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (code.length >= OTP_LENGTH) verify(code);
  };

  const onSubmit = mode === 'password' ? submitPassword : step === 'start' ? requestCode : handleOtpSubmit;

  return (
    <div className="auth">
      <KamdhenuBrandPanel />
      <div className="auth__panel">
        <form className="auth__card" onSubmit={onSubmit} noValidate>
          <div className="auth__mobile-logo">
            <span className="brand__logo-mark">✓</span> Kamdhenu&nbsp;ERP
          </div>

          <h2 className="auth__title">{mode === 'otp' && step === 'otp' ? 'Check your email' : 'Admin sign in'}</h2>
          <p className="auth__subtitle">
            {mode === 'password'
              ? 'Enter your email and password to sign in.'
              : step === 'start'
                ? "Enter your email and we'll send you a sign-in code."
                : (
                  <>
                    We sent a verification code to <span className="verify__email">{email}</span>.
                  </>
                )}
          </p>

          {error && <div className="alert alert--error">{error}</div>}

          {mode === 'otp' && step === 'otp' ? (
            <>
              <OtpInput value={code} onChange={handleCodeChange} length={OTP_LENGTH} disabled={loading} />
              <div className="verify__meta">
                <button type="button" className="link-btn" onClick={() => setStep('start')}>
                  ← Change email
                </button>
                {cooldown > 0 ? (
                  <span>Resend in {cooldown}s</span>
                ) : (
                  <button type="button" className="link-btn" onClick={requestCode}>
                    Resend code
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label className="field__label" htmlFor="email">Email</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {mode === 'password' && (
                <div className="field">
                  <label className="field__label" htmlFor="password">Password</label>
                  <input
                    id="password"
                    className="input"
                    type="password"
                    placeholder="Your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {!(mode === 'otp' && step === 'otp') && (
            <button className="btn" type="submit" disabled={loading} style={{ marginTop: 6 }}>
              {loading ? <span className="spinner" /> : mode === 'password' ? 'Continue' : 'Send code'}
            </button>
          )}

          {mode === 'otp' && step === 'otp' && (
            <div style={{ marginTop: 22 }}>
              <button className="btn" type="submit" disabled={loading || code.length < OTP_LENGTH}>
                {loading ? <span className="spinner" /> : 'Verify & sign in'}
              </button>
            </div>
          )}

          {!(mode === 'otp' && step === 'otp') && (
            <p className="auth__foot">
              {mode === 'password' ? (
                <button type="button" className="link-btn" onClick={() => switchMode('otp')}>
                  Login with OTP instead
                </button>
              ) : (
                <button type="button" className="link-btn" onClick={() => switchMode('password')}>
                  Login with password instead
                </button>
              )}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
