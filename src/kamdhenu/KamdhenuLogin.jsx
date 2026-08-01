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

/** The Kamdhenu Aviation K-wing mark (same original artwork as the landing
 *  page's `AviationLogo`, inlined as plain SVG so this page adds no MUI
 *  dependency to the portal bundle). */
function AviationMark({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Kamdhenu Aviation logo"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="kavLoginGrad" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0a4da3" />
          <stop offset="1" stopColor="#2196f3" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="12" fill="#ffffff" />
      <rect x="11" y="10" width="6.5" height="28" rx="2.5" fill="url(#kavLoginGrad)" />
      <path d="M19 24.5 L38.5 8.5 C40.5 7 42.5 8.8 41.2 10.9 L30 25.5 Z" fill="url(#kavLoginGrad)" />
      <path d="M23.5 23.4 L36.5 12.6 L34.6 15.2 L26.4 22.2 Z" fill="#ffffff" opacity="0.85" />
      <path d="M19 26.5 L28.5 26.5 L38 38.5 C39 39.8 37.6 41.4 36.2 40.5 L19 30 Z" fill="url(#kavLoginGrad)" opacity="0.92" />
    </svg>
  );
}

/** Aviation-branded panel matching the Kamdhenu Aviation landing page's
 *  light/blue theme — no Task Pro, ERP, or "admin" wording. */
function KamdhenuBrandPanel() {
  return (
    <aside className="auth__brand">
      <div className="brand__logo">
        <AviationMark />
        <span style={{ marginLeft: 10 }}>Kamdhenu&nbsp;Aviation</span>
      </div>
      <div className="brand__hero">
        <h1>Kamdhenu Aviation</h1>
        <p>Professional Aircraft Painting &amp; Aviation Surface Solutions.</p>
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

  // Brand the tab like the Kamdhenu Aviation landing page (same favicon).
  // Deliberately NOT restored on unmount — the whole /kamdhenu portal session
  // keeps the aviation branding after sign-in.
  useEffect(() => {
    document.title = 'Kamdhenu Aviation — Sign in';
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = '/kamdhenu-aviation-favicon.svg';
    link.type = 'image/svg+xml';
  }, []);

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
    <div className="auth kav-auth">
      <KamdhenuBrandPanel />
      <div className="auth__panel">
        <form className="auth__card" onSubmit={onSubmit} noValidate>
          <div className="auth__mobile-logo">
            <AviationMark size={30} /> <span style={{ marginLeft: 8 }}>Kamdhenu&nbsp;Aviation</span>
          </div>

          <h2 className="auth__title">{mode === 'otp' && step === 'otp' ? 'Check your email' : 'Sign in'}</h2>
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
