import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import OtpInput from '../components/OtpInput.jsx';
import {
  loginPlatformWithPassword,
  requestPlatformOtp,
  verifyPlatformOtp,
  verifyPlatformSignup,
} from '../store/slices/platformAuthSlice.js';

const RESEND_SECONDS = 30;
const OTP_LENGTH = 4;

/** Mirrors `BrandPanel`'s look (same `.auth__brand`/`.brand__*` classes) with
 *  copy noting this is the platform portal rather than the normal client app —
 *  the login process itself (password by default, "Login with OTP instead"
 *  to switch, same as `Login.jsx`; the OTP step itself matches `Verify.jsx`
 *  exactly, boxes and all) is otherwise identical. */
function PlatformBrandPanel() {
  return (
    <aside className="auth__brand">
      <div className="brand__logo">
        <span className="brand__logo-mark">✓</span>
        Task&nbsp;Pro
      </div>
      <div className="brand__hero">
        <h1>Platform access</h1>
        <p>Super Admin and Reseller accounts sign in with their email — password or a one-time code, your choice.</p>
      </div>
    </aside>
  );
}

export default function PlatformLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [step, setStep] = useState('start'); // 'start' | 'otp' — 'otp' only ever reached from OTP mode
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  // Set when a password login hits an unverified self-signup: the OTP step then
  // consumes the *signup* code rather than a login code (different purposes).
  const [verifyingSignup, setVerifyingSignup] = useState(false);

  useEffect(() => {
    if (step !== 'otp' || cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, cooldown]);

  /** `needsOnboarding` is computed server-side per sign-in (not a JWT claim, so
   *  it can't go stale) — a self-signed-up reseller with no plan yet is sent to
   *  finish setup instead of into a half-configured portal. */
  const goToPortal = (res) => {
    if (res.needsOnboarding) {
      navigate('/platform/onboarding', { replace: true });
      return;
    }
    navigate(res.platformUser.role === 'SUPER_ADMIN' ? '/platform/admin' : '/platform/reseller', { replace: true });
  };

  const switchMode = (next) => {
    setMode(next);
    setStep('start');
    setVerifyingSignup(false);
    setError('');
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await dispatch(loginPlatformWithPassword({ email: email.trim(), password })).unwrap();
      if (res.requiresVerification) {
        // Unverified self-signup — the backend already reissued the signup
        // code, so drop straight into the OTP step in signup-verify mode.
        setVerifyingSignup(true);
        setMode('otp');
        setCooldown(RESEND_SECONDS);
        setCode('');
        setStep('otp');
        return;
      }
      goToPortal(res);
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
      const res = await dispatch(requestPlatformOtp(email.trim())).unwrap();
      setDevCode(res.devCode || '');
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
      const thunk = verifyingSignup ? verifyPlatformSignup : verifyPlatformOtp;
      const res = await dispatch(thunk({ email: email.trim(), code: finalCode })).unwrap();
      goToPortal(res);
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
    if (next.length === OTP_LENGTH) verify(next); // auto-submit when full
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (code.length >= OTP_LENGTH) verify(code);
  };

  const onSubmit = mode === 'password' ? submitPassword : step === 'start' ? requestCode : handleOtpSubmit;

  return (
    <div className="auth">
      <PlatformBrandPanel />
      <div className="auth__panel">
        <form className="auth__card" onSubmit={onSubmit} noValidate>
          <div className="auth__mobile-logo">
            <span className="brand__logo-mark">✓</span> Task&nbsp;Pro Platform
          </div>

          <h2 className="auth__title">
            {mode === 'otp' && step === 'otp' ? 'Check your email' : 'Platform sign in'}
          </h2>
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
          {/* {mode === 'otp' && step === 'otp' && devCode && (
            <div className="alert">Dev code: <strong>{devCode}</strong></div>
          )} */}

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
            <>
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
              {/* Resellers can self-register; a Super Admin account is seeded,
                  never signed up — hence the reseller-specific wording. */}
              {/* <p className="auth__foot">
                Want to resell Task Pro? <Link className="link-btn" to="/platform/signup">Create a reseller account</Link>
              </p> */}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
