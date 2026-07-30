import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import OtpInput from '../components/OtpInput.jsx';
import { signupPlatformReseller, verifyPlatformSignup } from '../store/slices/platformAuthSlice.js';

const RESEND_SECONDS = 30;
const OTP_LENGTH = 4;

/** Same `.auth`/`.auth__brand` shell as `PlatformLogin.jsx`, different copy. */
function SignupBrandPanel() {
  return (
    <aside className="auth__brand">
      <div className="brand__logo">
        <span className="brand__logo-mark">✓</span>
        Task&nbsp;Pro
      </div>
      <div className="brand__hero">
        <h1>Become a reseller</h1>
        <p>Sell Task Pro under your own brand and domain. Create your account, pick a plan, and start onboarding clients.</p>
      </div>
    </aside>
  );
}

/**
 * Reseller self-registration — name + email + password, then the emailed code,
 * exactly mirroring the client app's `Signup.jsx` → `Verify.jsx` pair (and
 * reusing `OtpInput`). Billing details and the plan choice come *after*
 * verification, on `/platform/onboarding`, because they're a lot to ask before
 * someone has even confirmed their address.
 *
 * Both steps live in one component's local `step` state, same as
 * `PlatformLogin.jsx` — the platform lane has no shared `/verify` route.
 */
export default function PlatformSignup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (step !== 'otp' || cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, cooldown]);

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submitForm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await dispatch(
        signupPlatformReseller({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      ).unwrap();
      setCooldown(RESEND_SECONDS);
      setCode('');
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Could not create the account');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      // The signup endpoint doubles as "resend" for an unverified account —
      // see platformAuth.service.js#signupPlatformReseller.
      await dispatch(
        signupPlatformReseller({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      ).unwrap();
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.message || 'Could not resend the code');
    }
  };

  const verify = async (finalCode) => {
    setError('');
    setLoading(true);
    try {
      await dispatch(verifyPlatformSignup({ email: form.email.trim(), code: finalCode })).unwrap();
      // A fresh signup always still needs billing details + a plan.
      navigate('/platform/onboarding', { replace: true });
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

  const canSubmit = form.name.trim() && form.email.trim() && form.password.length >= 6 && !loading;

  return (
    <div className="auth">
      <SignupBrandPanel />
      <div className="auth__panel">
        <form
          className="auth__card"
          onSubmit={step === 'form' ? submitForm : (e) => { e.preventDefault(); if (code.length >= OTP_LENGTH) verify(code); }}
          noValidate
        >
          <div className="auth__mobile-logo">
            <span className="brand__logo-mark">✓</span> Task&nbsp;Pro Platform
          </div>

          <h2 className="auth__title">{step === 'form' ? 'Create a reseller account' : 'Check your email'}</h2>
          <p className="auth__subtitle">
            {step === 'form' ? (
              'Start with your name, email and a password. Billing details and your plan come next.'
            ) : (
              <>
                We sent a verification code to <span className="verify__email">{form.email}</span>.
              </>
            )}
          </p>

          {error && <div className="alert alert--error">{error}</div>}

          {step === 'form' ? (
            <>
              <div className="field">
                <label className="field__label" htmlFor="name">Your name</label>
                <input
                  id="name"
                  className="input"
                  autoFocus
                  autoComplete="name"
                  value={form.name}
                  onChange={up('name')}
                  placeholder="Rahul Bhist"
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="email">Email</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={up('email')}
                  placeholder="you@yourbrand.com"
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="password">Password</label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={up('password')}
                  placeholder="At least 6 characters"
                />
              </div>

              <button className="btn" type="submit" disabled={!canSubmit} style={{ marginTop: 6 }}>
                {loading ? <span className="spinner" /> : 'Create account'}
              </button>

              <p className="auth__foot">
                Already have an account? <Link className="link-btn" to="/platform/login">Sign in</Link>
              </p>
            </>
          ) : (
            <>
              <OtpInput value={code} onChange={handleCodeChange} length={OTP_LENGTH} disabled={loading} />
              <div className="verify__meta">
                <button type="button" className="link-btn" onClick={() => setStep('form')}>
                  ← Change details
                </button>
                {cooldown > 0 ? (
                  <span>Resend in {cooldown}s</span>
                ) : (
                  <button type="button" className="link-btn" onClick={resend}>
                    Resend code
                  </button>
                )}
              </div>
              <div style={{ marginTop: 22 }}>
                <button className="btn" type="submit" disabled={loading || code.length < OTP_LENGTH}>
                  {loading ? <span className="spinner" /> : 'Verify & continue'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
